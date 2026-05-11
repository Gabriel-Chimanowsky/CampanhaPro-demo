<?php

namespace App\Actions\AI;

use App\Enums\AiGenerationStatus;
use App\Models\AiGeneration;
use App\Models\AiTemplate;
use App\Models\BrandDna;
use App\Models\BrandDnaPersona;
use App\Models\GuidedBrief;
use App\Models\User;
use App\Services\AI\PlainTextOutputNormalizer;
use App\Services\AI\ProviderManager;
use App\Services\AI\Support\AiProviderException;
use App\Services\AI\Support\ImageGenerationResult;
use App\Services\AI\Support\InputSchemaRules;
use App\Services\AI\Support\PromptRenderer;
use App\Services\BrandDna\ContextPackageBuilder;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class GenerateFromTemplate
{
    public function __construct(
        protected InputSchemaRules $inputSchemaRules,
        protected PromptRenderer $promptRenderer,
        protected ProviderManager $providerManager,
        protected ContextPackageBuilder $contextPackageBuilder,
        protected PlainTextOutputNormalizer $plainTextOutputNormalizer,
    ) {}

    /**
     * @param  array<string, mixed>  $input
     */
    public function handle(
        User $user,
        AiTemplate $template,
        array $input,
        ?string $provider = null,
        ?string $model = null,
        ?BrandDna $brandDna = null,
        ?BrandDnaPersona $persona = null,
        bool $useKnowledgeBase = false,
        ?AiGeneration $sourceGeneration = null,
        ?GuidedBrief $guidedBrief = null,
        ?string $promptAddendum = null,
    ): AiGeneration {
        if (! $template->is_active) {
            throw ValidationException::withMessages([
                'template' => 'Este template nao esta disponivel agora.',
            ]);
        }

        $validated = Validator::make(
            $input,
            $this->inputSchemaRules->build($template->input_schema ?? []),
            attributes: $this->inputSchemaRules->attributes($template->input_schema ?? []),
        )->validate();

        ['provider' => $provider, 'model' => $model] = $this->providerManager->resolveSelection(
            $template,
            $provider,
            $model,
        );

        $promptSnapshot = $this->promptRenderer->render($template->user_prompt_template, $validated);
        $contextPackage = null;
        $systemPrompt = $template->system_prompt;

        if ($brandDna) {
            $contextPackage = $this->contextPackageBuilder->build(
                $brandDna,
                $validated,
                $persona,
                $useKnowledgeBase,
                $template,
            );

            $promptSnapshot = trim(
                "Contexto Brand DNA ativo:\n".$contextPackage->toPromptString()."\n\nSolicitacao do template:\n".$promptSnapshot
            );

            $systemPrompt = trim(collect([
                $template->system_prompt,
                'Use o contexto Brand DNA como fonte prioritaria de identidade e estilo. Quando houver trechos da base de conhecimento, trate-os como referencia factual.',
            ])->filter()->implode("\n\n"));
        }

        if (filled($promptAddendum)) {
            $promptSnapshot = trim($promptSnapshot."\n\nDirecao especifica desta variacao:\n".$promptAddendum);
        }

        $generation = AiGeneration::create([
            'user_id' => $user->id,
            'ai_template_id' => $template->id,
            'source_generation_id' => $sourceGeneration?->id,
            'guided_brief_id' => $guidedBrief?->id,
            'brand_dna_id' => $brandDna?->id,
            'brand_dna_persona_id' => $persona?->id,
            'type' => $template->type,
            'provider' => $provider,
            'model' => $model,
            'status' => AiGenerationStatus::Pending,
            'input_payload' => $validated,
            'prompt_snapshot' => $promptSnapshot,
            'meta' => array_filter([
                ...($contextPackage?->meta() ?? []),
                'brand_context_summary' => $contextPackage?->summary(),
                'knowledge_base_enabled' => $useKnowledgeBase,
                'prefill_mode' => $sourceGeneration ? 'reused_generation' : null,
                'guided_brief_id' => $guidedBrief?->id,
            ], fn (mixed $value): bool => $value !== null && $value !== []),
        ]);

        try {
            if ($template->isText()) {
                $result = $this->providerManager->text($provider)->generateText($promptSnapshot, [
                    'model' => $model,
                    'system_prompt' => $systemPrompt,
                ]);

                $generation->update([
                    'status' => AiGenerationStatus::Completed,
                    'output_text' => $this->plainTextOutputNormalizer->normalize($result->text, $template),
                    'meta' => $this->completedMeta($result->meta, $generation->meta ?? []),
                    'completed_at' => now(),
                ]);
            } else {
                $result = $this->providerManager->images($provider)->generateImage($promptSnapshot, [
                    'model' => $model,
                ]);

                $generation->update([
                    'status' => AiGenerationStatus::Completed,
                    'output_file_path' => $this->storeImage($generation, $result),
                    'meta' => $this->completedMeta($result->meta, $generation->meta ?? []),
                    'completed_at' => now(),
                ]);
            }
        } catch (AiProviderException $exception) {
            Log::warning('AI generation failed', [
                'generation_id' => $generation->id,
                'template_id' => $template->id,
                'provider' => $provider,
                'technical_message' => $exception->technicalMessage(),
            ]);

            $generation->update([
                'status' => AiGenerationStatus::Failed,
                'error_message' => $exception->userMessage(),
                'meta' => $this->failedMeta($exception, $generation->meta ?? []),
            ]);
        } catch (Throwable $exception) {
            report($exception);

            $generation->update([
                'status' => AiGenerationStatus::Failed,
                'error_message' => 'Nao foi possivel concluir a geracao agora. Tente novamente em instantes.',
                'meta' => $this->failedMeta(null, $generation->meta ?? []),
            ]);
        }

        return $generation->fresh(['template', 'brandDna', 'brandDnaPersona']);
    }

    /**
     * @param  array<string, mixed>  $meta
     * @param  array<string, mixed>  $existing
     * @return array<string, mixed>
     */
    protected function completedMeta(array $meta, array $existing = []): array
    {
        return array_filter([
            ...$existing,
            ...$meta,
            'completed_via' => 'sync',
        ], fn (mixed $value): bool => $value !== null);
    }

    /**
     * @param  array<string, mixed>  $existing
     * @return array<string, mixed>
     */
    protected function failedMeta(?AiProviderException $exception = null, array $existing = []): array
    {
        return array_filter([
            ...$existing,
            'failed_via' => 'sync',
            'provider_code' => $exception?->getCode(),
            'provider_technical_message' => $exception?->technicalMessage(),
        ], fn (mixed $value): bool => $value !== null && $value !== 0);
    }

    protected function storeImage(AiGeneration $generation, ImageGenerationResult $result): string
    {
        $disk = config('ai.output.disk');
        $basePath = trim((string) config('ai.output.path', 'ai-generations'), '/');
        $path = sprintf(
            '%s/%s/%s.%s',
            $basePath,
            $generation->user_id,
            Str::uuid(),
            $result->extension,
        );

        Storage::disk($disk)->put($path, $result->binary);

        return $path;
    }
}
