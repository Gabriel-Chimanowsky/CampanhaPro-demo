<?php

namespace App\Livewire\BrandDna;

use App\Enums\BrandDnaKnowledgeIngestionStatus;
use App\Models\BrandDna;
use App\Models\Niche;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Title;
use Livewire\Component;
use Livewire\Features\SupportFileUploads\WithFileUploads;

#[Title('Workspace Brand DNA')]
class BrandDnaForm extends Component
{
    use AuthorizesRequests;
    use WithFileUploads;

    public ?BrandDna $brandDna = null;

    public string $activeSection = 'overview';

    public string $saveState = 'idle';

    public string $saveStateMessage = 'Preencha os campos principais para criar o workspace.';

    public string $name = '';

    public string $primaryProduct = '';

    public $primaryLogo = null;

    public $monochromeLogo = null;

    public $iconLogo = null;

    /**
     * @var array<int, string>
     */
    public array $brandColors = ['#111827', '#F97316'];

    public string $defaultTone = 'criativo';

    public string $customTone = '';

    public string $pitchBio = '';

    public string $brandDescription = '';

    public string $competitiveDifferentiators = '';

    /**
     * @var array<int, string>
     */
    public array $targetAgeRanges = [];

    public string $targetGender = 'ambos';

    public string $salesModel = 'ambos';

    public string $defaultLanguage = 'pt-BR';

    /**
     * @var array<int, string>
     */
    public array $niches = [];

    public string $nicheInput = '';

    /**
     * @var array<int, string>
     */
    public array $writingStyles = [];

    public string $writingStyleInput = '';

    /**
     * @var array<int, string>
     */
    public array $frequentTerms = [];

    public string $frequentTermInput = '';

    /**
     * @var array<int, string>
     */
    public array $forbiddenWords = [];

    public string $forbiddenWordInput = '';

    public string $communicationNotes = '';

    public function mount(?BrandDna $brandDna = null): void
    {
        if (! $brandDna) {
            return;
        }

        $this->authorize('update', $brandDna);
        $this->brandDna = $this->freshBrand($brandDna);

        $this->name = $brandDna->name;
        $this->primaryProduct = $brandDna->primary_product;
        $this->brandColors = $brandDna->brand_colors ?? ['#111827'];
        $this->defaultTone = $brandDna->default_tone;
        $this->customTone = $brandDna->custom_tone ?? '';
        $this->pitchBio = $brandDna->pitch_bio;
        $this->brandDescription = $brandDna->brand_description ?? '';
        $this->competitiveDifferentiators = $brandDna->competitive_differentiators ?? '';
        $this->targetAgeRanges = $brandDna->target_age_ranges ?? [];
        $this->targetGender = $brandDna->target_gender ?? 'ambos';
        $this->salesModel = $brandDna->sales_model ?? 'ambos';
        $this->defaultLanguage = $brandDna->default_language;
        $this->niches = $brandDna->niches->pluck('name')->all();
        $this->writingStyles = $brandDna->writing_styles ?? [];
        $this->frequentTerms = $brandDna->frequent_terms ?? [];
        $this->forbiddenWords = $brandDna->forbidden_words ?? [];
        $this->communicationNotes = $brandDna->communication_notes ?? '';
        $this->saveState = 'saved';
        $this->saveStateMessage = 'Workspace carregado.';
    }

    public function updated(string $property): void
    {
        if (! $this->brandDna || ! $this->shouldAutosave($property)) {
            return;
        }

        try {
            $this->persistBrand(false);
        } catch (ValidationException) {
            $this->saveState = 'error';
            $this->saveStateMessage = 'Nao foi possivel salvar automaticamente. Revise os campos destacados.';
        }
    }

    public function goToSection(string $section): void
    {
        if (in_array($section, ['personas', 'knowledge', 'examples'], true) && ! $this->brandDna) {
            if (! $this->hasDraftableContent()) {
                $this->saveState = 'idle';
                $this->saveStateMessage = 'Comece a preencher o Brand DNA antes de liberar personas, conhecimento e exemplos.';
                $this->activeSection = $section;

                return;
            }

            $this->createDraftBrandDna();
        }

        $this->activeSection = $section;
    }

    public function save()
    {
        return $this->persistBrand(true);
    }

