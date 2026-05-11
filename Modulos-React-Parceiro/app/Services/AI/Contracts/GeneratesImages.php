<?php

namespace App\Services\AI\Contracts;

use App\Services\AI\Support\ImageGenerationResult;

interface GeneratesImages
{
    /**
     * @param  array<string, mixed>  $options
     */
    public function generateImage(string $prompt, array $options = []): ImageGenerationResult;
}
