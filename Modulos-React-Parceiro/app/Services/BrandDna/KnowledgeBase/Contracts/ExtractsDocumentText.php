<?php

namespace App\Services\BrandDna\KnowledgeBase\Contracts;

use App\Data\BrandDna\KnowledgeSourceContentResult;

interface ExtractsDocumentText
{
    /**
     * @param  array<string, mixed>  $options
     */
    public function extract(string $path, array $options = []): KnowledgeSourceContentResult;
}