    public function addColor(): void
    {
        $this->brandColors[] = '#000000';
    }

    public function removeColor(int $index): void
    {
        if (count($this->brandColors) === 1) {
            return;
        }

        unset($this->brandColors[$index]);
        $this->brandColors = array_values($this->brandColors);
    }

    public function addNiche(): void
    {
        $normalized = $this->normalizeTag($this->nicheInput);

        if ($normalized === null) {
            return;
        }

        $this->niches = $this->mergeUniqueStrings($this->niches, [$normalized]);
        $this->nicheInput = '';
    }

    public function selectNicheSuggestion(string $niche): void
    {
        $this->niches = $this->mergeUniqueStrings($this->niches, [$niche]);
        $this->nicheInput = '';
    }

    public function removeNiche(int $index): void
    {
        unset($this->niches[$index]);
        $this->niches = array_values($this->niches);
    }

    public function addWritingStyle(): void
    {
        $normalized = $this->normalizeTag($this->writingStyleInput);

        if ($normalized === null) {
            return;
        }

        $this->writingStyles = $this->mergeUniqueStrings($this->writingStyles, [$normalized]);
        $this->writingStyleInput = '';
    }

    public function removeWritingStyle(int $index): void
    {
        unset($this->writingStyles[$index]);
        $this->writingStyles = array_values($this->writingStyles);
    }

    public function addFrequentTerm(): void
    {
        $normalized = $this->normalizeTag($this->frequentTermInput);

        if ($normalized === null) {
            return;
        }

        $this->frequentTerms = $this->mergeUniqueStrings($this->frequentTerms, [$normalized]);
        $this->frequentTermInput = '';
    }

    public function removeFrequentTerm(int $index): void
    {
        unset($this->frequentTerms[$index]);
        $this->frequentTerms = array_values($this->frequentTerms);
    }

    public function addForbiddenWord(): void
    {
        $normalized = $this->normalizeTag($this->forbiddenWordInput);

        if ($normalized === null) {
            return;
        }

        $this->forbiddenWords = $this->mergeUniqueStrings($this->forbiddenWords, [$normalized]);
        $this->forbiddenWordInput = '';
    }

    public function removeForbiddenWord(int $index): void
    {
        unset($this->forbiddenWords[$index]);
        $this->forbiddenWords = array_values($this->forbiddenWords);
    }

    public function removeStoredLogo(string $slot): void
    {
        abort_unless($this->brandDna, 404);

        $this->authorize('update', $this->brandDna);

        $column = match ($slot) {
            'primary' => 'primary_logo_path',
            'monochrome' => 'monochrome_logo_path',
            'icon' => 'icon_logo_path',
            default => null,
        };

        abort_if($column === null, 404);

        $path = $this->brandDna->{$column};

        if (filled($path)) {
            Storage::disk('public')->delete($path);
        }

        $this->brandDna->forceFill([$column => null])->save();
        $this->brandDna = $this->freshBrand($this->brandDna);
        $this->saveState = 'saved';
        $this->saveStateMessage = 'Logo removida com sucesso.';
    }

    #[Computed]
    public function toneOptions(): array
    {
        return config('brand_dna.default_tones', []);
    }

    #[Computed]
    public function ageRangeOptions(): array
    {
        return config('brand_dna.age_ranges', []);
    }

    #[Computed]
    public function genderOptions(): array
    {
        return config('brand_dna.genders', []);
    }

    #[Computed]
    public function salesModelOptions(): array
    {
        return config('brand_dna.sales_models', []);
    }

    #[Computed]
    public function languageOptions(): array
    {
        return config('brand_dna.languages', []);
    }

    #[Computed]
    public function presetWritingStyles(): array
    {
        return config('brand_dna.writing_styles', []);
    }

    #[Computed]
    public function nicheSuggestions(): Collection
    {
        if (blank(trim($this->nicheInput))) {
            return collect();
        }

        $selected = collect($this->niches)
            ->map(fn (string $niche): string => Str::lower($niche))
            ->all();

        return Niche::query()
            ->where('name', 'like', '%'.trim($this->nicheInput).'%')
            ->orderBy('name')
            ->limit(6)
            ->get()
            ->pluck('name')
            ->reject(fn (string $name): bool => in_array(Str::lower($name), $selected, true))
            ->values();
    }

