<?php

namespace App\Services\BrandDna\KnowledgeBase;

use App\Data\BrandDna\KnowledgeSourceContentResult;
use App\Services\BrandDna\KnowledgeBase\Contracts\ExtractsDocumentText;
use RuntimeException;

class TextDocumentExtractor implements ExtractsDocumentText
{
    public function __construct(
        protected KnowledgeContentNormalizer $normalizer,
    ) {}

    public function extract(string $path, array $options = []): KnowledgeSourceContentResult
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $title = $options['title'] ?? pathinfo($path, PATHINFO_FILENAME);

        $content = match ($extension) {
            'txt', 'md', 'csv', 'json' => $this->readPlainText($path),
            'pdf' => $this->extractPdfText($path),
            default => throw new RuntimeException('Formato de documento ainda nao suportado para ingestao automatica.'),
        };

        $content = $this->normalizer->normalize($content);

        if ($content === '') {
            throw new RuntimeException('Nao foi possivel extrair texto util deste documento.');
        }

        return new KnowledgeSourceContentResult(
            content: $content,
            meta: [
                'source_extension' => $extension,
                'source_size_bytes' => @filesize($path) ?: null,
            ],
            title: is_string($title) ? $title : null,
        );
    }

    protected function readPlainText(string $path): string
    {
        $content = @file_get_contents($path);

        if (! is_string($content)) {
            throw new RuntimeException('Nao foi possivel ler o documento informado.');
        }

        return $content;
    }

    protected function extractPdfText(string $path): string
    {
        $binary = @file_get_contents($path);

        if (! is_string($binary)) {
            throw new RuntimeException('Nao foi possivel ler o PDF informado.');
        }

        preg_match_all('/[\x20-\x7E]{4,}/', $binary, $matches);

        return collect($matches[0] ?? [])
            ->map(fn (string $part): string => trim($part))
            ->filter(fn (string $part): bool => strlen($part) >= 4)
            ->implode("\n");
    }
}
