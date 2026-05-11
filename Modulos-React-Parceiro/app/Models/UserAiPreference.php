<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAiPreference extends Model
{
    protected $fillable = [
        'user_id',
        'default_brand_dna_id',
        'last_brand_dna_id',
        'last_brand_dna_persona_id',
        'last_provider',
        'last_model',
        'last_use_brand_dna',
        'last_use_knowledge_base',
    ];

    protected function casts(): array
    {
        return [
            'last_use_brand_dna' => 'boolean',
            'last_use_knowledge_base' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function defaultBrandDna(): BelongsTo
    {
        return $this->belongsTo(BrandDna::class, 'default_brand_dna_id');
    }

    public function lastBrandDna(): BelongsTo
    {
        return $this->belongsTo(BrandDna::class, 'last_brand_dna_id');
    }

    public function lastBrandDnaPersona(): BelongsTo
    {
        return $this->belongsTo(BrandDnaPersona::class, 'last_brand_dna_persona_id');
    }
}
