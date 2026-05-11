<?php

namespace App\Models;

use App\Enums\BrandDnaKnowledgeIngestionStatus;
use Database\Factories\BrandDnaFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Facades\Storage;

class BrandDna extends Model
{
    /** @use HasFactory<BrandDnaFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'primary_product',
        'primary_logo_path',
        'monochrome_logo_path',
        'icon_logo_path',
        'brand_colors',
        'default_tone',
        'custom_tone',
        'pitch_bio',
        'brand_description',
        'competitive_differentiators',
        'target_age_ranges',
        'target_gender',
        'sales_model',
        'default_language',
        'writing_styles',
        'frequent_terms',
        'forbidden_words',
        'communication_notes',
    ];

    protected function casts(): array
    {
        return [
            'brand_colors' => 'array',
            'target_age_ranges' => 'array',
            'writing_styles' => 'array',
            'frequent_terms' => 'array',
            'forbidden_words' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function niches(): BelongsToMany
    {
        return $this->belongsToMany(Niche::class)->withTimestamps()->orderBy('name');
    }

    public function generations(): HasMany
    {
        return $this->hasMany(AiGeneration::class);
    }

    public function guidedBriefs(): HasMany
    {
        return $this->hasMany(GuidedBrief::class);
    }

    public function contentItems(): HasMany
    {
        return $this->hasMany(ContentItem::class);
    }

    public function personas(): HasMany
    {
        return $this->hasMany(BrandDnaPersona::class)->orderBy('label');
    }

    public function knowledgeDocuments(): HasMany
    {
        return $this->hasMany(BrandDnaKnowledgeDocument::class)->latest('updated_at');
    }

    public function knowledgeChunks(): HasManyThrough
    {
        return $this->hasManyThrough(
            BrandDnaKnowledgeChunk::class,
            BrandDnaKnowledgeDocument::class,
            'brand_dna_id',
            'brand_dna_knowledge_document_id',
        );
    }

    public function examples(): HasMany
    {
        return $this->hasMany(BrandDnaExample::class)->latest('updated_at');
    }

    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->where('user_id', $user->id);
    }

    public function scopeVisibleTo(Builder $query, ?User $user): Builder
    {
        return $user ? $query : $query->whereRaw('1 = 0');
    }

    public function resolvedTone(): string
    {
        return $this->custom_tone ?: $this->default_tone;
    }

    public function audienceSummary(): string
    {
        $ranges = collect($this->target_age_ranges)->filter()->implode(', ');

        return trim(collect([
            $ranges !== '' ? 'Faixas '.$ranges : null,
            filled($this->target_gender) ? 'Genero '.$this->target_gender : null,
        ])->filter()->implode(' | '));
    }

    public function nicheSummary(): string
    {
        return $this->relationLoaded('niches')
            ? $this->niches->pluck('name')->implode(', ')
            : $this->niches()->pluck('name')->implode(', ');
    }

    public function frequentTermsSummary(): string
    {
        return collect($this->frequent_terms)->filter()->implode(', ');
    }

    public function paletteSummary(): string
    {
        return collect($this->brand_colors)->filter()->implode(', ');
    }

    public function visualDirectionSummary(): string
    {
        return trim(collect([
            $this->paletteSummary() !== '' ? 'Paleta '.$this->paletteSummary() : null,
            filled($this->resolvedTone()) ? 'Tom '.$this->resolvedTone() : null,
            filled($this->pitch_bio) ? $this->pitch_bio : null,
        ])->filter()->implode('. '));
    }

    public function communicationSummary(): string
    {
        return trim(collect([
            filled($this->resolvedTone()) ? 'Tom principal: '.$this->resolvedTone() : null,
            filled($this->frequentTermsSummary()) ? 'Termos prioritarios: '.$this->frequentTermsSummary() : null,
            filled($this->forbiddenWordsSummary()) ? 'Evitar: '.$this->forbiddenWordsSummary() : null,
            filled($this->writingStylesSummary()) ? 'Estilos: '.$this->writingStylesSummary() : null,
            filled($this->communication_notes) ? $this->communication_notes : null,
        ])->filter()->implode('. '));
    }

    public function identitySummary(): string
    {
        return trim(collect([
            filled($this->primary_product) ? 'Oferta principal: '.$this->primary_product : null,
            filled($this->pitch_bio) ? $this->pitch_bio : null,
            filled($this->brand_description) ? $this->brand_description : null,
            filled($this->competitive_differentiators) ? 'Diferenciais: '.$this->competitive_differentiators : null,
            filled($this->nicheSummary()) ? 'Nichos: '.$this->nicheSummary() : null,
        ])->filter()->implode('. '));
    }

    public function previewDescription(): string
    {
        return trim(collect([
            filled($this->name) ? "{$this->name} atua com {$this->primary_product}." : null,
            filled($this->pitch_bio) ? $this->pitch_bio : null,
            filled($this->brand_description) ? $this->brand_description : null,
            filled($this->communicationSummary()) ? 'A comunicacao prioriza '.$this->communicationSummary() : null,
            $this->readyKnowledgeDocumentsCount() > 0 ? 'A base de conhecimento ja possui materiais prontos para consulta.' : null,
            $this->personasCount() > 0 ? 'Existem personas cadastradas para adaptar a mensagem.' : null,
            $this->examplesCount() > 0 ? 'Ha exemplos salvos para padronizar formato e acabamento.' : null,
        ])->filter()->implode(' '));
    }

    public function sectionProgress(string $section): int
    {
        return match ($section) {
            'basic' => $this->ratioToPercent([
                $this->name,
                $this->primary_product,
                $this->default_language,
                $this->pitch_bio,
                $this->brand_description,
                $this->competitive_differentiators,
                collect($this->brand_colors)->filter()->isNotEmpty(),
                filled($this->nicheSummary()),
            ]),
            'communication' => $this->ratioToPercent([
                $this->default_tone,
                $this->custom_tone,
                collect($this->writing_styles)->filter()->isNotEmpty(),
                collect($this->frequent_terms)->filter()->isNotEmpty(),
                collect($this->forbidden_words)->filter()->isNotEmpty(),
                $this->communication_notes,
            ]),
            'personas' => $this->countToPercent($this->personasCount(), 2),
            'knowledge' => $this->countToPercent($this->readyKnowledgeDocumentsCount(), 3),
            'examples' => $this->countToPercent($this->examplesCount(), 3),
            default => 0,
        };
    }

    public function overallCompletion(): int
    {
        $weightedTotal = (
            ($this->sectionProgress('basic') * 0.2) +
            ($this->sectionProgress('communication') * 0.25) +
            ($this->sectionProgress('personas') * 0.2) +
            ($this->sectionProgress('knowledge') * 0.2) +
            ($this->sectionProgress('examples') * 0.15)
        );

        return (int) round($weightedTotal);
    }

    public function completionLabel(): string
    {
        return match (true) {
            $this->overallCompletion() >= 85 => 'excelente',
            $this->overallCompletion() >= 65 => 'forte',
            $this->overallCompletion() >= 40 => 'bom',
            default => 'inicial',
        };
    }

    /**
     * @return array{section_key: string, title: string, reason: string, impact_copy: string, cta_label: string, priority_score: int}
     */
    public function nextRecommendation(): array
    {
        return match (true) {
            $this->sectionProgress('personas') < 55 => [
                'section_key' => 'personas',
                'title' => 'Definir personas prioritarias',
                'reason' => 'A IA ainda tem pouco contexto sobre publicos, objecoes e resultados desejados.',
                'impact_copy' => 'Melhora a adaptacao das respostas e reduz briefing repetido por audiencia.',
                'cta_label' => 'Adicionar personas',
                'priority_score' => 95,
            ],
            $this->sectionProgress('communication') < 60 => [
                'section_key' => 'communication',
                'title' => 'Refinar voz e repertorio',
                'reason' => 'Tom, estilos, termos prioritarios e palavras proibidas ainda nao guiam a escrita o bastante.',
                'impact_copy' => 'Aumenta consistencia de linguagem nos templates e no chat.',
                'cta_label' => 'Refinar comunicacao',
                'priority_score' => 85,
            ],
            $this->sectionProgress('knowledge') < 60 => [
                'section_key' => 'knowledge',
                'title' => 'Adicionar fontes de conhecimento',
                'reason' => 'A base factual ainda tem poucas fontes prontas para consulta.',
                'impact_copy' => 'Permite respostas ancoradas em materiais reais da marca.',
                'cta_label' => 'Adicionar fontes',
                'priority_score' => 75,
            ],
            $this->sectionProgress('examples') < 60 => [
                'section_key' => 'examples',
                'title' => 'Salvar exemplos ideais',
                'reason' => 'Faltam saidas finais para ensinar formato, ritmo e acabamento.',
                'impact_copy' => 'Ajuda a repetir padroes bons sem reexplicar a cada geracao.',
                'cta_label' => 'Salvar exemplos',
                'priority_score' => 65,
            ],
            default => [
                'section_key' => 'communication',
                'title' => 'Revisar ajustes finos',
                'reason' => 'A base esta consistente; agora vale lapidar voz, repertorio e restricoes.',
                'impact_copy' => 'Mantem a qualidade do contexto conforme a marca evolui.',
                'cta_label' => 'Revisar comunicacao',
                'priority_score' => 40,
            ],
        };
    }

