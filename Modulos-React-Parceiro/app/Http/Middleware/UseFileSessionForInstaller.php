<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Encryption\Encrypter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\Response;

class UseFileSessionForInstaller
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('install*')) {
            config([
                'app.key' => filled(config('app.key')) ? config('app.key') : $this->temporaryKey(),
                'session.driver' => 'file',
                'cache.default' => 'file',
            ]);
        }

        return $next($request);
    }

    protected function temporaryKey(): string
    {
        $path = storage_path('framework/installer.key');

        if (File::exists($path)) {
            return trim((string) File::get($path));
        }

        File::ensureDirectoryExists(dirname($path));

        $key = 'base64:'.base64_encode(Encrypter::generateKey((string) config('app.cipher', 'AES-256-CBC')));

        File::put($path, $key);

        return $key;
    }
}
