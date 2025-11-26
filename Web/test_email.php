<?php
// Simple email test script
// Place this in your Web directory and access it via browser: http://your-domain/test_email.php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\Mail;
use App\Mail\RegistrationVerificationCode;

// Load Laravel environment
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "<h2>Email Configuration Test</h2>";

// Check mail configuration
echo "<h3>Mail Configuration:</h3>";
echo "Default Mailer: " . config('mail.default') . "<br>";
echo "Mail Host: " . config('mail.mailers.smtp.host') . "<br>";
echo "Mail Port: " . config('mail.mailers.smtp.port') . "<br>";
echo "Mail Encryption: " . config('mail.mailers.smtp.encryption') . "<br>";
echo "Mail Username: " . config('mail.mailers.smtp.username') . "<br>";
echo "Mail From Address: " . config('mail.from.address') . "<br>";
echo "Mail From Name: " . config('mail.from.name') . "<br>";

echo "<h3>Environment Variables:</h3>";
echo "MAIL_MAILER: " . env('MAIL_MAILER', 'not set') . "<br>";
echo "MAIL_HOST: " . env('MAIL_HOST', 'not set') . "<br>";
echo "MAIL_PORT: " . env('MAIL_PORT', 'not set') . "<br>";
echo "MAIL_USERNAME: " . env('MAIL_USERNAME', 'not set') . "<br>";
echo "MAIL_PASSWORD: " . (env('MAIL_PASSWORD') ? '***set***' : 'not set') . "<br>";
echo "MAIL_ENCRYPTION: " . env('MAIL_ENCRYPTION', 'not set') . "<br>";
echo "MAIL_FROM_ADDRESS: " . env('MAIL_FROM_ADDRESS', 'not set') . "<br>";
echo "MAIL_FROM_NAME: " . env('MAIL_FROM_NAME', 'not set') . "<br>";

echo "<h3>Test Email Send:</h3>";

try {
    $testCode = "123456";
    $testName = "Test User";
    $testEmail = "test@example.com"; // Change this to your email for testing
    
    echo "Attempting to send test email to: " . $testEmail . "<br>";
    
    Mail::to($testEmail)->send(new RegistrationVerificationCode($testCode, $testName));
    
    echo "<span style='color: green;'>✅ Email sent successfully!</span><br>";
    echo "Check your email inbox for the verification code: " . $testCode . "<br>";
    
} catch (Exception $e) {
    echo "<span style='color: red;'>❌ Email failed to send:</span><br>";
    echo "Error: " . $e->getMessage() . "<br>";
    echo "File: " . $e->getFile() . " Line: " . $e->getLine() . "<br>";
}

echo "<h3>Log Files:</h3>";
echo "Check these log files for more details:<br>";
echo "- storage/logs/laravel.log<br>";
echo "- storage/logs/mail.log (if using log driver)<br>";

echo "<h3>Quick Fixes:</h3>";
echo "1. If using 'log' driver, emails are saved to storage/logs/laravel.log<br>";
echo "2. For Gmail, use: smtp.gmail.com, port 587, tls<br>";
echo "3. For Outlook, use: smtp-mail.outlook.com, port 587, tls<br>";
echo "4. Make sure to enable 'Less secure app access' or use App Passwords<br>";
?>
