<?php

namespace App\Services\AI\Providers;

use App\Services\AI\Contracts\GeneratesImages;
use App\Services\AI\Contracts\GeneratesText;
use App\Services\AI\Support\AiProviderException;
use App\Services\AI\Support\ImageGenerationResult;
use App\Services\AI\Support\TextGenerationResult;
use Gemini\Client;
use Gemini\Data\Content;
use Gemini\Data\GenerationConfig;
use Gemini\Enums\ResponseModality;
use Gemini\Exceptions\ErrorException as GeminiErrorException;
use Gemini\Responses\GenerativeModel\GenerateContentResponse;
use Throwable;

class GeminiProvider implements GeneratesImages, GeneratesText
{
    public function generateText(string $prompt, array $options = []): TextGenerationResult
    {
        $config = $this->config();
        $model = $options['model'] ?? $config['text_model'];

        try {
            $generativeModel = $this->client()->generativeModel(model: $model);

            if (filled($options['system_prompt'] ?? null)) {
                $generativeModel = $generativeModel->withSystemInstruction(
                    Content::parse((string) $options['system_prompt']),
                );
            }

            $response = $generativeModel->generateContent($prompt);
            $text = trim($this->extractTextParts($response));

            if ($text === '') {
                throw new AiProviderException('A IA nao retornou texto para este template.');
            }

            return new TextGenerationResult(
                text: $text,
                meta: [
                    'provider_model' => $response->modelVersion ?? $model,
                    'usage' => $response->usageMetadata->toArray(),
                    'prompt_feedback' => $response->promptFeedback?->toArray(),
                ],
            );
        } catch (GeminiErrorException $exception) {
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
            $response = $this->client()
                ->generativeModel(model: $model)
                ->withGenerationConfig(new GenerationConfig(
                    responseModalities: [ResponseModality::IMAGE],
                ))
                ->generateContent($prompt);

            $imagePart = collect($response->parts())->first(
                fn ($part): bool => $part->inlineData !== null
            );

            $blob = $imagePart?->inlineData;
            $binary = $blob ? base64_decode($blob->data, true) : false;

            if (! is_string($binary) || $binary === '') {
                throw new AiProviderException('A IA nao retornou uma imagem valida para este template.');
            }

            $mimeType = $blob->mimeType->value;
            $extension = match ($mimeType) {
                'image/jpeg' => 'jpg',
                'image/webp' => 'webp',
                default => 'png',
            };

            return new ImageGenerationResult(
                binary: $binary,
                extension: $extension,
                mimeType: $mimeType,
                meta: [
                    'provider_model' => $response->modelVersion ?? $model,
                    'usage' => $response->usageMetadata->toArray(),
                    'prompt_feedback' => $response->promptFeedback?->toArray(),
                    'text_parts' => $this->extractTextParts($response),
                ],
            );
        } catch (GeminiErrorException $exception) {
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
        return config('ai.providers.gemini', []);
    }

    protected function client(): Client
    {
        $config = $this->config();
        $apiKey = $config['api_key'] ?? null;

        if (blank($apiKey)) {
            throw new AiProviderException('A integracao com IA ainda nao foi configurada.');
        }

        return \Gemini::factory()
            ->withApiKey((string) $apiKey)
            ->withBaseUrl((string) ($config['base_url'] ?? 'https://generativelanguage.googleapis.com/v1beta/'))
            ->make();
    }

    protected function extractTextParts(GenerateContentResponse $response): string
    {
        return collect($response->parts())
            ->filter(fn ($part): bool => filled($part->text))
            ->map(fn ($part): string => trim((string) $part->text))
            ->implode("\n\n");
    }

    protected function toProviderException(GeminiErrorException $exception): AiProviderException
    {
        report($exception);

        $status = $exception->getErrorStatus();
        $code = (int) ($exception->getErrorCode() ?? 0);
        $technicalMessage = $exception->getErrorMessage();

        $message = match (true) {
            $status === 'UNAUTHENTICATED' => 'A chave do Gemini precisa ser revisada antes de novas geracoes.',
            $status === 'PERMISSION_DENIED' && $this->contains($technicalMessage, ['denied access', 'contact support']) => 'O projeto Gemini vinculado a esta chave esta bloqueado e precisa ser revisado antes de novas geracoes.',
            $status === 'PERMISSION_DENIED' => 'A integracao do provider de IA precisa ser revisada antes de novas geracoes.',
            $status === 'INVALID_ARGUMENT' && $this->contains($technicalMessage, ['model', 'not found', 'unsupported']) => 'O modelo configurado no Gemini nao esta disponivel para esta operacao.',
            $status === 'INVALID_ARGUMENT' => 'Os dados enviados nao puderam ser processados pelo provider. Revise os campos e tente novamente.',
            $status === 'RESOURCE_EXHAUSTED' && $this->contains($technicalMessage, ['quota', 'rate limit', 'limit exceeded']) => 'A cota do Gemini foi atingida. Tente novamente mais tarde ou revise o plano configurado.',
            $status === 'RESOURCE_EXHAUSTED' => 'O provider de IA esta com alta demanda agora. Tente novamente em alguns instantes.',
            in_array($status, ['UNAVAILABLE', 'INTERNAL'], true) => 'O provider de IA esta indisponivel no momento. Tente novamente em instantes.',
            default => 'Nao foi possivel concluir a geracao agora. Tente novamente em alguns instantes.',
        };

        return new AiProviderException(
            userMessage: $message,
            technicalMessage: $technicalMessage,
            code: $code,
            previous: $exception,
        );
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
