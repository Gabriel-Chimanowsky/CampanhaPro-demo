<?php

namespace App\Models;

use App\Enums\AiTemplateType;
use Database\Factories\AiTemplateFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiTemplate extends Model
{
    /** @use HasFactory<AiTemplateFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'type',
        'description',
        'provider',
        'model',
        'system_prompt',
        'user_prompt_template',
        'input_schema',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'type' => AiTemplateType::class,
            'input_schema' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
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

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query
            ->orderBy('sort_order')
            ->orderBy('name');
    }

    public function isText(): bool
    {
        return $this->type === AiTemplateType::Text;
    }

    public function isImage(): bool
    {
        return $this->type === AiTemplateType::Image;
    }
}
