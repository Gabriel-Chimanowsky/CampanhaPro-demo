<?php

namespace App\Console\Commands;

use App\Models\BrandDna;
use App\Services\BrandDna\KnowledgeBase\Contracts\RetrievesBrandKnowledge;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;

class EvaluateChatRetrievalCommand extends Command
{
    protected $signature = 'ai:chat-evaluate-retrieval {dataset : Caminho para um arquivo JSON com queries e expectativas}';

    protected $description = 'Avalia recall, reciprocal rank e latencia do retrieval de conhecimento do chat.';

    public function handle(RetrievesBrandKnowledge $retriever): int
    {
        $datasetPath = (string) $this->argument('dataset');

        if (! is_file($datasetPath)) {
            $this->error('Arquivo de dataset nao encontrado.');

            return self::FAILURE;
        }

        $decoded = json_decode((string) file_get_contents($datasetPath), true);

        if (! is_array($decoded)) {
            $this->error('O dataset precisa ser um JSON valido.');

            return self::FAILURE;
        }

        $rows = collect($decoded)
            ->map(function (mixed $item) use ($retriever): ?array {
                if (! is_array($item) || ! isset($item['brand_dna_id'], $item['query'])) {
                    return null;
                }

                $brand = BrandDna::query()->find($item['brand_dna_id']);

                if (! $brand) {
                    return null;
                }

                $expectedChunkIds = collect(Arr::wrap($item['expected_chunk_ids'] ?? []))
                    ->map(fn (mixed $id): int => (int) $id)
                    ->filter()
                    ->values();
                $expectedDocumentIds = collect(Arr::wrap($item['expected_document_ids'] ?? []))
                    ->map(fn (mixed $id): int => (int) $id)
                    ->filter()
                    ->values();

                $startedAt = microtime(true);
                $results = $retriever->search($brand, (string) $item['query']);
                $latencyMs = (microtime(true) - $startedAt) * 1000;

                $retrievedChunkIds = $results->pluck('id')->map(fn (mixed $id): int => (int) $id)->values();
                $retrievedDocumentIds = $results->pluck('brand_dna_knowledge_document_id')->map(fn (mixed $id): int => (int) $id)->unique()->values();
                $expected = $expectedChunkIds->isNotEmpty() ? $expectedChunkIds : $expectedDocumentIds;
                $retrieved = $expectedChunkIds->isNotEmpty() ? $retrievedChunkIds : $retrievedDocumentIds;

                return [
                    'brand' => $brand->name,
                    'query' => (string) $item['query'],
                    'expected' => $expected,
                    'retrieved' => $retrieved,
                    'recall' => $this->recall($expected, $retrieved),
                    'mrr' => $this->reciprocalRank($expected, $retrieved),
                    'latency_ms' => round($latencyMs, 2),
                ];
            })
            ->filter();

        if ($rows->isEmpty()) {
            $this->error('Nenhuma linha valida foi encontrada no dataset.');

            return self::FAILURE;
        }

        $this->table(
            ['Brand', 'Query', 'Expected', 'Retrieved', 'Recall@k', 'RR', 'Latency ms'],
            $rows->map(fn (array $row): array => [
                $row['brand'],
                $row['query'],
                $row['expected']->implode(', '),
                $row['retrieved']->implode(', '),
                number_format($row['recall'], 2),
                number_format($row['mrr'], 2),
                number_format($row['latency_ms'], 2),
            ])->all()
        );

        $this->newLine();
        $this->line('Resumo:');
        $this->line('Avg recall@k: '.number_format($rows->avg('recall'), 3));
        $this->line('Avg reciprocal rank: '.number_format($rows->avg('mrr'), 3));
        $this->line('Avg latency ms: '.number_format($rows->avg('latency_ms'), 2));

        return self::SUCCESS;
    }

    /**
     * @param  Collection<int, int>  $expected
     * @param  Collection<int, int>  $retrieved
     */
    protected function recall(Collection $expected, Collection $retrieved): float
    {
        if ($expected->isEmpty()) {
            return 0.0;
        }

        return $expected
            ->intersect($retrieved)
            ->count() / $expected->count();
    }

    /**
     * @param  Collection<int, int>  $expected
     * @param  Collection<int, int>  $retrieved
     */
    protected function reciprocalRank(Collection $expected, Collection $retrieved): float
    {
        if ($expected->isEmpty()) {
            return 0.0;
        }

        foreach ($retrieved->values() as $index => $id) {
            if ($expected->contains($id)) {
                return 1 / ($index + 1);
            }
        }

        return 0.0;
    }
}
