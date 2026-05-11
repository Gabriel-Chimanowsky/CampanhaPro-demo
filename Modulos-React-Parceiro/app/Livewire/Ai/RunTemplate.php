<?php

namespace App\Livewire\Ai;

use App\Actions\AI\GenerateFromTemplate;
use App\Enums\AiGenerationStatus;
use App\Enums\AiTemplateType;
use App\Models\AiGeneration;
use App\Models\AiTemplate;
use App\Models\BrandDna;
use App\Models\BrandDnaPersona;
use App\Models\ContentItem;
use App\Models\GuidedBrief;
use App\Services\AI\BriefToTemplateInputMapper;
use App\Services\AI\ContentItemFactory;
use App\Services\AI\GuidedBriefResolver;
use App\Services\AI\ProviderManager;
use App\Services\AI\RunContextMemory;
use App\Services\AI\RunContextResolver;
use App\Services\AI\Support\InputSchemaRules;
use App\Services\AI\VariationPlanBuilder;
use App\Services\BrandDna\TemplatePrefillResolver;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Title('Executar Template AI')]
class RunTemplate extends Component
{
    public AiTemplate $template;

    /**
     * @var array<string, mixed>
     */
    public array $inputs = [];

    /**
     * @var array<string, mixed>
     */
    public array $briefAnswers = [];

    public ?AiGeneration $generation = null;

    public ?string $friendlyError = null;

    public ?string $contextNotice = null;

    public ?int $sourceGenerationId = null;

    public ?int $sourceBriefId = null;

    public string $selectedProvider = '';

    public string $selectedModel = '';

    public bool $useBrandDna = false;

    public ?int $selectedBrandDnaId = null;

    public ?int $selectedBrandPersonaId = null;

    public bool $useKnowledgeBase = false;

    public string $brandSearch = '';

    public bool $advancedMode = false;

    public int $resultCount = 1;

    /**
     * @var array<int, int>
     */
    public array $generatedContentItemIds = [];

    public function mount(
        AiTemplate $template,
        RunContextResolver $contextResolver,
        TemplatePrefillResolver $prefillResolver,
    ): void {
        abort_unless($template->is_active, 404);

        $this->template = $template;
        $this->sourceGenerationId = request()->integer('source_generation_id') ?: null;
        $this->sourceBriefId = request()->integer('source_brief_id') ?: null;

        try {
            $context = $contextResolver->resolve(auth()->user(), $template, $this->sourceGenerationId);

            $this->selectedProvider = $context['provider'];
            $this->selectedModel = $context['model'];
            $this->useBrandDna = (bool) $context['use_brand_dna'];
            $this->selectedBrandDnaId = $context['brand_dna_id'];
            $this->selectedBrandPersonaId = $context['brand_dna_persona_id'];
            $this->useKnowledgeBase = (bool) $context['use_knowledge_base'];
            $this->sourceGenerationId = $context['source_generation_id'];
            $this->inputs = $context['input_payload'] ?? [];
            $this->brandSearch = (string) ($context['brand_dna_name'] ?? '');
            $this->contextNotice = $context['notice'];

            $selectedBrandDna = $this->selectedBrandDna();

            if ($this->useBrandDna && $selectedBrandDna) {
                $this->applyBrandDnaPrefill($prefillResolver, $selectedBrandDna, false);
            }

            $sourceBrief = $this->resolveReusableBrief();

            if ($sourceBrief) {
                $this->applyReusableBrief($sourceBrief);
            } else {
                $this->fillMissingBriefAnswers();
            }
        } catch (ValidationException $exception) {
            $this->friendlyError = collect($exception->errors())->flatten()->first();
        }
    }

    public function updatedSelectedProvider(ProviderManager $providerManager): void
    {
        $models = $providerManager->modelsFor($this->selectedProvider, $this->templateType());

        if ($models === []) {
            $this->selectedModel = '';

            return;
        }

        if (! collect($models)->pluck('id')->contains($this->selectedModel)) {
            $this->selectedModel = (string) collect($models)->pluck('id')->first();
        }
    }

