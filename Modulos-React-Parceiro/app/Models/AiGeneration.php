<?php

namespace App\Models;

use App\Enums\AiGenerationStatus;
use App\Enums\AiTemplateType;
use Database\Factories\AiGenerationFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class AiGeneration extends Model
{
    /** @use HasFactory<AiGenerationFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ai_template_id',
        'source_generation_id',
        'guided_brief_id',
        'brand_dna_id',
        'brand_dna_persona_id',
        'type',
        'provider',
        'model',
        'status',
        'input_payload',
        'prompt_snapshot',
        'output_text',
        'output_file_path',
        'error_message',
        'meta',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => AiTemplateType::class,
            'status' => AiGenerationStatus::class,
            'input_payload' => 'array',
            'meta' => 'array',
            'completed_at' => 'immutable_datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(AiTemplate::class, 'ai_template_id');
    }

    public function sourceGeneration(): BelongsTo
    {
        return $this->belongsTo(self::class, 'source_generation_id');
    }

    public function guidedBrief(): BelongsTo
    {
        return $this->belongsTo(GuidedBrief::class);
    }

    public function brandDna(): BelongsTo
    {
        return $this->belongsTo(BrandDna::class);
    }

    public function brandDnaPersona(): BelongsTo
    {
        return $this->belongsTo(BrandDnaPersona::class);
    }

    public function contentItems(): HasMany
    {
        return $this->hasMany(ContentItem::class);
    }

    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->where('user_id', $user->id);
    }

    public function scopeLatestFirst(Builder $query): Builder
    {
        return $query->latest('created_at');
    }

    public function isText(): bool
    {
        return $this->type === AiTemplateType::Text;
    }

    public function isImage(): bool
    {
        return $this->type === AiTemplateType::Image;
    }

    public function outputUrl(): ?string
    {
        if (blank($this->output_file_path)) {
            return null;
        }

        return Storage::disk(config('ai.output.disk'))->url($this->output_file_path);
    }
}
