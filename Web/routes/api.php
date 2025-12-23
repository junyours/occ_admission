<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\PersonalityTestController;
use App\Http\Controllers\Api\MobileAuthController;
use App\Http\Controllers\Api\MobileExamineeController;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\QuestionBank;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::post('/login', [AuthController::class, 'apiLogin']); // Keep existing for backward compatibility
Route::get('/health', [MobileAuthController::class, 'health']); // Mobile app health check

// Mobile app authentication routes (public)
Route::prefix('mobile')->group(function () {
    Route::post('/login', [MobileAuthController::class, 'login']);
    Route::post('/login/fingerprint', [MobileAuthController::class, 'fingerprintLogin']); // Fingerprint login endpoint
    Route::post('/force-logout-other-devices', [MobileAuthController::class, 'forceLogoutOtherDevices']); // Force logout from other devices
    Route::post('/force-logout/request-otp', [MobileAuthController::class, 'requestForceLogoutOtp']);
    Route::post('/force-logout/verify-otp', [MobileAuthController::class, 'verifyForceLogoutOtp']);
    Route::post('/register', [\App\Http\Controllers\Api\MobileRegistrationController::class, 'register']);
    Route::post('/verify-email', [\App\Http\Controllers\Api\MobileRegistrationController::class, 'verifyEmail']);
    Route::post('/resend-verification', [\App\Http\Controllers\Api\MobileRegistrationController::class, 'resendVerificationCode']);
    Route::get('/health', [MobileAuthController::class, 'health']);
});

// Test route to verify Passport is working
Route::get('/test', function () {
    return response()->json(['message' => 'API is working!']);
});

// Test route to check examinee data
Route::get('/test-examinee', [MobileExamineeController::class, 'testExamineeData']);



// Protected routes
Route::middleware('auth:api')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    
    Route::post('/logout', [AuthController::class, 'apiLogout']); // Keep existing for backward compatibility
    
    // Mobile app protected routes
    Route::prefix('mobile')->group(function () {
        Route::get('/validate-token', [MobileAuthController::class, 'validateToken']); // Token validation - MUST be inside auth:api middleware
        Route::get('/profile', [MobileAuthController::class, 'profile']);
        Route::get('/examinee/profile', [MobileExamineeController::class, 'getProfile']);
        Route::put('/examinee/profile', [MobileExamineeController::class, 'updateProfile']);
        Route::post('/examinee/preferred-course', [MobileExamineeController::class, 'updatePreferredCourse']);
        Route::get('/exam-schedule', [MobileAuthController::class, 'getExamSchedule']);
        Route::get('/check-force-allow', [MobileAuthController::class, 'checkForceAllow']);
        Route::get('/courses', [MobileExamineeController::class, 'getCourses']);
        Route::get('/exam-dates', [MobileExamineeController::class, 'getExamDates']);
        Route::get('/exam-schedules', [MobileExamineeController::class, 'getExamSchedules']);
        Route::post('/reschedule-exam', [MobileExamineeController::class, 'rescheduleExam']);
        Route::post('/logout', [MobileAuthController::class, 'logout']);
        
        // Fingerprint/Biometric routes
        Route::post('/user/fingerprint', [MobileAuthController::class, 'registerFingerprint']);
        Route::get('/user/fingerprint', [MobileAuthController::class, 'getFingerprintStatus']);
        Route::delete('/user/fingerprint', [MobileAuthController::class, 'deleteFingerprint']);
    });
    
    // Student routes (for mobile app)
    Route::prefix('student')->group(function () {
        Route::get('/profile', [AuthController::class, 'getStudentProfile']);
        Route::get('/exams', [AuthController::class, 'getStudentExams']);
        Route::get('/results', [AuthController::class, 'getStudentResults']);
        Route::post('/submit-exam', [AuthController::class, 'submitExam']);
    });


});

// Test endpoint for question images
Route::get('/questions/{id}/image', function ($id) {
    $question = QuestionBank::find($id);
    if (!$question || !$question->image) {
        return response()->json(['error' => 'Question or image not found'], 404);
    }
    
    return response()->json([
        'questionId' => $question->questionId,
        'image' => $question->image
    ]);
});

// Registration status endpoint
Route::get('/registration-status', function () {
    $settings = \App\Models\ExamRegistrationSetting::getCurrentSettings();
    return response()->json([
        'registration_open' => $settings->registration_open,
        'registration_message' => $settings->registration_message
    ]);
});

// Exam API routes
Route::prefix('exams')->group(function () {
    Route::get('/', [ExamController::class, 'getAllExams']);
    Route::post('/get-by-ref', [ExamController::class, 'getExamByRef']);
    Route::post('/attach-personality-questions', [ExamController::class, 'attachPersonalityQuestions']);
});

// Mobile exam routes (protected)
Route::middleware('auth:api')->group(function () {
    Route::prefix('mobile/exam')->group(function () {
        Route::post('/validate-code', [ExamController::class, 'validateExamCode']);
        Route::get('/{examId}/questions', [ExamController::class, 'getExamQuestions']);
        
        // Separate personality and academic question endpoints
        Route::get('/{examId}/personality-questions', [ExamController::class, 'getPersonalityTestQuestions']);
        Route::get('/{examId}/academic-questions', [ExamController::class, 'getAcademicExamQuestions']);
        // Submit personality-only answers before academic exam
        Route::post('/personality/submit', [PersonalityTestController::class, 'submitPersonalityTestAnswers']);
        
        Route::post('/submit', [ExamController::class, 'submitExamAnswers']);
        Route::post('/answer', [ExamController::class, 'submitSingleExamAnswer']); // Real-time per-question save
        Route::get('/results', [ExamController::class, 'getExamResults']);
        
        // Departmental exam routes
        Route::get('/departmental/{examId}/questions', [ExamController::class, 'getDepartmentalExamQuestions']);
        Route::post('/departmental/submit', [ExamController::class, 'submitDepartmentalExamAnswers']);
        
        // Exam monitoring routes
        Route::post('/exam-started', [ExamController::class, 'markExamStarted']);
        Route::post('/exam-stopped', [ExamController::class, 'markExamStopped']);
    });

    // Exam progress persistence
    Route::prefix('mobile/exam-progress')->group(function () {
        Route::post('/upsert', [\App\Http\Controllers\Api\ExamProgressController::class, 'upsert']);
        Route::get('/', [\App\Http\Controllers\Api\ExamProgressController::class, 'fetch']);
        Route::post('/clear', [\App\Http\Controllers\Api\ExamProgressController::class, 'clear']);
    });
    
    // General personality questions endpoint
    Route::get('/mobile/personality-questions/all', [ExamController::class, 'getAllPersonalityTestQuestions']);

    // Personality status & submission
    Route::get('/mobile/personality/status', [PersonalityTestController::class, 'checkStatus']);
});


