<?php

namespace App\Services\AI;

use App\Enums\ContentItemStatus;
use App\Models\AiGeneration;
use App\Models\ContentItem;
use App\Models\ContentItemVersion;
use App\Models\GuidedBrief;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ContentItemVersionService
{
    public function createTextVersion(
        ContentItem $item,
        User $user,
        string $body,
        string $editMode,
        ?string $editInstruction = null,
        ?string $changeReason = null,
    ): ContentItemVersion {
        return DB::transaction(function () use ($item, $user, $body, $editMode, $editInstruction, $changeReason): ContentItemVersion {
            $guidedBrief = $item->getRelationValue('guidedBrief');
            $generation = $item->getRelationValue('generation');

            $version = ContentItemVersion::query()->create([
                'content_item_id' => $item->id,
                'version_number' => $this->nextVersionNumber($item),
                'body' => $body,
                'output_file_path' => $item->output_file_path,
                'edit_instruction' => $editInstruction,
                'edit_mode' => $editMode,
                'changed_by' => $user->id,
                'change_reason' => $changeReason,
                'brief_snapshot' => $guidedBrief instanceof GuidedBrief ? ($guidedBrief->answers ?? []) : [],
                'context_snapshot' => array_filter([
                    'brand_dna_id' => $item->brand_dna_id,
                    'brand_dna_persona_id' => $item->brand_dna_persona_id,
                    'meta' => $item->meta ?? [],
                ]),
                'provider' => $generation instanceof AiGeneration ? $generation->provider : null,
                'model' => $generation instanceof AiGeneration ? $generation->model : null,
            ]);

            $item->forceFill([
                'body' => $body,
                'status' => ContentItemStatus::InReview,
                'approved_at' => null,
                'approved_by' => null,
            ])->save();

            return $version;
        });
    }

    protected function nextVersionNumber(ContentItem $item): int
    {
        return ((int) $item->versions()->max('version_number')) + 1;
    }
}