    #[Computed]
    public function workspaceBrand(): BrandDna
    {
        $brand = new BrandDna([
            'name' => $this->name,
            'primary_product' => $this->primaryProduct,
            'brand_colors' => $this->brandColors,
            'default_tone' => $this->defaultTone,
            'custom_tone' => $this->customTone,
            'pitch_bio' => $this->pitchBio,
            'brand_description' => $this->brandDescription,
            'competitive_differentiators' => $this->competitiveDifferentiators,
            'target_age_ranges' => $this->targetAgeRanges,
            'target_gender' => $this->targetGender,
            'sales_model' => $this->salesModel,
            'default_language' => $this->defaultLanguage,
            'writing_styles' => $this->writingStyles,
            'frequent_terms' => $this->frequentTerms,
            'forbidden_words' => $this->forbiddenWords,
            'communication_notes' => $this->communicationNotes,
        ]);

        $brand->setRelation('niches', collect($this->niches)->map(fn (string $name): Niche => new Niche(['name' => $name])));

        if ($this->brandDna) {
            $brand->setRelation('personas', $this->brandDna->personas);
            $brand->setRelation('examples', $this->brandDna->examples);
            $brand->setRelation('knowledgeDocuments', $this->brandDna->knowledgeDocuments);
            $brand->setRelation('generations', $this->brandDna->generations);
            $brand->forceFill([
                'personas_count' => $this->brandDna->personas->count(),
                'examples_count' => $this->brandDna->examples->count(),
                'ready_knowledge_documents_count' => $this->brandDna->knowledgeDocuments->where('ingestion_status', BrandDnaKnowledgeIngestionStatus::Ready)->count(),
            ]);
        } else {
            $brand->setRelation('personas', collect());
            $brand->setRelation('examples', collect());
            $brand->setRelation('knowledgeDocuments', collect());
            $brand->setRelation('generations', collect());
            $brand->forceFill([
                'personas_count' => 0,
                'examples_count' => 0,
                'ready_knowledge_documents_count' => 0,
            ]);
        }

        return $brand;
    }

    #[Computed]
    public function workspaceSections(): array
    {
        return [
            $this->sectionSummary('overview', 'Visao geral', 100, 'Resumo e progresso geral do treinamento'),
            $this->sectionSummary('basic', 'Informacoes basicas', $this->workspaceBrand->sectionProgress('basic'), 'Identidade, logos, paleta e contexto central'),
            $this->sectionSummary('communication', 'Comunicacao', $this->workspaceBrand->sectionProgress('communication'), 'Tom, estilos, termos e preview em tempo real'),
            $this->sectionSummary('personas', 'Personas', $this->workspaceBrand->sectionProgress('personas'), 'Publicos, objecoes e resultados desejados'),
            $this->sectionSummary('knowledge', 'Base de conhecimento', $this->workspaceBrand->sectionProgress('knowledge'), 'Documentos, sites, videos e textos ingeridos'),
            $this->sectionSummary('examples', 'Exemplos', $this->workspaceBrand->sectionProgress('examples'), 'Few-shot, formato e acabamento desejado'),
        ];
    }

    #[Computed]
    public function recentGenerations()
    {
        if (! $this->brandDna) {
            return collect();
        }

        return $this->brandDna->generations()
            ->with(['user', 'template', 'brandDnaPersona'])
            ->latest('created_at')
            ->limit(6)
            ->get();
    }

