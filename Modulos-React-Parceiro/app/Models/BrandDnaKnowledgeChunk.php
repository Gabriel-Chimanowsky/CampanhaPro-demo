<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandDnaKnowledgeChunk extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_dna_id',
        'brand_dna_knowledge_document_id',
        'chunk_index',
        'content',
        'embedding',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'embedding' => 'array',
            'meta' => 'array',
            'embedded_at' => 'immutable_datetime',
        ];
    }

    public function brandDna(): BelongsTo
    {
        return $this->belongsTo(BrandDna::class);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(BrandDnaKnowledgeDocument::class, 'brand_dna_knowledge_document_id');
    }
}
