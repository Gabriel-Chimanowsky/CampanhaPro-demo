<?php

namespace App\Enums;

enum BrandDnaKnowledgeIngestionStatus: string
{
    case Pending = 'pending';
    case Processing = 'processing';
    case Ready = 'ready';
    case Failed = 'failed';
}
