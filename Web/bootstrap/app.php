<?php

use Illuminate\Foundation\Application;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
         $middleware->web(append: [
        HandleInertiaRequests::class,
    ]);
    
    $middleware->api(append: [
        // CreateFreshApiToken::class, // Removed for mobile API compatibility
    ]);
    
    // Register middleware aliases
    $middleware->alias([
        'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
        'prevent.back' => \App\Http\Middleware\PreventBackHistory::class,
        'auth.validator' => \App\Http\Middleware\AuthenticationStateValidator::class,
    ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
