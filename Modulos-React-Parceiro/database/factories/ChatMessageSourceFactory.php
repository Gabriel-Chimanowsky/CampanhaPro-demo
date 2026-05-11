<?php

namespace Database\Factories;

use App\Enums\ChatMessageSourceType;
use App\Models\BrandDnaKnowledgeChunk;
use App\Models\BrandDnaKnowledgeDocument;
use App\Models\ChatMessage;
use App\Models\ChatMessageSource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChatMessageSource>
 */
class ChatMessageSourceFactory extends Factory
{
    protected $model = ChatMessageSource::class;

    public function definition(): array
    {
        return [
            'chat_message_id' => ChatMessage::factory(),
            'source_type' => ChatMessageSourceType::Knowledge,
            'brand_dna_knowledge_document_id' => BrandDnaKnowledgeDocument::factory(),
            'brand_dna_knowledge_chunk_id' => BrandDnaKnowledgeChunk::factory(),
            'title' => fake()->sentence(3),
            'url' => fake()->url(),
            'excerpt' => fake()->paragraph(),
            'score' => fake()->randomFloat(4, 0.2, 1),
            'rank' => 1,
            'meta' => [],
        ];
    }
}
