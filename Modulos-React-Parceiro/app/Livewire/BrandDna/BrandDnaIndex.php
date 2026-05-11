<?php

namespace App\Livewire\BrandDna;

use App\Models\BrandDna;
use App\Services\AI\RunContextMemory;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Storage;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Title;
use Livewire\Attributes\Url;
use Livewire\Component;

#[Title('Brand DNA')]
class BrandDnaIndex extends Component
{
    use AuthorizesRequests;

    #[Url(as: 'q', history: true)]
    public string $search = '';

    public ?int $defaultBrandDnaId = null;

    public function mount(): void
    {
        $this->defaultBrandDnaId = auth()->user()?->aiPreference?->default_brand_dna_id;
    }

    public function setDefaultBrandDna(int $brandDnaId, RunContextMemory $memory): void
    {
        $brandDna = BrandDna::query()
            ->visibleTo(auth()->user())
            ->findOrFail($brandDnaId);

        $memory->setDefaultBrandDna(auth()->user(), $brandDna);
        $this->defaultBrandDnaId = $brandDna->id;

        session()->flash('status', "{$brandDna->name} definida como Brand DNA padrao.");
    }

    public function clearDefaultBrandDna(RunContextMemory $memory): void
    {
        $memory->clearDefaultBrandDna(auth()->user());
        $this->defaultBrandDnaId = null;

        session()->flash('status', 'Brand DNA padrao removida.');
    }

    public function delete(int $brandDnaId): void
    {
        $brandDna = BrandDna::query()
            ->visibleTo(auth()->user())
            ->with('niches')
            ->findOrFail($brandDnaId);

        $this->authorize('delete', $brandDna);

        collect([
            $brandDna->primary_logo_path,
            $brandDna->monochrome_logo_path,
            $brandDna->icon_logo_path,
        ])->filter()->each(fn (string $path) => Storage::disk('public')->delete($path));

        $brandDna->delete();

        if ($this->defaultBrandDnaId === $brandDnaId) {
            $this->defaultBrandDnaId = null;
        }

        session()->flash('status', 'Brand DNA excluido com sucesso.');
    }

    #[Computed]
    public function brands()
    {
        return BrandDna::query()
            ->visibleTo(auth()->user())
            ->with(['niches', 'user'])
            ->withCount([
                'generations',
                'personas',
                'examples',
                'knowledgeDocuments as ready_knowledge_documents_count' => fn ($query) => $query->ready(),
            ])
            ->when(
                filled($this->search),
                fn ($query) => $query->where(function ($inner): void {
                    $inner
                        ->where('name', 'like', '%'.$this->search.'%')
                        ->orWhere('primary_product', 'like', '%'.$this->search.'%')
                        ->orWhereHas('niches', fn ($niches) => $niches->where('name', 'like', '%'.$this->search.'%'));
                }),
            )
            ->orderBy('name')
            ->get();
    }

    public function render()
    {
        return view('livewire.brand-dna.index');
    }
}
