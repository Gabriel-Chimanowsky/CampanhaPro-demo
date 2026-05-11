<?php

namespace App\Livewire\Ai;

use App\Models\AiGeneration;
use App\Models\BrandDna;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Title;
use Livewire\Attributes\Url;
use Livewire\Component;
use Livewire\WithPagination;

#[Title('Historico de Geracoes')]
class GenerationHistory extends Component
{
    use WithPagination;

    #[Url(as: 'type', history: true)]
    public string $filter = 'all';

    #[Url(as: 'status', history: true)]
    public string $status = 'all';

    #[Url(as: 'q', history: true)]
    public string $search = '';

    #[Url(as: 'brand', history: true)]
    public string $brand = 'all';

    public function updatedFilter(): void
    {
        $this->resetPage();
    }

    public function updatedStatus(): void
    {
        $this->resetPage();
    }

    public function updatedSearch(): void
    {
        $this->resetPage();
    }

    public function updatedBrand(): void
    {
        $this->resetPage();
    }

    #[Computed]
    public function generations()
    {
        return AiGeneration::query()
            ->ownedBy(auth()->user())
            ->with(['template', 'brandDna', 'brandDnaPersona'])
            ->latestFirst()
            ->when($this->filter !== 'all', fn ($query) => $query->where('type', $this->filter))
            ->when($this->status !== 'all', fn ($query) => $query->where('status', $this->status))
            ->when($this->brand !== 'all', fn ($query) => $query->where('brand_dna_id', $this->brand))
            ->when(
                filled($this->search),
                fn ($query) => $query->where(function ($inner): void {
                    $inner
                        ->whereHas('template', fn ($templateQuery) => $templateQuery->where('name', 'like', '%'.$this->search.'%'))
                        ->orWhereHas('brandDna', fn ($brandQuery) => $brandQuery->where('name', 'like', '%'.$this->search.'%'))
                        ->orWhere('output_text', 'like', '%'.$this->search.'%');
                }),
            )
            ->paginate(12);
    }

    #[Computed]
    public function brands()
    {
        return BrandDna::query()
            ->visibleTo(auth()->user())
            ->whereHas('generations', fn ($query) => $query->ownedBy(auth()->user()))
            ->orderBy('name')
            ->get();
    }

    public function render()
    {
        return view('livewire.ai.generation-history');
    }
}
