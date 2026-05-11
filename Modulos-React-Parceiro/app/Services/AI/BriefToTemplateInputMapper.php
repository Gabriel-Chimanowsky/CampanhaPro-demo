<?php

namespace App\Services\AI;

use App\Models\AiTemplate;

class BriefToTemplateInputMapper
{
    /**
     * @param  array<string, mixed>  $answers
     * @param  array<string, mixed>  $existingInput
     * @return array<string, mixed>
     */
    public function map(AiTemplate $template, array $answers, array $existingInput = []): array
    {
        $mapped = $existingInput;
        $schema = $template->getAttribute('input_schema');
        /** @var array<int, array<string, mixed>> $inputSchema */
        $inputSchema = is_array($schema) ? $schema : [];

        foreach ($inputSchema as $field) {
            $name = (string) ($field['name'] ?? '');

            if ($name === '') {
                continue;
            }

            $value = $this->answerForField($name, $answers);

            if (filled($value)) {
                $mapped[$name] = $this->coerceForField((string) $value, $field);

                continue;
            }

            if (! array_key_exists($name, $mapped)) {
                $mapped[$name] = null;
            }
        }

        return $mapped;
    }

    /**
     * @param  array<string, mixed>  $answers
     */
    protected function answerForField(string $fieldName, array $answers): ?string
    {
        $normalized = str($fieldName)->snake()->toString();
        $key = match ($normalized) {
            'objective', 'goal' => 'objective',
            'channel', 'format', 'platform' => 'channel',
            'audience', 'public', 'segment' => 'audience',
            'tone', 'communication_style' => 'tone',
            'cta', 'call_to_action' => 'cta',
            'constraints', 'restriction', 'restrictions' => 'constraints',
            'visual_direction', 'direction' => filled($answers['constraints'] ?? null) ? 'constraints' : 'message',
            'mood' => filled($answers['constraints'] ?? null) ? 'constraints' : 'tone',
            default => 'message',
        };

        $value = $answers[$key] ?? null;

        return filled($value) && ! is_array($value) ? trim((string) $value) : null;
    }

    /**
     * @param  array<string, mixed>  $field
     */
    protected function coerceForField(string $value, array $field): mixed
    {
        $type = (string) ($field['type'] ?? 'text');

        if ($type === 'number') {
            return is_numeric($value) ? (int) $value : $value;
        }

        if ($type !== 'select') {
            return $value;
        }

        $options = collect((array) ($field['options'] ?? []))
            ->map(fn (mixed $option): string => (string) $option)
            ->filter();

        if ($options->isEmpty()) {
            return $value;
        }

        $normalizedValue = str($value)->lower()->ascii()->squish()->toString();

        return $options->first(function (string $option) use ($normalizedValue): bool {
            $normalizedOption = str($option)->lower()->ascii()->squish()->toString();

            return $normalizedOption === $normalizedValue
                || str_contains($normalizedValue, $normalizedOption)
                || str_contains($normalizedOption, $normalizedValue);
        }) ?: $value;
    }
}
