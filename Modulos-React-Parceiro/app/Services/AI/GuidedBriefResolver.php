<?php

namespace App\Services\AI;

use App\Models\AiTemplate;
use App\Models\BrandDna;
use Illuminate\Support\Arr;

class GuidedBriefResolver
{
    /**
     * @return array<int, array{key: string, label: string, required: bool, type: string, placeholder: string}>
     */
    public function questions(): array
    {
        return [
            [
                'key' => 'objective',
                'label' => 'Qual e o objetivo desta peca?',
                'required' => true,
                'type' => 'text',
                'placeholder' => 'Ex: gerar demanda, nutrir leads, anunciar oferta',
            ],
            [
                'key' => 'channel',
                'label' => 'Qual canal ou formato sera usado?',
                'required' => true,
                'type' => 'text',
                'placeholder' => 'Ex: LinkedIn, Instagram, email, landing page',
            ],
            [
                'key' => 'audience',
                'label' => 'Para quem estamos falando?',
                'required' => true,
                'type' => 'text',
                'placeholder' => 'Ex: founders B2B, CMOs, compradores recorrentes',
            ],
            [
                'key' => 'message',
                'label' => 'Qual oferta, tema ou mensagem central?',
                'required' => true,
                'type' => 'textarea',
                'placeholder' => 'Escreva a ideia central que precisa virar conteudo',
            ],
            [
                'key' => 'tone',
                'label' => 'Qual tom desejado?',
                'required' => true,
                'type' => 'text',
                'placeholder' => 'Ex: consultivo, direto, premium, tecnico',
            ],
            [
                'key' => 'cta',
                'label' => 'Qual CTA ou proximo passo?',
                'required' => true,
                'type' => 'text',
                'placeholder' => 'Ex: agendar demo, baixar material, responder email',
            ],
            [
                'key' => 'constraints',
                'label' => 'Quais restricoes ou pontos obrigatorios?',
                'required' => false,
                'type' => 'textarea',
                'placeholder' => 'Ex: evitar promessas absolutas, mencionar prazo, manter curto',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, string>
     */
    public function initialAnswers(AiTemplate $template, array $input = [], ?BrandDna $brandDna = null): array
    {
        return [
            'objective' => $this->stringValue($input, ['objective', 'goal']) ?: 'Criar '.$template->name,
            'channel' => $this->stringValue($input, ['channel', 'format', 'platform']) ?: $this->channelFromTemplate($template),
            'audience' => $this->stringValue($input, ['audience', 'segment', 'public']) ?: (string) ($brandDna?->audienceSummary() ?: ''),
            'message' => $this->stringValue($input, [
                'topic',
                'offer',
                'product_name',
                'benefit',
                'subject',
                'campaign_name',
                'headline_focus',
                'article_text',
                'title',
                'theme',
            ]),
            'tone' => $this->stringValue($input, ['tone', 'communication_style']) ?: (string) ($brandDna?->resolvedTone() ?: ''),
            'cta' => $this->stringValue($input, ['cta', 'call_to_action']),
            'constraints' => $this->stringValue($input, ['constraints', 'visual_direction', 'direction', 'mood']),
        ];
    }

    /**
     * @param  array<string, mixed>  $answers
     * @param  array<string, mixed>  $input
     * @return array<string, string>
     */
    public function normalizeAnswers(
        AiTemplate $template,
        array $answers,
        array $input = [],
        ?BrandDna $brandDna = null,
    ): array {
        $defaults = $this->initialAnswers($template, $input, $brandDna);
        $inputAnswers = $this->inputAnswerValues($input);

        return collect($this->questions())
            ->mapWithKeys(function (array $question) use ($answers, $defaults, $inputAnswers): array {
                $key = $question['key'];
                $answer = trim((string) Arr::get($answers, $key, ''));
                $inputValue = trim((string) ($inputAnswers[$key] ?? ''));

                if ($inputValue !== '' && $answer !== $inputValue) {
                    return [$key => $inputValue];
                }

                return [$key => $answer !== '' ? $answer : (string) ($defaults[$key] ?? '')];
            })
            ->all();
    }

    /**
     * @param  array<string, mixed>  $answers
     */
    public function summary(array $answers): string
    {
        $parts = collect([
            $answers['objective'] ?? null,
            filled($answers['channel'] ?? null) ? 'Canal: '.$answers['channel'] : null,
            filled($answers['audience'] ?? null) ? 'Publico: '.$answers['audience'] : null,
            filled($answers['message'] ?? null) ? 'Mensagem: '.$answers['message'] : null,
            filled($answers['tone'] ?? null) ? 'Tom: '.$answers['tone'] : null,
            filled($answers['cta'] ?? null) ? 'CTA: '.$answers['cta'] : null,
            filled($answers['constraints'] ?? null) ? 'Restricoes: '.$answers['constraints'] : null,
        ])->filter()->implode(' | ');

        return mb_substr($parts, 0, 1000);
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<int, string>  $keys
     */
    protected function stringValue(array $input, array $keys): string
    {
        foreach ($keys as $key) {
            $value = Arr::get($input, $key);

            if (filled($value) && ! is_array($value)) {
                return trim((string) $value);
            }
        }

        return '';
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, string>
     */
    protected function inputAnswerValues(array $input): array
    {
        return [
            'objective' => $this->stringValue($input, ['objective', 'goal']),
            'channel' => $this->stringValue($input, ['channel', 'format', 'platform']),
            'audience' => $this->stringValue($input, ['audience', 'segment', 'public']),
            'message' => $this->stringValue($input, [
                'topic',
                'offer',
                'product_name',
                'benefit',
                'subject',
                'campaign_name',
                'headline_focus',
                'article_text',
                'title',
                'theme',
            ]),
            'tone' => $this->stringValue($input, ['tone', 'communication_style']),
            'cta' => $this->stringValue($input, ['cta', 'call_to_action']),
            'constraints' => $this->stringValue($input, ['constraints', 'visual_direction', 'direction', 'mood']),
        ];
    }

    protected function channelFromTemplate(AiTemplate $template): string
    {
        $name = str($template->name)->lower()->ascii()->toString();

        return match (true) {
            str_contains($name, 'instagram') => 'Instagram',
            str_contains($name, 'email') => 'Email',
            str_contains($name, 'landing') => 'Landing page',
            str_contains($name, 'produto') => 'Catalogo',
            str_contains($name, 'thumbnail') => 'Video',
            default => '',
        };
    }
}
