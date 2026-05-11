<?php

namespace App\Services\AI\Chat\Contracts;

interface SearchesWeb
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function search(string $query, array $options = []): array;
}
