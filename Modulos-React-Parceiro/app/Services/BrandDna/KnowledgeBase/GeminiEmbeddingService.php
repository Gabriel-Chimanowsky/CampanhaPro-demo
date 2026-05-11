<?php

namespace App\Services\BrandDna\KnowledgeBase;

use App\Models\BrandDnaKnowledgeChunk;
use App\Services\BrandDna\KnowledgeBase\Contracts\EmbedsKnowledgeContent;
use Gemini\Client;
use Gemini\Enums\TaskType;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class GeminiEmbeddingService implements EmbedsKnowledgeContent
{
    public function supportsEmbeddings(): bool
    {
        return (bool) config('brand_dna.knowledge_base.embeddings.enabled', true)
            && filled(config('ai.providers.gemini.api_key'));
    }

    public function embedChunks(Collection $chunks): void
    {
        if (! $this->supportsEmbeddings()) {
            return;
        }

        $chunks
            ->filter(fn (BrandDnaKnowledgeChunk $chunk): bool => filled(trim($chunk->content)))
            ->each(function (BrandDnaKnowledgeChunk $chunk): void {
                try {
                    $response = $this->client()
                        ->embeddingModel($this->model())
                        ->embedContent(
                            $chunk->content,
                            TaskType::RETRIEVAL_DOCUMENT,
                            $chunk->document?->title,
                            $this->dimensions(),
                        );

                    $values = $this->normalizeVector($response->embedding->values);

                    $chunk->forceFill([
                        'embedding' => $values,
                        'embedded_at' => now(),
                    ])->save();

                    if ($this->supportsPgvector()) {
                        DB::table('brand_dna_knowledge_chunks')
                            ->where('id', $chunk->id)
                            ->update([
                                'embedding_vector' => DB::raw("'".$this->asVectorLiteral($values)."'"),
                            ]);
                    }
                } catch (Throwable $exception) {
                    report($exception);
                }
            });
    }

    public function embedQuery(string $query): ?array
    {
        if (! $this->supportsEmbeddings() || blank(trim($query))) {
            return null;
        }

        try {
            $response = $this->client()
                ->embeddingModel($this->model())
                ->embedContent(
                    $query,
                    TaskType::RETRIEVAL_QUERY,
                    null,
                    $this->dimensions(),
                );

            return $this->normalizeVector($response->embedding->values);
        } catch (Throwable $exception) {
            report($exception);

            return null;
        }
    }

    protected function client(): Client
    {
        $factory = \Gemini::factory()
            ->withApiKey((string) config('ai.providers.gemini.api_key'))
            ->withBaseUrl((string) config('ai.providers.gemini.base_url', 'https://generativelanguage.googleapis.com/v1beta/'));

        if (class_exists(\GuzzleHttp\Client::class)) {
            $factory = $factory->withHttpClient(
                new \GuzzleHttp\Client([
                    'timeout' => (int) config('brand_dna.knowledge_base.embeddings.timeout', 120),
                ]),
            );
        }

        return $factory->make();
    }

    protected function model(): string
    {
        return (string) config('brand_dna.knowledge_base.embeddings.model', 'gemini-embedding-001');
    }

    protected function dimensions(): int
    {
        return (int) config('brand_dna.knowledge_base.embeddings.dimensions', 1536);
    }

    /**
     * @param  array<int, float|int>  $values
     * @return array<int, float>
     */
    protected function normalizeVector(array $values): array
    {
        $vector = array_map(static fn (float|int $value): float => (float) $value, $values);
        $magnitude = sqrt(array_reduce($vector, fn (float $carry, float $value): float => $carry + ($value ** 2), 0.0));

        if ($magnitude <= 0.0) {
            return $vector;
        }

        return array_map(static fn (float $value): float => $value / $magnitude, $vector);
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
