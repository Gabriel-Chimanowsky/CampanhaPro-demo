<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use App\Services\AI\Chat\ChatTurnService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoreChatTurnController extends Controller
{
    public function __invoke(Request $request, ChatTurnService $chatTurnService): JsonResponse
    {
        $result = $chatTurnService->createTurn($request->user(), $request->all());
        $session = $result['session'];
        $assistantMessage = $result['assistantMessage'];
        $userMessage = $session->messages()->where('message_index', $assistantMessage->message_index - 1)->first();

        return response()->json([
            'session_id' => $session->id,
            'assistant_message_id' => $assistantMessage->id,
            'session_url' => route('ai.chat.show', $session),
            'stream_url' => route('ai.chat.messages.stream', $assistantMessage),
            'session' => [
                'id' => $session->id,
                'title' => $session->title,
                'last_used_at' => $session->last_used_at?->toIso8601String(),
            ],
            'user_message' => $userMessage ? [
                'id' => $userMessage->id,
                'content' => $userMessage->content,
            ] : null,
        ], 201);
    }
}
