<?php

namespace App\Enums;

enum AiGenerationStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
    case Failed = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Gerando',
            self::Completed => 'Concluido',
            self::Failed => 'Falhou',
        };
    }

    public function badgeClasses(): string
    {
        return match ($this) {
            self::Pending => 'bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-200',
            self::Completed => 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200',
            self::Failed => 'bg-rose-500/12 text-rose-700 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-200',
        };
    }
}
