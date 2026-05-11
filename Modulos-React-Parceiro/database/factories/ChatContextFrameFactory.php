<?php

namespace Database\Factories;

use App\Models\BrandDna;
use App\Models\BrandDnaPersona;
use App\Models\ChatContextFrame;
use App\Models\ChatSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChatContextFrame>
 */
class ChatContextFrameFactory extends Factory
{
    protected $model = ChatContextFrame::class;

    public function definition(): array
    {
        return [
            'chat_session_id' => ChatSession::factory(),
            'inherits_from_id' => null,
            'brand_dna_id' => null,
            'brand_dna_persona_id' => null,
            'knowledge_enabled' => false,
            'web_search_enabled' => false,
            'system_snapshot' => null,
            'meta' => [],
        ];
    }

    public function withBrandContext(): self
    {
        return $this->state(function (): array {
            $brand = BrandDna::factory()->create();
            $persona = BrandDnaPersona::factory()->for($brand)->create();

            return [
                'brand_dna_id' => $brand->id,
                'brand_dna_persona_id' => $persona->id,
                'knowledge_enabled' => true,
            ];
        });
    }
}
