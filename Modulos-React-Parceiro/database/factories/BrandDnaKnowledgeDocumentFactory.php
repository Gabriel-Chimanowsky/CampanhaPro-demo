<?php

namespace Database\Factories;

use App\Enums\BrandDnaKnowledgeDocumentType;
use App\Enums\BrandDnaKnowledgeIngestionStatus;
use App\Models\BrandDna;
use App\Models\BrandDnaKnowledgeDocument;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BrandDnaKnowledgeDocument>
 */
class BrandDnaKnowledgeDocumentFactory extends Factory
{
    protected $model = BrandDnaKnowledgeDocument::class;

    public function definition(): array
    {
        return [
            'brand_dna_id' => BrandDna::factory(),
            'type' => BrandDnaKnowledgeDocumentType::Text,
            'title' => fake()->sentence(3),
            'source_url' => null,
            'source_filename' => null,
            'content' => fake()->paragraphs(3, true),
            'summary' => fake()->sentence(),
            'meta' => [],
            'ingestion_status' => BrandDnaKnowledgeIngestionStatus::Ready,
            'ingestion_error' => null,
            'ingested_at' => now(),
            'last_processed_at' => now(),
            'created_by' => User::factory(),
            'updated_by' => null,
        ];
    }
}
