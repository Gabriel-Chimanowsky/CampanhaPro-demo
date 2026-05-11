<?php

namespace App\Models;

use Database\Factories\ContentItemVersionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContentItemVersion extends Model
{
    /** @use HasFactory<ContentItemVersionFactory> */
    use HasFactory;

    protected $fillable = [
        'content_item_id',
        'version_number',
        'body',
        'output_file_path',
        'edit_instruction',
        'edit_mode',
        'changed_by',
        'change_reason',
        'brief_snapshot',
        'context_snapshot',
        'provider',
        'model',
    ];

    protected function casts(): array
    {
        return [
            'brief_snapshot' => 'array',
            'context_snapshot' => 'array',
        ];
    }

    public function contentItem(): BelongsTo
    {
        return $this->belongsTo(ContentItem::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
