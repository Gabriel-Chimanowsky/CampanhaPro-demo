<?php

namespace App\Data\BrandDna;

use App\Models\BrandDnaExample;
use App\Models\BrandDnaKnowledgeChunk;
use App\Models\BrandDnaPersona;
use Illuminate\Support\Collection;

final class BrandContextPackage
{
    /**
     * @param  array<string, string>  $identity
     * @param  array<string, string>  $communication
     * @param  Collection<int, BrandDnaExample>  $examples
     * @param  Collection<int, BrandDnaKnowledgeChunk>  $knowledgeChunks
     */
    public function __construct(
        public readonly array $identity,
        public readonly array $communication,
        public readonly ?BrandDnaPersona $persona,
        public readonly Collection $examples,
        public readonly Collection $knowledgeChunks,
        public readonly bool $knowledgeEnabled,
    ) {}

    public function toPromptString(): string
    {
        $sections = [];

        if ($this->identity !== []) {
            $sections[] = "Identidade da marca:\n".$this->renderKeyValueBlock($this->identity);
        }

        if ($this->communication !== []) {
            $sections[] = "Regras de comunicacao:\n".$this->renderKeyValueBlock($this->communication);
        }

        if ($this->persona) {
            $sections[] = "Persona selecionada:\n".$this->persona->summary();
        }

        if ($this->examples->isNotEmpty()) {
            $sections[] = 'Exemplos de saida:'.PHP_EOL.$this->examples
                ->map(fn (BrandDnaExample $example): string => sprintf(
                    "- %s%s\n%s",
                    $example->title,
                    filled($example->content_type) ? ' ['.$example->content_type.']' : '',
                    trim($example->content)
                ))
                ->implode(PHP_EOL.PHP_EOL);
        }

        if ($this->knowledgeChunks->isNotEmpty()) {
            $sections[] = 'Trechos da base de conhecimento:'.PHP_EOL.$this->knowledgeChunks
                ->map(fn (BrandDnaKnowledgeChunk $chunk): string => '- '.$chunk->content)
                ->implode(PHP_EOL.PHP_EOL);
        }

        return trim(implode(PHP_EOL.PHP_EOL, $sections));
    }

    /**
     * @return array<string, mixed>
     */
    public function meta(): array
    {
        return [
            'brand_dna_persona_id' => $this->persona?->id,
            'used_example_ids' => $this->examples->pluck('id')->values()->all(),
            'used_knowledge_chunk_ids' => $this->knowledgeChunks->pluck('id')->values()->all(),
            'used_knowledge_document_ids' => $this->knowledgeChunks
                ->pluck('brand_dna_knowledge_document_id')
                ->unique()
                ->values()
                ->all(),
            'knowledge_base_enabled' => $this->knowledgeEnabled,
        ];
    }

    public function summary(): string
    {
        return trim(collect([
            filled($this->communication['tone'] ?? null) ? 'Tom '.$this->communication['tone'] : null,
            $this->persona ? 'Persona '.$this->persona->label : null,
            $this->examples->isNotEmpty() ? $this->examples->count().' exemplo(s)' : null,
            $this->knowledgeChunks->isNotEmpty() ? $this->knowledgeChunks->count().' trecho(s) da base' : null,
        ])->filter()->implode(' | '));
    }

    /**
     * @param  array<string, string>  $data
     */
    protected function renderKeyValueBlock(array $data): string
    {
        return collect($data)
            ->filter(fn (string $value): bool => filled($value))
            ->map(fn (string $value, string $key): string => '- '.ucfirst(str_replace('_', ' ', $key)).': '.$value)
            ->implode(PHP_EOL);
    }
}
