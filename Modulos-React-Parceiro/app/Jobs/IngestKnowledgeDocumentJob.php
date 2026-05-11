<?php

namespace App\Jobs;

use App\Models\BrandDnaKnowledgeDocument;
use App\Services\BrandDna\KnowledgeBase\Contracts\ExtractsDocumentText;
use App\Services\BrandDna\KnowledgeBase\KnowledgeDocumentManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Throwable;

class IngestKnowledgeDocumentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $documentId,
    ) {}

    public function handle(
        ExtractsDocumentText $extractor,
        KnowledgeDocumentManager $manager,
    ): void {
        $document = BrandDnaKnowledgeDocument::query()->find($this->documentId);

        if (! $document) {
            return;
        }

        $disk = data_get($document->meta, 'temporary_disk', config('brand_dna.knowledge_base.temporary_disk', 'local'));
        $path = data_get($document->meta, 'temporary_path');

        if (! is_string($path) || $path === '') {
            $manager->markFailed($document, 'O arquivo temporario nao esta mais disponivel para processamento.');

            return;
        }

        $manager->markProcessing($document);

        try {
            $result = $extractor->extract(Storage::disk($disk)->path($path), ['title' => $document->title]);

            $manager->markReadyFromSource(
                $document,
                $result->content,
                $document->summary ?: $result->summary,
                [
                    ...($document->meta ?? []),
                    ...$result->meta,
                    'source_kind' => 'document',
                ],
                $result->title ?: $document->title,
            );
        } catch (Throwable $exception) {
            report($exception);

            $manager->markFailed($document, $exception->getMessage());
        } finally {
            Storage::disk($disk)->delete($path);
        }
    }
}
