<?php

return [
    'lock_file' => storage_path('app/installed.lock'),
    'env_file' => base_path('.env'),
    'env_example_file' => base_path('.env.example'),

    'required_php_version' => '8.3.0',

    'required_extensions' => [
        'ctype',
        'curl',
        'dom',
        'fileinfo',
        'filter',
        'hash',
        'mbstring',
        'openssl',
        'pcre',
        'pdo',
        'session',
        'tokenizer',
        'xml',
    ],

    'writable_paths' => [
        storage_path(),
        base_path('bootstrap/cache'),
    ],
];
