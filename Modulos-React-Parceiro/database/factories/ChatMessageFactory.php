<?php

namespace Database\Factories;

use App\Enums\ChatMessageRole;
use App\Enums\ChatMessageStatus;
use App\Models\ChatContextFrame;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChatMessage>
 */
class ChatMessageFactory extends Factory
{
    protected $model = ChatMessage::class;

    public function definition(): array
    {
        return [
            'chat_session_id' => ChatSession::factory(),
            'context_frame_id' => ChatContextFrame::factory(),
            'role' => ChatMessageRole::User,
            'content' => fake()->sentence(),
            'provider' => null,
            'model' => null,
            'status' => ChatMessageStatus::Completed,
            'message_index' => 0,
            'meta' => [],
            'completed_at' => now(),
        ];
    }
}
