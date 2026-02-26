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

    /**
     * Check all exam results with "In Progress" remarks
     * Returns list of all exams (finished or not) that are marked as "In Progress"
     */
    public function checkAllInProgressExams(Request $request)
    {
        try {
            // Get all exams marked as "In Progress" (regardless of finished_at status)
            $inProgressExams = ExamResult::where('remarks', 'In Progress')
                ->with('examinee:id,lname,fname,mname')
                ->get();
            
            $examsData = $inProgressExams->map(function($exam) {
                // Build full name from lname, fname, mname
                $fullName = 'Unknown';
                if ($exam->examinee) {
                    $fullName = trim(
                        $exam->examinee->fname . ' ' . 
                        ($exam->examinee->mname ? $exam->examinee->mname . ' ' : '') . 
                        $exam->examinee->lname
                    );
                }
                
                return [
                    'resultId' => $exam->resultId,
                    'examineeId' => $exam->examineeId,
                    'examinee_full_name' => $fullName,
                    'examId' => $exam->examId,
                    'started_at' => $exam->started_at ? $exam->started_at->format('Y-m-d H:i:s') : null,
                    'finished_at' => $exam->finished_at ? $exam->finished_at->format('Y-m-d H:i:s') : null,
                    'total_items' => $exam->total_items,
                    'correct' => $exam->correct,
                    'is_finished' => $exam->finished_at !== null,
                    'created_at' => $exam->created_at->format('Y-m-d H:i:s'),
                ];
            });
            
            return response()->json([
                'success' => true,
                'found_count' => $examsData->count(),
                'exams' => $examsData
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error checking all in-progress exams', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error checking exam status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete selected exam results with "In Progress" remarks
     * Allows deletion of specific exam results to fix bugs
     */
    public function deleteSelectedInProgressExams(Request $request)
    {
        try {
            $examIds = $request->get('exam_ids', []);
            
            if (empty($examIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No exams selected for deletion'
                ], 400);
            }
            
            // Get selected exams that are marked as "In Progress"
            $examsToDelete = ExamResult::where('remarks', 'In Progress')
                ->whereIn('resultId', $examIds)
                ->get();
            
            $deletedCount = 0;
            $errors = [];
            
            // Log details before deletion
            $examDetails = $examsToDelete->map(function($exam) {
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
            
            // Delete the selected exams
            foreach ($examsToDelete as $exam) {
                try {
                    $exam->delete();
                    $deletedCount++;
                } catch (\Exception $e) {
                    $errors[] = "Failed to delete exam result ID {$exam->resultId}: {$e->getMessage()}";
                    Log::error('[Delete In Progress] Failed to delete exam result', [
                        'result_id' => $exam->resultId,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            $message = "Successfully deleted {$deletedCount} exam result(s)";
            if (!empty($errors)) {
                $message .= ". Errors: " . implode(', ', $errors);
            }
            
            Log::info('[Delete Selected In Progress] Manually deleted selected exam results', [
                'deleted_count' => $deletedCount,
                'requested_count' => count($examIds),
                'deleted_by' => Auth::user()->email,
                'deleted_at' => now(),
                'exam_details' => $examDetails
            ]);
            
            return response()->json([
                'success' => true,
                'message' => $message,
                'deleted_count' => $deletedCount,
                'errors' => $errors
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error deleting selected in-progress exams', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error deleting exam results: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark selected exam results as finished
     * Updates finished_at, calculates score, and sets remarks to Passed/Failed
     */
    public function markSelectedExamsAsFinished(Request $request)
    {
        try {
            $examIds = $request->get('exam_ids', []);
            
            if (empty($examIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No exams selected'
                ], 400);
            }
            
            // Get selected exams that are marked as "In Progress"
            $examsToFinish = ExamResult::where('remarks', 'In Progress')
                ->whereIn('resultId', $examIds)
                ->get();
            
            $finishedCount = 0;
            $passedCount = 0;
            $failedCount = 0;
            $errors = [];
            
            $examDetails = [];
            
            foreach ($examsToFinish as $exam) {
                try {
                    // Calculate percentage
                    $percentage = null;
                    if ($exam->total_items > 0) {
                        $percentage = ($exam->correct / $exam->total_items) * 100;
                    }
                    
                    // Determine pass/fail based on 10% passing rate
                    $newRemarks = ($percentage >= 10) ? 'Passed' : 'Failed';
                    
                    // Update the exam result
                    $updateData = [
                        'remarks' => $newRemarks,
                    ];
                    
                    // Set finished_at if not already set
                    if (!$exam->finished_at) {
                        $updateData['finished_at'] = now();
                    }
                    
                    $exam->update($updateData);
                    
                    $finishedCount++;
                    if ($newRemarks === 'Passed') {
                        $passedCount++;
                    } else {
                        $failedCount++;
                    }
                    
                    $examDetails[] = [
                        'result_id' => $exam->resultId,
                        'examinee_id' => $exam->examineeId,
                        'exam_id' => $exam->examId,
                        'total_items' => $exam->total_items,
                        'correct' => $exam->correct,
                        'percentage' => $percentage,
                        'old_remarks' => 'In Progress',
                        'new_remarks' => $newRemarks,
                        'finished_at' => $exam->finished_at ? $exam->finished_at->format('Y-m-d H:i:s') : now()->format('Y-m-d H:i:s')
                    ];
                    
                } catch (\Exception $e) {
                    $errors[] = "Failed to mark exam result ID {$exam->resultId} as finished: {$e->getMessage()}";
                    Log::error('[Mark as Finished] Failed to update exam result', [
                        'result_id' => $exam->resultId,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            Log::info('[Mark as Finished] Updated exams with finished status', [
                'finished_count' => $finishedCount,
                'passed_count' => $passedCount,
                'failed_count' => $failedCount,
                'marked_by' => Auth::user()->email,
                'marked_at' => now(),
                'exam_details' => $examDetails
            ]);
            
            $message = "Successfully marked {$finishedCount} exam(s) as finished: {$passedCount} Passed, {$failedCount} Failed";
            if (!empty($errors)) {
                $message .= '. ' . count($errors) . ' error(s) occurred.';
            }
            
            return response()->json([
                'success' => true,
                'message' => $message,
                'finished_count' => $finishedCount,
                'passed_count' => $passedCount,
                'failed_count' => $failedCount,
                'errors' => $errors
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error marking exams as finished', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error marking exams as finished: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check exam results with 0/150 score that may be bugged
     * Returns list of exams where correct = 0 and total_items = 150
     * Also includes exams with status 'failed' or 'done' that have 0 score
     */
    public function checkZeroScoreExams(Request $request)
    {
        try {
            // Get exam results where correct = 0 and total_items = 150
            // Also include exams with status 'failed' or 'done' that have 0 score
            $zeroScoreExams = ExamResult::where('correct', 0)
                ->where(function($query) {
                    // Either total_items is 150 (full exam) or status is failed/done
                    $query->where('total_items', 150)
                          ->orWhereIn('remarks', ['failed', 'done']);
                })
                ->with('examinee:id,lname,fname,mname')
                ->get();
            
            $examsData = $zeroScoreExams->map(function($exam) {
                // Build full name from lname, fname, mname
                $fullName = 'Unknown';
                if ($exam->examinee) {
                    $fullName = trim(
                        $exam->examinee->fname . ' ' . 
                        ($exam->examinee->mname ? $exam->examinee->mname . ' ' : '') . 
                        $exam->examinee->lname
                    );
                }
                
                return [
                    'id' => $exam->resultId,
                    'examinee_name' => $fullName,
                    'correct' => $exam->correct,
                    'total_items' => $exam->total_items,
                    'status' => $exam->remarks,
                    'finished_at' => $exam->finished_at ? $exam->finished_at->format('Y-m-d H:i:s') : null,
                ];
            });
            
            return response()->json([
                'success' => true,
                'found_count' => $examsData->count(),
                'exams' => $examsData
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error checking zero score exams', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error checking zero score exams: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete selected exam results with 0/150 score
     * Permanently removes bugged exam records from the database
     */
    public function deleteZeroScoreExams(Request $request)
    {
        try {
            $examIds = $request->get('exam_ids', []);
            
            if (empty($examIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No exams selected for deletion'
                ], 400);
            }
            
            // Get selected exams that match zero score criteria
            $examsToDelete = ExamResult::whereIn('resultId', $examIds)
                ->where('correct', 0)
                ->where(function($query) {
                    $query->where('total_items', 150)
                          ->orWhereIn('remarks', ['failed', 'done']);
                })
                ->get();
            
            $deletedCount = 0;
            $errors = [];
            
            // Log details before deletion
            $examDetails = $examsToDelete->map(function($exam) {
                return [
                    'result_id' => $exam->resultId,
                    'examinee_id' => $exam->examineeId,
                    'exam_id' => $exam->examId,
                    'correct' => $exam->correct,
                    'total_items' => $exam->total_items,
                    'remarks' => $exam->remarks,
                    'finished_at' => $exam->finished_at,
                    'created_at' => $exam->created_at
                ];
            })->toArray();
            
            // Delete the selected exams
            foreach ($examsToDelete as $exam) {
                try {
                    $exam->delete();
                    $deletedCount++;
                } catch (\Exception $e) {
                    $errors[] = "Failed to delete exam result ID {$exam->resultId}: {$e->getMessage()}";
                    Log::error('[Delete Zero Score] Failed to delete exam result', [
                        'result_id' => $exam->resultId,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            $message = "Successfully deleted {$deletedCount} zero score exam result(s)";
            if (!empty($errors)) {
                $message .= ". Errors: " . implode(', ', $errors);
            }
            
            Log::info('[Delete Zero Score] Manually deleted zero score exam results', [
                'deleted_count' => $deletedCount,
                'requested_count' => count($examIds),
                'deleted_by' => Auth::user()->email,
                'deleted_at' => now(),
                'exam_details' => $examDetails
            ]);
            
            return response()->json([
                'success' => true,
                'message' => $message,
                'deleted_count' => $deletedCount,
                'errors' => $errors
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error deleting zero score exams', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error deleting zero score exams: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check examinee registrations with "completed" status
     * Returns list of examinees who have completed status
     */
    public function checkCompletedRegistrations(Request $request)
    {
        try {
            // Get examinee registrations with "completed" status
            // Join with examinee table to get name information
            $completedRegistrations = DB::table('examinee_registrations')
                ->where('examinee_registrations.status', 'completed')
                ->leftJoin('examinee', 'examinee_registrations.examinee_id', '=', 'examinee.id')
                ->select(
                    'examinee_registrations.id',
                    'examinee_registrations.examinee_id',
                    'examinee_registrations.status',
                    'examinee_registrations.created_at',
                    'examinee_registrations.registration_date',
                    'examinee_registrations.school_year',
                    'examinee_registrations.semester',
                    'examinee.fname',
                    'examinee.mname',
                    'examinee.lname'
                )
                ->get();
            
            Log::info('Query executed successfully', ['count' => $completedRegistrations->count()]);
            
            $registrationsData = $completedRegistrations->map(function($registration) {
                $fullName = 'Unknown';
                if ($registration->fname || $registration->lname) {
                    $fullName = trim($registration->fname . ' ' . ($registration->mname ? $registration->mname . ' ' : '') . $registration->lname);
                }
                
                return [
                    'id' => $registration->id,
                    'examinee_id' => $registration->examinee_id,
                    'examinee_name' => $fullName,
                    'email' => 'N/A', // Email not available in current table structure
                    'status' => $registration->status,
                    'registration_date' => $registration->registration_date,
                    'school_year' => $registration->school_year,
                    'semester' => $registration->semester,
                    'created_at' => $registration->created_at,
                ];
            });
            
            return response()->json([
                'success' => true,
                'found_count' => $registrationsData->count(),
                'registrations' => $registrationsData
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error checking completed registrations', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error checking completed registrations: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Search examinee registrations with "completed" status
     * Returns filtered list based on search query
     */
    public function searchCompletedRegistrations(Request $request)
    {
        try {
            $query = $request->get('query', '');
            
            if (empty($query)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Search query is required'
                ], 400);
            }
            
            // Search examinee registrations with "completed" status
            $completedRegistrations = DB::table('examinee_registrations')
                ->where('examinee_registrations.status', 'completed')
                ->leftJoin('examinee', 'examinee_registrations.examinee_id', '=', 'examinee.id')
                ->where(function($q) use ($query) {
                    $q->where('examinee.fname', 'like', '%' . $query . '%')
                      ->orWhere('examinee.mname', 'like', '%' . $query . '%')
                      ->orWhere('examinee.lname', 'like', '%' . $query . '%')
                      ->orWhere('examinee_registrations.id', 'like', '%' . $query . '%')
                      ->orWhere('examinee_registrations.examinee_id', 'like', '%' . $query . '%')
                      ->orWhere('examinee_registrations.school_year', 'like', '%' . $query . '%')
                      ->orWhere('examinee_registrations.semester', 'like', '%' . $query . '%');
                })
                ->select(
                    'examinee_registrations.id',
                    'examinee_registrations.examinee_id',
                    'examinee_registrations.status',
                    'examinee_registrations.created_at',
                    'examinee_registrations.registration_date',
                    'examinee_registrations.school_year',
                    'examinee_registrations.semester',
                    'examinee.fname',
                    'examinee.mname',
                    'examinee.lname'
                )
                ->get();
            
            $registrationsData = $completedRegistrations->map(function($registration) {
                $fullName = 'Unknown';
                if ($registration->fname || $registration->lname) {
                    $fullName = trim($registration->fname . ' ' . ($registration->mname ? $registration->mname . ' ' : '') . $registration->lname);
                }
                
                return [
                    'id' => $registration->id,
                    'examinee_id' => $registration->examinee_id,
                    'examinee_name' => $fullName,
                    'email' => 'N/A', // Email not available in current table structure
                    'status' => $registration->status,
                    'registration_date' => $registration->registration_date,
                    'school_year' => $registration->school_year,
                    'semester' => $registration->semester,
                    'created_at' => $registration->created_at,
                ];
            });
            
            return response()->json([
                'success' => true,
                'found_count' => $registrationsData->count(),
                'registrations' => $registrationsData
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error searching completed registrations', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error searching completed registrations: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Change status of examinee registration from "completed" to "assigned" or "cancelled"
     * Requires confirmation string verification
     */
    public function changeRegistrationStatus(Request $request)
    {
        try {
            $registrationId = $request->get('registration_id');
            $newStatus = $request->get('new_status');
            
            if (empty($registrationId) || empty($newStatus)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Registration ID and new status are required'
                ], 400);
            }
            
            if (!in_array($newStatus, ['assigned', 'cancelled'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid status. Must be "assigned" or "cancelled"'
                ], 400);
            }
            
            // Find the registration
            $registration = DB::table('examinee_registrations')
                ->where('id', $registrationId)
                ->where('status', 'completed')
                ->first();
            
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Registration not found or not in "completed" status'
                ], 404);
            }
            
            // Update the status
            $updated = DB::table('examinee_registrations')
                ->where('id', $registrationId)
                ->update([
                    'status' => $newStatus,
                    'updated_at' => now()
                ]);
            
            if ($updated) {
                Log::info('[Registration Status Change] Updated registration status', [
                    'registration_id' => $registrationId,
                    'examinee_id' => $registration->examinee_id,
                    'old_status' => 'completed',
                    'new_status' => $newStatus,
                    'changed_by' => Auth::user()->email,
                    'changed_at' => now()
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => "Successfully changed status to {$newStatus}"
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to update registration status'
                ], 500);
            }
            
        } catch (\Exception $e) {
            Log::error('Error changing registration status', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Error changing registration status: ' . $e->getMessage()
            ], 500);
        }
    }
}

