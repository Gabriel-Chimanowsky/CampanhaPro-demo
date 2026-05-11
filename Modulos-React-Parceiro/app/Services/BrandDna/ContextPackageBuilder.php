<?php

namespace App\Services\BrandDna;

use App\Data\BrandDna\BrandContextPackage;
use App\Models\AiTemplate;
use App\Models\BrandDna;
use App\Models\BrandDnaExample;
use App\Models\BrandDnaPersona;
use App\Services\BrandDna\KnowledgeBase\BrandKnowledgeSearch;
use Illuminate\Support\Collection;

class ContextPackageBuilder
{
    public function __construct(
        protected BrandKnowledgeSearch $knowledgeSearch,
    ) {}

    /**
     * @param  array<string, mixed>  $input
     */
    public function build(
        BrandDna $brandDna,
        array $input,
        ?BrandDnaPersona $persona = null,
        bool $useKnowledgeBase = false,
        ?AiTemplate $template = null,
    ): BrandContextPackage {
        $examples = $this->relevantExamples($brandDna, $template);
        $knowledgeChunks = $useKnowledgeBase
            ? $this->knowledgeSearch->search($brandDna, $this->inputToQuery($input))
            : collect();

        return new BrandContextPackage(
            identity: array_filter([
                'marca' => $brandDna->name,
                'oferta_principal' => $brandDna->primary_product,
                'pitch_bio' => $brandDna->pitch_bio,
                'descricao' => (string) $brandDna->brand_description,
                'diferenciais' => (string) $brandDna->competitive_differentiators,
                'idioma' => $brandDna->default_language,
                'paleta' => $brandDna->paletteSummary(),
                'nichos' => $brandDna->nicheSummary(),
            ]),
            communication: array_filter([
                'tone' => $brandDna->resolvedTone(),
                'writing_styles' => collect($brandDna->writing_styles)->filter()->implode(', '),
                'frequent_terms' => collect($brandDna->frequent_terms)->filter()->implode(', '),
                'forbidden_words' => collect($brandDna->forbidden_words)->filter()->implode(', '),
                'notes' => (string) $brandDna->communication_notes,
            ]),
            persona: $persona,
            examples: $examples,
            knowledgeChunks: $knowledgeChunks,
            knowledgeEnabled: $useKnowledgeBase,
        );
    }

    /**
     * @param  array<string, mixed>  $input
     */
    protected function inputToQuery(array $input): string
    {
        return collect($input)
            ->flatten(1)
            ->filter(fn (mixed $value): bool => is_scalar($value) && filled($value))
            ->implode(' ');
    }

    /**
     * @return Collection<int, BrandDnaExample>
     */
    protected function relevantExamples(BrandDna $brandDna, ?AiTemplate $template): Collection
    {
        return $brandDna->examples()
            ->when(
                $template?->type,
                fn ($query) => $query->orderByRaw(
                    'case when content_type = ? then 0 when content_type is null then 1 else 2 end',
                    [$template->type->value],
                ),
            )
            ->limit(3)
            ->get();
    }
}
