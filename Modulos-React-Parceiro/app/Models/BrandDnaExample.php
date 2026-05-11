<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandDnaExample extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_dna_id',
        'title',
        'content',
        'content_type',
        'notes',
    ];

    public function brandDna(): BelongsTo
    {
        return $this->belongsTo(BrandDna::class);
    }
}
