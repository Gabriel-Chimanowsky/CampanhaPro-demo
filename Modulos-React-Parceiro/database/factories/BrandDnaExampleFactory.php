<?php

namespace Database\Factories;

use App\Models\BrandDna;
use App\Models\BrandDnaExample;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BrandDnaExample>
 */
class BrandDnaExampleFactory extends Factory
{
    protected $model = BrandDnaExample::class;

    public function definition(): array
    {
        return [
            'brand_dna_id' => BrandDna::factory(),
            'title' => fake()->sentence(3),
            'content' => fake()->paragraphs(2, true),
            'content_type' => 'text',
            'notes' => fake()->sentence(),
        ];
    }
}
