<?php

namespace Database\Factories;

use App\Models\BrandDna;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BrandDna>
 */
class BrandDnaFactory extends Factory
{
    protected $model = BrandDna::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->company(),
            'primary_product' => fake()->words(3, true),
            'primary_logo_path' => null,
            'monochrome_logo_path' => null,
            'icon_logo_path' => null,
            'brand_colors' => ['#111827', '#F97316'],
            'default_tone' => 'criativo',
            'custom_tone' => null,
            'pitch_bio' => fake()->paragraph(),
            'brand_description' => fake()->paragraph(),
            'competitive_differentiators' => fake()->sentence(),
            'target_age_ranges' => ['25-34'],
            'target_gender' => 'ambos',
            'sales_model' => 'B2C',
            'default_language' => 'pt-BR',
            'writing_styles' => ['educacional'],
            'frequent_terms' => ['performance'],
            'forbidden_words' => ['gratis demais'],
            'communication_notes' => fake()->sentence(),
        ];
    }
}
