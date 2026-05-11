<?php

namespace App\Services\Installation;

use Illuminate\Support\Facades\File;

class InstallationState
{
    public function installed(): bool
    {
        return File::exists($this->lockFile());
    }

    public function markInstalled(): void
    {
        File::ensureDirectoryExists(dirname($this->lockFile()));

        File::put($this->lockFile(), now()->toIso8601String().PHP_EOL);
    }

    public function lockFile(): string
    {
        return (string) config('installer.lock_file', storage_path('app/installed.lock'));
    }
}
