<?php

namespace App\Services\AI\Chat\Contracts;

use App\Models\ChatMessage;
use Symfony\Component\HttpFoundation\StreamedResponse;

interface StreamsChatResponses
{
    public function stream(ChatMessage $assistantMessage): StreamedResponse;
}
