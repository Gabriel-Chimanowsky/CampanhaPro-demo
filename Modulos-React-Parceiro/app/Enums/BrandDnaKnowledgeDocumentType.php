<?php

namespace App\Enums;

enum BrandDnaKnowledgeDocumentType: string
{
    case Document = 'document';
    case Text = 'text';
    case Site = 'site';
    case Youtube = 'youtube';
    case Mp4Transcript = 'mp4_transcript';
}
