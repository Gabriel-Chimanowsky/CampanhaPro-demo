<?php

namespace App\Services\BrandDna\KnowledgeBase;

use App\Enums\BrandDnaKnowledgeDocumentType;
use App\Enums\BrandDnaKnowledgeIngestionStatus;
use App\Jobs\ChunkKnowledgeDocumentJob;
use App\Jobs\ExtractWebsiteKnowledgeSourceJob;
use App\Jobs\IngestKnowledgeDocumentJob;
use App\Jobs\TranscribeMp4KnowledgeSourceJob;
use App\Jobs\TranscribeYoutubeKnowledgeSourceJob;
use App\Models\BrandDna;
use App\Models\BrandDnaKnowledgeDocument;
use App\Models\User;

class KnowledgeDocumentManager
{
    public function __construct(
        protected KnowledgeContentNormalizer $normalizer,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function createFromPayload(BrandDna $brandDna, User $actor, array $payload): BrandDnaKnowledgeDocument
    {
        $type = BrandDnaKnowledgeDocumentType::from((string) $payload['type']);

        $document = BrandDnaKnowledgeDocument::create([
            'brand_dna_id' => $brandDna->id,
            'type' => $type,
            'title' => (string) $payload['title'],
            'source_url' => $payload['source_url'] ?? null,
            'source_filename' => $payload['source_filename'] ?? null,
            'summary' => $payload['summary'] ?? null,
            'content' => $type === BrandDnaKnowledgeDocumentType::Text
                ? $this->normalizer->normalize((string) ($payload['content'] ?? ''))
                : null,
            'meta' => $payload['meta'] ?? [],
            'ingestion_status' => $type === BrandDnaKnowledgeDocumentType::Text
                ? BrandDnaKnowledgeIngestionStatus::Ready
                : BrandDnaKnowledgeIngestionStatus::Pending,
            'ingested_at' => $type === BrandDnaKnowledgeDocumentType::Text ? now() : null,
            'last_processed_at' => $type === BrandDnaKnowledgeDocumentType::Text ? now() : null,
            'created_by' => $actor->id,
            'updated_by' => $actor->id,
        ]);

        if ($type === BrandDnaKnowledgeDocumentType::Text) {
            ChunkKnowledgeDocumentJob::dispatchSync($document->id);

            return $document->fresh('chunks');
        }

        $this->dispatchJobForDocument($document);

        return $document->fresh();
    }

    public function markProcessing(BrandDnaKnowledgeDocument $document): void
    {
        $document->forceFill([
            'ingestion_status' => BrandDnaKnowledgeIngestionStatus::Processing,
            'ingestion_error' => null,
        ])->save();
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    public function markReadyFromSource(
        BrandDnaKnowledgeDocument $document,
        string $content,
        ?string $summary = null,
        array $meta = [],
        ?string $title = null,
    ): BrandDnaKnowledgeDocument {
        $document->forceFill([
            'title' => $title ?: $document->title,
            'summary' => $summary ?: $document->summary,
            'content' => $this->normalizer->normalize($content),
            'meta' => array_filter([
                ...($document->meta ?? []),
                ...$meta,
            ], fn (mixed $value): bool => $value !== null),
            'ingestion_status' => BrandDnaKnowledgeIngestionStatus::Ready,
            'ingestion_error' => null,
            'ingested_at' => $document->ingested_at ?: now(),
            'last_processed_at' => now(),
        ])->save();

        ChunkKnowledgeDocumentJob::dispatchSync($document->id);

        return $document->fresh('chunks');
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    public function markFailed(BrandDnaKnowledgeDocument $document, string $message, array $meta = []): void
    {
        $document->forceFill([
            'meta' => array_filter([
                ...($document->meta ?? []),
                ...$meta,
            ], fn (mixed $value): bool => $value !== null),
            'ingestion_status' => BrandDnaKnowledgeIngestionStatus::Failed,
            'ingestion_error' => $message,
        ])->save();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function updateEditableContent(BrandDnaKnowledgeDocument $document, User $actor, array $payload): BrandDnaKnowledgeDocument
    {
        $document->forceFill([
            'title' => (string) ($payload['title'] ?? $document->title),
            'summary' => $payload['summary'] ?? null,
            'content' => $this->normalizer->normalize((string) ($payload['content'] ?? $document->content ?? '')),
            'meta' => array_filter([
                ...($document->meta ?? []),
                ...($payload['meta'] ?? []),
            ], fn (mixed $value): bool => $value !== null),
            'updated_by' => $actor->id,
            'ingestion_status' => BrandDnaKnowledgeIngestionStatus::Ready,
            'ingestion_error' => null,
            'last_processed_at' => now(),
        ])->save();

        ChunkKnowledgeDocumentJob::dispatchSync($document->id);

        return $document->fresh('chunks');
    }

    public function reprocess(BrandDnaKnowledgeDocument $document): BrandDnaKnowledgeDocument
    {
        $document->forceFill([
            'ingestion_status' => BrandDnaKnowledgeIngestionStatus::Pending,
            'ingestion_error' => null,
        ])->save();

        $temporaryPath = data_get($document->meta, 'temporary_path');

        if (
            in_array($document->type, [BrandDnaKnowledgeDocumentType::Document, BrandDnaKnowledgeDocumentType::Mp4Transcript], true)
            && blank($temporaryPath)
        ) {
            $document->forceFill([
                'last_processed_at' => now(),
                'ingestion_status' => BrandDnaKnowledgeIngestionStatus::Ready,
            ])->save();

            ChunkKnowledgeDocumentJob::dispatchSync($document->id);

            return $document->fresh('chunks');
        }

        if ($document->type === BrandDnaKnowledgeDocumentType::Text) {
            $document->forceFill([
                'last_processed_at' => now(),
                'ingestion_status' => BrandDnaKnowledgeIngestionStatus::Ready,
            ])->save();

            ChunkKnowledgeDocumentJob::dispatchSync($document->id);

            return $document->fresh('chunks');
        }

        $this->dispatchJobForDocument($document);

        return $document->fresh();
    }

    public function delete(BrandDnaKnowledgeDocument $document): void
    {
        $document->chunks()->delete();
        $document->delete();
    }

    protected function dispatchJobForDocument(BrandDnaKnowledgeDocument $document): void
    {
        match ($document->type) {
            BrandDnaKnowledgeDocumentType::Document => IngestKnowledgeDocumentJob::dispatch($document->id),
            BrandDnaKnowledgeDocumentType::Site => ExtractWebsiteKnowledgeSourceJob::dispatch($document->id),
            BrandDnaKnowledgeDocumentType::Youtube => TranscribeYoutubeKnowledgeSourceJob::dispatch($document->id),
            BrandDnaKnowledgeDocumentType::Mp4Transcript => TranscribeMp4KnowledgeSourceJob::dispatch($document->id),
            default => ChunkKnowledgeDocumentJob::dispatchSync($document->id),
        };
    }
}
