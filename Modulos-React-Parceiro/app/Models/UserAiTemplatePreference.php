<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAiTemplatePreference extends Model
{
    protected $fillable = [
        'user_id',
        'ai_template_id',
        'brand_dna_id',
        'brand_dna_persona_id',
        'provider',
        'model',
        'use_knowledge_base',
    ];

    protected function casts(): array
    {
        return [
            'use_knowledge_base' => 'boolean',
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

    public function brandDna(): BelongsTo
    {
        return $this->belongsTo(BrandDna::class);
    }

    public function brandDnaPersona(): BelongsTo
    {
        return $this->belongsTo(BrandDnaPersona::class);
    }
}
