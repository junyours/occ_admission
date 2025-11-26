<?php

/**
 * Script to fix incomplete registrations
 * This will complete the examinee records for users who have user accounts but no examinee records
 */

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Examinee;
use App\Models\ExamineeRegistration;
use App\Models\ExamRegistrationSetting;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔧 Fixing Incomplete Registrations...\n\n";

try {
    // Find users with no examinee records
    $incompleteUsers = User::where('role', 'student')
        ->whereDoesntHave('examinee')
        ->get();

    echo "Found " . $incompleteUsers->count() . " users with incomplete registrations:\n";
    
    foreach ($incompleteUsers as $user) {
        echo "- User ID: {$user->id}, Email: {$user->email}, Name: {$user->username}\n";
    }
    
    echo "\n";

    if ($incompleteUsers->count() === 0) {
        echo "✅ No incomplete registrations found. All users have examinee records.\n";
        exit(0);
    }

    // Get current registration settings
    $settings = ExamRegistrationSetting::getCurrentSettings();
    
    DB::beginTransaction();
    
    $fixedCount = 0;
    
    foreach ($incompleteUsers as $user) {
        try {
            echo "Processing user: {$user->email}... ";
            
            // Extract name parts from username
            $nameParts = explode(' ', $user->username);
            $fname = $nameParts[0] ?? '';
            $lname = end($nameParts) ?? '';
            $mname = count($nameParts) > 2 ? implode(' ', array_slice($nameParts, 1, -1)) : null;
            
            // Create examinee record with default values
            $examinee = Examinee::create([
                'accountId' => $user->id,
                'lname' => $lname,
                'fname' => $fname,
                'mname' => $mname,
                'phone' => 0, // Default phone number
                'address' => 'Address not provided', // Default address
                'school_name' => 'School not specified', // Default school
                'parent_name' => 'Parent not specified', // Default parent name
                'parent_phone' => 0, // Default parent phone
                'Profile' => null, // No profile image
            ]);
            
            // Create examinee registration record
            $registration = ExamineeRegistration::create([
                'examinee_id' => $examinee->id,
                'school_year' => $settings->academic_year ?? date('Y') . '-' . (date('Y') + 1),
                'semester' => $settings->semester ?? '1st',
                'status' => 'registered',
                'registration_date' => now()->toDateString(),
            ]);
            
            echo "✅ Fixed\n";
            $fixedCount++;
            
        } catch (Exception $e) {
            echo "❌ Failed: " . $e->getMessage() . "\n";
        }
    }
    
    DB::commit();
    
    echo "\n🎉 Successfully fixed {$fixedCount} incomplete registrations!\n";
    echo "All users now have both user accounts and examinee records.\n";
    
} catch (Exception $e) {
    DB::rollback();
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
