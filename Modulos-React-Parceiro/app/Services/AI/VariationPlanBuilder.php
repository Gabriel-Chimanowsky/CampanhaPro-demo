<?php

namespace App\Services\AI;

class VariationPlanBuilder
{
    /**
     * @return array<int, array{index: int, direction: string}>
     */
    public function build(int $count): array
    {
        $count = max(1, min(5, $count));

        $directions = [
            'direta e objetiva, com foco em clareza e acao',
            'consultiva, explicando contexto e valor percebido',
            'provocativa, abrindo com contraste ou tensao relevante',
            'premium, com linguagem precisa e acabamento sofisticado',
            'tecnica, com enfase em especificidade e criterio',
        ];

        return collect(range(1, $count))
            ->map(fn (int $index): array => [
                'index' => $index,
                'direction' => $directions[$index - 1],
            ])
            ->all();
    }
}
