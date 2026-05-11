<?php

namespace App\Services\AI\Contracts;

use App\Services\AI\Support\TextGenerationResult;

interface GeneratesText
{
    /**
     * @param  array<string, mixed>  $options
     */
    public function generateText(string $prompt, array $options = []): TextGenerationResult;
}
