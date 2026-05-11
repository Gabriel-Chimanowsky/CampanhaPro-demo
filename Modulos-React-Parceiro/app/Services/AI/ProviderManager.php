<?php

namespace App\Services\AI;

use App\Enums\AiTemplateType;
use App\Models\AiTemplate;
use App\Services\AI\Contracts\GeneratesImages;
use App\Services\AI\Contracts\GeneratesText;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class ProviderManager
{
    public function __construct(
        protected Application $app,
    ) {}

    public function providerNameFor(AiTemplate $template): string
    {
        return $template->provider ?: config('ai.default_provider');
    }

    /**
     * @return array<int, array{key: string, label: string, models: array<int, array{id: string, label: string}>}>
     */
    public function textProviderOptions(): array
    {
        return $this->providersFor(AiTemplateType::Text);
    }

    /**
     * @return array<int, array{key: string, label: string, models: array<int, array{id: string, label: string}>}>
     */
    public function providersFor(AiTemplateType $type): array
    {
        $providers = [];

        foreach ((array) config('ai.providers', []) as $key => $config) {
            if (($config['enabled'] ?? true) !== true) {
                continue;
            }

            $models = $this->modelsFor($key, $type);

            if ($models === []) {
                continue;
            }

            $providers[] = [
                'key' => (string) $key,
                'label' => (string) ($config['label'] ?? Str::headline((string) $key)),
                'models' => $models,
            ];
        }

        return $providers;
    }

    /**
     * @return array<int, array{id: string, label: string}>
     */
    public function modelsFor(string $provider, AiTemplateType $type): array
    {
        $typeKey = $type === AiTemplateType::Text ? 'text' : 'image';
        $configuredModels = (array) config("ai.providers.{$provider}.models.{$typeKey}", []);

        if ($configuredModels !== []) {
            return collect($configuredModels)
                ->map(function (mixed $model): ?array {
                    if (is_string($model) && $model !== '') {
                        return [
                            'id' => $model,
                            'label' => $model,
                        ];
                    }

                    if (is_array($model) && filled($model['id'] ?? null)) {
                        return [
                            'id' => (string) $model['id'],
                            'label' => (string) ($model['label'] ?? $model['id']),
                        ];
                    }

                    return null;
                })
                ->filter()
                ->values()
                ->all();
        }

        $fallbackModel = $this->modelFor($provider, $type);

        return filled($fallbackModel)
            ? [['id' => $fallbackModel, 'label' => $fallbackModel]]
            : [];
    }

    public function modelFor(string $provider, AiTemplateType $type): ?string
    {
        return config(sprintf(
            'ai.providers.%s.%s_model',
            $provider,
            $type === AiTemplateType::Text ? 'text' : 'image',
        ));
    }

    /**
     * @return array{provider: string, model: string}
     */
    public function resolveSelection(AiTemplate $template, ?string $provider = null, ?string $model = null): array
    {
        $providers = $this->providersFor($template->type);

        if ($providers === []) {
            throw ValidationException::withMessages([
                'provider' => 'Nenhum provider de IA esta configurado para este tipo de template.',
            ]);
        }

        $providerMap = collect($providers)->keyBy('key');

        $resolvedProvider = filled($provider) ? $provider : $this->providerNameFor($template);

        if (! $providerMap->has($resolvedProvider)) {
            $resolvedProvider = (string) Arr::first($providers)['key'];
        }

        $models = $this->modelsFor($resolvedProvider, $template->type);

        if ($models === []) {
            throw ValidationException::withMessages([
                'model' => 'Nao existem modelos disponiveis para o provider selecionado.',
            ]);
        }

        $modelIds = collect($models)->pluck('id');
        $resolvedModel = filled($model) ? $model : ($template->model ?: $this->modelFor($resolvedProvider, $template->type));

        if (! $modelIds->contains($resolvedModel)) {
            $resolvedModel = (string) $modelIds->first();
        }

        return [
            'provider' => $resolvedProvider,
            'model' => $resolvedModel,
        ];
    }

    /**
     * @return array{provider: string, model: string}
     */
    public function resolveTextSelection(?string $provider = null, ?string $model = null): array
    {
        $providers = $this->providersFor(AiTemplateType::Text);

        if ($providers === []) {
            throw ValidationException::withMessages([
                'provider' => 'Nenhum provider de IA esta configurado para conversas em texto.',
            ]);
        }

        $providerMap = collect($providers)->keyBy('key');
        $resolvedProvider = filled($provider) ? $provider : (string) config('ai.default_provider');

        if (! $providerMap->has($resolvedProvider)) {
            $resolvedProvider = (string) Arr::first($providers)['key'];
        }

        $models = $this->modelsFor($resolvedProvider, AiTemplateType::Text);

        if ($models === []) {
            throw ValidationException::withMessages([
                'model' => 'Nao existem modelos disponiveis para o provider selecionado.',
            ]);
        }

        $modelIds = collect($models)->pluck('id');
        $resolvedModel = filled($model) ? $model : ($this->modelFor($resolvedProvider, AiTemplateType::Text));

        if (! $modelIds->contains($resolvedModel)) {
            $resolvedModel = (string) $modelIds->first();
        }

        return [
            'provider' => $resolvedProvider,
            'model' => $resolvedModel,
        ];
    }

    public function text(string $provider): GeneratesText
    {
        $instance = $this->resolve($provider);

        if (! $instance instanceof GeneratesText) {
            throw new InvalidArgumentException("Provider [{$provider}] cannot generate text.");
        }

        return $instance;
    }

    public function images(string $provider): GeneratesImages
    {
        $instance = $this->resolve($provider);

        if (! $instance instanceof GeneratesImages) {
            throw new InvalidArgumentException("Provider [{$provider}] cannot generate images.");
        }

        return $instance;
    }

    protected function resolve(string $provider): mixed
    {
        $driver = config("ai.providers.{$provider}.driver");

        if (! is_string($driver) || $driver === '') {
            throw new InvalidArgumentException("AI provider [{$provider}] is not configured.");
        }

        return $this->app->make($driver);
    }
}
