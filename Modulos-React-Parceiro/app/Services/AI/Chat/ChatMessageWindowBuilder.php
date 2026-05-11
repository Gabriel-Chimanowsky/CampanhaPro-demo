<?php

namespace App\Services\AI\Chat;

use App\Data\Chat\ChatHistoryWindow;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ChatMessageWindowBuilder
{
    /**
     * @param  Collection<int, ChatMessage>  $historyMessages
     */
    public function build(ChatSession $session, Collection $historyMessages): ChatHistoryWindow
    {
        $maxMessages = max(2, (int) config('chat.history.max_messages', 8));

        if ($historyMessages->count() <= $maxMessages) {
            return new ChatHistoryWindow(
                summary: $this->existingSummary($session),
                recentMessages: $historyMessages->values(),
            );
        }

        $older = $historyMessages->slice(0, $historyMessages->count() - $maxMessages)->values();
        $recent = $historyMessages->slice(-$maxMessages)->values();
        $summary = $this->summarize($older);
        $meta = $session->meta ?? [];
        $meta['rolling_summary'] = $summary;
        $meta['history_summary_until_index'] = $older->last()?->message_index;
        $session->forceFill(['meta' => $meta])->save();

        return new ChatHistoryWindow(
            summary: $summary,
            recentMessages: $recent,
        );
    }

    protected function existingSummary(ChatSession $session): ?string
    {
        $summary = data_get($session->meta, 'rolling_summary');

        return is_string($summary) && $summary !== '' ? $summary : null;
    }

    /**
     * @param  Collection<int, ChatMessage>  $messages
     */
    protected function summarize(Collection $messages): string
    {
        $maxChars = max(120, (int) config('chat.history.summary_max_chars', 900));

        return Str::limit(
            $messages
                ->map(fn (ChatMessage $message): string => sprintf(
                    '%s: %s',
                    Str::headline($message->role->value),
                    Str::squish((string) $message->content)
                ))
                ->implode(' | '),
            $maxChars,
            '...'
        );
    }
}
