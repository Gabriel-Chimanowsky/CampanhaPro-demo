<?php

namespace App\Models;

use App\Enums\ChatMessageRole;
use App\Enums\ChatMessageStatus;
use Database\Factories\ChatMessageFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatMessage extends Model
{
    /** @use HasFactory<ChatMessageFactory> */
    use HasFactory;

    protected $fillable = [
        'chat_session_id',
        'context_frame_id',
        'role',
        'content',
        'provider',
        'model',
        'status',
        'message_index',
        'meta',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'role' => ChatMessageRole::class,
            'status' => ChatMessageStatus::class,
            'meta' => 'array',
            'completed_at' => 'immutable_datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ChatSession::class, 'chat_session_id');
    }

    public function contextFrame(): BelongsTo
    {
        return $this->belongsTo(ChatContextFrame::class, 'context_frame_id');
    }

    public function sources(): HasMany
    {
        return $this->hasMany(ChatMessageSource::class)->orderBy('rank');
    }

    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->whereHas('session', fn (Builder $builder) => $builder->where('user_id', $user->id));
    }
}
