<?php

namespace App\Http\Controllers\Guidance;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Examinee;
use App\Models\ExamResult;
use App\Http\Controllers\Controller;

class SettingsController extends Controller
{
    /**
     * Settings page for guidance counselor
     */
    public function index()
    {
        $user = Auth::user();
        
        return Inertia::render('Guidance/Settings', [
            'user' => $user,
        ]);
    }

    /**
     * Dry run to check incomplete registrations
     */
    public function registrationDryRun(Request $request)
    {
        try {
            $hours = $request->get('hours', 1);
            
            // Query database directly instead of parsing command output
            // Find users with role 'student' who are either:
            // 1. Not email verified AND no examinee record (incomplete registration)
            // 2. Email verified BUT no examinee record (missing examinee data)
            $incompleteUsers = User::where('role', 'student')
                ->where('created_at', '<', now()->subHours($hours))
                ->where(function($query) {
                    // Not verified and no examinee record
                    $query->where(function($q) {
                        $q->whereNull('email_verified_at')
                          ->whereDoesntHave('examinee');
                    })
                    // OR verified but no examinee record
                    ->orWhere(function($q) {
                        $q->whereNotNull('email_verified_at')
                          ->whereDoesntHave('examinee');
                    });
                })
                ->get();
            
            $incompleteRegistrations = $incompleteUsers->map(function($user) {
                return [
                    'id' => $user->id,
                    'email' => $user->email,
                    'name' => $user->username,
                    'created_at' => $user->created_at->format('Y-m-d H:i:s'),
                    'email_verified' => $user->email_verified_at ? 'Yes' : 'No',
                    'has_examinee' => false,
                    'issue_type' => $user->email_verified_at ? 'Missing examinee data' : 'Incomplete registration'
                ];
            })->toArray();
            
            $foundCount = count($incompleteRegistrations);
            
            Log::info('Registration dry run completed', [
                'hours' => $hours,
                'found_count' => $foundCount,
                'registrations' => $incompleteRegistrations
            ]);
            
            return response()->json([
                'success' => true,
                'found_count' => $foundCount,
                'incomplete_registrations' => $incompleteRegistrations,
                'message' => $foundCount > 0 
                    ? "Found {$foundCount} incomplete registration(s)" 
                    : "No incomplete registrations found"
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error running registration dry run', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error running dry run: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clean up incomplete registrations
     */
    public function registrationCleanup(Request $request)
    {
        try {
            $userIds = $request->get('user_ids', []);
            
            if (empty($userIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No users selected for deletion'
                ], 400);
            }
            
            // Find the selected users
            $usersToDelete = User::where('role', 'student')
                ->whereIn('id', $userIds)
                ->get();
            
            $deletedCount = 0;
            $errors = [];
            
            foreach ($usersToDelete as $user) {
                try {
                    Log::info('[Cleanup] Removing incomplete registration', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'created_at' => $user->created_at,
                        'hours_old' => $user->created_at->diffInHours(now())
                    ]);
                    
                    $user->delete();
                    $deletedCount++;
                    
                } catch (\Exception $e) {
                    $errors[] = "Failed to delete {$user->email}: {$e->getMessage()}";
                    Log::error('[Cleanup] Failed to delete user', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            $message = "Successfully deleted {$deletedCount} incomplete registration(s)";
            if (!empty($errors)) {
                $message .= ". Errors: " . implode(', ', $errors);
            }
            
            return response()->json([
                'success' => true,
                'message' => $message,
                'deleted_count' => $deletedCount,
                'errors' => $errors
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error running registration cleanup', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error running cleanup: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Fix incomplete registrations
     */
    public function fixIncompleteRegistrations(Request $request)
    {
        try {
            $userIds = $request->get('user_ids', []);
            
            if (empty($userIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No users selected for fixing'
                ], 400);
            }
            
            // Find users that need fixing (verified but no examinee record)
            $usersToFix = User::where('role', 'student')
                ->whereIn('id', $userIds)
                ->whereNotNull('email_verified_at')
                ->whereDoesntHave('examinee')
                ->get();
            
            $fixedCount = 0;
            $errors = [];
            
            foreach ($usersToFix as $user) {
                try {
                    // Parse name from username (assuming format: "FirstName MiddleName LastName")
                    $nameParts = explode(' ', trim($user->username));
                    $fname = $nameParts[0] ?? 'Unknown';
                    $lname = count($nameParts) > 1 ? array_pop($nameParts) : '';
                    $mname = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '';
                    
                    // Create examinee record with required fields
                    $examinee = Examinee::create([
                        'accountId' => $user->id,
                        'fname' => $fname,
                        'lname' => $lname,
                        'mname' => $mname,
                        'phone' => 0, // Default value - user needs to update
                        'address' => 'To be updated',
                        'school_name' => 'To be updated',
                        'parent_name' => 'To be updated',
                        'parent_phone' => 0, // Default value - user needs to update
                        'preferred_course' => '',
                        'Profile' => null,
                    ]);
                    
                    $fixedCount++;
                    
                    Log::info('[Fix] Created examinee record for verified user', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'examinee_id' => $examinee->id,
                        'fname' => $fname,
                        'lname' => $lname
                    ]);
                    
                } catch (\Exception $e) {
                    $errors[] = "Failed to fix {$user->email}: {$e->getMessage()}";
                    Log::error('[Fix] Failed to create examinee record', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            $message = "Successfully fixed {$fixedCount} incomplete registration(s)";
            if (!empty($errors)) {
                $message .= ". Errors: " . implode(', ', $errors);
            }
            
            return response()->json([
                'success' => true,
                'message' => $message,
                'fixed_count' => $fixedCount,
                'errors' => $errors
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fixing incomplete registrations', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error fixing registrations: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clear exam progress table
     */
    public function clearExamProgress(Request $request)
    {
        try {
            $deletedCount = DB::table('exam_progress')->delete();
            
            Log::info('[Clear Exam Progress] Manually cleared exam_progress table', [
                'deleted_count' => $deletedCount,
                'cleared_by' => Auth::user()->email,
                'cleared_at' => now()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => "Successfully cleared {$deletedCount} exam progress record(s)",
                'deleted_count' => $deletedCount
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error clearing exam progress', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error clearing exam progress: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clear exam results that are still "In Progress" and truly abandoned
     * Only deletes exams where:
     * - remarks = "In Progress"
     * - finished_at = NULL (not completed)
     * - total_items = 0 (no questions answered)
     * - correct = 0 (no correct answers)
     */
    public function clearInProgressExams(Request $request)
    {
        try {
            // Get abandoned exams (truly incomplete with no progress)
            $abandonedExams = ExamResult::where('remarks', 'In Progress')
                ->whereNull('finished_at')
                ->where('total_items', 0)
                ->where('correct', 0)
                ->get();
            
            $deletedCount = $abandonedExams->count();
            
            // Log details before deletion
            $examDetails = $abandonedExams->map(function($exam) {
                return [
                    'result_id' => $exam->resultId,
                    'examinee_id' => $exam->examineeId,
                    'exam_id' => $exam->examId,
                    'started_at' => $exam->started_at,
                    'finished_at' => $exam->finished_at,
                    'total_items' => $exam->total_items,
                    'correct' => $exam->correct,
                    'remarks' => $exam->remarks,
                    'created_at' => $exam->created_at
                ];
            })->toArray();
            
            // Delete the abandoned exams
            ExamResult::where('remarks', 'In Progress')
                ->whereNull('finished_at')
                ->where('total_items', 0)
                ->where('correct', 0)
                ->delete();
            
            Log::info('[Clear Abandoned Exams] Manually cleared abandoned exam results', [
                'deleted_count' => $deletedCount,
                'cleared_by' => Auth::user()->email,
                'cleared_at' => now(),
                'exam_details' => $examDetails
            ]);
            
            return response()->json([
                'success' => true,
                'message' => "Successfully deleted {$deletedCount} abandoned exam(s)",
                'deleted_count' => $deletedCount
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error clearing abandoned exams', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error clearing abandoned exams: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check exam results that are finished but still marked as "In Progress"
     * Returns list for review before fixing
     */
    public function checkInProgressExams(Request $request)
    {
        try {
            // Get finished exams that are still marked as "In Progress"
            $finishedExams = ExamResult::where('remarks', 'In Progress')
                ->whereNotNull('finished_at')
                ->with('examinee')
                ->get();
            
            $examsData = $finishedExams->map(function($exam) {
                // Calculate percentage if not already set
                $percentage = $exam->percentage;
                if ($percentage === null && $exam->total_items > 0) {
                    $percentage = ($exam->correct / $exam->total_items) * 100;
                }
                
                return [
                    'resultId' => $exam->resultId,
                    'examinee_id' => $exam->examineeId,
                    'examinee_name' => $exam->examinee ? ($exam->examinee->fname . ' ' . ($exam->examinee->mname ? $exam->examinee->mname . ' ' : '') . $exam->examinee->lname) : 'Unknown',
                    'exam_id' => $exam->examId,
                    'finished_at' => $exam->finished_at,
                    'total_items' => $exam->total_items,
                    'correct' => $exam->correct,
                    'percentage' => $percentage,
                    'will_be' => ($percentage >= 10) ? 'Passed' : 'Failed'
                ];
            });
            
            return response()->json([
                'success' => true,
                'found_count' => $examsData->count(),
                'exams' => $examsData
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error checking in-progress exams', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error checking exam status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Fix selected exam results that are finished but still marked as "In Progress"
     * Updates remarks to "Passed" or "Failed" based on percentage score
     * Passing rate: 10%
     */
    public function fixInProgressRemarks(Request $request)
    {
        try {
            $examIds = $request->get('exam_ids', []);
            
            if (empty($examIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No exams selected for fixing'
                ], 400);
            }
            
            // Get selected finished exams that are still marked as "In Progress"
            $finishedExams = ExamResult::where('remarks', 'In Progress')
                ->whereNotNull('finished_at')
                ->whereIn('resultId', $examIds)
                ->get();
            
            $fixedCount = 0;
            $passedCount = 0;
            $failedCount = 0;
            
            $examDetails = [];
            
            foreach ($finishedExams as $exam) {
                // Calculate percentage if not already set
                $percentage = $exam->percentage;
                if ($percentage === null && $exam->total_items > 0) {
                    $percentage = ($exam->correct / $exam->total_items) * 100;
                }
                
                // Determine pass/fail based on 10% passing rate
                $newRemarks = ($percentage >= 10) ? 'Passed' : 'Failed';
                
                // Update the exam result
                $exam->update([
                    'remarks' => $newRemarks,
                    'percentage' => $percentage
                ]);
                
                $fixedCount++;
                if ($newRemarks === 'Passed') {
                    $passedCount++;
                } else {
                    $failedCount++;
                }
                
                $examDetails[] = [
                    'result_id' => $exam->resultId,
                    'examinee_id' => $exam->examineeId,
                    'exam_id' => $exam->examId,
                    'finished_at' => $exam->finished_at,
                    'total_items' => $exam->total_items,
                    'correct' => $exam->correct,
                    'percentage' => $percentage,
                    'old_remarks' => 'In Progress',
                    'new_remarks' => $newRemarks
                ];
            }
            
            Log::info('[Fix In Progress Remarks] Updated finished exams with proper Pass/Fail status', [
                'fixed_count' => $fixedCount,
                'passed_count' => $passedCount,
                'failed_count' => $failedCount,
                'fixed_by' => Auth::user()->email,
                'fixed_at' => now(),
                'exam_details' => $examDetails
            ]);
            
            return response()->json([
                'success' => true,
                'message' => "Successfully fixed {$fixedCount} exam(s): {$passedCount} Passed, {$failedCount} Failed",
                'fixed_count' => $fixedCount,
                'passed_count' => $passedCount,
                'failed_count' => $failedCount
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fixing in-progress remarks', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error fixing exam remarks: ' . $e->getMessage()
            ], 500);
        }
    }
}

