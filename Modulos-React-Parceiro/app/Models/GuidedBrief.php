<?php

namespace App\Models;

use Database\Factories\GuidedBriefFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GuidedBrief extends Model
{
    /** @use HasFactory<GuidedBriefFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ai_template_id',
        'source_guided_brief_id',
        'brand_dna_id',
        'brand_dna_persona_id',
        'answers',
        'input_payload',
        'summary',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'answers' => 'array',
            'input_payload' => 'array',
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

    public function sourceBrief(): BelongsTo
    {
        return $this->belongsTo(self::class, 'source_guided_brief_id');
    }

    public function brandDna(): BelongsTo
    {
        return $this->belongsTo(BrandDna::class);
    }

    public function brandDnaPersona(): BelongsTo
    {
        return $this->belongsTo(BrandDnaPersona::class);
    }

    public function generations(): HasMany
    {
        return $this->hasMany(AiGeneration::class);
    }

    public function contentItems(): HasMany
    {
        return $this->hasMany(ContentItem::class);
    }

    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->where('user_id', $user->id);
    }
}