    protected function persistBrand(bool $allowRedirect)
    {
        $this->saveState = 'saving';
        $this->saveStateMessage = 'Salvando alteracoes...';

        $this->brandColors = $this->normalizeColors($this->brandColors);
        $this->niches = $this->mergeUniqueStrings($this->niches);
        $this->writingStyles = $this->mergeUniqueStrings($this->writingStyles);
        $this->frequentTerms = $this->mergeUniqueStrings($this->frequentTerms);
        $this->forbiddenWords = $this->mergeUniqueStrings($this->forbiddenWords);
        $this->customTone = trim($this->customTone);
        $this->brandDescription = trim($this->brandDescription);
        $this->competitiveDifferentiators = trim($this->competitiveDifferentiators);
        $this->communicationNotes = trim($this->communicationNotes);

        $validated = $this->validate($this->rules(), $this->messages(), $this->validationAttributes());

        $isNew = ! $this->brandDna;
        $brandDna = $this->brandDna ?? new BrandDna;

        if ($this->brandDna) {
            $this->authorize('update', $this->brandDna);
        }

        $brandDna->user()->associate(auth()->user());
        $brandDna->fill([
            'name' => $validated['name'],
            'primary_product' => $validated['primaryProduct'],
            'brand_colors' => $validated['brandColors'],
            'default_tone' => $validated['defaultTone'],
            'custom_tone' => $validated['customTone'] ?: null,
            'pitch_bio' => $validated['pitchBio'],
            'brand_description' => $validated['brandDescription'] ?: null,
            'competitive_differentiators' => $validated['competitiveDifferentiators'] ?: null,
            'target_age_ranges' => $validated['targetAgeRanges'] ?: [],
            'target_gender' => $validated['targetGender'] ?: null,
            'sales_model' => $validated['salesModel'] ?: null,
            'default_language' => $validated['defaultLanguage'],
            'writing_styles' => $validated['writingStyles'] ?: [],
            'frequent_terms' => $validated['frequentTerms'] ?: [],
            'forbidden_words' => $validated['forbiddenWords'] ?: [],
            'communication_notes' => $validated['communicationNotes'] ?: null,
        ]);
        $brandDna->save();

        $logoUpdates = [
            'primary_logo_path' => $this->storeLogo($this->primaryLogo, $brandDna, 'primary', $brandDna->primary_logo_path),
            'monochrome_logo_path' => $this->storeLogo($this->monochromeLogo, $brandDna, 'mono', $brandDna->monochrome_logo_path),
            'icon_logo_path' => $this->storeLogo($this->iconLogo, $brandDna, 'icon', $brandDna->icon_logo_path),
        ];

        $brandDna->forceFill(array_filter($logoUpdates, fn ($value): bool => $value !== false))->save();

        $brandDna->niches()->sync(
            collect($this->niches)
                ->map(fn (string $name): int => Niche::query()->firstOrCreate(
                    ['slug' => Str::slug($name)],
                    ['name' => $name],
                )->id)
                ->all(),
        );

        $this->brandDna = $this->freshBrand($brandDna);
        $this->primaryLogo = null;
        $this->monochromeLogo = null;
        $this->iconLogo = null;
        $this->saveState = 'saved';
        $this->saveStateMessage = $isNew
            ? 'Workspace criado. Agora voce pode treinar personas, base de conhecimento e exemplos.'
            : 'Alteracoes salvas.';

        if ($allowRedirect && $isNew) {
            return $this->redirectRoute('brands.edit', ['brandDna' => $this->brandDna], navigate: true);
        }

        return null;
    }

    protected function createDraftBrandDna(): void
    {
        if ($this->brandDna) {
            return;
        }

        $draft = new BrandDna;
        $draft->user()->associate(auth()->user());
        $draft->fill($this->draftPayloadFromState());
        $draft->save();

        $this->brandDna = $this->freshBrand($draft);
        $this->name = $draft->name;
        $this->primaryProduct = $draft->primary_product;
        $this->pitchBio = $draft->pitch_bio;
        $this->brandColors = $draft->brand_colors ?? ['#111827'];
        $this->defaultTone = $draft->default_tone;
        $this->defaultLanguage = $draft->default_language;
        $this->targetGender = $draft->target_gender;
        $this->salesModel = $draft->sales_model;
        $this->saveState = 'saved';
        $this->saveStateMessage = 'Rascunho criado automaticamente para liberar personas, conhecimento e exemplos.';
    }

