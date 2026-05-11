<?php

namespace App\Data\BrandDna;

final class KnowledgeTranscriptResult
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        public readonly string $text,
        public readonly array $meta = [],
        public readonly ?string $title = null,
    ) {}
}
