<?php

namespace App\Services\Installation;

class ServerRequirementChecker
{
    /**
     * @return array<int, array{name: string, expected: string, actual: string, passed: bool, blocking: bool}>
     */
    public function checks(): array
    {
        return [
            $this->phpVersion(),
            ...$this->extensions(),
            ...$this->writablePaths(),
            $this->documentRoot(),
        ];
    }

    public function hasBlockingFailures(): bool
    {
        return collect($this->checks())->contains(
            fn (array $check): bool => $check['blocking'] && ! $check['passed'],
        );
    }

    /**
     * @return array{name: string, expected: string, actual: string, passed: bool, blocking: bool}
     */
    protected function phpVersion(): array
    {
        $required = (string) config('installer.required_php_version', '8.3.0');

        return [
            'name' => 'Versao do PHP',
            'expected' => 'PHP '.$required.' ou superior',
            'actual' => PHP_VERSION,
            'passed' => version_compare(PHP_VERSION, $required, '>='),
            'blocking' => true,
        ];
    }

    /**
     * @return array<int, array{name: string, expected: string, actual: string, passed: bool, blocking: bool}>
     */
    protected function extensions(): array
    {
        return collect(config('installer.required_extensions', []))
            ->map(fn (string $extension): array => [
                'name' => 'Extensao '.$extension,
                'expected' => 'Instalada',
                'actual' => extension_loaded($extension) ? 'Instalada' : 'Ausente',
                'passed' => extension_loaded($extension),
                'blocking' => true,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{name: string, expected: string, actual: string, passed: bool, blocking: bool}>
     */
    protected function writablePaths(): array
    {
        return collect(config('installer.writable_paths', []))
            ->map(fn (string $path): array => [
                'name' => 'Permissao de escrita',
                'expected' => $path,
                'actual' => is_writable($path) ? 'Gravavel' : 'Sem escrita',
                'passed' => is_writable($path),
                'blocking' => true,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array{name: string, expected: string, actual: string, passed: bool, blocking: bool}
     */
    protected function documentRoot(): array
    {
        $documentRoot = realpath((string) ($_SERVER['DOCUMENT_ROOT'] ?? '')) ?: '';
        $publicPath = realpath(public_path()) ?: public_path();
        $passed = $documentRoot !== '' && $documentRoot === $publicPath;

        return [
            'name' => 'Pasta publica do dominio',
            'expected' => $publicPath,
            'actual' => $documentRoot !== '' ? $documentRoot : 'Nao detectada',
            'passed' => $passed,
            'blocking' => false,
        ];
    }
}