    public function updatedUseBrandDna(bool $value): void
    {
        if ($value) {
            return;
        }

        $this->selectedBrandDnaId = null;
        $this->selectedBrandPersonaId = null;
        $this->useKnowledgeBase = false;
        $this->brandSearch = '';
        $this->resetValidation('selectedBrandDnaId');
    }

    public function selectBrandDna(int $brandDnaId): void
    {
        $brandDna = BrandDna::query()
            ->visibleTo(auth()->user())
            ->with(['niches', 'user'])
            ->withCount([
                'knowledgeDocuments as ready_knowledge_documents_count' => fn ($query) => $query->ready(),
            ])
            ->findOrFail($brandDnaId);

        $this->useBrandDna = true;
        $this->selectedBrandDnaId = $brandDna->id;
        $this->selectedBrandPersonaId = null;
        $this->useKnowledgeBase = false;
        $this->brandSearch = $brandDna->name;
        $this->applyBrandDnaPrefill(app(TemplatePrefillResolver::class), $brandDna, false);
        $this->fillMissingBriefAnswers($brandDna);
        $this->resetValidation('selectedBrandDnaId');
    }

    public function applySelectedBrandPrefill(bool $overwrite = false): void
    {
        $selectedBrandDna = $this->selectedBrandDna();

        if (! $selectedBrandDna) {
            return;
        }

        $this->applyBrandDnaPrefill(app(TemplatePrefillResolver::class), $selectedBrandDna, $overwrite);
        $this->fillMissingBriefAnswers($selectedBrandDna);
    }

    public function clearBrandDna(): void
    {
        $this->selectedBrandDnaId = null;
        $this->selectedBrandPersonaId = null;
        $this->useKnowledgeBase = false;
        $this->brandSearch = '';
        $this->resetValidation('selectedBrandDnaId');
    }

    public function updatedBriefAnswers(): void
    {
        $this->inputs = app(BriefToTemplateInputMapper::class)->map($this->template, $this->briefAnswers, $this->inputs);
    }