    protected function hasDraftableContent(): bool
    {
        if (filled(trim($this->name))) {
            return true;
        }

        if (filled(trim($this->primaryProduct))) {
            return true;
        }

        if (filled(trim($this->pitchBio))) {
            return true;
        }

        if (filled(trim($this->customTone))) {
            return true;
        }

        if (filled(trim($this->brandDescription))) {
            return true;
        }

        if (filled(trim($this->competitiveDifferentiators))) {
            return true;
        }

        if (filled(trim($this->communicationNotes))) {
            return true;
        }

        if ($this->targetAgeRanges !== []) {
            return true;
        }

        if ($this->niches !== []) {
            return true;
        }

        if ($this->writingStyles !== []) {
            return true;
        }

        if ($this->frequentTerms !== []) {
            return true;
        }

        if ($this->forbiddenWords !== []) {
            return true;
        }

        if ($this->primaryLogo !== null || $this->monochromeLogo !== null || $this->iconLogo !== null) {
            return true;
        }

        if ($this->normalizeColors($this->brandColors) !== ['#111827', '#F97316']) {
            return true;
        }

        if ($this->defaultTone !== 'criativo') {
            return true;
        }

        if ($this->targetGender !== 'ambos') {
            return true;
        }

        if ($this->salesModel !== 'ambos') {
            return true;
        }

        return $this->defaultLanguage !== 'pt-BR';
    }

