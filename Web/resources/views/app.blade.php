<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title inertia>{{ config('app.name', 'OCC Admission System') }}</title>

        <!-- Favicon -->
        <link rel="icon" type="image/png" href="{{ asset('OCC logo.png') }}">
        <link rel="shortcut icon" type="image/png" href="{{ asset('OCC logo.png') }}">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
        
        <!-- Browser History Protection -->
        <script>
            // Enhanced Browser Navigation Security
            (function() {
                // Get authentication and route information
                @auth
                    const isAuthenticated = true;
                    const userRole = '{{ auth()->user()->role ?? "" }}';
                @else
                    const isAuthenticated = false;
                    const userRole = '';
                @endauth
                
                const currentRoute = '{{ Route::currentRouteName() ?? "" }}';
                const authRoutes = ['login', 'register', 'forgot-password', 'reset-password'];
                const dashboardRoutes = ['evaluator.dashboard', 'guidance.dashboard'];
                
                // Disable browser cache for authentication-sensitive pages
                if (authRoutes.includes(currentRoute) || dashboardRoutes.includes(currentRoute)) {
                    // Override browser navigation
                    history.pushState(null, null, location.href);
                    
                    window.addEventListener('popstate', function(event) {
                        // Always prevent the default back action
                        event.preventDefault();
                        
                        // INSTANT validation on history navigation
                        checkServerAuthStatus();
                        
                        // Re-validate authentication state
                        validateAuthenticationState();
                        
                        // Push the current state back to prevent navigation
                        history.pushState(null, null, location.href);
                    });
                }
                
                // Function to validate authentication state
                function validateAuthenticationState() {
                    // For authenticated users trying to access auth pages
                    if (isAuthenticated && authRoutes.includes(currentRoute)) {
                        redirectToDashboard();
                        return;
                    }
                    
                    // For non-authenticated users trying to access dashboard
                    if (!isAuthenticated && dashboardRoutes.includes(currentRoute)) {
                        window.location.replace('{{ route("login") }}');
                        return;
                    }
                    
                    // Check server-side auth status for dashboard pages
                    if (isAuthenticated && dashboardRoutes.includes(currentRoute)) {
                        checkServerAuthStatus();
                    }
                }
                
                // Function to redirect to appropriate dashboard
                function redirectToDashboard() {
                    const dashboardUrl = userRole === 'evaluator' 
                        ? '{{ route("evaluator.dashboard") }}' 
                        : '{{ route("guidance.dashboard") }}';
                    window.location.replace(dashboardUrl);
                }
                
                // Function to check server-side authentication status
                function checkServerAuthStatus() {
                    // Use dedicated auth check endpoint for instant response
                    fetch('{{ route("auth.check") }}', {
                        method: 'GET',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                        },
                        cache: 'no-store'
                    }).then(response => {
                        if (response.ok) {
                            return response.json();
                        } else if (response.status === 401) {
                            // Not authenticated
                            throw new Error('Not authenticated');
                        } else {
                            throw new Error('Auth check failed');
                        }
                    }).then(data => {
                        if (!data.authenticated) {
                            // Session expired or not authenticated
                            window.location.replace(data.redirect_url || '{{ route("login") }}');
                        } else {
                            // Check if user is on correct dashboard for their role
                            const currentUrl = window.location.pathname;
                            const expectedDashboard = data.role === 'evaluator' ? '/evaluator/dashboard' : '/guidance/dashboard';
                            
                            if (authRoutes.includes(currentRoute)) {
                                // Authenticated user on auth page, redirect to dashboard
                                window.location.replace(data.redirect_url);
                            }
                        }
                    }).catch((error) => {
                        // Session expired, network error, or auth failure
                        console.warn('Auth check failed:', error.message);
                        window.location.replace('{{ route("login") }}');
                    });
                }
                
                // Disable browser cache for sensitive pages
                if (authRoutes.includes(currentRoute) || dashboardRoutes.includes(currentRoute)) {
                    // Prevent caching
                    window.addEventListener('beforeunload', function() {
                        // Clear any cached data
                        if ('caches' in window) {
                            caches.keys().then(function(names) {
                                names.forEach(function(name) {
                                    caches.delete(name);
                                });
                            });
                        }
                    });
                }
                
                // Additional periodic auth check for dashboard pages
                @auth
                if (dashboardRoutes.includes(currentRoute)) {
                    // Check auth status every 5 seconds for instant detection
                    setInterval(checkServerAuthStatus, 5000);
                    
                    // Check immediately if page was loaded from cache
                    if (performance.navigation.type === 2) { // Back/Forward cache
                        setTimeout(checkServerAuthStatus, 100);
                    }
                }
                @endauth
                
                // Handle page visibility changes (e.g., switching tabs) - INSTANT CHECK
                document.addEventListener('visibilitychange', function() {
                    if (!document.hidden) {
                        // Immediate auth check when tab becomes visible
                        if (dashboardRoutes.includes(currentRoute)) {
                            @auth
                            checkServerAuthStatus();
                            @endauth
                        } else if (authRoutes.includes(currentRoute)) {
                            validateAuthenticationState();
                        }
                    }
                });
                
                // Handle focus events - INSTANT CHECK
                window.addEventListener('focus', function() {
                    // Immediate check when window gains focus
                    if (dashboardRoutes.includes(currentRoute)) {
                        @auth
                        checkServerAuthStatus();
                        @endauth
                    } else if (authRoutes.includes(currentRoute)) {
                        validateAuthenticationState();
                    }
                });
                
                // Add instant validation on user interaction
                if (dashboardRoutes.includes(currentRoute)) {
                    @auth
                    // Check on any user interaction for instant feedback
                    let lastCheck = Date.now();
                    const THROTTLE_DELAY = 1000; // 1 second throttle for instant response
                    
                    function throttledAuthCheck() {
                        const now = Date.now();
                        if (now - lastCheck > THROTTLE_DELAY) {
                            lastCheck = now;
                            checkServerAuthStatus();
                        }
                    }
                    
                    // Mouse interactions
                    document.addEventListener('click', throttledAuthCheck);
                    document.addEventListener('mousemove', throttledAuthCheck);
                    
                    // Keyboard interactions
                    document.addEventListener('keydown', throttledAuthCheck);
                    
                    // Page interactions
                    document.addEventListener('scroll', throttledAuthCheck);
                    @endauth
                }
                
                // Prevent unauthorized access on page load - INSTANT CHECK
                window.addEventListener('load', function() {
                    // Immediate validation on page load
                    validateAuthenticationState();
                    
                    // Also check server auth status for dashboard pages
                    if (dashboardRoutes.includes(currentRoute)) {
                        @auth
                        checkServerAuthStatus();
                        @endauth
                    }
                });
                
                // DOM content loaded check - EVEN FASTER
                document.addEventListener('DOMContentLoaded', function() {
                    validateAuthenticationState();
                    
                    if (dashboardRoutes.includes(currentRoute)) {
                        @auth
                        checkServerAuthStatus();
                        @endauth
                    }
                });
                
                // Initial validation - IMMEDIATE
                validateAuthenticationState();
                
                // Immediate server check for dashboard
                if (dashboardRoutes.includes(currentRoute)) {
                    @auth
                    setTimeout(checkServerAuthStatus, 50); // Almost instant
                    @endauth
                }
                
            })();
        </script>
    </body>
</html>