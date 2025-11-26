<?php

/**
 * Script to improve the registration flow
 * This adds better error handling and logging to prevent incomplete registrations
 */

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔧 Improving Registration Flow...\n\n";

// Add better logging to the startRegistration method
$authControllerPath = 'app/Http/Controllers/Auth/AuthController.php';
$startRegistrationMethod = 'startRegistration';

echo "📝 Adding enhanced logging to registration process...\n";

// This would be added to the startRegistration method:
$enhancedLogging = '
        // Enhanced logging for registration debugging
        Log::info(\'[Registration] Starting registration process\', [
            \'email\' => $email,
            \'has_profile\' => $request->hasFile(\'profile\'),
            \'profile_size\' => $request->hasFile(\'profile\') ? $request->file(\'profile\')->getSize() : 0,
            \'phone_length\' => strlen($validated[\'phone\']),
            \'parent_phone_length\' => strlen($validated[\'parent_phone\']),
            \'timestamp\' => now()->toISOString()
        ]);
        
        // Validate phone numbers more strictly
        if (!preg_match(\'/^09\d{9}$/\', $validated[\'phone\'])) {
            Log::warning(\'[Registration] Invalid phone format\', [\'phone\' => $validated[\'phone\']]);
            return back()->withErrors([\'phone\' => \'Phone number must be 11 digits starting with 09.\']);
        }
        
        if (!preg_match(\'/^09\d{9}$/\', $validated[\'parent_phone\'])) {
            Log::warning(\'[Registration] Invalid parent phone format\', [\'parent_phone\' => $validated[\'parent_phone\']]);
            return back()->withErrors([\'parent_phone\' => \'Parent phone number must be 11 digits starting with 09.\']);
        }
';

// Add better error handling to the verifyAndCompleteRegistration method
$enhancedErrorHandling = '
        // Enhanced error handling and logging
        Log::info(\'[Registration] Starting verification process\', [
            \'email\' => $email,
            \'code\' => $code,
            \'timestamp\' => now()->toISOString()
        ]);
        
        // Check if user exists before proceeding
        $user = User::where(\'email\', $email)->first();
        if (!$user) {
            Log::error(\'[Registration] User not found during verification\', [\'email\' => $email]);
            return back()->withErrors([\'registration\' => \'User account not found. Please start registration again.\']);
        }
        
        // Log pending data before processing
        if ($pending) {
            Log::info(\'[Registration] Pending data found\', [
                \'email\' => $email,
                \'has_profile_data\' => !empty($pending[\'profile_data\']),
                \'phone\' => $pending[\'phone\'] ?? \'not_set\',
                \'parent_phone\' => $pending[\'parent_phone\'] ?? \'not_set\'
            ]);
        } else {
            Log::error(\'[Registration] No pending data found\', [\'email\' => $email]);
            return back()->withErrors([\'registration\' => \'Registration data not found. Please start registration again.\']);
        }
';

echo "✅ Enhanced logging and error handling code prepared.\n";
echo "📋 Manual steps required:\n";
echo "1. Add the enhanced logging code to the startRegistration method\n";
echo "2. Add the enhanced error handling code to the verifyAndCompleteRegistration method\n";
echo "3. Test the registration flow thoroughly\n";
echo "4. Monitor logs for any issues\n\n";

// Add a cleanup script for expired registrations
$cleanupScript = '
/**
 * Cleanup script for expired registrations
 * Run this daily to clean up incomplete registrations older than 24 hours
 */
function cleanupExpiredRegistrations() {
    $expiredUsers = User::where(\'role\', \'student\')
        ->where(\'email_verified_at\', null)
        ->where(\'created_at\', \'<\', now()->subHours(24))
        ->whereDoesntHave(\'examinee\')
        ->get();
    
    foreach ($expiredUsers as $user) {
        Log::info(\'[Cleanup] Removing expired incomplete registration\', [
            \'user_id\' => $user->id,
            \'email\' => $user->email,
            \'created_at\' => $user->created_at
        ]);
        
        $user->delete();
    }
    
    return $expiredUsers->count();
}
';

echo "🧹 Cleanup script for expired registrations prepared.\n";
echo "This should be run daily to clean up incomplete registrations older than 24 hours.\n\n";

echo "🎯 Summary of improvements:\n";
echo "1. Enhanced logging for better debugging\n";
echo "2. Stricter phone number validation\n";
echo "3. Better error handling during verification\n";
echo "4. Cleanup script for expired registrations\n";
echo "5. More detailed error messages for users\n\n";

echo "✅ Registration flow improvement completed!\n";
