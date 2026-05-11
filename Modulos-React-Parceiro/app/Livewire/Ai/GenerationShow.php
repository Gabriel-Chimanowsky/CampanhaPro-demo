<?php

namespace App\Livewire\Ai;

use App\Models\AiGeneration;
use App\Models\ContentItem;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Title('Detalhe da Geracao')]
class GenerationShow extends Component
{
    use AuthorizesRequests;

    public AiGeneration $generation;

    public function mount(AiGeneration $generation): void
    {
        $this->authorize('view', $generation);

        $this->generation = $generation->load([
            'template',
            'brandDna.niches',
            'brandDnaPersona',
            'contentItems.guidedBrief',
            'contentItems.template',
        ]);
    }

    public function approveContentItem(int $contentItemId): void
    {
        $contentItem = ContentItem::query()
            ->ownedBy(auth()->user())
            ->where('ai_generation_id', $this->generation->id)
            ->findOrFail($contentItemId);

        $this->authorize('update', $contentItem);

        $contentItem->approve(auth()->user());
        $this->generation->load(['contentItems.guidedBrief', 'contentItems.template']);
    }

    public function toggleFavorite(int $contentItemId): void
    {
        $contentItem = ContentItem::query()
            ->ownedBy(auth()->user())
            ->where('ai_generation_id', $this->generation->id)
            ->findOrFail($contentItemId);

        $this->authorize('update', $contentItem);

        $contentItem->toggleFavorite();
        $this->generation->load(['contentItems.guidedBrief', 'contentItems.template']);
    }

    #[Computed]
    public function relatedGenerations()
    {
        return AiGeneration::query()
            ->ownedBy(auth()->user())
            ->with(['template', 'brandDna', 'brandDnaPersona'])
            ->whereKeyNot($this->generation->id)
            ->latestFirst()
            ->limit(4)
            ->get();
    }

    public function render()
    {
        return view('livewire.ai.generation-show');
    }
}
