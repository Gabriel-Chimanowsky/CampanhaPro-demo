<?php

namespace App\Services\AI\Chat;

use App\Models\ChatSession;
use Illuminate\Support\Str;

class ChatSessionTitleGenerator
{
    public function ensureTitle(ChatSession $session): void
    {
        if (filled($session->title)) {
            return;
        }

        $firstUserMessage = $session->messages()
            ->where('role', 'user')
            ->orderBy('message_index')
            ->value('content');

        if (! is_string($firstUserMessage) || trim($firstUserMessage) === '') {
            return;
        }

        $session->forceFill([
            'title' => Str::limit(Str::squish($firstUserMessage), 60, '...'),
        ])->save();
    }
}
