<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\PersonalityTestController;
use App\Http\Controllers\Api\MobileAuthController;
use App\Http\Controllers\Api\MobileExamineeController;
use App\Models\ExamResult;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\QuestionBank;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
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

Route::get('/exam-results/practice', function (Request $request) {
    try {
        $year = $request->get('year');

        $includeArchived = filter_var(
            $request->get('include_archived', 'false'),
            FILTER_VALIDATE_BOOLEAN
        );

        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        $query = ExamResult::with([
            'examinee:id,accountId,lname,fname,mname,address,preferred_course',
            'examinee.user:id,email',
            'exam:examId,exam-ref-no',
        ]);

        // Match the reference:
        // false = non-archived only
        // true  = archived only
        $query->where('is_archived', $includeArchived ? 1 : 0);

        if ($year) {
            $query->whereYear('finished_at', (int) $year);
        }

        // Inclusive date range, matching the reference.
        if ($startDate) {
            $query->whereDate('finished_at', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('finished_at', '<=', $endDate);
        }

        // Export all matching records, sorted alphabetically.
        $results = $query
            ->get()
            ->sortBy([
                ['examinee.lname', 'asc'],
                ['examinee.fname', 'asc'],
            ])
            ->values();

        $spreadsheet = new Spreadsheet();

        $worksheet = $spreadsheet->getActiveSheet();
        $worksheet->setTitle('Exam Results');

        $headers = [
            'Last Name',
            'First Name',
            'Middle Name',
            'Address',
            'Preferred Course',
            'Email',
            'Exam Reference No.',
            'Finished At',
            'Score',
            'Percentage',
            'Remarks',
        ];

        foreach ($headers as $index => $header) {
            $column = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($index + 1);

            $worksheet->setCellValue($column . '1', $header);
        }

        /*
         * Fixed widths — no auto-size.
         * This prevents long addresses and emails from expanding the sheet.
         */
        $worksheet->getColumnDimension('A')->setWidth(18); // Last Name
        $worksheet->getColumnDimension('B')->setWidth(22); // First Name
        $worksheet->getColumnDimension('C')->setWidth(18); // Middle Name
        $worksheet->getColumnDimension('D')->setWidth(38); // Address
        $worksheet->getColumnDimension('E')->setWidth(20); // Preferred Course
        $worksheet->getColumnDimension('F')->setWidth(32); // Email
        $worksheet->getColumnDimension('G')->setWidth(22); // Exam Reference No.
        $worksheet->getColumnDimension('H')->setWidth(22); // Finished At
        $worksheet->getColumnDimension('I')->setWidth(12); // Score
        $worksheet->getColumnDimension('J')->setWidth(14); // Percentage
        $worksheet->getColumnDimension('K')->setWidth(15); // Remarks

        // Header styling
        $worksheet->getStyle('A1:K1')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => '1E3A8A'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E0E7FF'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        $worksheet->getRowDimension(1)->setRowHeight(24);
        $worksheet->freezePane('A2');
        $worksheet->setAutoFilter('A1:K1');

        $row = 2;

        foreach ($results as $result) {
            $student = $result->examinee;

            $worksheet->setCellValue('A' . $row, $student?->lname ?? '[Missing examinee]');
            $worksheet->setCellValue('B' . $row, $student?->fname ?? '');
            $worksheet->setCellValue('C' . $row, $student?->mname ?? '');
            $worksheet->setCellValue('D' . $row, $student?->address ?? '');
            $worksheet->setCellValue('E' . $row, $student?->preferred_course ?? '');
            $worksheet->setCellValue('F' . $row, $student?->user?->email ?? '');
            $worksheet->setCellValue('G' . $row, $result->exam?->{'exam-ref-no'} ?? '');
            $worksheet->setCellValue('H' . $row, $result->finished_at ?? '');
            $worksheet->setCellValue('I' . $row, $result->score ?? '');
            $worksheet->setCellValue('J' . $row, $result->percentage ?? '');
            $worksheet->setCellValue('K' . $row, $result->remarks ?? '');

            $row++;
        }

        $lastRow = $row - 1;

        if ($lastRow >= 2) {
            // Wrap long fields instead of widening columns.
            $worksheet->getStyle('D2:D' . $lastRow)
                ->getAlignment()
                ->setWrapText(true);

            $worksheet->getStyle('F2:F' . $lastRow)
                ->getAlignment()
                ->setWrapText(true);

            $worksheet->getStyle('A2:K' . $lastRow)
                ->getAlignment()
                ->setVertical(Alignment::VERTICAL_TOP);

            $worksheet->getStyle('I2:J' . $lastRow)
                ->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $worksheet->getStyle('A1:K' . $lastRow)
                ->getBorders()
                ->getAllBorders()
                ->setBorderStyle(Border::BORDER_THIN)
                ->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('D1D5DB'));
        }

        $filename = 'exam_results_' . now()->format('Y-m-d_His') . '.xlsx';
        $filepath = storage_path('app/' . $filename);

        (new Xlsx($spreadsheet))->save($filepath);

        return response()
            ->download(
                $filepath,
                $filename,
                [
                    'Content-Type' =>
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                ]
            )
            ->deleteFileAfterSend(true);
    } catch (\Exception $e) {
        Log::error('[ExamResults Practice] Excel export failed: ' . $e->getMessage());

        return response()->json([
            'success' => false,
            'message' => 'Failed to export exam results.',
            'error' => $e->getMessage(),
        ], 500);
    }
});

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


