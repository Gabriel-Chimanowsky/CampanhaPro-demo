<?php

namespace App\Services\BrandDna\KnowledgeBase\Contracts;

use App\Models\BrandDnaKnowledgeChunk;
use Illuminate\Support\Collection;

interface EmbedsKnowledgeContent
{
    public function supportsEmbeddings(): bool;

    /**
     * @param  Collection<int, BrandDnaKnowledgeChunk>  $chunks
     */
    public function embedChunks(Collection $chunks): void;

    /**
     * @return array<int, float>|null
     */
    public function embedQuery(string $query): ?array;
}
