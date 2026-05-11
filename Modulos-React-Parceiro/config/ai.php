<?php

use App\Services\AI\Providers\GeminiProvider;
use App\Services\AI\Providers\OpenAIProvider;
use App\Services\AI\Providers\OpenRouterProvider;

return [

    'default_provider' => env('AI_DEFAULT_PROVIDER', 'openai'),

    'timeout' => (int) env('AI_TIMEOUT', 60),

    'output' => [
        'disk' => env('AI_OUTPUT_DISK', 'public'),
        'path' => env('AI_OUTPUT_PATH', 'ai-generations'),
    ],

    'providers' => [
        'openai' => [
            'label' => 'OpenAI',
            'enabled' => filled(env('OPENAI_API_KEY')),
            'driver' => OpenAIProvider::class,
            'api_key' => env('OPENAI_API_KEY'),
            'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
            'timeout' => (int) env('OPENAI_TIMEOUT', env('AI_TIMEOUT', 60)),
            'text_model' => env('OPENAI_TEXT_MODEL', 'gpt-5-mini'),
            'image_model' => env('OPENAI_IMAGE_MODEL', 'gpt-image-1'),
            'image_size' => env('OPENAI_IMAGE_SIZE', '1536x1024'),
            'image_quality' => env('OPENAI_IMAGE_QUALITY', 'medium'),
            'image_background' => env('OPENAI_IMAGE_BACKGROUND', 'opaque'),
            'image_output_format' => env('OPENAI_IMAGE_OUTPUT_FORMAT', 'png'),
            'models' => [
                'text' => [
                    ['id' => env('OPENAI_TEXT_MODEL', 'gpt-5-mini'), 'label' => 'GPT-5 Mini'],
                    ['id' => env('OPENAI_TEXT_MODEL_ALT', 'gpt-4.1-mini'), 'label' => 'GPT-4.1 Mini'],
                ],
                'image' => [
                    ['id' => env('OPENAI_IMAGE_MODEL', 'gpt-image-1'), 'label' => 'GPT Image 1'],
                ],
            ],
        ],
        'gemini' => [
            'label' => 'Google Gemini',
            'enabled' => filled(env('GEMINI_API_KEY')),
            'driver' => GeminiProvider::class,
            'api_key' => env('GEMINI_API_KEY'),
            'base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/'),
            'timeout' => (int) env('GEMINI_TIMEOUT', env('AI_TIMEOUT', 60)),
            'text_model' => env('GEMINI_TEXT_MODEL', 'gemini-2.5-flash'),
            'image_model' => env('GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image'),
            'models' => [
                'text' => [
                    ['id' => env('GEMINI_TEXT_MODEL_FAST', 'gemini-2.5-flash-lite'), 'label' => 'Gemini 2.5 Flash-Lite'],
                    ['id' => env('GEMINI_TEXT_MODEL', 'gemini-2.5-flash'), 'label' => 'Gemini 2.5 Flash'],
                ],
                'image' => [
                    ['id' => env('GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image'), 'label' => 'Gemini 2.5 Flash Image'],
                ],
            ],
        ],
        'openrouter' => [
            'label' => 'OpenRouter',
            'enabled' => filled(env('OPENROUTER_API_KEY')),
            'driver' => OpenRouterProvider::class,
            'timeout' => (int) env('OPENROUTER_API_TIMEOUT', env('AI_TIMEOUT', 60)),
            'text_model' => env('OPENROUTER_TEXT_MODEL', 'openai/gpt-4.1-mini'),
            'route' => env('OPENROUTER_ROUTE'),
            'provider_preferences' => [
                'allow_fallbacks' => filter_var(env('OPENROUTER_ALLOW_FALLBACKS', true), FILTER_VALIDATE_BOOL),
                'require_parameters' => filter_var(env('OPENROUTER_REQUIRE_PARAMETERS', true), FILTER_VALIDATE_BOOL),
                'data_collection' => env('OPENROUTER_DATA_COLLECTION', 'deny'),
                'zdr' => filter_var(env('OPENROUTER_ZDR', false), FILTER_VALIDATE_BOOL),
                'order' => array_values(array_filter(array_map(
                    'trim',
                    explode(',', (string) env('OPENROUTER_PROVIDER_ORDER', ''))
                ))),
            ],
            'models' => [
                'text' => [
                    ['id' => env('OPENROUTER_TEXT_MODEL', 'openai/gpt-4.1-mini'), 'label' => 'GPT-4.1 Mini via OpenRouter'],
                    ['id' => env('OPENROUTER_TEXT_MODEL_ALT', 'google/gemini-2.5-flash'), 'label' => 'Gemini 2.5 Flash via OpenRouter'],
                    ['id' => env('OPENROUTER_TEXT_MODEL_ALT_2', 'anthropic/claude-sonnet-4.5'), 'label' => 'Claude Sonnet 4.5 via OpenRouter'],
                    ['id' => env('OPENROUTER_FREE_MODEL', 'google/gemma-3-27b-it:free'), 'label' => 'Gemma 3 27B Free via OpenRouter'],
                    ['id' => env('OPENROUTER_FREE_MODEL_ALT', 'meta-llama/llama-3.3-70b-instruct:free'), 'label' => 'Llama 3.3 70B Free via OpenRouter'],
                ],
            ],
        ],
    ],

];
