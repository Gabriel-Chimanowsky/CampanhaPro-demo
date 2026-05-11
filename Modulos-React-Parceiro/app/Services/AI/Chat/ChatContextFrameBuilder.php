<?php

namespace App\Services\AI\Chat;

use App\Models\BrandDna;
use App\Models\BrandDnaPersona;
use App\Models\ChatContextFrame;
use App\Models\ChatSession;
use App\Services\AI\Chat\Contracts\BuildsChatContextFrames;
use App\Services\BrandDna\ContextPackageBuilder;
use Illuminate\Validation\ValidationException;

class ChatContextFrameBuilder implements BuildsChatContextFrames
{
    public function __construct(
        protected ContextPackageBuilder $contextPackageBuilder,
    ) {}

    public function build(ChatSession $session, array $context, ?ChatContextFrame $previousFrame = null): ChatContextFrame
    {
        $brandDna = $this->resolveBrandDna($context);
        $persona = $this->resolvePersona($brandDna, $context);
        $knowledgeEnabled = (bool) ($context['knowledge_enabled'] ?? false);
        $webSearchEnabled = (bool) ($context['web_search_enabled'] ?? false);
        $role = filled($context['role'] ?? null) ? trim((string) $context['role']) : null;

        $systemSnapshot = null;
        $summary = null;

        if ($brandDna) {
            $package = $this->contextPackageBuilder->build(
                $brandDna,
                [],
                $persona,
                false,
                null,
            );

            $systemSnapshot = $package->toPromptString();
            $summary = $package->summary();
        }

        return ChatContextFrame::query()->create([
            'chat_session_id' => $session->id,
            'inherits_from_id' => $previousFrame?->id,
            'brand_dna_id' => $brandDna?->id,
            'brand_dna_persona_id' => $persona?->id,
            'knowledge_enabled' => $knowledgeEnabled,
            'web_search_enabled' => $webSearchEnabled,
            'system_snapshot' => $systemSnapshot,
            'meta' => array_filter([
                'context_summary' => $summary,
                'role' => $role,
            ], fn (mixed $value): bool => $value !== null && $value !== ''),
        ]);
    }

    /**
     * @param  array<string, mixed>  $context
     */
    protected function resolveBrandDna(array $context): ?BrandDna
    {
        $brandDnaId = $context['brand_dna_id'] ?? null;

        if (! $brandDnaId) {
            return null;
        }

        return BrandDna::query()
            ->visibleTo(auth()->user())
            ->with(['niches', 'examples', 'personas'])
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
