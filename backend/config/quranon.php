<?php

return [
    // Where the frontend lives, for payment return URLs and CORS.
    'frontend_url' => rtrim(env('FRONTEND_URL', 'http://localhost:8080'), '/'),

    // Bundled translation files shared with the frontend.
    'i18n_path' => env('I18N_PATH') ?: base_path('../i18n'),

    // Dashboard URL prefix. Change it in production so the login page isn't at a guessable address.
    'admin_path' => trim(env('ADMIN_PATH', 'admin'), '/'),

    // Optional comma-separated list of IPs allowed to open the dashboard.
    'admin_ips' => array_filter(array_map('trim', explode(',', (string) env('ADMIN_ALLOWED_IPS', '')))),

    // Built-in data sources; the dashboard can override them.
    'sources' => [
        'audio_api' => 'https://mp3quran.net/api/v3',
        'text_api' => 'https://api.alquran.cloud/v1',
        'text_provider' => 'alquran_cloud',
    ],
];
