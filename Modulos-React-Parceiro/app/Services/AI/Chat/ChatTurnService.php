<?php

namespace App\Services\AI\Chat;

use App\Enums\ChatMessageRole;
use App\Enums\ChatMessageStatus;
use App\Models\ChatContextFrame;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\User;
use App\Services\AI\Chat\Contracts\BuildsChatContextFrames;
use App\Services\AI\ProviderManager;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ChatTurnService
{
    public function __construct(
        protected ProviderManager $providerManager,
        protected BuildsChatContextFrames $contextFrameBuilder,
        protected ChatSessionContextStateStore $contextStateStore,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array{session: ChatSession, assistantMessage: ChatMessage}
     */
    public function createTurn(User $user, array $payload): array
    {
        $validated = Validator::make($payload, [
            'session_id' => ['nullable', 'integer'],
            'message' => ['required', 'string', 'max:12000'],
            'provider' => ['nullable', 'string'],
            'model' => ['nullable', 'string'],
            'context' => ['nullable', 'array'],
            'context.brand_dna_id' => ['nullable', 'integer'],
            'context.brand_dna_persona_id' => ['nullable', 'integer'],
            'context.knowledge_enabled' => ['nullable', 'boolean'],
            'context.web_search_enabled' => ['nullable', 'boolean'],
            'context.role' => ['nullable', 'string', 'max:120'],
        ])->validate();

        ['provider' => $provider, 'model' => $model] = $this->providerManager->resolveTextSelection(
            $validated['provider'] ?? null,
            $validated['model'] ?? null,
        );

        $session = $this->resolveSession($user, $validated['session_id'] ?? null);
        $lastFrame = $session->contextFrames()->first();
        $frame = $this->contextFrameBuilder->build(
            $session,
            $validated['context'] ?? [],
            $lastFrame instanceof ChatContextFrame ? $lastFrame : null,
        );
        $frame->forceFill([
            'meta' => array_filter([
                ...($frame->meta ?? []),
                'provider' => $provider,
                'model' => $model,
            ], fn (mixed $value): bool => $value !== null),
        ])->save();

        $this->contextStateStore->persist($session, [
            'provider' => $provider,
            'model' => $model,
            'brand_dna_id' => $frame->brand_dna_id,
            'brand_dna_persona_id' => $frame->brand_dna_persona_id,
            'knowledge_enabled' => $frame->knowledge_enabled,
            'web_search_enabled' => $frame->web_search_enabled,
            'role' => data_get($frame->meta, 'role'),
        ]);

        $lastMessageIndex = (int) ($session->messages()->max('message_index') ?? -1);

        ChatMessage::query()->create([
            'chat_session_id' => $session->id,
            'context_frame_id' => $frame->id,
            'role' => ChatMessageRole::User,
            'content' => trim((string) $validated['message']),
            'status' => ChatMessageStatus::Completed,
            'message_index' => $lastMessageIndex + 1,
            'completed_at' => now(),
            'meta' => [],
        ]);

        $assistantMessage = ChatMessage::query()->create([
            'chat_session_id' => $session->id,
            'context_frame_id' => $frame->id,
            'role' => ChatMessageRole::Assistant,
            'content' => null,
            'provider' => $provider,
            'model' => $model,
            'status' => ChatMessageStatus::Pending,
            'message_index' => $lastMessageIndex + 2,
            'meta' => [],
        ]);

        $session->forceFill([
            'last_used_at' => now(),
        ])->save();

        return [
            'session' => $session->fresh(),
            'assistantMessage' => $assistantMessage->fresh(),
        ];
    }

    protected function resolveSession(User $user, mixed $sessionId): ChatSession
    {
        if ($sessionId) {
            $session = ChatSession::query()->ownedBy($user)->find($sessionId);

            if (! $session) {
                throw ValidationException::withMessages([
                    'session_id' => 'A conversa informada nao foi encontrada.',
                ]);
            }

            return $session;
        }

        return ChatSession::query()->create([
            'user_id' => $user->id,
            'title' => null,
            'last_used_at' => now(),
            'meta' => [],
        ]);
    }
}
