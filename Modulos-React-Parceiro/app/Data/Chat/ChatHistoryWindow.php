<?php

namespace App\Data\Chat;

use App\Models\ChatMessage;
use Illuminate\Support\Collection;

final class ChatHistoryWindow
{
    /**
     * @param  Collection<int, ChatMessage>  $recentMessages
     */
    public function __construct(
        public readonly ?string $summary,
        public readonly Collection $recentMessages,
    ) {}
}
