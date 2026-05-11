<?php

namespace App\Services\AI;

use InvalidArgumentException;

class ContentEditInstructionRunner
{
    public function apply(string $body, string $instruction): string
    {
        $instruction = trim($instruction);

        if (preg_match('/remov[ae]\s+a\s+linha\s+(\d+)/iu', $instruction, $matches) === 1) {
            return $this->removeLine($body, (int) $matches[1]);
        }

        throw new InvalidArgumentException('Nao entendi a edicao. Tente algo como "remova a linha 2".');
    }

    protected function removeLine(string $body, int $lineNumber): string
    {
        $lines = preg_split('/\R/u', $body) ?: [];

        if ($lineNumber < 1 || $lineNumber > count($lines)) {
            throw new InvalidArgumentException('Essa linha nao existe no conteudo atual.');
        }

        unset($lines[$lineNumber - 1]);

        return trim(implode("\n", array_values($lines)));
    }
}
