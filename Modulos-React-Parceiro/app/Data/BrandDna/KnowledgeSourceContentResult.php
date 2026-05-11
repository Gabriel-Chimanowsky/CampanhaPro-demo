<?php

namespace App\Data\BrandDna;

final class KnowledgeSourceContentResult
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        public readonly string $content,
        public readonly array $meta = [],
        public readonly ?string $title = null,
        public readonly ?string $summary = null,
    ) {}
}
