<?php

namespace App\Services\BrandDna\KnowledgeBase\Contracts;

use App\Data\BrandDna\KnowledgeSourceContentResult;

interface ExtractsWebsiteKnowledgeSources
{
    /**
     * @param  array<string, mixed>  $options
     */
    public function extract(string $url, array $options = []): KnowledgeSourceContentResult;
}
