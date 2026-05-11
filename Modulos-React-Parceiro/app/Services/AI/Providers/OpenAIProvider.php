<?php

namespace App\Services\AI\Providers;

use App\Services\AI\Contracts\GeneratesImages;
use App\Services\AI\Contracts\GeneratesText;
use App\Services\AI\Support\AiProviderException;
use App\Services\AI\Support\ImageGenerationResult;
use App\Services\AI\Support\TextGenerationResult;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Throwable;

class OpenAIProvider implements GeneratesImages, GeneratesText
{
    public function __construct(
        protected HttpFactory $http,
    ) {}

    public function generateText(string $prompt, array $options = []): TextGenerationResult
    {
        $config = $this->config();
        $model = $options['model'] ?? $config['text_model'];

        try {
            $response = $this->client()->post('/responses', array_filter([
                'model' => $model,
                'input' => $prompt,
                'instructions' => $options['system_prompt'] ?? null,
            ], fn (mixed $value): bool => filled($value)));

            $response->throw();

            $payload = $response->json();
            $text = $this->extractText($payload);

            if (blank($text)) {
                throw new AiProviderException('A IA nao retornou texto para este template.');
            }

            return new TextGenerationResult(
                text: trim($text),
                meta: [
                    'response_id' => data_get($payload, 'id'),
                    'usage' => data_get($payload, 'usage', []),
                    'provider_model' => data_get($payload, 'model', $model),
                ],
            );
        } catch (RequestException $exception) {
            throw $this->toProviderException($exception);
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

    public function generateImage(string $prompt, array $options = []): ImageGenerationResult
    {
        $config = $this->config();
        $model = $options['model'] ?? $config['image_model'];

        try {
            $response = $this->client()->post('/images/generations', array_filter([
                'model' => $model,
                'prompt' => $prompt,
                'size' => $options['size'] ?? $config['image_size'],
                'quality' => $options['quality'] ?? $config['image_quality'],
                'background' => $options['background'] ?? $config['image_background'],
                'output_format' => $options['output_format'] ?? $config['image_output_format'],
            ], fn (mixed $value): bool => filled($value)));

            $response->throw();

            $payload = $response->json();
            $encoded = data_get($payload, 'data.0.b64_json', data_get($payload, 'b64_json'));
            $binary = is_string($encoded) ? base64_decode($encoded, true) : false;

            if (! is_string($binary) || $binary === '') {
                throw new AiProviderException('A IA nao retornou uma imagem valida para este template.');
            }

            $outputFormat = (string) ($options['output_format'] ?? $config['image_output_format'] ?? 'png');
            $extension = Str::of($outputFormat)->lower()->value();
            $mimeType = match ($extension) {
                'jpg', 'jpeg' => 'image/jpeg',
                'webp' => 'image/webp',
                default => 'image/png',
            };

            return new ImageGenerationResult(
                binary: $binary,
                extension: $extension,
                mimeType: $mimeType,
                meta: [
                    'created' => data_get($payload, 'created'),
                    'usage' => data_get($payload, 'usage', []),
                    'provider_model' => $model,
                    'revised_prompt' => data_get($payload, 'data.0.revised_prompt'),
                ],
            );
        } catch (RequestException $exception) {
            throw $this->toProviderException($exception);
        } catch (Throwable $exception) {
            if ($exception instanceof AiProviderException) {
                throw $exception;
            }

            report($exception);

            throw new AiProviderException(
                userMessage: 'Nao foi possivel gerar a imagem agora. Tente novamente em instantes.',
                previous: $exception,
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function config(): array
    {
        return config('ai.providers.openai', []);
    }

    protected function client(): PendingRequest
    {
        $config = $this->config();
        $apiKey = $config['api_key'] ?? null;

        if (blank($apiKey)) {
            throw new AiProviderException('A integracao com IA ainda nao foi configurada.');
        }

        return $this->http
            ->baseUrl(rtrim((string) ($config['base_url'] ?? 'https://api.openai.com/v1'), '/'))
            ->acceptJson()
            ->asJson()
            ->timeout((int) ($config['timeout'] ?? config('ai.timeout', 60)))
            ->withToken($apiKey);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function extractText(array $payload): string
    {
        $outputText = data_get($payload, 'output_text');

        if (is_string($outputText) && filled($outputText)) {
            return $outputText;
        }

        return collect(Arr::wrap(data_get($payload, 'output', [])))
            ->flatMap(fn (mixed $item): array => Arr::wrap(data_get($item, 'content', [])))
            ->filter(fn (mixed $content): bool => data_get($content, 'type') === 'output_text' && filled(data_get($content, 'text')))
            ->map(fn (mixed $content): string => (string) data_get($content, 'text'))
            ->implode("\n\n");
    }

    protected function toProviderException(RequestException $exception): AiProviderException
    {
        report($exception);

        $status = $exception->response?->status();
        $technicalMessage = data_get($exception->response?->json(), 'error.message');
        $errorCode = data_get($exception->response?->json(), 'error.code');

        $message = match (true) {
            $status === 429 && $this->contains([$technicalMessage, $errorCode], ['quota', 'billing', 'insufficient_quota', 'exceeded your current quota']) => 'A conta da OpenAI esta sem cota ou billing disponivel para novas geracoes.',
            in_array($status, [400, 404], true) && $this->contains([$technicalMessage, $errorCode], ['model', 'does not exist', 'not found']) => 'O modelo configurado na OpenAI nao esta disponivel para esta conta ou endpoint.',
            $status === 401 || $status === 403 => 'A integracao do provider de IA precisa ser revisada antes de novas geracoes.',
            $status === 422 => 'Os dados enviados nao puderam ser processados pelo provider. Revise os campos e tente novamente.',
            $status === 429 => 'O provider de IA esta com alta demanda agora. Tente novamente em alguns instantes.',
            $status !== null && $status >= 500 => 'O provider de IA esta indisponivel no momento. Tente novamente em instantes.',
            default => 'Nao foi possivel concluir a geracao agora. Tente novamente em alguns instantes.',
        };

        return new AiProviderException(
            userMessage: $message,
            technicalMessage: is_string($technicalMessage) && $technicalMessage !== '' ? $technicalMessage : $exception->getMessage(),
            code: (int) ($status ?? 0),
            previous: $exception,
        );
    }

    /**
     * @param  array<int, mixed>  $haystacks
     * @param  array<int, string>  $needles
     */
    protected function contains(array $haystacks, array $needles): bool
    {
        $normalizedHaystack = collect($haystacks)
            ->filter(fn (mixed $value): bool => is_string($value) && $value !== '')
            ->map(fn (string $value): string => str($value)->lower()->value())
            ->implode(' ');

        if ($normalizedHaystack === '') {
            return false;
        }

        return str($normalizedHaystack)->contains(
            collect($needles)->map(fn (string $needle): string => str($needle)->lower()->value())->all(),
        );
    }
}
