<?php

namespace App\Services\AI\Support;

readonly class ImageGenerationResult
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        public string $binary,
        public string $extension = 'png',
        public string $mimeType = 'image/png',
        public array $meta = [],
    ) {}
}
