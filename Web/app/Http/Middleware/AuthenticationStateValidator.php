<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

class AuthenticationStateValidator
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        $currentRoute = Route::currentRouteName();
        $isAuthenticated = Auth::check();
        
        // Define route groups
        $authRoutes = ['login', 'register', 'forgot-password', 'reset-password'];
        $dashboardRoutes = ['evaluator.dashboard', 'guidance.dashboard'];
        
        // If this is an AJAX request, handle it appropriately
        if ($request->ajax() || $request->wantsJson()) {
            if (!$isAuthenticated && in_array($currentRoute, $dashboardRoutes)) {
                return response()->json(['redirect' => route('login')], 401);
            }
            
            if ($isAuthenticated && in_array($currentRoute, $authRoutes)) {
                $user = Auth::user();
                $redirectRoute = $user->role === 'evaluator' ? 'evaluator.dashboard' : 'guidance.dashboard';
                return response()->json(['redirect' => route($redirectRoute)], 200);
            }
        }
        
        // For regular requests, let the existing middleware handle it
        return $next($request);
    }
}
