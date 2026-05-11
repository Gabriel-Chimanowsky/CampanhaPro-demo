<?php

namespace App\Services\AI;

use App\Models\AiTemplate;

class PlainTextOutputNormalizer
{
    public function normalize(string $text, AiTemplate $template): string
    {
        if ($this->allowsMarkdown($template)) {
            return trim($text);
        }

        $normalized = preg_replace('/^\s{0,3}#{1,6}\s+/m', '', $text) ?? $text;
        $normalized = preg_replace('/\*\*(.*?)\*\*/s', '$1', $normalized) ?? $normalized;
        $normalized = preg_replace('/__(.*?)__/s', '$1', $normalized) ?? $normalized;
        $normalized = preg_replace('/(?<!\*)\*(?!\s)(.*?)(?<!\s)\*(?!\*)/s', '$1', $normalized) ?? $normalized;
        $normalized = preg_replace("/\n{3,}/", "\n\n", $normalized) ?? $normalized;

        return trim($normalized);
    }

    protected function allowsMarkdown(AiTemplate $template): bool
    {
        $schema = $template->getAttribute('input_schema');
        $inputSchema = is_array($schema) ? $schema : [];

        if (collect($inputSchema)->contains(fn (array $field): bool => (bool) ($field['allow_markdown'] ?? false))) {
            return true;
        }

        $prompt = mb_strtolower(trim(collect([
            $template->system_prompt,
            $template->user_prompt_template,
        ])->filter()->implode(' ')));

        return str_contains($prompt, 'markdown');
    }
}
