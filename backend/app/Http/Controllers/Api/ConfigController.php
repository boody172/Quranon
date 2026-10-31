<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AppConfig;
use Illuminate\Http\JsonResponse;

class ConfigController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()
            ->json(AppConfig::get())
            ->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=86400');
    }
}
