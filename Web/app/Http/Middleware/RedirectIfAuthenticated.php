<?php

namespace App\Http\Middleware;

use App\Providers\RouteServiceProvider;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RedirectIfAuthenticated
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @param  string|null  ...$guards
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next, ...$guards)
    {
        $guards = empty($guards) ? [null] : $guards;

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                $user = Auth::guard($guard)->user();
                
                // Redirect based on user role
                switch ($user->role) {
                    case 'evaluator':
                        return redirect()->route('evaluator.dashboard');
                    case 'guidance':
                        return redirect()->route('guidance.dashboard');
                    case 'student':
                        // Students should use mobile app, so redirect to home with message
                        return redirect()->route('login')->with('info', 'Students should use the mobile application.');
                    default:
                        // Logout invalid role users
                        Auth::logout();
                        return redirect()->route('login')->with('error', 'Invalid user role detected. Please contact administrator.');
                }
            }
        }

        return $next($request);
    }
}
