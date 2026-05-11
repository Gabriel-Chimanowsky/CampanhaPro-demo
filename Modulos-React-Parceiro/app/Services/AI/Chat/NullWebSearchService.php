<?php

namespace App\Services\AI\Chat;

use App\Services\AI\Chat\Contracts\SearchesWeb;

class NullWebSearchService implements SearchesWeb
{
    public function search(string $query, array $options = []): array
    {
        return [];
    }
}
