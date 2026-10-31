<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** When ADMIN_ALLOWED_IPS is set, the dashboard (including its login page) answers 404 to everyone else. */
class RestrictAdminIps
{
    public function handle(Request $request, Closure $next): Response
    {
        $allowed = config('quranon.admin_ips');

        abort_if($allowed && ! in_array($request->ip(), $allowed, true), 404);

        return $next($request);
    }
}
