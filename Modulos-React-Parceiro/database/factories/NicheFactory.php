<?php

namespace Database\Factories;

use App\Models\Niche;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Niche>
 */
class NicheFactory extends Factory
{
    protected $model = Niche::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'name' => Str::headline($name),
            'slug' => Str::slug($name),
        ];
    }
}
