<?php

namespace App\Livewire\BrandDna;

use App\Enums\BrandDnaKnowledgeDocumentType;
use App\Models\BrandDna;
use App\Services\BrandDna\KnowledgeBase\KnowledgeDocumentManager;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Validation\Rule;
use Livewire\Attributes\Computed;
use Livewire\Component;
use Livewire\Features\SupportFileUploads\WithFileUploads;

class KnowledgeBaseManager extends Component
{
    use AuthorizesRequests;
    use WithFileUploads;

    public BrandDna $brandDna;

    public ?int $editingDocumentId = null;

    public string $type = 'text';

    public string $title = '';

    public string $summary = '';

    public string $sourceUrl = '';

    public string $content = '';

    public $knowledgeFile = null;

    public function mount(BrandDna $brandDna): void
    {
        $this->authorize('update', $brandDna);

        $this->brandDna = $brandDna;
    }

    public function saveDocument(KnowledgeDocumentManager $manager): void
    {
        if ($this->editingDocumentId) {
            $document = $this->brandDna->knowledgeDocuments()->findOrFail($this->editingDocumentId);
            $validated = $this->validateEditPayload();

            $manager->updateEditableContent($document, auth()->user(), [
                'title' => $validated['title'],
                'summary' => $validated['summary'] ?? null,
                'content' => $validated['content'],
            ]);

            $this->resetDocumentForm();
            session()->flash('brand_dna_knowledge_status', 'Documento atualizado e reindexado com sucesso.');

            return;
        }

        $validated = $this->validateCreatePayload();
        $payload = [
            'type' => $validated['type'],
            'title' => $validated['title'],
            'summary' => $validated['summary'] ?? null,
            'content' => $validated['content'] ?? null,
            'source_url' => $validated['sourceUrl'] ?? null,
        ];

        if ($this->knowledgeFile) {
            $disk = (string) config('brand_dna.knowledge_base.temporary_disk', 'local');
            $path = $this->knowledgeFile->store('brand-dna/knowledge-temp', $disk);

            $payload['source_filename'] = $this->knowledgeFile->getClientOriginalName();
            $payload['meta'] = [
                'temporary_disk' => $disk,
                'temporary_path' => $path,
                'mime_type' => $this->knowledgeFile->getClientMimeType(),
            ];
        }

        $manager->createFromPayload($this->brandDna, auth()->user(), $payload);

        $this->resetDocumentForm();
        session()->flash('brand_dna_knowledge_status', 'Fonte adicionada com sucesso.');
    }

    public function editDocument(int $documentId): void
    {
        $document = $this->brandDna->knowledgeDocuments()->findOrFail($documentId);

        $this->editingDocumentId = $document->id;
        $this->type = $document->type->value;
        $this->title = $document->title;
        $this->summary = $document->summary ?? '';
        $this->sourceUrl = $document->source_url ?? '';
        $this->content = $document->content ?? '';
        $this->knowledgeFile = null;
    }

    public function reprocessDocument(int $documentId, KnowledgeDocumentManager $manager): void
    {
        $document = $this->brandDna->knowledgeDocuments()->findOrFail($documentId);

        $manager->reprocess($document);

        session()->flash('brand_dna_knowledge_status', 'Reprocessamento disparado com sucesso.');
    }

    public function deleteDocument(int $documentId, KnowledgeDocumentManager $manager): void
    {
        $document = $this->brandDna->knowledgeDocuments()->findOrFail($documentId);

        $manager->delete($document);

        if ($this->editingDocumentId === $documentId) {
            $this->resetDocumentForm();
        }

        session()->flash('brand_dna_knowledge_status', 'Fonte removida com sucesso.');
    }

    public function resetDocumentForm(): void
    {
        $this->reset(['editingDocumentId', 'title', 'summary', 'sourceUrl', 'content', 'knowledgeFile']);
        $this->type = BrandDnaKnowledgeDocumentType::Text->value;
    }

    #[Computed]
    public function documents()
    {
        return $this->brandDna->knowledgeDocuments()
            ->withCount('chunks')
            ->latest('updated_at')
            ->get();
    }

    #[Computed]
    public function typeOptions(): array
    {
        return [
            BrandDnaKnowledgeDocumentType::Text->value => 'Texto manual',
            BrandDnaKnowledgeDocumentType::Site->value => 'Site',
            BrandDnaKnowledgeDocumentType::Youtube->value => 'YouTube',
            BrandDnaKnowledgeDocumentType::Document->value => 'Documento',
            BrandDnaKnowledgeDocumentType::Mp4Transcript->value => '.mp4',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function validateCreatePayload(): array
    {
        $rules = [
            'type' => ['required', Rule::in(array_keys($this->typeOptions))],
            'title' => ['required', 'string', 'max:160'],
            'summary' => ['nullable', 'string'],
        ];

        match ($this->type) {
            BrandDnaKnowledgeDocumentType::Text->value => $rules['content'] = ['required', 'string'],
            BrandDnaKnowledgeDocumentType::Site->value => $rules['sourceUrl'] = ['required', 'url'],
            BrandDnaKnowledgeDocumentType::Youtube->value => $rules['sourceUrl'] = [
                'required',
                'url',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_string($value) || ! $this->isSupportedYoutubeUrl($value)) {
                        $fail('Informe uma URL valida do YouTube.');
                    }
                },
            ],
            BrandDnaKnowledgeDocumentType::Document->value => $rules['knowledgeFile'] = [
                'required',
                'file',
                'mimes:'.implode(',', config('brand_dna.knowledge_base.supported_document_extensions', ['pdf', 'txt', 'md', 'csv', 'json'])),
                'max:51200',
            ],
            BrandDnaKnowledgeDocumentType::Mp4Transcript->value => $rules['knowledgeFile'] = [
                'required',
                'file',
                'mimes:mp4',
                'max:'.((int) config('brand_dna.knowledge_base.max_mp4_mb', 200) * 1024),
            ],
            default => null,
        };

        return $this->validate($rules, attributes: [
            'type' => 'tipo da fonte',
            'title' => 'titulo',
            'summary' => 'resumo',
            'sourceUrl' => 'URL da fonte',
            'content' => 'conteudo',
            'knowledgeFile' => 'arquivo',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function validateEditPayload(): array
    {
        return $this->validate([
            'title' => ['required', 'string', 'max:160'],
            'summary' => ['nullable', 'string'],
            'content' => ['required', 'string'],
        ], attributes: [
            'title' => 'titulo',
            'summary' => 'resumo',
            'content' => 'conteudo',
        ]);
    }

    protected function isSupportedYoutubeUrl(string $url): bool
    {
        return (bool) preg_match('~^(https?://)?(www\.)?(youtube\.com/(watch\?v=|shorts/|live/)|youtu\.be/)~i', $url);
    }

    public function render()
    {
        return view('livewire.brand-dna.knowledge-base-manager');
    }
}
