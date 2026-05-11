<?php

namespace App\Models;

use Database\Factories\ChatSessionFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatSession extends Model
{
    /** @use HasFactory<ChatSessionFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'category',
        'last_used_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'last_used_at' => 'immutable_datetime',
            'meta' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class)->orderBy('message_index');
    }

    public function contextFrames(): HasMany
    {
        return $this->hasMany(ChatContextFrame::class)->latest('id');
    }

    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->where('user_id', $user->id);
    }
}
