<?php

namespace App\Services\AI\Support;

use Illuminate\Validation\Rule;

class InputSchemaRules
{
    /**
     * @param  array<int, array<string, mixed>>  $schema
     * @return array<string, array<int, mixed>>
     */
    public function build(array $schema, string $prefix = ''): array
    {
        $rules = [];

        foreach ($schema as $field) {
            $name = $field['name'] ?? null;

            if (! is_string($name) || $name === '') {
                continue;
            }

            $key = ltrim($prefix.'.'.$name, '.');
            $fieldRules = [
                ($field['required'] ?? false) ? 'required' : 'nullable',
            ];

            $type = $field['type'] ?? 'text';

            match ($type) {
                'number' => $fieldRules[] = 'numeric',
                default => $fieldRules[] = 'string',
            };

            if (in_array($type, ['text', 'textarea', 'select'], true) && isset($field['max'])) {
                $fieldRules[] = 'max:'.$field['max'];
            }

            if ($type === 'number') {
                if (isset($field['min'])) {
                    $fieldRules[] = 'min:'.$field['min'];
                }

                if (isset($field['max'])) {
                    $fieldRules[] = 'max:'.$field['max'];
                }
            }

            if ($type === 'select' && is_array($field['options'] ?? null) && $field['options'] !== []) {
                $fieldRules[] = Rule::in(array_map('strval', $field['options']));
            }

            $rules[$key] = $fieldRules;
        }

        return $rules;
    }

    /**
     * @param  array<int, array<string, mixed>>  $schema
     * @return array<string, string>
     */
    public function attributes(array $schema, string $prefix = ''): array
    {
        $attributes = [];

        foreach ($schema as $field) {
            $name = $field['name'] ?? null;

            if (! is_string($name) || $name === '') {
                continue;
            }

            $attributes[ltrim($prefix.'.'.$name, '.')] = (string) ($field['label'] ?? $name);
        }

        return $attributes;
    }
}
