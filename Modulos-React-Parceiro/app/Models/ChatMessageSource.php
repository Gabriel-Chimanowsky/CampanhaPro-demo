<?php

namespace App\Models;

use App\Enums\ChatMessageSourceType;
use Database\Factories\ChatMessageSourceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatMessageSource extends Model
{
    /** @use HasFactory<ChatMessageSourceFactory> */
    use HasFactory;

    protected $fillable = [
        'chat_message_id',
        'source_type',
        'brand_dna_knowledge_document_id',
        'brand_dna_knowledge_chunk_id',
        'title',
        'url',
        'excerpt',
        'score',
        'rank',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'source_type' => ChatMessageSourceType::class,
            'score' => 'float',
            'meta' => 'array',
        ];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(ChatMessage::class, 'chat_message_id');
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(BrandDnaKnowledgeDocument::class, 'brand_dna_knowledge_document_id');
    }

    public function chunk(): BelongsTo
    {
        return $this->belongsTo(BrandDnaKnowledgeChunk::class, 'brand_dna_knowledge_chunk_id');
    }
}
