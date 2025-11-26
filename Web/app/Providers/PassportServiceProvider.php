<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;

class PassportServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Initialize Passport keyPath
        Passport::$keyPath = storage_path('oauth');
        
        // Create the oauth directory if it doesn't exist
        if (!file_exists(storage_path('oauth'))) {
            mkdir(storage_path('oauth'), 0755, true);
        }

        // Set token expiration to 7 days (604800 seconds)
        Passport::tokensExpireIn(now()->addDays(7));
        Passport::refreshTokensExpireIn(now()->addDays(30));
        Passport::personalAccessTokensExpireIn(now()->addDays(7));
    }
}
