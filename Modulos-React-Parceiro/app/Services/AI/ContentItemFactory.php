<?php

namespace App\Services\AI;

use App\Enums\AiGenerationStatus;
use App\Enums\ContentItemStatus;
use App\Models\AiGeneration;
use App\Models\AiTemplate;
use App\Models\ContentItem;
use App\Models\GuidedBrief;
use Illuminate\Support\Str;

class ContentItemFactory
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function createFromGeneration(AiGeneration $generation, ?GuidedBrief $brief = null, array $meta = []): ?ContentItem
    {
        if ($generation->getAttribute('status') !== AiGenerationStatus::Completed) {
            return null;
        }

        $existing = ContentItem::query()
            ->where('ai_generation_id', $generation->id)
            ->first();

        if ($existing) {
            return $existing;
        }

        $answers = $brief instanceof GuidedBrief ? $brief->answers : [];

        return ContentItem::query()->create([
            'user_id' => $generation->user_id,
            'ai_generation_id' => $generation->id,
            'guided_brief_id' => $brief?->id,
            'ai_template_id' => $generation->ai_template_id,
            'brand_dna_id' => $generation->brand_dna_id,
            'brand_dna_persona_id' => $generation->brand_dna_persona_id,
            'type' => $generation->type,
            'channel' => $this->nullableAnswer($answers, 'channel'),
            'objective' => $this->nullableAnswer($answers, 'objective'),
            'tone' => $this->nullableAnswer($answers, 'tone'),
            'title' => $this->titleFor($generation, $answers),
            'body' => $generation->output_text,
            'output_file_path' => $generation->output_file_path,
            'status' => ContentItemStatus::InReview,
            'is_favorited' => false,
            'meta' => [
                ...array_filter([
                    'brief_summary' => $brief instanceof GuidedBrief ? $brief->summary : null,
                    'cta' => $this->nullableAnswer($answers, 'cta'),
                    'constraints' => $this->nullableAnswer($answers, 'constraints'),
                    'provider' => $generation->provider,
                    'model' => $generation->model,
                ], fn (mixed $value): bool => filled($value)),
                ...$meta,
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $answers
     */
    protected function titleFor(AiGeneration $generation, array $answers): string
    {
        $message = $this->nullableAnswer($answers, 'message');
        $template = $generation->template;
        $base = $message ?: ($template instanceof AiTemplate ? $template->name : 'Conteudo gerado');

        return Str::limit($base, 90, '');
    }

    /**
     * @param  array<string, mixed>  $answers
     */
    protected function nullableAnswer(array $answers, string $key): ?string
    {
        $value = $answers[$key] ?? null;

        return filled($value) && ! is_array($value) ? trim((string) $value) : null;
    }
}
