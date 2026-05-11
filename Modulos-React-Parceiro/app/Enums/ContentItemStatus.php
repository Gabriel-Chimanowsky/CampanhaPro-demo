<?php

namespace App\Enums;

enum ContentItemStatus: string
{
    case Draft = 'draft';
    case InReview = 'in_review';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Rascunho',
            self::InReview => 'Em revisao',
            self::Approved => 'Aprovado',
            self::Rejected => 'Rejeitado',
            self::Archived => 'Arquivado',
        };
    }

    public function badgeClasses(): string
    {
        return match ($this) {
            self::Draft => 'bg-slate-500/10 text-slate-700 ring-slate-500/20',
            self::InReview => 'bg-amber-500/12 text-amber-700 ring-amber-500/20',
            self::Approved => 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/20',
            self::Rejected => 'bg-rose-500/12 text-rose-700 ring-rose-500/20',
            self::Archived => 'bg-zinc-500/10 text-zinc-700 ring-zinc-500/20',
        };
    }
}
