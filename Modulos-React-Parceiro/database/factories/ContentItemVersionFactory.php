<?php

namespace Database\Factories;

use App\Models\ContentItem;
use App\Models\ContentItemVersion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContentItemVersion>
 */
class ContentItemVersionFactory extends Factory
{
    protected $model = ContentItemVersion::class;

    public function definition(): array
    {
        return [
            'content_item_id' => ContentItem::factory(),
            'version_number' => 1,
            'body' => fake()->paragraphs(2, true),
            'output_file_path' => null,
            'edit_instruction' => null,
            'edit_mode' => 'manual',
            'changed_by' => User::factory(),
            'change_reason' => fake()->sentence(),
            'brief_snapshot' => [],
            'context_snapshot' => [],
            'provider' => 'openai-fake',
            'model' => 'openai-text-model',
        ];
    }
}
