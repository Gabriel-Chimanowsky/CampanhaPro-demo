<?php

namespace App\Services\AI\Chat\Contracts;

use App\Models\ChatContextFrame;
use App\Models\ChatSession;

interface BuildsChatContextFrames
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function build(ChatSession $session, array $context, ?ChatContextFrame $previousFrame = null): ChatContextFrame;
}
