<?php

namespace App\Livewire\Ai;

use App\Models\AiGeneration;
use App\Models\AiTemplate;
use Illuminate\Support\Collection;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Title;
use Livewire\Attributes\Url;
use Livewire\Component;

#[Title('AI Templates')]
class TemplateCatalog extends Component
{
    #[Url(as: 'type', history: true)]
    public string $filter = 'all';

    #[Url(as: 'q', history: true)]
    public string $search = '';

    public function setFilter(string $filter): void
    {
        if (in_array($filter, ['all', 'text', 'image'], true)) {
            $this->filter = $filter;
        }
    }

    #[Computed]
    public function templates(): Collection
    {
        return AiTemplate::query()
            ->active()
            ->ordered()
            ->when($this->filter !== 'all', fn ($query) => $query->where('type', $this->filter))
            ->when(
                filled($this->search),
                fn ($query) => $query->where(function ($inner): void {
                    $inner
                        ->where('name', 'like', '%'.$this->search.'%')
                        ->orWhere('description', 'like', '%'.$this->search.'%');
                }),
            )
            ->get();
    }

    /**
     * @return array<string, int>
     */
    #[Computed]
    public function counts(): array
    {
        $base = AiTemplate::query()->active();

        return [
            'all' => (clone $base)->count(),
            'text' => (clone $base)->where('type', 'text')->count(),
            'image' => (clone $base)->where('type', 'image')->count(),
        ];
    }

    #[Computed]
    public function recentGenerations(): Collection
    {
        return AiGeneration::query()
            ->ownedBy(auth()->user())
            ->with('template')
            ->latestFirst()
            ->limit(4)
            ->get();
    }

    public function render()
    {
        return view('livewire.ai.template-catalog');
    }
}
