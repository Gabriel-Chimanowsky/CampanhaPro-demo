<?php

namespace Database\Factories;

use App\Enums\AiGenerationStatus;
use App\Enums\AiTemplateType;
use App\Models\AiGeneration;
use App\Models\AiTemplate;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiGeneration>
 */
class AiGenerationFactory extends Factory
{
    protected $model = AiGeneration::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'ai_template_id' => AiTemplate::factory(),
            'brand_dna_id' => null,
            'brand_dna_persona_id' => null,
            'type' => AiTemplateType::Text,
            'provider' => 'openai',
            'model' => null,
            'status' => AiGenerationStatus::Pending,
            'input_payload' => ['topic' => fake()->sentence()],
            'prompt_snapshot' => fake()->paragraph(),
            'output_text' => null,
            'output_file_path' => null,
            'error_message' => null,
            'meta' => [],
            'completed_at' => null,
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (): array => [
            'status' => AiGenerationStatus::Completed,
            'output_text' => fake()->paragraphs(3, true),
            'completed_at' => now(),
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn (): array => [
            'status' => AiGenerationStatus::Failed,
            'error_message' => 'Falha amigavel do provider.',
        ]);
    }
}
