<?php

namespace App\Livewire\Ai;

use App\Models\ContentItem;
use App\Services\AI\ContentEditInstructionRunner;
use App\Services\AI\ContentItemVersionService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use InvalidArgumentException;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Title('Conteudo da Biblioteca')]
class ContentItemShow extends Component
{
    use AuthorizesRequests;

    public ContentItem $contentItem;

    public string $editableBody = '';

    public string $changeReason = '';

    public string $editInstruction = '';

    public string $rejectReason = '';

    public ?string $friendlyError = null;

    public function mount(ContentItem $contentItem): void
    {
        $this->authorize('view', $contentItem);

        $this->contentItem = $contentItem;
        $this->refreshContentItem();
    }

    public function approve(): void
    {
        $this->friendlyError = null;
        $this->authorize('update', $this->contentItem);

        $this->contentItem->approve(auth()->user());
        $this->refreshContentItem();
    }

    public function sendToReview(): void
    {
        $this->friendlyError = null;
        $this->authorize('update', $this->contentItem);

        $this->contentItem->sendToReview();
        $this->refreshContentItem();
    }

    public function reject(): void
    {
        $this->friendlyError = null;
        $this->authorize('update', $this->contentItem);

        $this->validate([
            'rejectReason' => ['required', 'string', 'max:1000'],
        ], attributes: [
            'rejectReason' => 'motivo',
        ]);

        $this->contentItem->reject(auth()->user(), $this->rejectReason);
        $this->rejectReason = '';
        $this->refreshContentItem();
    }

    public function saveManualEdit(ContentItemVersionService $versionService): void
    {
        $this->friendlyError = null;
        $this->authorize('update', $this->contentItem);

        $this->validate([
            'editableBody' => ['required', 'string', 'max:50000'],
            'changeReason' => ['nullable', 'string', 'max:1000'],
        ], attributes: [
            'editableBody' => 'conteudo',
            'changeReason' => 'motivo da alteracao',
        ]);

        $versionService->createTextVersion(
            $this->contentItem,
            auth()->user(),
            $this->editableBody,
            'manual',
            null,
            filled($this->changeReason) ? $this->changeReason : null,
        );

        $this->changeReason = '';
        $this->refreshContentItem();
    }

    public function applyEditInstruction(
        ContentEditInstructionRunner $instructionRunner,
        ContentItemVersionService $versionService,
    ): void {
        $this->friendlyError = null;
        $this->authorize('update', $this->contentItem);

        $this->validate([
            'editInstruction' => ['required', 'string', 'max:1000'],
        ], attributes: [
            'editInstruction' => 'instrucao',
        ]);

        try {
            $body = $instructionRunner->apply((string) $this->contentItem->body, $this->editInstruction);
        } catch (InvalidArgumentException $exception) {
            $this->friendlyError = $exception->getMessage();

            return;
        }

        $versionService->createTextVersion(
            $this->contentItem,
            auth()->user(),
            $body,
            'ai',
            $this->editInstruction,
        );

        $this->editInstruction = '';
        $this->refreshContentItem();
    }

    protected function refreshContentItem(): void
    {
        $this->contentItem = ContentItem::query()
            ->with([
                'template',
                'brandDna',
                'brandDnaPersona',
                'generation',
                'guidedBrief',
                'versions.changedBy',
            ])
            ->findOrFail($this->contentItem->id);

        $this->editableBody = (string) $this->contentItem->body;
    }

    public function render()
    {
        return view('livewire.ai.content-item-show');
    }
}
