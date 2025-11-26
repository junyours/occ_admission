<?php

/**
 * Test script to verify the mobile registration API endpoint
 * This will test the API directly to ensure it's working
 */

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🧪 Testing Mobile Registration API...\n\n";

try {
    // Test data
    $testData = [
        'lname' => 'Test',
        'fname' => 'User',
        'mname' => 'Mobile',
        'email' => 'test.mobile.' . time() . '@gmail.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'school_name' => 'Test School',
        'parent_name' => 'Test Parent',
        'parent_phone' => '09123456789',
        'phone' => '09123456789',
        'address' => 'Test Address, Test City',
        'selected_exam_date' => '2025-01-15',
        'selected_exam_session' => 'morning'
    ];
    
    echo "📝 Test Data:\n";
    echo "- Email: {$testData['email']}\n";
    echo "- Name: {$testData['fname']} {$testData['mname']} {$testData['lname']}\n";
    echo "- Phone: {$testData['phone']}\n\n";
    
    // Create a test profile image (1x1 pixel PNG)
    $testImageData = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    $testImagePath = storage_path('app/test_profile.png');
    file_put_contents($testImagePath, $testImageData);
    
    // Create a test request
    $request = new \Illuminate\Http\Request();
    $request->merge($testData);
    $request->files->set('profile', new \Illuminate\Http\UploadedFile(
        $testImagePath,
        'test_profile.png',
        'image/png',
        null,
        true
    ));
    
    // Test the controller
    $controller = new \App\Http\Controllers\Api\MobileRegistrationController();
    $response = $controller->register($request);
    
    echo "📊 API Response:\n";
    echo "- Status Code: " . $response->getStatusCode() . "\n";
    echo "- Success: " . ($response->getData()->success ? 'Yes' : 'No') . "\n";
    echo "- Message: " . $response->getData()->message . "\n";
    
    if ($response->getData()->success) {
        $data = $response->getData()->data;
        echo "- User ID: {$data->user_id}\n";
        echo "- Examinee ID: {$data->examinee_id}\n";
        echo "- Email Verified: " . ($data->email_verified ? 'Yes' : 'No') . "\n";
        echo "- Examinee Linked: " . ($data->examinee_linked ? 'Yes' : 'No') . "\n";
        
        // Verify in database
        $user = \App\Models\User::find($data->user_id);
        $examinee = \App\Models\Examinee::find($data->examinee_id);
        
        if ($user && $examinee) {
            echo "\n✅ Database Verification:\n";
            echo "- User exists: Yes\n";
            echo "- User email verified: " . ($user->email_verified_at ? 'Yes' : 'No') . "\n";
            echo "- Examinee exists: Yes\n";
            echo "- Examinee linked to user: " . ($examinee->accountId == $user->id ? 'Yes' : 'No') . "\n";
            echo "- User role: {$user->role}\n";
            
            // Clean up test data
            $examinee->delete();
            $user->delete();
            echo "\n🧹 Test data cleaned up\n";
        } else {
            echo "\n❌ Database verification failed\n";
        }
    } else {
        echo "\n❌ Registration failed\n";
        if (isset($response->getData()->errors)) {
            echo "Errors: " . json_encode($response->getData()->errors, JSON_PRETTY_PRINT) . "\n";
        }
    }
    
    // Clean up test image
    if (file_exists($testImagePath)) {
        unlink($testImagePath);
    }
    
    echo "\n🎉 Test completed!\n";
    
} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}
