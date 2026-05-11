<?php

namespace App\Services\AI;

use App\Enums\AiGenerationStatus;
use App\Models\AiGeneration;
use App\Models\BrandDna;
use App\Models\User;
use App\Models\UserAiPreference;
use App\Models\UserAiTemplatePreference;

class RunContextMemory
{
    public function rememberSuccessfulGeneration(AiGeneration $generation, bool $useKnowledgeBase): void
    {
        if ($generation->status !== AiGenerationStatus::Completed) {
            return;
        }

        UserAiPreference::query()->updateOrCreate(
            ['user_id' => $generation->user_id],
            [
                'last_brand_dna_id' => $generation->brand_dna_id,
                'last_brand_dna_persona_id' => $generation->brand_dna_persona_id,
                'last_provider' => $generation->provider,
                'last_model' => $generation->model,
                'last_use_brand_dna' => $generation->brand_dna_id !== null,
                'last_use_knowledge_base' => $useKnowledgeBase,
            ],
        );

        UserAiTemplatePreference::query()->updateOrCreate(
            [
                'user_id' => $generation->user_id,
                'ai_template_id' => $generation->ai_template_id,
            ],
            [
                'brand_dna_id' => $generation->brand_dna_id,
                'brand_dna_persona_id' => $generation->brand_dna_persona_id,
                'provider' => $generation->provider,
                'model' => $generation->model,
                'use_knowledge_base' => $useKnowledgeBase,
            ],
        );
    }

    public function setDefaultBrandDna(User $user, BrandDna $brandDna): UserAiPreference
    {
        return UserAiPreference::query()->updateOrCreate(
            ['user_id' => $user->id],
            ['default_brand_dna_id' => $brandDna->id],
        );
    }

    public function clearDefaultBrandDna(User $user): void
    {
        UserAiPreference::query()->where('user_id', $user->id)->update([
            'default_brand_dna_id' => null,
        ]);
    }
}
