<?php

namespace App\Services\BrandDna\KnowledgeBase;

use App\Data\BrandDna\KnowledgeSourceContentResult;
use App\Services\BrandDna\KnowledgeBase\Contracts\ExtractsWebsiteKnowledgeSources;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class SiteContentExtractor implements ExtractsWebsiteKnowledgeSources
{
    public function __construct(
        protected KnowledgeContentNormalizer $normalizer,
    ) {}

    public function extract(string $url, array $options = []): KnowledgeSourceContentResult
    {
        $response = Http::accept('text/html,application/xhtml+xml')
            ->timeout(15)
            ->connectTimeout(10)
            ->get($url);

        if ($response->failed()) {
            throw new RuntimeException('Nao foi possivel acessar o site informado agora.');
        }

        $html = (string) $response->body();
        $text = $this->extractMainText($html);

        if ($text === '') {
            throw new RuntimeException('O site informado nao retornou texto util para ingestao.');
        }

        return new KnowledgeSourceContentResult(
            content: $text,
            meta: [
                'http_status' => $response->status(),
                'content_type' => $response->header('Content-Type'),
            ],
            title: $this->extractTitle($html),
        );
    }

    protected function extractTitle(string $html): ?string
    {
        if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $matches) !== 1) {
            return null;
        }

        return $this->normalizer->normalize(strip_tags($matches[1]));
    }

    protected function extractMainText(string $html): string
    {
        if (! class_exists(\DOMDocument::class)) {
            return $this->normalizer->normalize(strip_tags($html));
        }

        libxml_use_internal_errors(true);

        $dom = new \DOMDocument('1.0', 'UTF-8');
        $dom->loadHTML('<?xml encoding="utf-8" ?>'.$html, LIBXML_NOERROR | LIBXML_NOWARNING);

        $xpath = new \DOMXPath($dom);

        foreach (['script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside', 'form', 'svg'] as $tag) {
            foreach ($xpath->query('//'.$tag) ?: [] as $node) {
                $node->parentNode?->removeChild($node);
            }
        }

        $mainNode = $xpath->query('//main|//article|//body')?->item(0);
        $text = $mainNode?->textContent ?? '';

        libxml_clear_errors();

        return $this->normalizer->normalize($text);
    }
}
