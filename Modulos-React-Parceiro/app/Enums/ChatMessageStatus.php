<?php

namespace App\Enums;

enum ChatMessageStatus: string
{
    case Pending = 'pending';
    case Streaming = 'streaming';
    case Completed = 'completed';
    case Failed = 'failed';
}
