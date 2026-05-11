<?php

namespace App\Services\BrandDna\KnowledgeBase;

class KnowledgeChunker
{
    /**
     * @return array<int, string>
     */
    public function split(string $content): array
    {
        $size = max(350, (int) config('brand_dna.knowledge_base.chunk_size', 1100));
        $overlap = max(40, (int) config('brand_dna.knowledge_base.chunk_overlap', 180));
        $paragraphs = preg_split("/\n{2,}/", trim($content)) ?: [];

        $chunks = [];
        $current = '';

        foreach ($paragraphs as $paragraph) {
            $paragraph = trim($paragraph);

            if ($paragraph === '') {
                continue;
            }

            if (mb_strlen($paragraph) > $size) {
                if ($current !== '') {
                    $chunks[] = trim($current);
                    $current = '';
                }

                $chunks = [...$chunks, ...$this->window($paragraph, $size, $overlap)];

                continue;
            }

            $candidate = trim($current === '' ? $paragraph : $current."\n\n".$paragraph);

            if (mb_strlen($candidate) <= $size) {
                $current = $candidate;

                continue;
            }

            if ($current !== '') {
                $chunks[] = trim($current);
            }

            $current = $paragraph;
        }

        if ($current !== '') {
            $chunks[] = trim($current);
        }

        return array_values(array_filter(array_unique($chunks)));
    }

    /**
     * @return array<int, string>
     */
    protected function window(string $content, int $size, int $overlap): array
    {
        $chunks = [];
        $length = mb_strlen($content);
        $step = max(1, $size - $overlap);

        for ($offset = 0; $offset < $length; $offset += $step) {
            $chunk = trim(mb_substr($content, $offset, $size));

            if ($chunk !== '') {
                $chunks[] = $chunk;
            }
        }

        return $chunks;
    }
}
