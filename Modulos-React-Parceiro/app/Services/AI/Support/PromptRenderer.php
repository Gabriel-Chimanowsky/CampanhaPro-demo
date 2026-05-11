<?php

namespace App\Services\AI\Support;

class PromptRenderer
{
    /**
     * @param  array<string, mixed>  $input
     */
    public function render(string $template, array $input): string
    {
        return preg_replace_callback(
            '/\{([a-zA-Z0-9_]+)\}/',
            function (array $matches) use ($input): string {
                $value = $input[$matches[1]] ?? '';

                return is_scalar($value) ? (string) $value : '';
            },
            $template,
        ) ?? $template;
    }
}
