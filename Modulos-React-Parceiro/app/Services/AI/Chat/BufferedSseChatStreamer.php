<?php

namespace App\Services\AI\Chat;

use App\Data\Chat\ChatHistoryWindow;
use App\Enums\ChatMessageSourceType;
use App\Enums\ChatMessageStatus;
use App\Models\BrandDnaKnowledgeChunk;
use App\Models\ChatMessage;
use App\Models\ChatMessageSource;
use App\Services\AI\Chat\Contracts\StreamsChatResponses;
use App\Services\AI\ProviderManager;
use App\Services\AI\Support\AiProviderException;
use App\Services\BrandDna\KnowledgeBase\Contracts\RetrievesBrandKnowledge;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class BufferedSseChatStreamer implements StreamsChatResponses
{
    public function __construct(
        protected ProviderManager $providerManager,
        protected RetrievesBrandKnowledge $knowledgeRetriever,
        protected ChatMessageWindowBuilder $messageWindowBuilder,
        protected ChatSessionTitleGenerator $titleGenerator,
    ) {}

    public function stream(ChatMessage $assistantMessage): StreamedResponse
    {
        return response()->stream(function () use ($assistantMessage): void {
            $assistantMessage = ChatMessage::query()
                ->with([
                    'session.messages.contextFrame',
                    'contextFrame.brandDna.niches',
                    'contextFrame.brandDna.examples',
                    'contextFrame.persona',
                    'sources',
                ])
                ->findOrFail($assistantMessage->id);

            if ($assistantMessage->status === ChatMessageStatus::Completed) {
                $this->emit('completed', [
                    'message' => $assistantMessage->content,
                    'sources' => $assistantMessage->sources->map(fn (ChatMessageSource $source): array => $this->serializeSource($source))->all(),
                    'title' => $assistantMessage->session->title,
                ]);

                return;
            }

            $assistantMessage->forceFill([
                'status' => ChatMessageStatus::Streaming,
            ])->save();

            $userMessage = $assistantMessage->session->messages
                ->firstWhere('message_index', $assistantMessage->message_index - 1);

            if (! $userMessage) {
                $assistantMessage->forceFill([
                    'status' => ChatMessageStatus::Failed,
                    'meta' => ['error_message' => 'Mensagem do usuario nao encontrada para este turno.'],
                ])->save();

                $this->emit('error', ['message' => 'Mensagem do usuario nao encontrada para este turno.']);

                return;
            }

            $this->emit('started', [
                'assistant_message_id' => $assistantMessage->id,
            ]);

            try {
                $knowledgeChunks = $this->resolveKnowledgeChunks($assistantMessage, (string) $userMessage->content);
                $historyWindow = $this->messageWindowBuilder->build(
                    $assistantMessage->session,
                    $assistantMessage->session->messages
                        ->where('message_index', '<', $userMessage->message_index)
                        ->where('status', ChatMessageStatus::Completed)
                        ->values()
                );

                if ($knowledgeChunks->isNotEmpty()) {
                    $this->emit('sources', [
                        'sources' => $knowledgeChunks
                            ->map(fn (BrandDnaKnowledgeChunk $chunk): array => $this->serializeChunkSource($chunk))
                            ->all(),
                    ]);
                }

                $result = $this->providerManager->text((string) $assistantMessage->provider)->generateText(
                    $this->buildPrompt($historyWindow, (string) $userMessage->content, $knowledgeChunks),
                    [
                        'model' => $assistantMessage->model,
                        'system_prompt' => $this->buildSystemPrompt($assistantMessage, $knowledgeChunks),
                    ],
                );

                $assistantMessage->forceFill([
                    'content' => $result->text,
                    'status' => ChatMessageStatus::Completed,
                    'completed_at' => now(),
                    'meta' => array_filter([
                        ...($assistantMessage->meta ?? []),
                        ...$result->meta,
                        'context_summary' => data_get($assistantMessage->contextFrame?->meta, 'context_summary'),
                    ], fn (mixed $value): bool => $value !== null),
                ])->save();

                $this->persistKnowledgeSources($assistantMessage, $knowledgeChunks);

                $assistantMessage->session->forceFill([
                    'last_used_at' => now(),
                ])->save();

                $this->titleGenerator->ensureTitle($assistantMessage->session->fresh('messages'));

                foreach ($this->chunkText($result->text) as $piece) {
                    $this->emit('delta', ['content' => $piece]);
                }

                $this->emit('completed', [
                    'message' => $assistantMessage->content,
                    'sources' => $assistantMessage->fresh('sources')->sources->map(fn (ChatMessageSource $source): array => $this->serializeSource($source))->all(),
                    'title' => $assistantMessage->session->fresh()->title,
                ]);
            } catch (AiProviderException $exception) {
                $assistantMessage->forceFill([
                    'status' => ChatMessageStatus::Failed,
                    'meta' => array_filter([
                        ...($assistantMessage->meta ?? []),
                        'error_message' => $exception->userMessage(),
                        'provider_code' => $exception->getCode(),
                        'provider_technical_message' => $exception->technicalMessage(),
                    ], fn (mixed $value): bool => $value !== null && $value !== 0),
                ])->save();

                $this->emit('error', ['message' => $exception->userMessage()]);
            } catch (Throwable $exception) {
                report($exception);

                $assistantMessage->forceFill([
                    'status' => ChatMessageStatus::Failed,
                    'meta' => [
                        ...($assistantMessage->meta ?? []),
                        'error_message' => 'Nao foi possivel concluir a resposta agora. Tente novamente em instantes.',
                    ],
                ])->save();

                $this->emit('error', ['message' => 'Nao foi possivel concluir a resposta agora. Tente novamente em instantes.']);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    protected function resolveKnowledgeChunks(ChatMessage $assistantMessage, string $query): Collection
    {
        $frame = $assistantMessage->contextFrame;

        if (! $frame?->knowledge_enabled || ! $frame->brandDna) {
            return collect();
        }

        return $this->knowledgeRetriever->search(
            $frame->brandDna,
            $query,
            (int) config('brand_dna.knowledge_base.retrieval_limit', 4),
        );
    }

    protected function buildSystemPrompt(ChatMessage $assistantMessage, Collection $knowledgeChunks): string
    {
        $frame = $assistantMessage->contextFrame;
        $role = data_get($frame?->meta, 'role');
        $sections = [
            'Voce e o Chat IA do GT FLOW. Responda com clareza, continuidade e consistencia com o contexto ativo.',
        ];

        if (filled($role)) {
            $sections[] = "Papel operacional do usuario nesta conversa: {$role}. Adapte prioridades, linguagem e proximos passos para essa funcao.";
        }

        if (filled($frame?->system_snapshot)) {
            $sections[] = "Contexto ativo:\n".$frame->system_snapshot;
        }

        if ($knowledgeChunks->isNotEmpty()) {
            $sections[] = 'Quando usar as fontes recuperadas, cite explicitamente no texto com o marcador [Fonte N] correspondente.';
        }

        return implode("\n\n", $sections);
    }

    protected function buildPrompt(ChatHistoryWindow $historyWindow, string $currentMessage, Collection $knowledgeChunks): string
    {
        $sections = [];

        if (filled($historyWindow->summary)) {
            $sections[] = "Resumo acumulado da conversa:\n".$historyWindow->summary;
        }

        if ($historyWindow->recentMessages->isNotEmpty()) {
            $sections[] = "Mensagens recentes:\n".$historyWindow->recentMessages
                ->map(fn (ChatMessage $message): string => sprintf(
                    '%s: %s',
                    Str::headline($message->role->value),
                    trim((string) $message->content)
                ))
                ->implode("\n\n");
        }

        if ($knowledgeChunks->isNotEmpty()) {
            $sections[] = "Base de conhecimento recuperada:\n".$knowledgeChunks
                ->map(fn (BrandDnaKnowledgeChunk $chunk, int $index): string => sprintf(
                    '[Fonte %d] %s%s%s',
                    $index + 1,
                    $chunk->document?->title ?? 'Documento sem titulo',
                    PHP_EOL,
                    trim($chunk->content)
                ))
                ->implode("\n\n");
        }

        $sections[] = "Mensagem atual do usuario:\n".trim($currentMessage);

        return implode("\n\n", $sections);
    }

    /**
     * @param  Collection<int, BrandDnaKnowledgeChunk>  $knowledgeChunks
     */
    protected function persistKnowledgeSources(ChatMessage $assistantMessage, Collection $knowledgeChunks): void
    {
        if ($knowledgeChunks->isEmpty()) {
            return;
        }

        $assistantMessage->sources()->delete();

        $knowledgeChunks->each(function (BrandDnaKnowledgeChunk $chunk, int $index) use ($assistantMessage): void {
            $assistantMessage->sources()->create([
                'source_type' => ChatMessageSourceType::Knowledge,
                'brand_dna_knowledge_document_id' => $chunk->brand_dna_knowledge_document_id,
                'brand_dna_knowledge_chunk_id' => $chunk->id,
                'title' => $chunk->document?->title,
                'url' => $chunk->document?->source_url,
                'excerpt' => $chunk->getAttribute('retrieval_excerpt') ?: Str::limit($chunk->content, 280),
                'score' => $chunk->getAttribute('retrieval_score'),
                'rank' => $index + 1,
                'meta' => array_filter([
                    'document_type' => $chunk->document?->type?->value,
                    'vector_score' => $chunk->getAttribute('retrieval_vector_score'),
                    'lexical_score' => $chunk->getAttribute('retrieval_lexical_score'),
                ], fn (mixed $value): bool => $value !== null),
            ]);
        });
    }

    /**
     * @return array<int, string>
     */
    protected function chunkText(string $text): array
    {
        $size = max(1, (int) config('chat.stream.chunk_size', 32));

        return str_split($text, $size);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function emit(string $event, array $payload): void
    {
        echo "event: {$event}\n";
        echo 'data: '.json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n\n";

        @ob_flush();
        @flush();

        $sleep = (int) config('chat.stream.chunk_sleep_microseconds', 12000);

        if ($event === 'delta' && $sleep > 0) {
            usleep($sleep);
        }
    }

    protected function serializeChunkSource(BrandDnaKnowledgeChunk $chunk): array
    {
        return [
            'title' => $chunk->document?->title,
            'url' => $chunk->document?->source_url,
            'excerpt' => $chunk->getAttribute('retrieval_excerpt') ?: Str::limit($chunk->content, 280),
            'score' => $chunk->getAttribute('retrieval_score'),
            'rank' => $chunk->getAttribute('retrieval_rank'),
            'chunk_id' => $chunk->id,
            'document_id' => $chunk->brand_dna_knowledge_document_id,
        ];
    }

    protected function serializeSource(ChatMessageSource $source): array
    {
        return [
            'title' => $source->title,
            'url' => $source->url,
            'excerpt' => $source->excerpt,
            'score' => $source->score,
            'rank' => $source->rank,
            'chunk_id' => $source->brand_dna_knowledge_chunk_id,
            'document_id' => $source->brand_dna_knowledge_document_id,
        ];
    }
}
