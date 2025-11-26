<?php
// Test email sending in registration flow
require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache;
use App\Mail\RegistrationVerificationCode;

// Load Laravel environment
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "<h2>Email Sending Test in Registration Flow</h2>";

// Test 1: Check if we can send email directly
echo "<h3>Test 1: Direct Email Send</h3>";
try {
    $testCode = "123456";
    $testName = "Test User";
    $testEmail = "test.registration@example.com";
    
    echo "Sending email to: " . $testEmail . "<br>";
    
    Mail::to($testEmail)->send(new RegistrationVerificationCode($testCode, $testName));
    
    echo "<span style='color: green;'>✅ Direct email send successful!</span><br>";
    
} catch (Exception $e) {
    echo "<span style='color: red;'>❌ Direct email send failed:</span><br>";
    echo "Error: " . $e->getMessage() . "<br>";
}

// Test 2: Check cache functionality
echo "<h3>Test 2: Cache Test</h3>";
try {
    $email = "test.registration@example.com";
    $cacheKey = 'reg:pending:' . sha1($email);
    
    // Clear any existing cache
    Cache::forget($cacheKey);
    
    // Create test cache data
    $testData = [
        'lname' => 'Test',
        'fname' => 'User',
        'mname' => 'Middle',
        'email' => $email,
        'password_hash' => 'hashed_password',
        'school_name' => 'Test School',
        'parent_name' => 'Parent Name',
        'parent_phone' => '09123456789',
        'phone' => '09123456789',
        'address' => 'Test Address',
        'profile_data' => 'base64_image_data',
        'code' => '123456',
        'created_at' => now()->toIso8601String(),
        'attempts' => 0,
    ];
    
    Cache::put($cacheKey, $testData, now()->addMinutes(20));
    
    $cached = Cache::get($cacheKey);
    if ($cached) {
        echo "<span style='color: green;'>✅ Cache test successful!</span><br>";
        echo "Cached data keys: " . implode(', ', array_keys($cached)) . "<br>";
    } else {
        echo "<span style='color: red;'>❌ Cache test failed!</span><br>";
    }
    
} catch (Exception $e) {
    echo "<span style='color: red;'>❌ Cache test error:</span><br>";
    echo "Error: " . $e->getMessage() . "<br>";
}

// Test 3: Check mail configuration
echo "<h3>Test 3: Mail Configuration</h3>";
echo "Mail Driver: " . config('mail.default') . "<br>";
echo "Mail Host: " . config('mail.mailers.smtp.host') . "<br>";
echo "Mail Port: " . config('mail.mailers.smtp.port') . "<br>";
echo "Mail Encryption: " . config('mail.mailers.smtp.encryption') . "<br>";
echo "Mail Username: " . config('mail.mailers.smtp.username') . "<br>";
echo "Mail From: " . config('mail.from.address') . "<br>";
echo "Mail From Name: " . config('mail.from.name') . "<br>";

// Test 4: Check if RegistrationVerificationCode mail class exists
echo "<h3>Test 4: Mail Class Test</h3>";
try {
    $mailClass = new RegistrationVerificationCode('123456', 'Test User');
    echo "<span style='color: green;'>✅ RegistrationVerificationCode class exists!</span><br>";
    echo "Class: " . get_class($mailClass) . "<br>";
} catch (Exception $e) {
    echo "<span style='color: red;'>❌ RegistrationVerificationCode class error:</span><br>";
    echo "Error: " . $e->getMessage() . "<br>";
}

// Test 5: Check Laravel logs
echo "<h3>Test 5: Laravel Logs</h3>";
$logFile = 'storage/logs/laravel.log';
if (file_exists($logFile)) {
    $logContent = file_get_contents($logFile);
    if (empty($logContent)) {
        echo "Log file is empty<br>";
    } else {
        echo "Log file has content (" . strlen($logContent) . " characters)<br>";
        $lines = explode("\n", $logContent);
        $recentLines = array_slice($lines, -10);
        echo "Last 10 lines:<br>";
        foreach ($recentLines as $line) {
            if (!empty(trim($line))) {
                echo htmlspecialchars($line) . "<br>";
            }
        }
    }
} else {
    echo "Log file does not exist<br>";
}

echo "<h3>Next Steps:</h3>";
echo "1. Try the debug registration form at: <a href='/debug_registration_form.html'>/debug_registration_form.html</a><br>";
echo "2. Check your email inbox for verification codes<br>";
echo "3. Check Laravel logs for any errors<br>";
echo "4. Make sure to upload a profile image when testing<br>";
?>
