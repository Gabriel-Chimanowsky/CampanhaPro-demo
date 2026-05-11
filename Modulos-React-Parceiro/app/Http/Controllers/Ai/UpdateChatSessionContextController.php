<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use App\Models\ChatSession;
use App\Services\AI\Chat\ChatSessionContextStateStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UpdateChatSessionContextController extends Controller
{
    public function __invoke(
        Request $request,
        ChatSession $chatSession,
        ChatSessionContextStateStore $contextStateStore,
    ): JsonResponse {
        abort_unless($chatSession->user_id === $request->user()?->id, 403);

        $state = $contextStateStore->normalize($request->user(), $request->all());
        $contextStateStore->persist($chatSession, $state);

        return response()->json([
            'context' => $state,
        ]);
    }
}
