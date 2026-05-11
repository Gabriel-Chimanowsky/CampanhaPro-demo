<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Services\AI\Chat\Contracts\StreamsChatResponses;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StreamChatMessageController extends Controller
{
    public function __invoke(Request $request, ChatMessage $chatMessage, StreamsChatResponses $streamer): StreamedResponse
    {
        abort_unless($chatMessage->session()->where('user_id', $request->user()->id)->exists(), 403);

        return $streamer->stream($chatMessage);
    }
}
