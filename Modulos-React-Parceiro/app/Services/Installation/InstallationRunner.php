<?php

namespace App\Services\Installation;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use RuntimeException;

class InstallationRunner
{
    public function __construct(
        protected EnvironmentFileEditor $environment,
        protected InstallationState $state,
    ) {}

    /**
     * @return array<int, array{name: string, status: string, output: string}>
     */
    public function run(array $environment, array $database): array
    {
        $this->environment->write([
            'APP_NAME' => $environment['app_name'],
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'APP_URL' => $environment['app_url'],
            'APP_LOCALE' => 'pt_BR',
            'APP_FALLBACK_LOCALE' => 'pt_BR',
            'LOG_LEVEL' => 'error',
            'DB_CONNECTION' => $database['driver'],
            'DB_HOST' => $database['host'],
            'DB_PORT' => $database['port'],
            'DB_DATABASE' => $database['database'],
            'DB_USERNAME' => $database['username'],
            'DB_PASSWORD' => $database['password'],
            'SESSION_DRIVER' => 'database',
            'CACHE_STORE' => 'database',
            'QUEUE_CONNECTION' => 'database',
            'FILESYSTEM_DISK' => 'local',
            'AI_OUTPUT_DISK' => 'public',
            'AI_OUTPUT_PATH' => 'ai-generations',
            'BRAND_DNA_PGVECTOR_ENABLED' => 'false',
            'BRAND_DNA_EMBEDDINGS_ENABLED' => $environment['embeddings_enabled'] ? 'true' : 'false',
            'AI_DEFAULT_PROVIDER' => $environment['ai_default_provider'],
            'OPENAI_API_KEY' => $environment['openai_api_key'] ?? '',
            'GEMINI_API_KEY' => $environment['gemini_api_key'] ?? '',
            'OPENROUTER_API_KEY' => $environment['openrouter_api_key'] ?? '',
            'VITE_APP_NAME' => '${APP_NAME}',
        ]);

        $this->configureRuntimeDatabase($database);

        $steps = [];
        $steps[] = $this->call('migrate --force', ['--force' => true]);
        $steps[] = $this->call('db:seed --class=AiTemplateSeeder --force', [
            '--class' => 'AiTemplateSeeder',
            '--force' => true,
        ]);
        $steps[] = $this->call('storage:link', [], blocking: false);
        $steps[] = $this->call('optimize:clear', []);
        $steps[] = $this->call('optimize', []);

        $this->state->markInstalled();
        File::delete(storage_path('framework/installer.key'));

        return $steps;
    }

    protected function configureRuntimeDatabase(array $database): void
    {
        config([
            'database.default' => $database['driver'],
            "database.connections.{$database['driver']}.host" => $database['host'],
            "database.connections.{$database['driver']}.port" => $database['port'],
            "database.connections.{$database['driver']}.database" => $database['database'],
            "database.connections.{$database['driver']}.username" => $database['username'],
            "database.connections.{$database['driver']}.password" => $database['password'],
            'session.driver' => 'database',
            'cache.default' => 'database',
            'queue.default' => 'database',
        ]);
    }

    protected function call(string $label, array $arguments, bool $blocking = true): array
    {
        $command = explode(' ', $label, 2)[0];

        $status = Artisan::call($command, $arguments);
        $output = trim(Artisan::output());

        if ($blocking && $status !== 0) {
            throw new RuntimeException("Comando php artisan {$label} falhou. {$output}");
        }

        return [
            'name' => 'php artisan '.$label,
            'status' => $status === 0 ? 'ok' : 'aviso',
            'output' => $output,
        ];
    }
}
