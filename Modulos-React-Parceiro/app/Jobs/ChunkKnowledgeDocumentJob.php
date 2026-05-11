<?php

namespace App\Jobs;

use App\Models\BrandDnaKnowledgeDocument;
use App\Services\BrandDna\KnowledgeBase\Contracts\EmbedsKnowledgeContent;
use App\Services\BrandDna\KnowledgeBase\KnowledgeChunker;
use App\Services\BrandDna\KnowledgeBase\KnowledgeContentNormalizer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ChunkKnowledgeDocumentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $documentId,
    ) {}

    public function handle(
        KnowledgeChunker $chunker,
        KnowledgeContentNormalizer $normalizer,
        EmbedsKnowledgeContent $embedder,
    ): void {
        $document = BrandDnaKnowledgeDocument::query()->find($this->documentId);

        if (! $document) {
            return;
        }

        $document->chunks()->delete();

        $content = $normalizer->normalize((string) $document->content);

        if ($content === '') {
            return;
        }

        collect($chunker->split($content))
            ->values()
            ->each(function (string $chunk, int $index) use ($document): void {
                $document->chunks()->create([
                    'brand_dna_id' => $document->brand_dna_id,
                    'chunk_index' => $index,
                    'content' => $chunk,
                    'meta' => [
                        'document_type' => $document->type->value,
                        'document_title' => $document->title,
                    ],
                ]);
            });

        $embedder->embedChunks($document->fresh('chunks')->chunks);
    }
}
