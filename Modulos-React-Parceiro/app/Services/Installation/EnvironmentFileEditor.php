<?php

namespace App\Services\Installation;

use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\File;
use RuntimeException;

class EnvironmentFileEditor
{
    public function write(array $values): void
    {
        $path = (string) config('installer.env_file', base_path('.env'));
        $content = File::exists($path)
            ? (string) File::get($path)
            : $this->initialContent();

        $values['APP_KEY'] = filled($values['APP_KEY'] ?? null)
            ? $values['APP_KEY']
            : 'base64:'.base64_encode(Encrypter::generateKey((string) config('app.cipher', 'AES-256-CBC')));

        foreach ($values as $key => $value) {
            $content = $this->setValue($content, (string) $key, $this->formatValue($value));
        }

        File::put($path, $content);
    }

    protected function initialContent(): string
    {
        $examplePath = (string) config('installer.env_example_file', base_path('.env.example'));

        if (! File::exists($examplePath)) {
            throw new RuntimeException('Arquivo .env.example nao encontrado.');
        }

        return (string) File::get($examplePath);
    }

    protected function setValue(string $content, string $key, string $value): string
    {
        $line = $key.'='.$value;

        if (preg_match('/^'.preg_quote($key, '/').'=.*/m', $content) === 1) {
            return preg_replace('/^'.preg_quote($key, '/').'=.*/m', $line, $content) ?? $content;
        }

        return rtrim($content).PHP_EOL.$line.PHP_EOL;
    }

    protected function formatValue(mixed $value): string
    {
        $value = (string) $value;

        if ($value === '') {
            return '';
        }

        if (preg_match('/\s|#|"|\'/', $value) !== 1) {
            return $value;
        }

        return '"'.str_replace('"', '\"', $value).'"';
    }
}
