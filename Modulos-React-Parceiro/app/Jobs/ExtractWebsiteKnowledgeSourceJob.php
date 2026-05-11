<?php

namespace App\Jobs;

use App\Models\BrandDnaKnowledgeDocument;
use App\Services\BrandDna\KnowledgeBase\Contracts\ExtractsWebsiteKnowledgeSources;
use App\Services\BrandDna\KnowledgeBase\KnowledgeDocumentManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class ExtractWebsiteKnowledgeSourceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $documentId,
    ) {}

    public function handle(
        ExtractsWebsiteKnowledgeSources $extractor,
        KnowledgeDocumentManager $manager,
    ): void {
        $document = BrandDnaKnowledgeDocument::query()->find($this->documentId);

        if (! $document || blank($document->source_url)) {
            return;
        }

        $manager->markProcessing($document);

        try {
            $result = $extractor->extract($document->source_url, ['title' => $document->title]);

            $manager->markReadyFromSource(
                $document,
                $result->content,
                $document->summary ?: $result->summary,
                [
                    ...($document->meta ?? []),
                    ...$result->meta,
                    'source_kind' => 'site',
                ],
                $result->title ?: $document->title,
            );
        } catch (Throwable $exception) {
            report($exception);

            $manager->markFailed($document, $exception->getMessage());
        }
    }
}
