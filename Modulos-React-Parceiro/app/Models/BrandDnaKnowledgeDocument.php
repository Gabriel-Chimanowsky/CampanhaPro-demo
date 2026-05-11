<?php

namespace App\Models;

use App\Enums\BrandDnaKnowledgeDocumentType;
use App\Enums\BrandDnaKnowledgeIngestionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BrandDnaKnowledgeDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'brand_dna_id',
        'type',
        'title',
        'source_url',
        'source_filename',
        'content',
        'summary',
        'meta',
        'ingestion_status',
        'ingestion_error',
        'ingested_at',
        'last_processed_at',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'type' => BrandDnaKnowledgeDocumentType::class,
            'meta' => 'array',
            'ingestion_status' => BrandDnaKnowledgeIngestionStatus::class,
            'ingested_at' => 'immutable_datetime',
            'last_processed_at' => 'immutable_datetime',
        ];
    }

    public function brandDna(): BelongsTo
    {
        return $this->belongsTo(BrandDna::class);
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(BrandDnaKnowledgeChunk::class)->orderBy('chunk_index');
    }

    public function scopeReady($query)
    {
        return $query->where('ingestion_status', BrandDnaKnowledgeIngestionStatus::Ready);
    }

    public function sourceLabel(): string
    {
        return $this->source_url ?: ($this->source_filename ?: 'Texto manual');
    }
}
