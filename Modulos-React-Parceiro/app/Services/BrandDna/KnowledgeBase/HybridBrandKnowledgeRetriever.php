<?php

namespace App\Services\BrandDna\KnowledgeBase;

use App\Models\BrandDna;
use App\Models\BrandDnaKnowledgeChunk;
use App\Services\BrandDna\KnowledgeBase\Contracts\EmbedsKnowledgeContent;
use App\Services\BrandDna\KnowledgeBase\Contracts\RetrievesBrandKnowledge;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;

class HybridBrandKnowledgeRetriever implements RetrievesBrandKnowledge
{
    public function __construct(
        protected EmbedsKnowledgeContent $embedder,
    ) {}

    public function search(BrandDna $brandDna, string $query, ?int $limit = null): Collection
    {
        $limit ??= (int) config('brand_dna.knowledge_base.retrieval_limit', 4);
        $candidateLimit = max($limit * 3, (int) config('brand_dna.knowledge_base.hybrid.candidate_limit', 12));

        $baseQuery = BrandDnaKnowledgeChunk::query()
            ->where('brand_dna_id', $brandDna->id)
            ->whereHas('document', fn (Builder $builder) => $builder->ready())
            ->with('document');

        $allChunks = $baseQuery->get();

        if ($allChunks->isEmpty()) {
            return collect();
        }

        $lexicalRankings = $this->lexicalCandidates($allChunks, $query, $candidateLimit);
        $queryEmbedding = $this->supportsVectorCandidates() ? $this->embedder->embedQuery($query) : null;
        $vectorRankings = $queryEmbedding !== null
            ? $this->vectorCandidates($brandDna, $allChunks, $queryEmbedding, $candidateLimit)
            : [];

        $candidates = $this->combineCandidates($allChunks, $lexicalRankings, $vectorRankings);

        if ($candidates->isEmpty()) {
            return $allChunks->take($limit)->values();
        }

        return $this->mmrRerank($candidates, $queryEmbedding, $limit)
            ->values()
            ->each(function (BrandDnaKnowledgeChunk $chunk, int $index): void {
                $chunk->setAttribute('retrieval_rank', $index + 1);
                $chunk->setAttribute('retrieval_excerpt', Str::limit($chunk->content, 280));
            });
    }

    /**
     * @param  Collection<int, BrandDnaKnowledgeChunk>  $chunks
     * @return array<int, array{id: int, score: float, rank: int}>
     */
    protected function lexicalCandidates(Collection $chunks, string $query, int $limit): array
    {
        $terms = collect(preg_split('/\s+/', Str::of($query)->lower()->squish()->value()) ?: [])
            ->map(fn (string $term): string => trim($term))
            ->filter(fn (string $term): bool => mb_strlen($term) >= 3)
            ->unique()
            ->values()
            ->all();

        return $chunks
            ->map(function (BrandDnaKnowledgeChunk $chunk) use ($terms, $query): array {
                $haystack = Str::lower($chunk->content.' '.($chunk->document?->title ?? '').' '.($chunk->document?->summary ?? ''));
                $score = Str::contains($haystack, Str::lower(trim($query))) ? 8.0 : 0.0;

                foreach ($terms as $term) {
                    if (Str::contains($haystack, $term)) {
                        $score += 3.0;
                        $score += (float) substr_count($haystack, $term);
                    }
                }

                return [
                    'id' => $chunk->id,
                    'score' => $score,
                ];
            })
            ->filter(fn (array $item): bool => $item['score'] > 0)
            ->sortByDesc('score')
            ->take($limit)
            ->values()
            ->map(fn (array $item, int $index): array => [
                ...$item,
                'rank' => $index + 1,
            ])
            ->all();
    }

