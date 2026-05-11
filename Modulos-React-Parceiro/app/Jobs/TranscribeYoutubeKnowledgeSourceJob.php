<?php

namespace App\Jobs;

use App\Models\BrandDnaKnowledgeDocument;
use App\Services\BrandDna\KnowledgeBase\Contracts\TranscribesKnowledgeSources;
use App\Services\BrandDna\KnowledgeBase\KnowledgeDocumentManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class TranscribeYoutubeKnowledgeSourceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $documentId,
    ) {}

    public function handle(
        TranscribesKnowledgeSources $transcriber,
        KnowledgeDocumentManager $manager,
    ): void {
        $document = BrandDnaKnowledgeDocument::query()->find($this->documentId);

        if (! $document || blank($document->source_url)) {
            return;
        }

        $manager->markProcessing($document);

        try {
            $result = $transcriber->transcribeYoutube($document->source_url, ['title' => $document->title]);

            $manager->markReadyFromSource(
                $document,
                $result->text,
                $document->summary,
                [
                    ...($document->meta ?? []),
                    ...$result->meta,
                    'source_kind' => 'youtube',
                ],
                $result->title ?: $document->title,
            );
        } catch (Throwable $exception) {
            report($exception);

            $manager->markFailed($document, $exception->getMessage());
        }
    }
}
