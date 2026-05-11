<?php

namespace App\Services\BrandDna\KnowledgeBase;

use App\Data\BrandDna\KnowledgeTranscriptResult;
use App\Services\BrandDna\KnowledgeBase\Contracts\TranscribesKnowledgeSources;
use Gemini\Client;
use Gemini\Data\UploadedFile;
use Gemini\Enums\FileState;
use Gemini\Enums\MimeType;
use Gemini\Exceptions\ErrorException as GeminiErrorException;
use Gemini\Responses\GenerativeModel\GenerateContentResponse;
use Illuminate\Support\Arr;
use RuntimeException;
use Throwable;

class GeminiTranscriptionService implements TranscribesKnowledgeSources
{
    public function transcribeYoutube(string $url, array $options = []): KnowledgeTranscriptResult
    {
        try {
            $response = $this->client()
                ->generativeModel(model: $this->model())
                ->generateContent(
                    "Voce vai receber um link publico do YouTube. Quando o video estiver acessivel, gere uma transcricao fiel em texto corrido, sem resumir nem inventar conteudo.\n\nURL: {$url}"
                );

            $text = trim($this->extractText($response));

            if ($text === '') {
                throw new RuntimeException('A transcricao do YouTube voltou vazia.');
            }

            return new KnowledgeTranscriptResult(
                text: $text,
                meta: [
                    'transcription_provider' => 'gemini',
                    'transcription_model' => $response->modelVersion ?? $this->model(),
                    'source_kind' => 'youtube',
                    'prompt_feedback' => $response->promptFeedback?->toArray(),
                ],
                title: Arr::get($options, 'title'),
            );
        } catch (GeminiErrorException $exception) {
            report($exception);

            throw new RuntimeException('Nao foi possivel transcrever o video do YouTube agora.');
        } catch (Throwable $exception) {
            if ($exception instanceof RuntimeException) {
                throw $exception;
            }

            report($exception);

            throw new RuntimeException('Nao foi possivel transcrever o video do YouTube agora.');
        }
    }

    public function transcribeMp4(string $path, array $options = []): KnowledgeTranscriptResult
    {
        try {
            $files = $this->client()->files();
            $meta = $files->upload(
                filename: $path,
                mimeType: MimeType::VIDEO_MP4,
                displayName: basename($path),
            );

            $deadline = now()->addSeconds((int) config('brand_dna.knowledge_base.ingestion_timeout', 300));

            do {
                usleep(500000);
                $meta = $files->metadataGet($meta->uri);
            } while (! $meta->state->complete() && now()->lt($deadline));

            if (! $meta->state->complete() || $meta->state === FileState::Failed) {
                throw new RuntimeException('O arquivo de video nao ficou pronto para transcricao dentro do tempo esperado.');
            }

            $response = $this->client()
                ->generativeModel(model: $this->model())
                ->generateContent([
                    'Gere uma transcricao fiel deste video em texto corrido, preservando contexto e sequencia de ideias sem resumir.',
                    new UploadedFile(
                        fileUri: $meta->uri,
                        mimeType: MimeType::VIDEO_MP4,
                    ),
                ]);

            $text = trim($this->extractText($response));

            if ($text === '') {
                throw new RuntimeException('A transcricao do MP4 voltou vazia.');
            }

            return new KnowledgeTranscriptResult(
                text: $text,
                meta: [
                    'transcription_provider' => 'gemini',
                    'transcription_model' => $response->modelVersion ?? $this->model(),
                    'source_kind' => 'mp4',
                    'provider_file_uri' => $meta->uri,
                    'source_duration_seconds' => $this->secondsFromDuration($meta->videoMetadata?->videoDuration),
                    'prompt_feedback' => $response->promptFeedback?->toArray(),
                ],
                title: Arr::get($options, 'title'),
            );
        } catch (GeminiErrorException $exception) {
            report($exception);

            throw new RuntimeException('Nao foi possivel transcrever o arquivo MP4 agora.');
        } catch (Throwable $exception) {
            if ($exception instanceof RuntimeException) {
                throw $exception;
            }

            report($exception);

            throw new RuntimeException('Nao foi possivel transcrever o arquivo MP4 agora.');
        }
    }

    protected function client(): Client
    {
        $apiKey = config('ai.providers.gemini.api_key');

        if (blank($apiKey)) {
            throw new RuntimeException('A chave do Gemini nao foi configurada para a base de conhecimento.');
        }

        $factory = \Gemini::factory()
            ->withApiKey((string) $apiKey)
            ->withBaseUrl((string) config('ai.providers.gemini.base_url', 'https://generativelanguage.googleapis.com/v1beta/'));

        if (class_exists(\GuzzleHttp\Client::class)) {
            $factory = $factory->withHttpClient(
                new \GuzzleHttp\Client([
                    'timeout' => (int) config('brand_dna.knowledge_base.ingestion_timeout', 300),
                ]),
            );
        }

        return $factory->make();
    }

    protected function model(): string
    {
        return (string) config('brand_dna.knowledge_base.transcription_model', 'gemini-2.5-flash');
    }

    protected function extractText(GenerateContentResponse $response): string
    {
        return collect($response->parts())
            ->filter(fn ($part): bool => filled($part->text))
            ->map(fn ($part): string => trim((string) $part->text))
            ->implode("\n\n");
    }

    protected function secondsFromDuration(?string $duration): ?int
    {
        if (! is_string($duration) || $duration === '') {
            return null;
        }

        if (preg_match('/^(\d+)s$/', $duration, $matches) !== 1) {
            return null;
        }

        return (int) $matches[1];
    }
}
