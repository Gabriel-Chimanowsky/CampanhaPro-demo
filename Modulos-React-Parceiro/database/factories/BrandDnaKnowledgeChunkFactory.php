<?php

namespace Database\Factories;

use App\Models\BrandDna;
use App\Models\BrandDnaKnowledgeChunk;
use App\Models\BrandDnaKnowledgeDocument;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BrandDnaKnowledgeChunk>
 */
class BrandDnaKnowledgeChunkFactory extends Factory
{
    protected $model = BrandDnaKnowledgeChunk::class;

    public function definition(): array
    {
        return [
            'brand_dna_id' => BrandDna::factory(),
            'brand_dna_knowledge_document_id' => BrandDnaKnowledgeDocument::factory(),
            'chunk_index' => 0,
            'content' => fake()->paragraph(),
            'embedding' => null,
            'embedded_at' => null,
            'meta' => [],
        ];
    }
}