    public function generate(
        GenerateFromTemplate $generateFromTemplate,
        InputSchemaRules $inputSchemaRules,
        RunContextMemory $contextMemory,
        GuidedBriefResolver $briefResolver,
        BriefToTemplateInputMapper $inputMapper,
        ContentItemFactory $contentItemFactory,
        VariationPlanBuilder $variationPlanBuilder,
    ): void {
        $this->resetErrorBag();
        $this->friendlyError = null;
        $this->generatedContentItemIds = [];

        $validatedResultCount = Validator::make(
            ['resultCount' => $this->resultCount],
            ['resultCount' => ['required', 'integer', 'min:1', 'max:5']],
            attributes: ['resultCount' => 'resultados'],
        )->validate();

        $resultCount = (int) $validatedResultCount['resultCount'];
        $this->resultCount = $resultCount;

        $brandDna = null;

        if ($this->useBrandDna) {
            $brandDna = BrandDna::query()
                ->visibleTo(auth()->user())
                ->with(['niches', 'personas'])
                ->withCount([
                    'knowledgeDocuments as ready_knowledge_documents_count' => fn ($query) => $query->ready(),
                ])
                ->find($this->selectedBrandDnaId);

            if (! $brandDna) {
                $this->addError('selectedBrandDnaId', 'Selecione uma Brand DNA para continuar ou desligue a opcao.');

                return;
            }
        }

        $persona = null;

        if ($brandDna && $this->selectedBrandPersonaId) {
            $persona = BrandDnaPersona::query()
                ->where('brand_dna_id', $brandDna->id)
                ->find($this->selectedBrandPersonaId);

            if (! $persona) {
                $this->addError('selectedBrandPersonaId', 'Selecione uma persona valida para esta Brand DNA.');

                return;
            }
        }

        $answers = $briefResolver->normalizeAnswers($this->template, $this->briefAnswers, $this->inputs, $brandDna);
        $this->briefAnswers = $answers;
        $this->inputs = $inputMapper->map($this->template, $answers, $this->inputs);

        $validated = Validator::make(
            $this->inputs,
            $inputSchemaRules->build($this->template->input_schema ?? []),
            attributes: $inputSchemaRules->attributes($this->template->input_schema ?? []),
        )->validate();

        $brief = GuidedBrief::query()->create([
            'user_id' => auth()->id(),
            'ai_template_id' => $this->template->id,
            'source_guided_brief_id' => $this->sourceBriefId,
            'brand_dna_id' => $brandDna?->id,
            'brand_dna_persona_id' => $persona?->id,
            'answers' => [
                ...$answers,
                'result_count' => $resultCount,
            ],
            'input_payload' => $validated,
            'summary' => $briefResolver->summary($answers),
            'completed_at' => now(),
        ]);

        $knowledgeBaseEnabled = $this->useKnowledgeBase
            && (int) data_get($brandDna, 'ready_knowledge_documents_count', 0) > 0;
        $sourceGeneration = $this->sourceGenerationId
            ? AiGeneration::query()
                ->ownedBy(auth()->user())
                ->where('ai_template_id', $this->template->id)
                ->find($this->sourceGenerationId)
            : null;

        foreach ($variationPlanBuilder->build($resultCount) as $plan) {
            $generation = $generateFromTemplate->handle(
                auth()->user(),
                $this->template,
                $validated,
                $this->selectedProvider,
                $this->selectedModel,
                $brandDna,
                $persona,
                $knowledgeBaseEnabled,
                $sourceGeneration,
                $brief,
                $resultCount > 1 ? $plan['direction'] : null,
            );

            $this->generation = $generation;

            if ($generation->getAttribute('status') === AiGenerationStatus::Failed) {
                $this->friendlyError = $generation->error_message;

                return;
            }

            $contextMemory->rememberSuccessfulGeneration($generation, $knowledgeBaseEnabled);
            $contentItem = $contentItemFactory->createFromGeneration($generation, $brief, [
                'result_count' => $resultCount,
                'result_index' => $plan['index'],
                'variation_direction' => $plan['direction'],
            ]);

            if ($contentItem instanceof ContentItem) {
                $this->generatedContentItemIds[] = $contentItem->id;
            }
        }
    }

    /**
     * @return array<int, array{key: string, label: string, models: array<int, array{id: string, label: string}>}>
     */
    #[Computed]
    public function providerOptions(): array
    {
        return app(ProviderManager::class)->providersFor($this->templateType());
    }

    /**
     * @return array<int, array{id: string, label: string}>
     */
    #[Computed]
    public function modelOptions(): array
    {
        return app(ProviderManager::class)->modelsFor($this->selectedProvider, $this->templateType());
    }

    #[Computed]
    public function latestGeneration(): ?AiGeneration
    {
        return AiGeneration::query()
            ->ownedBy(auth()->user())
            ->with(['brandDna', 'brandDnaPersona'])
            ->where('ai_template_id', $this->template->id)
            ->latestFirst()
            ->first();
    }

    /**
     * @return Collection<int, ContentItem>
     */
    #[Computed]
    public function generatedContentItems(): Collection
    {
        if ($this->generatedContentItemIds === []) {
            return new Collection;
        }

        $positions = array_flip($this->generatedContentItemIds);

        return ContentItem::query()
            ->ownedBy(auth()->user())
            ->with(['template', 'brandDna', 'generation'])
            ->whereIn('id', $this->generatedContentItemIds)
            ->get()
            ->sortBy(fn (ContentItem $item): int => $positions[$item->id] ?? PHP_INT_MAX)
            ->values();
    }

    /**
     * @return Collection<int, BrandDna>
     */
    #[Computed]
    public function brandOptions(): Collection
    {
        return BrandDna::query()
            ->visibleTo(auth()->user())
            ->with('user')
            ->when(
                filled($this->brandSearch),
                fn ($query) => $query->where('name', 'like', '%'.$this->brandSearch.'%'),
            )
            ->orderBy('name')
            ->limit(8)
            ->get();
    }