    public function primaryLogoUrl(): ?string
    {
        return $this->logoUrl($this->primary_logo_path);
    }

    public function monochromeLogoUrl(): ?string
    {
        return $this->logoUrl($this->monochrome_logo_path);
    }

    public function iconLogoUrl(): ?string
    {
        return $this->logoUrl($this->icon_logo_path);
    }

    protected function logoUrl(?string $path): ?string
    {
        if (blank($path)) {
            return null;
        }

        return Storage::disk('public')->url($path);
    }

    protected function forbiddenWordsSummary(): string
    {
        return collect($this->forbidden_words)->filter()->implode(', ');
    }

    protected function writingStylesSummary(): string
    {
        return collect($this->writing_styles)->filter()->implode(', ');
    }

    protected function personasCount(): int
    {
        if (array_key_exists('personas_count', $this->attributes)) {
            return (int) $this->attributes['personas_count'];
        }

        if ($this->relationLoaded('personas')) {
            return $this->personas->count();
        }

        return $this->exists ? $this->personas()->count() : 0;
    }

    protected function examplesCount(): int
    {
        if (array_key_exists('examples_count', $this->attributes)) {
            return (int) $this->attributes['examples_count'];
        }

        if ($this->relationLoaded('examples')) {
            return $this->examples->count();
        }

        return $this->exists ? $this->examples()->count() : 0;
    }

