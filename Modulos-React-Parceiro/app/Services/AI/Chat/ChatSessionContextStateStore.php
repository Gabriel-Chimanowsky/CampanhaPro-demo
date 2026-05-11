<?php

namespace App\Services\AI\Chat;

use App\Models\BrandDna;
use App\Models\BrandDnaPersona;
use App\Models\ChatSession;
use App\Models\User;
use App\Services\AI\ProviderManager;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ChatSessionContextStateStore
{
    public function __construct(
        protected ProviderManager $providerManager,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function normalize(User $user, array $payload): array
    {
        $validated = Validator::make($payload, [
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

        $context = $validated['context'] ?? [];
        $brandDna = $this->resolveBrandDna($user, $context);
        $persona = $this->resolvePersona($brandDna, $context);
        $role = filled($context['role'] ?? null) ? trim((string) $context['role']) : null;

        return [
            'provider' => $provider,
            'model' => $model,
            'brand_dna_id' => $brandDna?->id,
            'brand_dna_persona_id' => $persona?->id,
            'knowledge_enabled' => $brandDna ? (bool) ($context['knowledge_enabled'] ?? false) : false,
            'web_search_enabled' => (bool) ($context['web_search_enabled'] ?? false),
            'role' => $role,
        ];
    }

    /**
     * @param  array<string, mixed>  $state
     */
    public function persist(ChatSession $session, array $state): void
    {
        $meta = $session->meta ?? [];
        data_set($meta, 'context_state', $state);

        $session->forceFill([
            'meta' => $meta,
        ])->save();
    }

    /**
     * @param  array<string, mixed>  $context
     */
    protected function resolveBrandDna(User $user, array $context): ?BrandDna
    {
        $brandDnaId = $context['brand_dna_id'] ?? null;

        if (! $brandDnaId) {
            return null;
        }

        return BrandDna::query()
            ->visibleTo($user)
            ->with('personas')
            ->findOrFail($brandDnaId);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    protected function resolvePersona(?BrandDna $brandDna, array $context): ?BrandDnaPersona
    {
        $personaId = $context['brand_dna_persona_id'] ?? null;

        if (! $brandDna || ! $personaId) {
            return null;
        }

        $persona = BrandDnaPersona::query()
            ->where('brand_dna_id', $brandDna->id)
            ->find($personaId);

        if (! $persona) {
            throw ValidationException::withMessages([
                'context.brand_dna_persona_id' => 'Selecione uma persona valida para o Brand DNA informado.',
            ]);
        }

        return $persona;
    }
}
