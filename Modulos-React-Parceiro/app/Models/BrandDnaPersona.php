<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BrandDnaPersona extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_dna_id',
        'label',
        'characteristics',
        'awareness_level',
        'objections',
        'desired_outcomes',
    ];

    public function brandDna(): BelongsTo
    {
        return $this->belongsTo(BrandDna::class);
    }

    public function generations(): HasMany
    {
        return $this->hasMany(AiGeneration::class, 'brand_dna_persona_id');
    }

    public function summary(): string
    {
        return trim(collect([
            $this->label,
            $this->characteristics,
            filled($this->awareness_level) ? 'Nivel de consciencia: '.$this->awareness_level : null,
            filled($this->objections) ? 'Objecoes: '.$this->objections : null,
            filled($this->desired_outcomes) ? 'Resultados desejados: '.$this->desired_outcomes : null,
        ])->filter()->implode('. '));
    }
}
