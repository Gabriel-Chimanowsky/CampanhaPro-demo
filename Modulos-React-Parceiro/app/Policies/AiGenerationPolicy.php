<?php

namespace App\Policies;

use App\Models\AiGeneration;
use App\Models\User;

class AiGenerationPolicy
{
    public function view(User $user, AiGeneration $generation): bool
    {
        return $generation->user_id === $user->id;
    }
}
