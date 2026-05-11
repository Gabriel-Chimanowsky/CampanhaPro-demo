<?php

namespace Database\Factories;

use App\Enums\AiTemplateType;
use App\Models\AiTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AiTemplate>
 */
class AiTemplateFactory extends Factory
{
    protected $model = AiTemplate::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'name' => Str::headline($name),
            'slug' => Str::slug($name),
            'type' => AiTemplateType::Text,
            'description' => fake()->sentence(),
            'provider' => null,
            'model' => null,
            'system_prompt' => 'Escreva com clareza, foco comercial e linguagem natural em portugues do Brasil.',
            'user_prompt_template' => 'Crie um texto sobre "{topic}" com tom "{tone}".',
            'input_schema' => [
                [
                    'name' => 'topic',
                    'label' => 'Tema',
                    'type' => 'text',
                    'required' => true,
                    'max' => 160,
                ],
                [
                    'name' => 'tone',
                    'label' => 'Tom',
                    'type' => 'select',
                    'required' => true,
                    'options' => ['profissional', 'amigavel', 'direto'],
                ],
            ],
            'is_active' => true,
            'sort_order' => 10,
        ];
    }

    public function image(): static
    {
        return $this->state(fn (): array => [
            'type' => AiTemplateType::Image,
            'system_prompt' => 'Crie uma imagem promocional limpa, sofisticada e de alta legibilidade.',
            'user_prompt_template' => 'Crie uma imagem promocional para "{campaign}" com direcao visual "{direction}".',
            'input_schema' => [
                [
                    'name' => 'campaign',
                    'label' => 'Campanha',
                    'type' => 'text',
                    'required' => true,
                    'max' => 160,
                ],
                [
                    'name' => 'direction',
                    'label' => 'Direcao visual',
                    'type' => 'textarea',
                    'required' => true,
                    'max' => 500,
                ],
            ],
        ]);
    }
}