    protected function readyKnowledgeDocumentsCount(): int
    {
        if (array_key_exists('ready_knowledge_documents_count', $this->attributes)) {
            return (int) $this->attributes['ready_knowledge_documents_count'];
        }

        if ($this->relationLoaded('knowledgeDocuments')) {
            return $this->knowledgeDocuments
                ->where('ingestion_status', BrandDnaKnowledgeIngestionStatus::Ready)
                ->count();
        }

        return $this->exists
            ? $this->knowledgeDocuments()->where('ingestion_status', BrandDnaKnowledgeIngestionStatus::Ready)->count()
            : 0;
    }

    /**
     * @param  array<int, mixed>  $values
     */
    protected function ratioToPercent(array $values): int
    {
        $total = count($values);

        if ($total === 0) {
            return 0;
        }

        $filled = collect($values)->filter(function (mixed $value): bool {
            if (is_bool($value)) {
                return $value;
            }

            if (is_array($value)) {
                return collect($value)->filter()->isNotEmpty();
            }

            return filled($value);
        })->count();

        return (int) round(($filled / $total) * 100);
    }

    protected function countToPercent(int $count, int $target): int
    {
        if ($target <= 0) {
            return 0;
        }

        return (int) min(100, round(($count / $target) * 100));
    }
}
