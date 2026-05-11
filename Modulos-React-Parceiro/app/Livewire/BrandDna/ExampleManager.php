<?php

namespace App\Livewire\BrandDna;

use App\Models\BrandDna;
use App\Models\BrandDnaExample;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Livewire\Attributes\Computed;
use Livewire\Component;

class ExampleManager extends Component
{
    use AuthorizesRequests;

    public BrandDna $brandDna;

    public ?int $editingExampleId = null;

    public string $title = '';

    public string $content = '';

    public string $contentType = '';

    public string $notes = '';

    public function mount(BrandDna $brandDna): void
    {
        $this->authorize('update', $brandDna);

        $this->brandDna = $brandDna;
    }

    public function saveExample(): void
    {
        $validated = $this->validate([
            'title' => ['required', 'string', 'max:120'],
            'content' => ['required', 'string'],
            'contentType' => ['nullable', 'string', 'max:80'],
            'notes' => ['nullable', 'string'],
        ], attributes: [
            'title' => 'titulo do exemplo',
            'content' => 'conteudo do exemplo',
            'contentType' => 'tipo do conteudo',
            'notes' => 'observacoes',
        ]);

        $example = $this->editingExampleId
            ? $this->brandDna->examples()->findOrFail($this->editingExampleId)
            : new BrandDnaExample(['brand_dna_id' => $this->brandDna->id]);

        $example->fill([
            'title' => $validated['title'],
            'content' => $validated['content'],
            'content_type' => $validated['contentType'] ?: null,
            'notes' => $validated['notes'] ?: null,
        ])->save();

        $this->resetExampleForm();
        session()->flash('brand_dna_example_status', 'Exemplo salvo com sucesso.');
    }

    public function editExample(int $exampleId): void
    {
        $example = $this->brandDna->examples()->findOrFail($exampleId);

        $this->editingExampleId = $example->id;
        $this->title = $example->title;
        $this->content = $example->content;
        $this->contentType = $example->content_type ?? '';
        $this->notes = $example->notes ?? '';
    }

    public function deleteExample(int $exampleId): void
    {
        $this->brandDna->examples()->findOrFail($exampleId)->delete();

        if ($this->editingExampleId === $exampleId) {
            $this->resetExampleForm();
        }

        session()->flash('brand_dna_example_status', 'Exemplo removido com sucesso.');
    }

    public function resetExampleForm(): void
    {
        $this->reset(['editingExampleId', 'title', 'content', 'contentType', 'notes']);
    }

    #[Computed]
    public function examples()
    {
        return $this->brandDna->examples()->latest('updated_at')->get();
    }

    public function render()
    {
        return view('livewire.brand-dna.example-manager');
    }
}
