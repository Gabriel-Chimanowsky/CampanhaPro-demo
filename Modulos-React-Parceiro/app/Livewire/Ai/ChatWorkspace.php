<?php

namespace App\Livewire\Ai;

use App\Models\BrandDna;
use App\Models\ChatContextFrame;
use App\Models\ChatSession;
use App\Services\AI\ProviderManager;
use Illuminate\Support\Collection;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Title('Chat IA')]
class ChatWorkspace extends Component
{
    public ?ChatSession $chatSession = null;

    public function mount(?ChatSession $chatSession = null): void
    {
        if ($chatSession && $chatSession->user_id !== auth()->id()) {
            abort(403);
        }

        $this->chatSession = $chatSession?->load([
            'messages.sources',
            'messages.contextFrame.persona',
            'contextFrames.persona',
            'contextFrames.brandDna',
        ]);
    }

    /**
     * @return Collection<int, ChatSession>
     */
    #[Computed]
    public function sessions(): Collection
    {
        return ChatSession::query()
            ->ownedBy(auth()->user())
            ->latest('last_used_at')
            ->limit(20)
            ->get();
    }

    /**
     * @return Collection<int, BrandDna>
     */
    #[Computed]
    public function brands(): Collection
    {
        return BrandDna::query()
            ->visibleTo(auth()->user())
            ->with(['personas', 'user'])
            ->withCount([
                'knowledgeDocuments as ready_knowledge_documents_count' => fn ($query) => $query->ready(),
            ])
            ->orderBy('name')
            ->get();
    }

    /**
     * @return array<int, array{key: string, label: string, models: array<int, array{id: string, label: string}>}>
     */
    #[Computed]
    public function providerOptions(): array
    {
        return app(ProviderManager::class)->textProviderOptions();
    }

    /**
     * @return array<string, mixed>
     */
    protected function initialState(): array
    {
        $latestFrame = $this->chatSession?->contextFrames?->sortByDesc('id')->first();
        $latestFrameMeta = $latestFrame instanceof ChatContextFrame ? ($latestFrame->meta ?? []) : [];
        $latestBrandDnaId = $latestFrame instanceof ChatContextFrame ? $latestFrame->brand_dna_id : null;
        $latestPersonaId = $latestFrame instanceof ChatContextFrame ? $latestFrame->brand_dna_persona_id : null;
        $latestKnowledgeEnabled = $latestFrame instanceof ChatContextFrame ? $latestFrame->knowledge_enabled : false;
        $sessionMeta = $this->chatSession instanceof ChatSession ? ($this->chatSession->meta ?? []) : [];
        $savedContext = (array) data_get($sessionMeta, 'context_state', []);
        $defaultProvider = $this->providerOptions[0]['key'] ?? '';
        $defaultModel = $this->providerOptions[0]['models'][0]['id'] ?? '';

        return [
            'sessions' => $this->sessions->map(fn (ChatSession $session): array => [
                'id' => $session->id,
                'title' => $session->title ?: 'Nova conversa',
                'last_used_at' => $session->last_used_at?->diffForHumans(),
                'url' => route('ai.chat.show', $session),
            ])->all(),
            'activeSession' => $this->chatSession ? [
                'id' => $this->chatSession->id,
                'title' => $this->chatSession->title ?: 'Nova conversa',
                'url' => route('ai.chat.show', $this->chatSession),
            ] : null,
            'messages' => $this->chatSession
                ? $this->chatSession->messages
                    ->sortBy('message_index')
                    ->values()
                    ->map(fn ($message): array => [
                        'id' => $message->id,
                        'role' => $message->role->value,
                        'content' => $message->content,
                        'status' => $message->status->value,
                        'sources' => $message->sources->map(fn ($source): array => [
                            'title' => $source->title,
                            'url' => $source->url,
                            'excerpt' => $source->excerpt,
                            'score' => $source->score,
                            'rank' => $source->rank,
                        ])->all(),
                    ])->all()
                : [],
            'providers' => $this->providerOptions,
            'allModels' => collect($this->providerOptions)
                ->flatMap(fn (array $provider) => collect($provider['models'])
                    ->map(fn (array $model) => [
                        'key' => $provider['key'].':'.$model['id'],
                        'label' => $model['label'],
                        'group' => $provider['label'],
                        'provider' => $provider['key'],
                        'model' => $model['id'],
                    ]))
                ->all(),
            'roles' => array_values(array_filter(array_map(
                static fn (mixed $role): ?string => is_string($role) && $role !== '' ? $role : null,
                (array) config('chat.roles.suggestions', []),
            ))),
            'brands' => $this->brands->map(fn (BrandDna $brand): array => [
                'id' => $brand->id,
                'name' => $brand->name,
                'product' => $brand->primary_product,
                'summary' => $brand->previewDescription(),
                'ready_knowledge_documents_count' => $brand->ready_knowledge_documents_count,
                'personas' => $brand->personas->map(fn ($persona): array => [
                    'id' => $persona->id,
                    'label' => $persona->label,
                ])->all(),
            ])->all(),
            'context' => [
                'provider' => data_get($savedContext, 'provider', data_get($latestFrameMeta, 'provider', $defaultProvider)),
                'model' => data_get($savedContext, 'model', data_get($latestFrameMeta, 'model', $defaultModel)),
                'brand_dna_id' => data_get($savedContext, 'brand_dna_id', $latestBrandDnaId),
                'brand_dna_persona_id' => data_get($savedContext, 'brand_dna_persona_id', $latestPersonaId),
                'knowledge_enabled' => (bool) data_get($savedContext, 'knowledge_enabled', $latestKnowledgeEnabled),
                'web_search_enabled' => (bool) data_get($savedContext, 'web_search_enabled', false),
                'role' => data_get($savedContext, 'role', data_get($latestFrameMeta, 'role', auth()->user()?->role)),
                'context_summary' => data_get($savedContext, 'context_summary', data_get($latestFrameMeta, 'context_summary')),
            ],
            'routes' => [
                'send' => route('ai.chat.turns.store'),
                'new_chat' => route('ai.chat.index'),
                'context_update' => route('ai.chat.context.update', ['chatSession' => '__SESSION__']),
            ],
        ];
    }

    public function render()
    {
        return view('livewire.ai.chat-workspace', [
            'initialState' => $this->initialState(),
        ]);
    }
}
