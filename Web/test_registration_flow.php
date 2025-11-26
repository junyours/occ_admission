<?php

/**
 * Test script to verify registration flow
 * This will test the new mobile registration API
 */

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Examinee;
use App\Models\ExamineeRegistration;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 Testing Registration Flow...\n\n";

try {
    // Check current counts
    $userCount = User::where('role', 'student')->count();
    $examineeCount = Examinee::count();
    $registrationCount = ExamineeRegistration::count();
    
    echo "📊 Current Database State:\n";
    echo "- Users (students): {$userCount}\n";
    echo "- Examinees: {$examineeCount}\n";
    echo "- Registrations: {$registrationCount}\n\n";
    
    // Check for users without examinee records
    $incompleteUsers = User::where('role', 'student')
        ->whereDoesntHave('examinee')
        ->get();
    
    echo "❌ Users without examinee records: {$incompleteUsers->count()}\n";
    
    if ($incompleteUsers->count() > 0) {
        echo "Incomplete users:\n";
        foreach ($incompleteUsers as $user) {
            echo "- ID: {$user->id}, Email: {$user->email}, Created: {$user->created_at}\n";
        }
    }
    
    // Check for examinees without registration records
    $incompleteExaminees = Examinee::whereDoesntHave('registration')->get();
    
    echo "\n❌ Examinees without registration records: {$incompleteExaminees->count()}\n";
    
    if ($incompleteExaminees->count() > 0) {
        echo "Incomplete examinees:\n";
        foreach ($incompleteExaminees as $examinee) {
            echo "- ID: {$examinee->id}, Account ID: {$examinee->accountId}, Name: {$examinee->fname} {$examinee->lname}\n";
        }
    }
    
    // Check for users with unverified emails
    $unverifiedUsers = User::where('role', 'student')
        ->whereNull('email_verified_at')
        ->get();
    
    echo "\n⚠️  Users with unverified emails: {$unverifiedUsers->count()}\n";
    
    if ($unverifiedUsers->count() > 0) {
        echo "Unverified users:\n";
        foreach ($unverifiedUsers as $user) {
            echo "- ID: {$user->id}, Email: {$user->email}, Created: {$user->created_at}\n";
        }
    }
    
    // Check recent registrations (last 24 hours)
    $recentUsers = User::where('role', 'student')
        ->where('created_at', '>=', now()->subDay())
        ->with('examinee')
        ->get();
    
    echo "\n📅 Recent registrations (last 24 hours): {$recentUsers->count()}\n";
    
    foreach ($recentUsers as $user) {
        $hasExaminee = $user->examinee ? '✅' : '❌';
        $isVerified = $user->email_verified_at ? '✅' : '❌';
        echo "- {$user->email}: Examinee {$hasExaminee}, Verified {$isVerified}\n";
    }
    
    echo "\n✅ Test completed!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}