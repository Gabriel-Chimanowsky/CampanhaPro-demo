<?php

namespace App\Services\BrandDna\KnowledgeBase;

use App\Models\BrandDna;
use App\Models\BrandDnaKnowledgeChunk;
use App\Services\BrandDna\KnowledgeBase\Contracts\RetrievesBrandKnowledge;
use Illuminate\Support\Collection;

class BrandKnowledgeSearch
{
    public function __construct(
        protected RetrievesBrandKnowledge $retriever,
    ) {}

    /**
     * @return Collection<int, BrandDnaKnowledgeChunk>
     */
    public function search(BrandDna $brandDna, string $query, ?int $limit = null): Collection
    {
        return $this->retriever->search($brandDna, $query, $limit);
    }
}
