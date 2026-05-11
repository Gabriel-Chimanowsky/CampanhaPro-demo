<?php

namespace App\Services\AI\Providers;

use App\Services\AI\Contracts\GeneratesText;
use App\Services\AI\Support\AiProviderException;
use App\Services\AI\Support\TextGenerationResult;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Arr;
use MoeMizrak\LaravelOpenrouter\DTO\ChatData;
use MoeMizrak\LaravelOpenrouter\DTO\ErrorData;
use MoeMizrak\LaravelOpenrouter\DTO\MessageData;
use MoeMizrak\LaravelOpenrouter\DTO\ProviderPreferencesData;
use MoeMizrak\LaravelOpenrouter\DTO\ResponseData;
use MoeMizrak\LaravelOpenrouter\OpenRouterRequest;
use Psr\Http\Message\ResponseInterface;
use Throwable;

class OpenRouterProvider implements GeneratesText
{
    public function __construct(
        protected OpenRouterRequest $request,
    ) {}

    public function generateText(string $prompt, array $options = []): TextGenerationResult
    {
        $config = $this->config();
        $model = (string) ($options['model'] ?? $config['text_model'] ?? '');

        if ($model === '') {
            throw new AiProviderException('Nenhum modelo do OpenRouter foi configurado para geracao de texto.');
        }

        try {
            $response = $this->request->chatRequest(new ChatData(
                messages: $this->messages($prompt, $options),
                model: $model,
                usage: true,
                route: filled($config['route'] ?? null) ? (string) $config['route'] : null,
                provider: $this->providerPreferences($config['provider_preferences'] ?? []),
            ));

            if ($response instanceof ErrorData) {
                throw $this->toProviderException($response->code, $response->message);
            }

            $text = trim($this->extractText($response));

            if ($text === '') {
                throw new AiProviderException('A IA nao retornou texto para este template.');
            }

            return new TextGenerationResult(
                text: $text,
                meta: array_filter([
                    'response_id' => $response->id,
                    'provider_model' => $response->model ?: $model,
                    'provider_name' => $response->provider,
                    'usage' => $response->usage?->toArray() ?? [],
                    'provider_route' => $config['route'] ?? null,
                    'provider_preferences' => $this->providerPreferencesSnapshot($config['provider_preferences'] ?? []),
                ], fn (mixed $value): bool => $value !== null),
            );
        } catch (RequestException $exception) {
            throw $this->toProviderExceptionFromHttp($exception);
        } catch (Throwable $exception) {
            if ($exception instanceof AiProviderException) {
                throw $exception;
            }

            report($exception);

            throw new AiProviderException(
                userMessage: 'Nao foi possivel gerar o texto agora. Tente novamente em instantes.',
                previous: $exception,
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function config(): array
    {
        return config('ai.providers.openrouter', []);
    }

    /**
     * @param  array<string, mixed>  $options
     * @return array<int, MessageData>
     */
    protected function messages(string $prompt, array $options): array
    {
        $messages = [];

        if (filled($options['system_prompt'] ?? null)) {
            $messages[] = new MessageData(
                role: 'system',
                content: (string) $options['system_prompt'],
            );
        }

        $messages[] = new MessageData(
            role: 'user',
            content: $prompt,
        );

        return $messages;
    }

    /**
     * @param  array<string, mixed>  $preferences
     */
    protected function providerPreferences(array $preferences): ?ProviderPreferencesData
    {
        $snapshot = $this->providerPreferencesSnapshot($preferences);

        if ($snapshot === []) {
            return null;
        }

        return new ProviderPreferencesData(
            allow_fallbacks: $snapshot['allow_fallbacks'] ?? null,
            require_parameters: $snapshot['require_parameters'] ?? null,
            data_collection: $snapshot['data_collection'] ?? null,
            order: $snapshot['order'] ?? null,
            zdr: $snapshot['zdr'] ?? null,
        );
    }

    /**
     * @param  array<string, mixed>  $preferences
     * @return array<string, mixed>
     */
    protected function providerPreferencesSnapshot(array $preferences): array
    {
        return array_filter([
            'allow_fallbacks' => $preferences['allow_fallbacks'] ?? null,
            'require_parameters' => $preferences['require_parameters'] ?? null,
            'data_collection' => $preferences['data_collection'] ?? null,
            'zdr' => $preferences['zdr'] ?? null,
            'order' => $preferences['order'] ?? null,
        ], function (mixed $value, string $key): bool {
            if ($value === null) {
                return false;
            }

            if ($key === 'order' && $value === []) {
                return false;
            }

            return true;
        }, ARRAY_FILTER_USE_BOTH);
    }

    protected function extractText(ResponseData $response): string
    {
        return collect(Arr::wrap($response->choices))
            ->map(fn (mixed $choice): string => $this->extractChoiceText($choice))
            ->filter(fn (string $text): bool => $text !== '')
            ->implode("\n\n");
    }

    protected function extractChoiceText(mixed $choice): string
    {
        $message = is_object($choice) ? data_get($choice, 'message') : data_get($choice, 'message');

        return $this->extractMessageText($message);
    }

    protected function extractMessageText(mixed $message): string
    {
        $content = is_object($message) ? data_get($message, 'content') : data_get($message, 'content');

        if (is_string($content)) {
            return trim($content);
        }

        return collect(Arr::wrap($content))
            ->map(function (mixed $part): string {
                if (is_string($part)) {
                    return trim($part);
                }

                $text = is_object($part)
                    ? data_get($part, 'text', data_get($part, 'content', ''))
                    : data_get($part, 'text', data_get($part, 'content', ''));

                return is_string($text) ? trim($text) : '';
            })
            ->filter(fn (string $text): bool => $text !== '')
            ->implode("\n\n");
    }

    protected function toProviderException(int $code, ?string $technicalMessage = null): AiProviderException
    {
        $message = match (true) {
            $code === 401 || $code === 403 => 'A integracao do provider de IA precisa ser revisada antes de novas geracoes.',
            $code === 404 && $this->contains($technicalMessage, ['no endpoints found', 'requested parameters', 'provider routing']) => 'O modelo escolhido no OpenRouter nao encontrou uma rota compativel. Revise o modelo ou as preferencias de roteamento.',
            $code === 404 => 'O modelo escolhido no OpenRouter nao esta disponivel para esta configuracao.',
            $code === 422 => 'Os dados enviados nao puderam ser processados pelo provider. Revise os campos e tente novamente.',
            $code === 429 => 'O provider de IA esta com alta demanda agora. Tente novamente em alguns instantes.',
            $code >= 500 => 'O provider de IA esta indisponivel no momento. Tente novamente em instantes.',
            default => 'Nao foi possivel concluir a geracao agora. Tente novamente em alguns instantes.',
        };

        return new AiProviderException(
            userMessage: $message,
            technicalMessage: $technicalMessage,
            code: $code,
        );
    }

    protected function toProviderExceptionFromHttp(RequestException $exception): AiProviderException
    {
        report($exception);

        $payload = $this->decodeResponseBody($exception->getResponse());
        $status = (int) ($exception->getResponse()?->getStatusCode() ?? 0);
        $code = (int) data_get($payload, 'error.code', $status);
        $technicalMessage = $this->extractTechnicalMessage($payload) ?? $exception->getMessage();

        return $this->toProviderException($code, $technicalMessage);
    }

    /**
     * @return array<string, mixed>
     */
    protected function decodeResponseBody(?ResponseInterface $response): array
    {
        if (! $response) {
            return [];
        }

        $decoded = json_decode((string) $response->getBody(), true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function extractTechnicalMessage(array $payload): ?string
    {
        foreach ([
            data_get($payload, 'error.metadata.raw'),
            data_get($payload, 'error.message'),
        ] as $message) {
            if (is_string($message) && trim($message) !== '') {
                return trim($message);
            }
        }

        return null;
    }

    /**
     * @param  array<int, string>  $needles
     */
    protected function contains(?string $haystack, array $needles): bool
    {
        if (! is_string($haystack) || $haystack === '') {
            return false;
        }

        return str($haystack)->lower()->contains(
            collect($needles)->map(fn (string $needle): string => str($needle)->lower()->value())->all(),
        );
    }
}