    /**
     * @param  Collection<int, BrandDnaKnowledgeChunk>  $allChunks
     * @param  array<int, float>  $queryEmbedding
     * @return array<int, array{id: int, score: float, rank: int}>
     */
    protected function vectorCandidates(BrandDna $brandDna, Collection $allChunks, array $queryEmbedding, int $limit): array
    {
        $vectorRankings = $this->supportsPgvector()
            ? $this->vectorCandidatesFromPgvector($brandDna, $queryEmbedding, $limit)
            : [];

        if ($vectorRankings !== []) {
            return $vectorRankings;
        }

        return $allChunks
            ->filter(fn (BrandDnaKnowledgeChunk $chunk): bool => is_array($chunk->embedding) && $chunk->embedding !== [])
            ->map(fn (BrandDnaKnowledgeChunk $chunk): array => [
                'id' => $chunk->id,
                'score' => $this->cosineSimilarity($queryEmbedding, $chunk->embedding),
            ])
            ->filter(fn (array $item): bool => $item['score'] > 0)
            ->sortByDesc('score')
            ->take($limit)
            ->values()
            ->map(fn (array $item, int $index): array => [
                ...$item,
                'rank' => $index + 1,
            ])->all();
    }

    /**
     * @param  array<int, float>  $queryEmbedding
     * @return array<int, array{id: int, score: float, rank: int}>
     */
    protected function vectorCandidatesFromPgvector(BrandDna $brandDna, array $queryEmbedding, int $limit): array
    {
        $literal = $this->asVectorLiteral($queryEmbedding);
        $rows = DB::table('brand_dna_knowledge_chunks')
            ->selectRaw('id, 1 - (embedding_vector <=> ?) as score', [$literal])
            ->where('brand_dna_id', $brandDna->id)
            ->whereNotNull('embedding_vector')
            ->whereIn(
                'brand_dna_knowledge_document_id',
                DB::table('brand_dna_knowledge_documents')
                    ->select('id')
                    ->where('brand_dna_id', $brandDna->id)
                    ->where('ingestion_status', 'ready')
            )
            ->orderByRaw('embedding_vector <=> ?', [$literal])
            ->limit($limit)
            ->get();

        return collect($rows)->map(fn (object $row, int $index): array => [
            'id' => (int) $row->id,
            'score' => (float) $row->score,
            'rank' => $index + 1,
        ])->all();
    }

    /**
     * @param  Collection<int, BrandDnaKnowledgeChunk>  $allChunks
     * @param  array<int, array{id: int, score: float, rank: int}>  $lexicalRankings
     * @param  array<int, array{id: int, score: float, rank: int}>  $vectorRankings
     * @return Collection<int, BrandDnaKnowledgeChunk>
     */
    protected function combineCandidates(Collection $allChunks, array $lexicalRankings, array $vectorRankings): Collection
    {
        $chunksById = $allChunks->keyBy('id');
        $lexicalById = collect($lexicalRankings)->keyBy('id');
        $vectorById = collect($vectorRankings)->keyBy('id');
        $ids = $lexicalById->keys()->merge($vectorById->keys())->unique();
        $rrfK = (float) config('brand_dna.knowledge_base.hybrid.rrf_k', 60);

        return $ids
            ->map(function (int|string $id) use ($chunksById, $lexicalById, $vectorById, $rrfK): ?BrandDnaKnowledgeChunk {
                /** @var BrandDnaKnowledgeChunk|null $chunk */
                $chunk = $chunksById->get((int) $id);

                if (! $chunk) {
                    return null;
                }

                $lexical = $lexicalById->get((int) $id);
                $vector = $vectorById->get((int) $id);
                $score = 0.0;

                if ($lexical) {
                    $score += 1 / ($rrfK + (float) $lexical['rank']);
                    $score += ((float) $lexical['score']) * 0.02;
                }

                if ($vector) {
                    $score += 1 / ($rrfK + (float) $vector['rank']);
                    $score += ((float) $vector['score']) * 0.8;
                }

                $score += $this->recencyBoost($chunk);

                $chunk->setAttribute('retrieval_score', round($score, 6));
                $chunk->setAttribute('retrieval_lexical_score', (float) ($lexical['score'] ?? 0));
                $chunk->setAttribute('retrieval_vector_score', (float) ($vector['score'] ?? 0));

                return $chunk;
            })
            ->filter()
            ->sortByDesc(fn (BrandDnaKnowledgeChunk $chunk): float => (float) $chunk->getAttribute('retrieval_score'))
            ->values();
    }

