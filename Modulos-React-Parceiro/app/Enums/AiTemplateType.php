<?php

namespace App\Enums;

enum AiTemplateType: string
{
    case Text = 'text';
    case Image = 'image';

    public function label(): string
    {
        return match ($this) {
            self::Text => 'Texto',
            self::Image => 'Imagem',
        };
    }

    public function badgeClasses(): string
    {
        return match ($this) {
            self::Text => 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200',
            self::Image => 'bg-sky-500/12 text-sky-700 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-200',
        };
    }

    public function accentClasses(): string
    {
        return match ($this) {
            self::Text => 'from-emerald-200 via-teal-100 to-white text-emerald-700',
            self::Image => 'from-sky-200 via-cyan-100 to-white text-sky-700',
        };
    }
}
