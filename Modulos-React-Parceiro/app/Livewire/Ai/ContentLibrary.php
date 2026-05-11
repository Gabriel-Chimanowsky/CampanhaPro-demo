<?php

namespace App\Livewire\Ai;

use App\Enums\ContentItemStatus;
use App\Models\BrandDna;
use App\Models\ContentItem;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Title;
use Livewire\Attributes\Url;
use Livewire\Component;
use Livewire\WithPagination;

#[Title('Biblioteca de Conteudo')]
class ContentLibrary extends Component
{
    use AuthorizesRequests;
    use WithPagination;

    #[Url(as: 'status', history: true)]
    public string $status = 'approved';

    #[Url(as: 'brand', history: true)]
    public string $brand = 'all';

    #[Url(as: 'channel', history: true)]
    public string $channel = 'all';

    #[Url(as: 'q', history: true)]
    public string $search = '';

    #[Url(as: 'favorite', history: true)]
    public bool $favoritesOnly = false;

    public function updatedStatus(): void
    {
        $this->resetPage();
    }

    public function updatedBrand(): void
    {
        $this->resetPage();
    }

    public function updatedChannel(): void
    {
        $this->resetPage();
    }

    public function updatedSearch(): void
    {
        $this->resetPage();
    }

    public function updatedFavoritesOnly(): void
    {
        $this->resetPage();
    }

    public function approveContentItem(int $contentItemId): void
    {
        $contentItem = $this->findOwnedItem($contentItemId);

        $this->authorize('update', $contentItem);

        $contentItem->approve(auth()->user());
    }

    public function toggleFavorite(int $contentItemId): void
    {
        $contentItem = $this->findOwnedItem($contentItemId);

        $this->authorize('update', $contentItem);

        $contentItem->toggleFavorite();
    }

    #[Computed]
    public function items()
    {
        return ContentItem::query()
            ->ownedBy(auth()->user())
            ->with(['template', 'brandDna', 'generation', 'guidedBrief'])
            ->latest('updated_at')
            ->when($this->status !== 'all', fn ($query) => $query->where('status', $this->status))
            ->when($this->brand !== 'all', fn ($query) => $query->where('brand_dna_id', $this->brand))
            ->when($this->channel !== 'all', fn ($query) => $query->where('channel', $this->channel))
            ->when($this->favoritesOnly, fn ($query) => $query->favorited())
            ->when(
                filled($this->search),
                fn ($query) => $query->where(function ($inner): void {
                    $inner
                        ->where('title', 'like', '%'.$this->search.'%')
                        ->orWhere('body', 'like', '%'.$this->search.'%')
                        ->orWhere('objective', 'like', '%'.$this->search.'%')
                        ->orWhereHas('template', fn ($templateQuery) => $templateQuery->where('name', 'like', '%'.$this->search.'%'))
                        ->orWhereHas('brandDna', fn ($brandQuery) => $brandQuery->where('name', 'like', '%'.$this->search.'%'));
                }),
            )
            ->paginate(12);
    }

    #[Computed]
    public function brands()
    {
        return BrandDna::query()
            ->visibleTo(auth()->user())
            ->whereHas('contentItems', fn ($query) => $query->where('user_id', auth()->id()))
            ->orderBy('name')
            ->get();
    }

    /**
     * @return array<int, string>
     */
    #[Computed]
    public function channels(): array
    {
        return ContentItem::query()
            ->ownedBy(auth()->user())
            ->whereNotNull('channel')
            ->distinct()
            ->orderBy('channel')
            ->pluck('channel')
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return array<string, string>
     */
    #[Computed]
    public function statusOptions(): array
    {
        return [
            'all' => 'Todos',
            ContentItemStatus::Approved->value => ContentItemStatus::Approved->label(),
            ContentItemStatus::InReview->value => ContentItemStatus::InReview->label(),
            ContentItemStatus::Draft->value => ContentItemStatus::Draft->label(),
            ContentItemStatus::Rejected->value => ContentItemStatus::Rejected->label(),
            ContentItemStatus::Archived->value => ContentItemStatus::Archived->label(),
        ];
    }

    protected function findOwnedItem(int $contentItemId): ContentItem
    {
        return ContentItem::query()
            ->ownedBy(auth()->user())
            ->findOrFail($contentItemId);
    }

    public function render()
    {
        return view('livewire.ai.content-library');
    }
}
