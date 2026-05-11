<?php

namespace Database\Factories;

use App\Models\AiTemplate;
use App\Models\GuidedBrief;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GuidedBrief>
 */
class GuidedBriefFactory extends Factory
{
    protected $model = GuidedBrief::class;

    public function definition(): array
    {
        $message = fake()->sentence();

        return [
            'user_id' => User::factory(),
            'ai_template_id' => AiTemplate::factory(),
            'source_guided_brief_id' => null,
            'brand_dna_id' => null,
            'brand_dna_persona_id' => null,
            'answers' => [
                'objective' => 'Gerar demanda',
                'channel' => 'LinkedIn',
                'audience' => 'Decisores B2B',
                'message' => $message,
                'tone' => 'consultivo',
                'cta' => 'Agendar conversa',
                'constraints' => '',
            ],
            'input_payload' => [
                'topic' => $message,
                'tone' => 'consultivo',
            ],
            'summary' => 'Gerar demanda para decisores B2B.',
            'completed_at' => now(),
        ];
    }
}
