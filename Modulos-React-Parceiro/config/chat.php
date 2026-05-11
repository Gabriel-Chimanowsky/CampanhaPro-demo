<?php

return [
    'roles' => [
        'suggestions' => [
            'Diretor de Vendas',
            'Gerente de Marketing',
            'Assistente Administrativo',
            'CEO',
            'COO',
            'Diretor Comercial',
            'Gerente Comercial',
            'SDR',
            'Closer',
            'Coordenador de Atendimento',
            'Gerente de Operacoes',
            'Analista de Marketing',
            'Social Media',
            'Copywriter',
            'Designer',
            'Customer Success',
            'Analista Financeiro',
            'RH',
            'Product Manager',
            'Founder',
        ],
    ],

    'history' => [
        'max_messages' => (int) env('CHAT_HISTORY_MAX_MESSAGES', 8),
        'summary_max_chars' => (int) env('CHAT_HISTORY_SUMMARY_MAX_CHARS', 900),
    ],

    'stream' => [
        'chunk_size' => (int) env('CHAT_STREAM_CHUNK_SIZE', 32),
        'chunk_sleep_microseconds' => (int) env('CHAT_STREAM_CHUNK_SLEEP_US', 12000),
    ],
];
