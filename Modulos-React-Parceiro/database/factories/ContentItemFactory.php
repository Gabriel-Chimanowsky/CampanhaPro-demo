<?php

namespace Database\Factories;

use App\Enums\AiTemplateType;
use App\Enums\ContentItemStatus;
use App\Models\AiGeneration;
use App\Models\AiTemplate;
use App\Models\ContentItem;
use App\Models\GuidedBrief;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContentItem>
 */
class ContentItemFactory extends Factory
{
    protected $model = ContentItem::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'ai_generation_id' => AiGeneration::factory()->completed(),
            'guided_brief_id' => GuidedBrief::factory(),
            'ai_template_id' => AiTemplate::factory(),
            'brand_dna_id' => null,
            'brand_dna_persona_id' => null,
            'campaign_package_id' => null,
            'parent_content_item_id' => null,
            'root_content_item_id' => null,
            'type' => AiTemplateType::Text,
            'channel' => 'LinkedIn',
            'objective' => 'Gerar demanda',
            'tone' => 'consultivo',
            'title' => fake()->sentence(4),
            'body' => fake()->paragraphs(2, true),
            'output_file_path' => null,
            'status' => ContentItemStatus::InReview,
            'is_favorited' => false,
            'approved_at' => null,
            'approved_by' => null,
            'meta' => [],
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (): array => [
            'status' => ContentItemStatus::Approved,
            'approved_at' => now(),
        ]);
    }
}
