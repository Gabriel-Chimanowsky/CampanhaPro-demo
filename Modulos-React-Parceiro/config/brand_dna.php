<?php

return [
    'default_tones' => [
        'criativo',
        'luxo',
        'amigavel',
        'tecnico',
        'inspirador',
        'direto',
        'descontraido',
    ],

    'age_ranges' => [
        '18-24',
        '25-34',
        '35-44',
        '45-54',
        '55+',
    ],

    'genders' => [
        'M',
        'F',
        'ambos',
    ],

    'sales_models' => [
        'B2B',
        'B2C',
        'ambos',
    ],

    'languages' => [
        'pt-BR' => 'Portugues (Brasil)',
        'en-US' => 'English (US)',
        'es-ES' => 'Espanol',
    ],

    'awareness_levels' => [
        'desconhece',
        'problema',
        'solucao',
        'produto',
        'muito consciente',
    ],

    'writing_styles' => [
        'educacional',
        'storytelling',
        'consultivo',
        'editorial',
        'provocativo',
        'aspiracional',
        'direto ao ponto',
    ],

    'knowledge_base' => [
        'enabled' => true,
        'transcription_provider' => env('BRAND_DNA_TRANSCRIPTION_PROVIDER', 'gemini'),
        'transcription_model' => env('BRAND_DNA_TRANSCRIPTION_MODEL', 'gemini-2.5-flash'),
        'max_mp4_mb' => (int) env('BRAND_DNA_MAX_MP4_MB', 200),
        'temporary_disk' => env('BRAND_DNA_TEMP_DISK', 'local'),
        'delete_provider_files' => filter_var(env('BRAND_DNA_DELETE_PROVIDER_FILES', true), FILTER_VALIDATE_BOOL),
        'ingestion_timeout' => (int) env('BRAND_DNA_INGESTION_TIMEOUT', 300),
        'chunk_size' => (int) env('BRAND_DNA_CHUNK_SIZE', 1100),
        'chunk_overlap' => (int) env('BRAND_DNA_CHUNK_OVERLAP', 180),
        'retrieval_limit' => (int) env('BRAND_DNA_RETRIEVAL_LIMIT', 4),
        'hybrid' => [
            'candidate_limit' => (int) env('BRAND_DNA_HYBRID_CANDIDATE_LIMIT', 12),
            'rrf_k' => (int) env('BRAND_DNA_HYBRID_RRF_K', 60),
            'mmr_lambda' => (float) env('BRAND_DNA_HYBRID_MMR_LAMBDA', 0.72),
        ],
        'embeddings' => [
            'enabled' => filter_var(env('BRAND_DNA_EMBEDDINGS_ENABLED', true), FILTER_VALIDATE_BOOL),
            'provider' => env('BRAND_DNA_EMBEDDINGS_PROVIDER', 'gemini'),
            'model' => env('BRAND_DNA_EMBEDDINGS_MODEL', 'gemini-embedding-001'),
            'dimensions' => (int) env('BRAND_DNA_EMBEDDINGS_DIMENSIONS', 1536),
            'timeout' => (int) env('BRAND_DNA_EMBEDDINGS_TIMEOUT', 120),
        ],
        'pgvector' => [
            'enabled' => filter_var(env('BRAND_DNA_PGVECTOR_ENABLED', true), FILTER_VALIDATE_BOOL),
        ],
        'supported_document_extensions' => ['pdf', 'txt', 'md', 'csv', 'json'],
    ],

    'template_field_map' => [
        'brand_name' => 'name',
        'product_name' => 'primary_product',
        'subject' => 'primary_product',
        'headline_focus' => 'primary_product',
        'campaign_name' => 'name',
        'title' => 'name',
        'offer' => 'pitch_bio',
        'topic' => 'pitch_bio',
        'benefit' => 'competitive_differentiators',
        'article_text' => 'article_context',
        'tone' => 'resolved_tone',
        'audience' => 'audience_summary',
        'segment' => 'niche_summary',
        'theme' => 'niche_summary',
        'mood' => 'palette_summary',
        'visual_direction' => 'visual_direction_summary',
        'keywords' => 'frequent_terms_summary',
        'communication_style' => 'communication_summary',
    ],
];
