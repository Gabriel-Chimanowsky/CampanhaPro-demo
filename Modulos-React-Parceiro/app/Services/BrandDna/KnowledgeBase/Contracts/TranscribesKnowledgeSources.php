<?php

namespace App\Services\BrandDna\KnowledgeBase\Contracts;

use App\Data\BrandDna\KnowledgeTranscriptResult;

interface TranscribesKnowledgeSources
{
    /**
     * @param  array<string, mixed>  $options
     */
    public function transcribeYoutube(string $url, array $options = []): KnowledgeTranscriptResult;

    /**
     * @param  array<string, mixed>  $options
     */
    public function transcribeMp4(string $path, array $options = []): KnowledgeTranscriptResult;
}