    /**
     * @return array<string, mixed>
     */
    protected function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'primaryProduct' => ['required', 'string', 'max:120'],
            'primaryLogo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,svg', 'max:2048'],
            'monochromeLogo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,svg', 'max:2048'],
            'iconLogo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,svg', 'max:2048'],
            'brandColors' => ['required', 'array', 'min:1'],
            'brandColors.*' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'defaultTone' => ['required', 'string', Rule::in(config('brand_dna.default_tones', []))],
            'customTone' => ['nullable', 'string', 'max:120'],
            'pitchBio' => ['required', 'string', 'max:1000'],
            'brandDescription' => ['nullable', 'string'],
            'competitiveDifferentiators' => ['nullable', 'string'],
            'targetAgeRanges' => ['nullable', 'array'],
            'targetAgeRanges.*' => ['required', 'string', Rule::in(config('brand_dna.age_ranges', []))],
            'targetGender' => ['nullable', 'string', Rule::in(config('brand_dna.genders', []))],
            'salesModel' => ['nullable', 'string', Rule::in(config('brand_dna.sales_models', []))],
            'defaultLanguage' => ['required', 'string', Rule::in(array_keys(config('brand_dna.languages', [])))],
            'niches' => ['nullable', 'array'],
            'niches.*' => ['required', 'string', 'max:120'],
            'writingStyles' => ['nullable', 'array'],
            'writingStyles.*' => ['required', 'string', 'max:120'],
            'frequentTerms' => ['nullable', 'array'],
            'frequentTerms.*' => ['required', 'string', 'max:120'],
            'forbiddenWords' => ['nullable', 'array'],
            'forbiddenWords.*' => ['required', 'string', 'max:120'],
            'communicationNotes' => ['nullable', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function messages(): array
    {
        return [
            'brandColors.*.regex' => 'Cada cor precisa estar em hexadecimal com 6 digitos.',
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function validationAttributes(): array
    {
        return [
            'name' => 'nome da marca',
            'primaryProduct' => 'principal produto',
            'pitchBio' => 'pitch ou bio',
            'brandDescription' => 'descricao da marca',
            'competitiveDifferentiators' => 'diferenciais competitivos',
            'defaultTone' => 'tom de voz',
            'targetAgeRanges' => 'faixa etaria',
            'targetGender' => 'genero',
            'salesModel' => 'modelo de venda',
            'defaultLanguage' => 'idioma padrao',
            'writingStyles' => 'estilos de escrita',
            'frequentTerms' => 'termos frequentes',
            'forbiddenWords' => 'palavras proibidas',
            'communicationNotes' => 'notas de comunicacao',
        ];
    }

    protected function freshBrand(BrandDna $brandDna): BrandDna
    {
        return $brandDna->fresh([
            'user',
            'niches',
            'personas',
            'examples',
            'knowledgeDocuments',
        ])->loadCount([
            'personas',
            'examples',
            'knowledgeDocuments as ready_knowledge_documents_count' => fn ($query) => $query->ready(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function draftPayloadFromState(): array
    {
        $defaultTone = in_array($this->defaultTone, config('brand_dna.default_tones', []), true)
            ? $this->defaultTone
            : 'criativo';

        $defaultLanguage = array_key_exists($this->defaultLanguage, config('brand_dna.languages', []))
            ? $this->defaultLanguage
            : 'pt-BR';

        $targetGender = in_array($this->targetGender, config('brand_dna.genders', []), true)
            ? $this->targetGender
            : 'ambos';

        $salesModel = in_array($this->salesModel, config('brand_dna.sales_models', []), true)
            ? $this->salesModel
            : 'ambos';

        $brandColors = $this->normalizeColors($this->brandColors);

        if ($brandColors === []) {
            $brandColors = ['#111827'];
        }

        return [
            'name' => filled(trim($this->name)) ? trim($this->name) : 'Novo Brand DNA',
            'primary_product' => filled(trim($this->primaryProduct)) ? trim($this->primaryProduct) : 'Oferta principal',
            'brand_colors' => $brandColors,
            'default_tone' => $defaultTone,
            'custom_tone' => filled(trim($this->customTone)) ? trim($this->customTone) : null,
            'pitch_bio' => filled(trim($this->pitchBio)) ? trim($this->pitchBio) : 'Rascunho inicial do contexto da marca.',
            'brand_description' => filled(trim($this->brandDescription)) ? trim($this->brandDescription) : null,
            'competitive_differentiators' => filled(trim($this->competitiveDifferentiators)) ? trim($this->competitiveDifferentiators) : null,
            'target_age_ranges' => $this->targetAgeRanges,
            'target_gender' => $targetGender,
            'sales_model' => $salesModel,
            'default_language' => $defaultLanguage,
            'writing_styles' => $this->writingStyles,
            'frequent_terms' => $this->frequentTerms,
            'forbidden_words' => $this->forbiddenWords,
            'communication_notes' => filled(trim($this->communicationNotes)) ? trim($this->communicationNotes) : null,
        ];
    }

    protected function shouldAutosave(string $property): bool
    {
        if (in_array($property, ['activeSection', 'nicheInput', 'writingStyleInput', 'frequentTermInput', 'forbiddenWordInput'], true)) {
            return false;
        }

        if (Str::startsWith($property, ['primaryLogo', 'monochromeLogo', 'iconLogo'])) {
            return false;
        }

        return Str::startsWith($property, [
            'name',
            'primaryProduct',
            'brandColors',
            'defaultTone',
            'customTone',
            'pitchBio',
            'brandDescription',
            'competitiveDifferentiators',
            'targetAgeRanges',
            'targetGender',
            'salesModel',
            'defaultLanguage',
            'niches',
            'writingStyles',
            'frequentTerms',
            'forbiddenWords',
            'communicationNotes',
        ]);
    }

    protected function storeLogo(mixed $upload, BrandDna $brandDna, string $prefix, ?string $currentPath): string|false|null
    {
        if ($upload === null) {
            return false;
        }

        if ($currentPath) {
            Storage::disk('public')->delete($currentPath);
        }

        return $upload->storeAs(
            'brand-dna/logos/'.$brandDna->user_id,
            $prefix.'-'.$brandDna->id.'-'.Str::uuid().'.'.$upload->getClientOriginalExtension(),
            'public',
        );
    }

    /**
     * @param  array<int, string>  $colors
     * @return array<int, string>
     */
    protected function normalizeColors(array $colors): array
    {
        return array_values(
            collect($colors)
                ->map(fn (string $color): string => '#'.strtoupper(ltrim(trim($color), '#')))
                ->filter(fn (string $color): bool => $color !== '#')
                ->unique()
                ->all(),
        );
    }

    /**
     * @param  array<int, string>  $base
     * @param  array<int, string>  $incoming
     * @return array<int, string>
     */
    protected function mergeUniqueStrings(array $base, array $incoming = []): array
    {
        return collect([...$base, ...$incoming])
            ->map(fn (string $value) => $this->normalizeTag($value))
            ->filter()
            ->unique(fn (string $value): string => Str::lower($value))
            ->values()
            ->all();
    }

    protected function normalizeTag(string $value): ?string
    {
        $value = trim($value);

        return $value === '' ? null : Str::squish($value);
    }

    /**
     * @return array<string, mixed>
     */
    protected function sectionSummary(string $key, string $label, int $progress, string $hint): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'progress' => $progress,
            'hint' => $hint,
            'status' => match (true) {
                $progress >= 100 => 'completo',
                $progress >= 45 => 'em progresso',
                default => 'vazio',
            },
        ];
    }

    public function render()
    {
        return view('livewire.brand-dna.form');
    }
}
