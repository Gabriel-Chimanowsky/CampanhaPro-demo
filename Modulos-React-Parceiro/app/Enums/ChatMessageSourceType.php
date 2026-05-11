<?php

namespace App\Enums;

enum ChatMessageSourceType: string
{
    case Knowledge = 'knowledge';
    case Web = 'web';
}
