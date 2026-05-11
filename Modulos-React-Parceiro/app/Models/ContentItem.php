<?php

namespace App\Models;

use App\Enums\AiTemplateType;
use App\Enums\ContentItemStatus;
use Database\Factories\ContentItemFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class ContentItem extends Model
{
    /** @use HasFactory<ContentItemFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ai_generation_id',
        'guided_brief_id',
        'ai_template_id',
        'brand_dna_id',
        'brand_dna_persona_id',
        'campaign_package_id',
        'parent_content_item_id',
        'root_content_item_id',
        'type',
        'channel',
        'objective',
        'tone',
        'title',
        'body',
        'output_file_path',
        'status',
        'is_favorited',
        'approved_at',
        'approved_by',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'type' => AiTemplateType::class,
            'status' => ContentItemStatus::class,
            'is_favorited' => 'boolean',
            'approved_at' => 'immutable_datetime',
            'meta' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function generation(): BelongsTo
    {
        return $this->belongsTo(AiGeneration::class, 'ai_generation_id');
    }

    public function guidedBrief(): BelongsTo
    {
        return $this->belongsTo(GuidedBrief::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(AiTemplate::class, 'ai_template_id');
    }

    public function brandDna(): BelongsTo
    {
        return $this->belongsTo(BrandDna::class);
    }

    public function brandDnaPersona(): BelongsTo
    {
        return $this->belongsTo(BrandDnaPersona::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function parentContentItem(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_content_item_id');
    }

    public function rootContentItem(): BelongsTo
    {
        return $this->belongsTo(self::class, 'root_content_item_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(ContentItemVersion::class)->orderByDesc('version_number');
    }

    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->where('user_id', $user->id);
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', ContentItemStatus::Approved);
    }

    public function scopeFavorited(Builder $query): Builder
    {
        return $query->where('is_favorited', true);
    }

    public function approve(User $user): void
    {
        $this->forceFill([
            'status' => ContentItemStatus::Approved,
            'approved_at' => now(),
            'approved_by' => $user->id,
        ])->save();
    }

    public function sendToReview(): void
    {
        $this->forceFill([
            'status' => ContentItemStatus::InReview,
            'approved_at' => null,
            'approved_by' => null,
        ])->save();
    }

    public function reject(User $user, string $reason): void
    {
        $this->forceFill([
            'status' => ContentItemStatus::Rejected,
            'approved_at' => null,
            'approved_by' => null,
            'meta' => [
                ...($this->meta ?? []),
                'reject_reason' => $reason,
                'rejected_by' => $user->id,
                'rejected_at' => now()->toIso8601String(),
            ],
        ])->save();
    }

    public function toggleFavorite(): void
    {
        $this->forceFill([
            'is_favorited' => ! $this->is_favorited,
        ])->save();
    }

    public function isText(): bool
    {
        $type = $this->getAttribute('type');

        return $type instanceof AiTemplateType
            ? $type === AiTemplateType::Text
            : $type === AiTemplateType::Text->value;
    }

    public function isImage(): bool
    {
        $type = $this->getAttribute('type');

        return $type instanceof AiTemplateType
            ? $type === AiTemplateType::Image
            : $type === AiTemplateType::Image->value;
    }

    public function outputUrl(): ?string
    {
        if (blank($this->output_file_path)) {
            return null;
        }

        return Storage::disk(config('ai.output.disk'))->url($this->output_file_path);
    }
}
