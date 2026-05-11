<?php

namespace App\Services\AI\Support;

readonly class TextGenerationResult
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        public string $text,
        public array $meta = [],
    ) {}
}
