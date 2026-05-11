<?php

namespace App\Services\BrandDna\KnowledgeBase\Contracts;

use App\Models\BrandDna;
use App\Models\BrandDnaKnowledgeChunk;
use Illuminate\Support\Collection;

interface RetrievesBrandKnowledge
{
    /**
     * @return Collection<int, BrandDnaKnowledgeChunk>
     */
    public function search(BrandDna $brandDna, string $query, ?int $limit = null): Collection;
}