    /**
     * @param  Collection<int, BrandDnaKnowledgeChunk>  $candidates
     * @param  array<int, float>|null  $queryEmbedding
     * @return Collection<int, BrandDnaKnowledgeChunk>
     */
    protected function mmrRerank(Collection $candidates, ?array $queryEmbedding, int $limit): Collection
    {
        if ($queryEmbedding === null) {
            return $candidates->take($limit)->values();
        }

        $selected = collect();
        $remaining = $candidates->values();
        $lambda = (float) config('brand_dna.knowledge_base.hybrid.mmr_lambda', 0.72);

        while ($selected->count() < $limit && $remaining->isNotEmpty()) {
            $bestKey = null;
            $bestScore = null;

            foreach ($remaining as $key => $chunk) {
                $relevance = $this->cosineSimilarity($queryEmbedding, (array) $chunk->embedding);
                $diversity = $selected->isEmpty()
                    ? 0.0
                    : $selected->max(fn (BrandDnaKnowledgeChunk $picked): float => $this->cosineSimilarity((array) $picked->embedding, (array) $chunk->embedding));

                $baseScore = (float) $chunk->getAttribute('retrieval_score');
                $mmrScore = ($lambda * ($relevance + $baseScore)) - ((1 - $lambda) * $diversity);

                if ($bestScore === null || $mmrScore > $bestScore) {
                    $bestScore = $mmrScore;
                    $bestKey = $key;
                }
            }

            if ($bestKey === null) {
                break;
            }

            $selected->push($remaining->get($bestKey));
            $remaining->forget($bestKey);
            $remaining = $remaining->values();
        }

        return $selected;
    }

    protected function recencyBoost(BrandDnaKnowledgeChunk $chunk): float
    {
        $updatedAt = $chunk->document?->updated_at;

        if (! $updatedAt) {
            return 0.0;
        }

        $days = max(1, now()->diffInDays($updatedAt));

        return 1 / (100 + $days);
    }

    /**
     * @param  array<int, float|int>  $a
     * @param  array<int, float|int>  $b
     */
    protected function cosineSimilarity(array $a, array $b): float
    {
        if ($a === [] || $b === [] || count($a) !== count($b)) {
            return 0.0;
        }

        $dot = 0.0;
        $magnitudeA = 0.0;
        $magnitudeB = 0.0;

        foreach ($a as $index => $value) {
            $left = (float) $value;
            $right = (float) $b[$index];
            $dot += $left * $right;
            $magnitudeA += $left ** 2;
            $magnitudeB += $right ** 2;
        }

        if ($magnitudeA <= 0.0 || $magnitudeB <= 0.0) {
            return 0.0;
        }

        return $dot / (sqrt($magnitudeA) * sqrt($magnitudeB));
    }

    protected function supportsVectorCandidates(): bool
    {
        return $this->embedder->supportsEmbeddings();
    }

    protected function supportsPgvector(): bool
    {
        try {
            return config('brand_dna.knowledge_base.pgvector.enabled', true)
                && Schema::getConnection()->getDriverName() === 'pgsql'
                && Schema::hasColumn('brand_dna_knowledge_chunks', 'embedding_vector');
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * @param  array<int, float>  $values
     */
    protected function asVectorLiteral(array $values): string
    {
        return '['.collect($values)
            ->map(static fn (float $value): string => number_format($value, 12, '.', ''))
            ->implode(',').']';
    }
}
