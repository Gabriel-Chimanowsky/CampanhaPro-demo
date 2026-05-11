<?php

namespace App\Services\BrandDna;

use App\Models\AiTemplate;
use App\Models\BrandDna;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class TemplatePrefillResolver
{
    /**
     * @param  array<string, mixed>  $existing
     * @return array<string, string>
     */
    public function forTemplate(AiTemplate $template, BrandDna $brandDna, array $existing = [], bool $overwrite = false): array
    {
        $context = $this->context($brandDna);
        $prefill = [];
        $schema = $template->getAttribute('input_schema');
        /** @var array<int, array<string, mixed>> $inputSchema */
        $inputSchema = is_array($schema) ? $schema : [];

        foreach ($inputSchema as $field) {
            $name = $field['name'] ?? null;

            if (! is_string($name) || $name === '') {
                continue;
            }

            if (! $overwrite && array_key_exists($name, $existing) && filled($existing[$name])) {
                continue;
            }

            $value = $this->valueForField($name, $context);

            if (filled($value)) {
                $prefill[$name] = (string) $value;
            }
        }

        return $prefill;
    }

    /**
     * @return array<string, mixed>
     */
    protected function context(BrandDna $brandDna): array
    {
        return [
            'name' => $brandDna->name,
            'primary_product' => $brandDna->primary_product,
            'pitch_bio' => $brandDna->pitch_bio,
            'brand_description' => $brandDna->brand_description,
            'competitive_differentiators' => $brandDna->competitive_differentiators,
            'article_context' => trim(collect([
                $brandDna->pitch_bio,
                $brandDna->brand_description,
                $brandDna->competitive_differentiators,
            ])->filter()->implode("\n\n")),
            'resolved_tone' => $brandDna->resolvedTone(),
            'audience_summary' => $brandDna->audienceSummary(),
            'niche_summary' => $brandDna->nicheSummary(),
            'palette_summary' => $brandDna->paletteSummary(),
            'visual_direction_summary' => $brandDna->visualDirectionSummary(),
            'frequent_terms_summary' => $brandDna->frequentTermsSummary(),
            'communication_summary' => $brandDna->communicationSummary(),
        ];
    }

    /**
     * @param  array<string, mixed>  $context
     */
    protected function valueForField(string $fieldName, array $context): mixed
    {
        $normalized = Str::snake($fieldName);
        $semanticMap = $this->semanticFieldMap();
        $contextKeys = (array) ($semanticMap[$normalized] ?? []);

        if ($contextKeys === []) {
            $configuredMap = (array) config('brand_dna.template_field_map', []);
            $contextKeys = [(string) ($configuredMap[$fieldName] ?? $configuredMap[$normalized] ?? '')];
        }

        foreach ($contextKeys as $key) {
            $value = Arr::get($context, $key);

            if (filled($value)) {
                return $value;
            }
        }

        return null;
    }

    /**
     * @return array<string, array<int, string>>
     */
    protected function semanticFieldMap(): array
    {
        return [
            'brand_name' => ['name'],
            'campaign_name' => ['name'],
            'title' => ['name'],
            'product_name' => ['primary_product'],
            'subject' => ['primary_product'],
            'headline_focus' => ['primary_product'],
            'topic' => ['pitch_bio', 'brand_description'],
            'offer' => ['pitch_bio', 'brand_description'],
            'benefit' => ['competitive_differentiators', 'pitch_bio'],
            'article_text' => ['article_context'],
            'audience' => ['audience_summary'],
            'segment' => ['niche_summary'],
            'theme' => ['niche_summary'],
            'tone' => ['resolved_tone'],
            'communication_style' => ['communication_summary'],
            'visual_direction' => ['visual_direction_summary'],
            'mood' => ['palette_summary'],
            'keywords' => ['frequent_terms_summary'],
        ];
    }
}
