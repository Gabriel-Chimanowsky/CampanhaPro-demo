<?php

namespace App\Policies;

use App\Models\ContentItem;
use App\Models\User;

class ContentItemPolicy
{
    public function view(User $user, ContentItem $contentItem): bool
    {
        return $contentItem->user_id === $user->id;
    }

    public function update(User $user, ContentItem $contentItem): bool
    {
        return $contentItem->user_id === $user->id;
    }
}
