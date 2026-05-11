<?php

namespace App\Services\AI;

use App\Enums\BrandDnaKnowledgeIngestionStatus;
use App\Models\AiGeneration;
use App\Models\AiTemplate;
use App\Models\BrandDna;
use App\Models\BrandDnaPersona;
use App\Models\User;
use App\Models\UserAiPreference;
use App\Models\UserAiTemplatePreference;

class RunContextResolver
{
    public function __construct(
        protected ProviderManager $providerManager,
        protected RunContextMemory $memory,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function resolve(User $user, AiTemplate $template, ?int $sourceGenerationId = null): array
    {
        $notice = null;

        if ($sourceGenerationId) {
            $source = AiGeneration::query()
                ->ownedBy($user)
                ->where('ai_template_id', $template->id)
                ->find($sourceGenerationId);

            if ($source) {
                return $this->contextFromGeneration($user, $template, $source, 'reused_generation');
            }

            $notice = 'A geracao usada como base nao esta mais disponivel para este template.';
        }

        $templatePreference = UserAiTemplatePreference::query()
            ->where('user_id', $user->id)
            ->where('ai_template_id', $template->id)
            ->first();

        if ($templatePreference) {
            return $this->contextFromTemplatePreference($user, $template, $templatePreference, $notice);
        }

        $userPreference = UserAiPreference::query()
            ->where('user_id', $user->id)
            ->first();

        if ($userPreference && ($userPreference->last_provider || $userPreference->last_brand_dna_id)) {
            $brandDna = $userPreference->last_use_brand_dna
                ? $this->visibleBrand($user, $userPreference->last_brand_dna_id)
                : null;

            if (! $userPreference->last_use_brand_dna || $brandDna) {
                return $this->context(
                    template: $template,
                    provider: $userPreference->last_provider,
                    model: $userPreference->last_model,
                    brandDna: $brandDna,
                    persona: $this->validPersona($brandDna, $userPreference->last_brand_dna_persona_id),
                    useKnowledgeBase: $userPreference->last_use_knowledge_base,
                    prefillMode: 'last_user_context',
                    notice: $notice,
                );
            }

            $notice = 'Algumas preferencias salvas nao estao mais disponiveis e foram ignoradas.';
        }

        if ($userPreference?->default_brand_dna_id) {
            $defaultBrand = $this->visibleBrand($user, $userPreference->default_brand_dna_id);

            if ($defaultBrand) {
                return $this->context(
                    template: $template,
                    provider: null,
                    model: null,
                    brandDna: $defaultBrand,
                    persona: null,
                    useKnowledgeBase: false,
                    prefillMode: 'default_brand_dna',
                    notice: $notice,
                );
            }

            $this->memory->clearDefaultBrandDna($user);
            $notice = 'A Brand DNA padrao nao esta mais disponivel e foi removida das preferencias.';
        }

        return $this->context(
            template: $template,
            provider: null,
            model: null,
            brandDna: null,
            persona: null,
            useKnowledgeBase: false,
            prefillMode: 'template_default',
            notice: $notice,
        );
    }

    protected function contextFromGeneration(User $user, AiTemplate $template, AiGeneration $generation, string $prefillMode): array
    {
        $brandDna = $generation->brand_dna_id
            ? $this->visibleBrand($user, $generation->brand_dna_id)
            : null;

        return $this->context(
            template: $template,
            provider: $generation->provider,
            model: $generation->model,
            brandDna: $brandDna,
            persona: $this->validPersona($brandDna, $generation->brand_dna_persona_id),
            useKnowledgeBase: (bool) data_get($generation->meta, 'knowledge_base_enabled', false),
            sourceGenerationId: $generation->id,
            inputPayload: $generation->input_payload ?? [],
            prefillMode: $prefillMode,
            notice: null,
        );
    }

    protected function contextFromTemplatePreference(
        User $user,
        AiTemplate $template,
        UserAiTemplatePreference $preference,
        ?string $notice,
    ): array {
        $brandDna = $preference->brand_dna_id
            ? $this->visibleBrand($user, $preference->brand_dna_id)
            : null;

        if ($preference->brand_dna_id && ! $brandDna) {
            $notice = 'Algumas preferencias salvas nao estao mais disponiveis e foram ignoradas.';
        }

        return $this->context(
            template: $template,
            provider: $preference->provider,
            model: $preference->model,
            brandDna: $brandDna,
            persona: $this->validPersona($brandDna, $preference->brand_dna_persona_id),
            useKnowledgeBase: $preference->use_knowledge_base,
            prefillMode: 'template_preference',
            notice: $notice,
        );
    }

    /**
     * @param  array<string, mixed>  $inputPayload
     * @return array<string, mixed>
     */
    protected function context(
        AiTemplate $template,
        ?string $provider,
        ?string $model,
        ?BrandDna $brandDna,
        ?BrandDnaPersona $persona,
        bool $useKnowledgeBase,
        string $prefillMode,
        ?string $notice,
        ?int $sourceGenerationId = null,
        array $inputPayload = [],
    ): array {
        $selection = $this->providerManager->resolveSelection($template, $provider, $model);
        $knowledgeEnabled = $brandDna && $useKnowledgeBase && $brandDna
            ->knowledgeDocuments()
            ->where('ingestion_status', BrandDnaKnowledgeIngestionStatus::Ready)
            ->exists();

        return [
            'provider' => $selection['provider'],
            'model' => $selection['model'],
            'use_brand_dna' => $brandDna !== null,
            'brand_dna_id' => $brandDna?->id,
            'brand_dna_name' => $brandDna?->name,
            'brand_dna_persona_id' => $persona?->id,
            'use_knowledge_base' => $knowledgeEnabled,
            'source_generation_id' => $sourceGenerationId,
            'input_payload' => $inputPayload,
            'prefill_mode' => $prefillMode,
            'notice' => $notice,
        ];
    }

    protected function visibleBrand(User $user, mixed $brandDnaId): ?BrandDna
    {
        if (! $brandDnaId) {
            return null;
        }

        return BrandDna::query()
            ->visibleTo($user)
            ->with(['niches', 'personas', 'user'])
            ->find($brandDnaId);
    }

    protected function validPersona(?BrandDna $brandDna, mixed $personaId): ?BrandDnaPersona
    {
        if (! $brandDna || ! $personaId) {
            return null;
        }

        return BrandDnaPersona::query()
            ->where('brand_dna_id', $brandDna->id)
            ->find($personaId);
    }
}
