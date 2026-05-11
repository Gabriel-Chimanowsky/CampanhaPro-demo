<?php

namespace App\Models;

use Database\Factories\ChatContextFrameFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatContextFrame extends Model
{
    /** @use HasFactory<ChatContextFrameFactory> */
    use HasFactory;

    protected $fillable = [
        'chat_session_id',
        'inherits_from_id',
        'brand_dna_id',
        'brand_dna_persona_id',
        'knowledge_enabled',
        'web_search_enabled',
        'system_snapshot',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'knowledge_enabled' => 'bool',
            'web_search_enabled' => 'bool',
            'meta' => 'array',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ChatSession::class, 'chat_session_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'inherits_from_id');
    }

    public function brandDna(): BelongsTo
    {
        return $this->belongsTo(BrandDna::class);
    }

    public function persona(): BelongsTo
    {
        return $this->belongsTo(BrandDnaPersona::class, 'brand_dna_persona_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'context_frame_id')->orderBy('message_index');
    }
}