    #[Computed]
    public function selectedBrandDna(): ?BrandDna
    {
        if (! $this->selectedBrandDnaId) {
            return null;
        }

        return BrandDna::query()
            ->visibleTo(auth()->user())
            ->with(['niches', 'personas', 'user'])
            ->withCount([
                'knowledgeDocuments as ready_knowledge_documents_count' => fn ($query) => $query->ready(),
                'examples',
            ])
            ->find($this->selectedBrandDnaId);
    }

    #[Computed]
    public function selectedBrandPersonas(): Collection
    {
        $selectedBrandDna = $this->selectedBrandDna();

        if (! $selectedBrandDna) {
            return new Collection;
        }

        return $selectedBrandDna->personas;
    }

    #[Computed]
    public function brandContextSummary(): ?string
    {
        $selectedBrandDna = $this->selectedBrandDna();

        if (! $selectedBrandDna) {
            return null;
        }

        return trim(collect([
            $selectedBrandDna->communicationSummary(),
            $selectedBrandDna->previewDescription(),
        ])->filter()->implode(' '));
    }

    /**
     * @return array<int, array{key: string, label: string, required: bool, type: string, placeholder: string}>
     */
    #[Computed]
    public function briefQuestions(): array
    {
        return app(GuidedBriefResolver::class)->questions();
    }

    #[Computed]
    public function briefSummary(): string
    {
        return app(GuidedBriefResolver::class)->summary($this->briefAnswers);
    }

    protected function applyBrandDnaPrefill(TemplatePrefillResolver $prefillResolver, BrandDna $brandDna, bool $overwrite): void
    {
        $this->inputs = [
            ...$this->inputs,
            ...$prefillResolver->forTemplate($this->template, $brandDna, $this->inputs, $overwrite),
        ];
    }

    protected function resolveReusableBrief(): ?GuidedBrief
    {
        if ($this->sourceBriefId) {
            $brief = GuidedBrief::query()
                ->ownedBy(auth()->user())
                ->where('ai_template_id', $this->template->id)
                ->find($this->sourceBriefId);

            return $brief instanceof GuidedBrief ? $brief : null;
        }

        if (! $this->sourceGenerationId) {
            return null;
        }

        $generation = AiGeneration::query()
            ->ownedBy(auth()->user())
            ->where('ai_template_id', $this->template->id)
            ->with('guidedBrief')
            ->find($this->sourceGenerationId);

        if (! $generation instanceof AiGeneration) {
            return null;
        }

        return $generation->guidedBrief instanceof GuidedBrief ? $generation->guidedBrief : null;
    }

    protected function applyReusableBrief(GuidedBrief $brief): void
    {
        $this->sourceBriefId = $brief->id;
        $this->briefAnswers = $brief->answers ?? [];
        $this->inputs = $brief->input_payload ?? $this->inputs;

        if ($brief->brand_dna_id) {
            $this->useBrandDna = true;
            $this->selectedBrandDnaId = $brief->brand_dna_id;
            $this->selectedBrandPersonaId = $brief->brand_dna_persona_id;
            $briefBrandDna = $brief->getRelationValue('brandDna');
            $this->brandSearch = $briefBrandDna instanceof BrandDna
                ? $briefBrandDna->name
                : $this->brandSearch;
        }

        $this->contextNotice = $this->contextNotice
            ?: 'Briefing reutilizado como base. Ajuste as respostas antes de gerar.';
    }

    protected function fillMissingBriefAnswers(?BrandDna $brandDna = null): void
    {
        $defaults = app(GuidedBriefResolver::class)->initialAnswers(
            $this->template,
            $this->inputs,
            $brandDna ?: $this->selectedBrandDna(),
        );

        foreach ($defaults as $key => $value) {
            if (blank($this->briefAnswers[$key] ?? null) && filled($value)) {
                $this->briefAnswers[$key] = $value;
            }
        }
    }

    public function render()
    {
        return view('livewire.ai.run-template');
    }

    protected function templateType(): AiTemplateType
    {
        $type = $this->template->getAttribute('type');

        return $type instanceof AiTemplateType ? $type : AiTemplateType::from((string) $type);
    }
}
