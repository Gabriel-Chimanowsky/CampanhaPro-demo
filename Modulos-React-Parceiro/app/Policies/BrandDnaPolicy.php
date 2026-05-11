<?php

namespace App\Policies;

use App\Models\BrandDna;
use App\Models\User;

class BrandDnaPolicy
{
    public function view(User $user, BrandDna $brandDna): bool
    {
        return true;
    }

    public function update(User $user, BrandDna $brandDna): bool
    {
        return $brandDna->user_id === $user->id;
    }

    public function delete(User $user, BrandDna $brandDna): bool
    {
        return $brandDna->user_id === $user->id;
    }
}
