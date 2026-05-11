<?php

namespace Database\Factories;

use App\Models\BrandDna;
use App\Models\BrandDnaPersona;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BrandDnaPersona>
 */
class BrandDnaPersonaFactory extends Factory
{
    protected $model = BrandDnaPersona::class;

    public function definition(): array
    {
        return [
            'brand_dna_id' => BrandDna::factory(),
            'label' => fake()->jobTitle(),
            'characteristics' => fake()->paragraph(),
            'awareness_level' => 'problema',
            'objections' => fake()->sentence(),
            'desired_outcomes' => fake()->sentence(),
        ];
    }
}
