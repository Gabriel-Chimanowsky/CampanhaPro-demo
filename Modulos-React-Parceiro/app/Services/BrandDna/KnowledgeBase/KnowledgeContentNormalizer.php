<?php

namespace App\Services\BrandDna\KnowledgeBase;

class KnowledgeContentNormalizer
{
    public function normalize(string $content): string
    {
        $content = str_replace(["\r\n", "\r"], "\n", $content);
        $content = preg_replace('/[^\P{C}\n\t]+/u', ' ', $content) ?? $content;
        $content = preg_replace("/[ \t]+/", ' ', $content) ?? $content;
        $content = preg_replace("/\n{3,}/", "\n\n", $content) ?? $content;

        return trim($content);
    }
}
