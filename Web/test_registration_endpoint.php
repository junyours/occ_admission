<?php
// Test registration endpoint directly
require_once 'vendor/autoload.php';

// Load Laravel environment
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "<h2>Registration Endpoint Test</h2>";

// Test the startRegistration method directly
try {
    $controller = new \App\Http\Controllers\Auth\AuthController();
    
    // Create a mock request
    $request = new \Illuminate\Http\Request();
    $request->merge([
        'lname' => 'Test',
        'fname' => 'User',
        'mname' => 'Middle',
        'email' => 'test.registration@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'school_name' => 'Test School',
        'parent_name' => 'Parent Name',
        'parent_phone' => '09123456789',
        'phone' => '09123456789',
        'address' => 'Test Address',
        'selected_exam_date' => '2024-12-01',
        'selected_exam_session' => 'morning',
    ]);
    
    echo "<h3>Testing startRegistration method...</h3>";
    echo "Request data:<br>";
    echo "- Email: " . $request->email . "<br>";
    echo "- Name: " . $request->fname . ' ' . $request->mname . ' ' . $request->lname . "<br>";
    echo "- School: " . $request->school_name . "<br>";
    
    // Call the method
    $response = $controller->startRegistration($request);
    
    echo "<span style='color: green;'>✅ startRegistration method executed successfully!</span><br>";
    echo "Response type: " . get_class($response) . "<br>";
    
    if (method_exists($response, 'getTargetUrl')) {
        echo "Redirect URL: " . $response->getTargetUrl() . "<br>";
    }
    
} catch (Exception $e) {
    echo "<span style='color: red;'>❌ startRegistration method error:</span><br>";
    echo "Error: " . $e->getMessage() . "<br>";
    echo "File: " . $e->getFile() . " Line: " . $e->getLine() . "<br>";
    echo "Trace: " . $e->getTraceAsString() . "<br>";
}

// Test if the route exists
echo "<h3>Route Test</h3>";
try {
    $routes = \Illuminate\Support\Facades\Route::getRoutes();
    $found = false;
    
    foreach ($routes as $route) {
        if ($route->uri() === 'register/start' && in_array('POST', $route->methods())) {
            $found = true;
            echo "✅ Route 'register/start' (POST) found<br>";
            echo "Controller: " . $route->getActionName() . "<br>";
            break;
        }
    }
    
    if (!$found) {
        echo "❌ Route 'register/start' (POST) not found<br>";
    }
    
} catch (Exception $e) {
    echo "❌ Route test error: " . $e->getMessage() . "<br>";
}

echo "<h3>Cache Test</h3>";
try {
    $cacheKey = 'reg:pending:' . sha1('test.registration@example.com');
    $cached = \Illuminate\Support\Facades\Cache::get($cacheKey);
    
    if ($cached) {
        echo "✅ Cache entry found for test email<br>";
        echo "Cached data keys: " . implode(', ', array_keys($cached)) . "<br>";
    } else {
        echo "❌ No cache entry found for test email<br>";
    }
    
} catch (Exception $e) {
    echo "❌ Cache test error: " . $e->getMessage() . "<br>";
}
?>
