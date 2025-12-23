<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\DepartmentExam;
use App\Models\DepartmentExamBank;
use App\Models\DepartmentExamAnswer;
use App\Models\DepartmentExamResult;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamController extends Controller
{
    /**
     * Get exam details by exam reference number
     */
    public function getExamByRef(Request $request): JsonResponse
    {
        $request->validate([
            'exam_ref' => 'required|string'
        ]);

        try {
            $exam = Exam::with(['questions', 'personalityQuestions', 'results'])
                ->where('exam-ref-no', $request->exam_ref)
                ->where('status', 'active')
                ->first();

            if (!$exam) {
                return response()->json([
                    'success' => false,
                    'message' => 'Exam not found or inactive',
                    'data' => null
                ], 404);
            }

            // Debug information
            $pivotCount = DB::table('exam_personality_questions_pivot')
                ->where('examId', $exam->examId)
                ->count();

            $examData = [
                'examId' => $exam->examId,
                'exam_ref_no' => $exam->{'exam-ref-no'},
                'time_limit' => $exam->time_limit,
                'status' => $exam->status,
                'include_personality_test' => $exam->include_personality_test,
                'created_at' => $exam->created_at,
                'updated_at' => $exam->updated_at,
                'debug_info' => [
                    'pivot_table_count' => $pivotCount,
                    'relationship_count' => $exam->personalityQuestions->count(),
                    'total_personality_questions_available' => \App\Models\PersonalityTest::count()
                ],
                'questions' => [
                    'count' => $exam->questions->count(),
                    'data' => $exam->questions->map(function($question) {
                        return [
                            'questionId' => $question->questionId,
                            'question' => $question->question,
                            'category' => $question->category,
                            'option1' => $question->option1,
                            'option2' => $question->option2,
                            'option3' => $question->option3,
                            'option4' => $question->option4,
                            'option5' => $question->option5,
                            'correct_answer' => $question->correct_answer,
                            'direction' => $question->direction,
                            'has_image' => !empty($question->image),
                            'has_option_images' => !empty($question->option1_image) || !empty($question->option2_image) || !empty($question->option3_image) || !empty($question->option4_image) || !empty($question->option5_image)
                        ];
                    })
                ],
                'personality_questions' => (function () use ($exam) {
                    $order = ['E/I' => 1, 'S/N' => 2, 'T/F' => 3, 'J/P' => 4];
                    $sorted = $exam->personalityQuestions
                        ->sort(function ($a, $b) use ($order) {
                            $cmp = ($order[$a->dichotomy] ?? 99) <=> ($order[$b->dichotomy] ?? 99);
                            if ($cmp !== 0) return $cmp;
                            return $a->id <=> $b->id;
                        })
                        ->values();
                    return [
                        'count' => $sorted->count(),
                        'data' => $sorted->map(function ($question) {
                            return [
                                'id' => $question->id,
                                'question' => $question->question,
                                'dichotomy' => $question->dichotomy,
                                'positive_side' => $question->positive_side,
                                'negative_side' => $question->negative_side,
                                'option1' => $question->option1,
                                'option2' => $question->option2,
                                'status' => $question->status
                            ];
                        })
                    ];
                })(),
                'results' => [
                    'count' => $exam->results->count(),
                    'data' => $exam->results->map(function($result) {
                        return [
                            'id' => $result->id,
                            'examinee_id' => $result->examinee_id,
                            'score' => $result->score,
                            'status' => $result->status,
                            'started_at' => $result->started_at,
                            'completed_at' => $result->completed_at
                        ];
                    })
                ]
            ];

            return response()->json([
                'success' => true,
                'message' => 'Exam found successfully',
                'data' => $examData
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving exam: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    /**
     * Save a single exam answer in real time (mobile, low-spec devices) while keeping bulk submit intact
     */
    public function submitSingleExamAnswer(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'examId' => 'required|integer',
                'questionId' => 'required|integer',
                'selected_answer' => 'nullable|string|max:1',
                'time_spent_seconds' => 'nullable|integer|min:0',
                'question_start_time' => 'nullable|date',
                'question_end_time' => 'nullable|date',
            ]);

            $user = $request->user();
            $examinee = \App\Models\Examinee::where('accountId', $user->id)->first();

            if (!$examinee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Examinee profile not found.',
                    'data' => null,
                ], 404);
            }

            $existingResult = \App\Models\ExamResult::where('examineeId', $examinee->id)
                ->where('examId', $request->examId)
                ->first();

            if ($existingResult && ($existingResult->remarks === 'Pass' || $existingResult->remarks === 'Fail')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Exam already completed. Real-time saving is disabled.',
                    'data' => null,
                ], 400);
            }

            $question = \App\Models\QuestionBank::where('questionId', $request->questionId)->first();
            if (!$question) {
                return response()->json([
                    'success' => false,
                    'message' => 'Question not found.',
                    'data' => null,
                ], 404);
            }

            // Guard against personality questions (bulk submission still handles them)
            if (is_string($request->questionId) && str_starts_with((string)$request->questionId, 'personality_')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Real-time save is only for academic questions.',
                    'data' => null,
                ], 400);
            }

            $selectedAnswer = $request->selected_answer;
            $isCorrect = $question && $selectedAnswer !== null && $question->correct_answer === $selectedAnswer;
            $category = $question->category ?? 'Uncategorized';

            // Convert ISO datetime strings to MySQL format
            $questionStartTime = null;
            $questionEndTime = null;

            if (!empty($request->question_start_time)) {
                try {
                    $questionStartTime = \Carbon\Carbon::parse($request->question_start_time)->format('Y-m-d H:i:s');
                } catch (\Exception $e) {
                    Log::warning('[ExamController] Invalid question_start_time format (single): ' . $request->question_start_time);
                }
            }

            if (!empty($request->question_end_time)) {
                try {
                    $questionEndTime = \Carbon\Carbon::parse($request->question_end_time)->format('Y-m-d H:i:s');
                } catch (\Exception $e) {
                    Log::warning('[ExamController] Invalid question_end_time format (single): ' . $request->question_end_time);
                }
            }

            DB::beginTransaction();
            Log::info('[ExamController] Real-time answer save start', [
                'examId' => $request->examId,
                'questionId' => $request->questionId,
                'examineeId' => $examinee->id,
            ]);

            // Upsert the single answer
            \App\Models\ExamineeAnswer::updateOrCreate(
                [
                    'examineeId' => $examinee->id,
                    'questionId' => $request->questionId,
                    'examId' => $request->examId,
                ],
                [
                    'selected_answer' => $selectedAnswer,
                    'is_correct' => $isCorrect,
                    'time_spent_seconds' => $request->time_spent_seconds ?? null,
                    'question_start_time' => $questionStartTime,
                    'question_end_time' => $questionEndTime,
                ]
            );

            // Recompute progress snapshot
            $answers = \App\Models\ExamineeAnswer::where('examineeId', $examinee->id)
                ->where('examId', $request->examId)
                ->get();

            $questionIds = $answers->pluck('questionId')->unique();
            $questionMap = \App\Models\QuestionBank::whereIn('questionId', $questionIds)->get()->keyBy('questionId');

            $categoryStats = [];
            $correctCount = 0;

            foreach ($answers as $storedAnswer) {
                $questionMeta = $questionMap[$storedAnswer->questionId] ?? null;
                $cat = $questionMeta->category ?? 'Uncategorized';
                if (!isset($categoryStats[$cat])) {
                    $categoryStats[$cat] = ['correct' => 0, 'total' => 0];
                }
                $categoryStats[$cat]['total']++;
                if ($storedAnswer->is_correct) {
                    $categoryStats[$cat]['correct']++;
                    $correctCount++;
                }
            }

            $categoryBreakdown = [];
            foreach ($categoryStats as $cat => $stats) {
                $categoryBreakdown[] = [
                    'category' => $cat,
                    'correct' => $stats['correct'],
                    'total' => $stats['total'],
                ];
            }

            $totalQuestions = \App\Models\ExamineeAnswer::getTotalQuestionsForExam($request->examId);
            if (!$totalQuestions || $totalQuestions < 0) {
                $totalQuestions = max($answers->count(), 0);
            }

            $examResult = $existingResult ?: \App\Models\ExamResult::firstOrCreate(
                [
                    'examineeId' => $examinee->id,
                    'examId' => $request->examId,
                ],
                [
                    'total_items' => $totalQuestions,
                    'correct' => 0,
                    'remarks' => 'In Progress',
                    'started_at' => now(),
                    'category_breakdown' => [],
                ]
            );

            // Keep the result in "In Progress" until bulk submission decides otherwise
            if (!$examResult->remarks || $examResult->remarks === '') {
                $examResult->remarks = 'In Progress';
            }

            $examResult->total_items = $totalQuestions;
            $examResult->correct = $correctCount;
            $examResult->category_breakdown = $categoryBreakdown;
            if (!$examResult->started_at) {
                $examResult->started_at = now();
            }
            $examResult->save();

            DB::commit();
            Log::info('[ExamController] Real-time answer saved', [
                'examId' => $request->examId,
                'questionId' => $request->questionId,
                'correct_so_far' => $correctCount,
                'total_questions' => $totalQuestions,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Answer saved in real time.',
                'data' => [
                    'is_correct' => $isCorrect,
                    'total_items' => $examResult->total_items,
                    'correct' => $examResult->correct,
                    'category_breakdown' => $categoryBreakdown,
                ],
            ], 200);
        } catch (\Exception $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            Log::error('[ExamController] Error saving single answer: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error saving answer: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * Manually attach personality questions to an exam (for testing)
     */
    public function attachPersonalityQuestions(Request $request): JsonResponse
    {
        $request->validate([
            'exam_ref' => 'required|string',
            'question_ids' => 'required|array',
            'question_ids.*' => 'integer'
        ]);

        try {
            $exam = Exam::where('exam-ref-no', $request->exam_ref)->first();
            
            if (!$exam) {
                return response()->json([
                    'success' => false,
                    'message' => 'Exam not found',
                    'data' => null
                ], 404);
            }

            // Attach personality questions
            $exam->personalityQuestions()->attach($request->question_ids);
            
            // Update the include_personality_test flag
            $exam->update(['include_personality_test' => true]);

            return response()->json([
                'success' => true,
                'message' => 'Personality questions attached successfully',
                'data' => [
                    'exam_ref' => $exam->{'exam-ref-no'},
                    'attached_questions' => count($request->question_ids),
                    'total_personality_questions' => $exam->personalityQuestions()->count()
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error attaching personality questions: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    /**
     * Get all exams with basic information
     */
    public function getAllExams(): JsonResponse
    {
        try {
            $exams = Exam::with(['questions', 'personalityQuestions', 'results'])
                ->latest()
                ->get()
                ->map(function($exam) {
                    return [
                        'examId' => $exam->examId,
                        'exam_ref_no' => $exam->{'exam-ref-no'},
                        'time_limit' => $exam->time_limit,
                        'status' => $exam->status,
                        'include_personality_test' => $exam->include_personality_test,
                        'questions_count' => $exam->questions->count(),
                        'personality_questions_count' => $exam->personalityQuestions->count(),
                        'results_count' => $exam->results->count(),
                        'created_at' => $exam->created_at
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Exams retrieved successfully',
                'data' => $exams
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving exams: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

        /**
     * Validate exam code for mobile app (supports both regular and departmental exams)
     */
    public function validateExamCode(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'exam_code' => 'required|string|max:255'
            ]);

            $examCode = $request->exam_code;
            
            Log::info('[ExamController] Validating exam code: ' . $examCode);

            // First, try to find a regular exam
            $regularExam = Exam::with(['questions'])
                ->where('exam-ref-no', $examCode)
                ->where('status', 'active')
                ->first();

            if ($regularExam) {
                Log::info('[ExamController] Found regular exam: ' . $regularExam->examId);
                
                // Check if examinee has already taken this exam
                $examineeId = $request->user()->examinee->id ?? null;
                if ($examineeId) {
                    $existingResult = \App\Models\ExamResult::where('examineeId', $examineeId)
                        ->where('examId', $regularExam->examId)
                        ->first();

                    if ($existingResult) {
                        // Allow retakes only if the previous attempt was "In Progress"
                        // Block retakes if the previous attempt was "Pass" or "Fail"
                        if ($existingResult->remarks === 'Pass' || $existingResult->remarks === 'Fail') {
                            return response()->json([
                                'success' => false,
                                'message' => 'You have already completed this exam. You cannot retake it.',
                                'data' => null
                            ], 400);
                        } else if ($existingResult->remarks === 'In Progress') {
                            // Allow retake for "In Progress" status
                            Log::info('[ExamController] Allowing retake for regular exam In Progress status', [
                                'examinee_id' => $examineeId,
                                'exam_id' => $regularExam->examId,
                                'existing_remarks' => $existingResult->remarks
                            ]);
                        }
                    }
                }

                // Temporarily disable schedule validation to allow testing
                // TODO: Re-enable after fixing the schedule matching issue
                Log::info('[ExamController] Schedule validation temporarily disabled for testing');
                
                // $scheduleValidation = $this->validateExamSchedule($request->user());
                // if (!$scheduleValidation['isValid']) {
                //     return response()->json([
                //         'success' => false,
                //         'message' => $scheduleValidation['message'],
                //         'data' => null
                //     ], 403);
                // }

                return response()->json([
                    'success' => true,
                    'message' => 'Exam code validated successfully.',
                    'data' => [
                        'examId' => $regularExam->examId,
                        'exam_ref_no' => $regularExam->{'exam-ref-no'},
                        'time_limit' => $regularExam->time_limit,
                        'questions_count' => $regularExam->questions->count(),
                        'include_personality_test' => $regularExam->include_personality_test,
                        'exam_type' => 'regular'
                    ]
                ], 200);
            }

            // If not found, try to find a departmental exam
            $departmentalExam = DepartmentExam::with(['questions'])
                ->where('exam_ref_no', $examCode)
                ->where('status', 1) // Active status for departmental exams
                ->first();

            if ($departmentalExam) {
                Log::info('[ExamController] Found departmental exam: ' . $departmentalExam->id);
                
                // Check if examinee has already taken this departmental exam
                $examineeId = $request->user()->examinee->id ?? null;
                if ($examineeId) {
                    $existingResult = DepartmentExamResult::where('examinee_id', $examineeId)
                        ->where('department_exam_id', $departmentalExam->id)
                        ->first();

                    if ($existingResult) {
                        // Allow retakes only if the previous attempt was "In Progress"
                        // Block retakes if the previous attempt was "Pass" or "Fail"
                        if ($existingResult->remarks === 'Pass' || $existingResult->remarks === 'Fail') {
                            return response()->json([
                                'success' => false,
                                'message' => 'You have already completed this departmental exam. You cannot retake it.',
                                'data' => null
                            ], 400);
                        } else if ($existingResult->remarks === 'In Progress') {
                            // Allow retake for "In Progress" status
                            Log::info('[ExamController] Allowing retake for In Progress status', [
                                'examinee_id' => $examineeId,
                                'exam_id' => $departmentalExam->id,
                                'existing_remarks' => $existingResult->remarks
                            ]);
                        }
                    }
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Departmental exam code validated successfully.',
                    'data' => [
                        'examId' => $departmentalExam->id,
                        'exam_ref_no' => $departmentalExam->exam_ref_no,
                        'exam_title' => $departmentalExam->exam_title,
                        'time_limit' => $departmentalExam->time_limit,
                        'questions_count' => $departmentalExam->questions->count(),
                        'exam_type' => 'departmental'
                    ]
                ], 200);
            }

            // If neither regular nor departmental exam found, try schedule code per date
            $schedule = \App\Models\ExamSchedule::where('exam_code', $examCode)->first();
            if ($schedule) {
                $user = $request->user();
                $examinee = \App\Models\Examinee::where('accountId', $user->id)->first();
                if (!$examinee) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Student profile not found.',
                        'data' => null
                    ], 404);
                }

                $registration = \App\Models\ExamineeRegistration::where('examinee_id', $examinee->id)
                    ->where('status', 'assigned')
                    ->orderByDesc('created_at')
                    ->first();
                if (!$registration) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No assigned exam schedule for your account.',
                        'data' => null
                    ], 403);
                }

                // Enforce same date use (normalize to date string to avoid timezone/format issues)
                $regDate = \Carbon\Carbon::parse($registration->assigned_exam_date)->toDateString();
                $schedDate = \Carbon\Carbon::parse($schedule->exam_date)->toDateString();
                \Illuminate\Support\Facades\Log::info('[ExamController] Schedule date check', [
                    'registration_assigned_date_raw' => $registration->assigned_exam_date,
                    'registration_assigned_date' => $regDate,
                    'schedule_exam_date_raw' => $schedule->exam_date,
                    'schedule_exam_date' => $schedDate,
                ]);
                if ($regDate !== $schedDate) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This code is not valid for your assigned exam date.',
                        'data' => null
                    ], 403);
                }

                // Map shuffled schedule code back to base exam by comparing character multiset
                $allActive = \App\Models\Exam::where('status', 'active')->get();
                $regularExam = null;
                $scheduleKey = $this->normalizeCodeForMatch($schedule->exam_code);
                foreach ($allActive as $ex) {
                    $exKey = $this->normalizeCodeForMatch($ex->{'exam-ref-no'});
                    if ($exKey === $scheduleKey) {
                        $regularExam = $ex;
                        break;
                    }
                }
                if (!$regularExam) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No matching active exam for this code. Please contact administrator.',
                        'data' => null
                    ], 404);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Schedule exam code validated successfully.',
                    'data' => [
                        'examId' => $regularExam->examId,
                        'exam_ref_no' => $regularExam->{'exam-ref-no'},
                        'time_limit' => $regularExam->time_limit,
                        'questions_count' => $regularExam->questions()->count(),
                        'include_personality_test' => $regularExam->include_personality_test,
                        'exam_type' => 'schedule',
                        'exam_date' => $schedule->exam_date
                    ]
                ], 200);
            }

            // If neither regular nor departmental exam nor schedule found
            return response()->json([
                'success' => false,
                'message' => 'Invalid exam code or exam is not active.',
                'data' => null
            ], 404);

        } catch (\Exception $e) {
            Log::error('[ExamController] Error validating exam code: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error validating exam code: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    /**
     * Validate exam schedule for regular exams
     * Checks if the current date and time falls within the assigned exam schedule
     */
    private function validateExamSchedule($user)
    {
        try {
            $examinee = \App\Models\Examinee::where('accountId', $user->id)->first();
            
            if (!$examinee) {
                return [
                    'isValid' => false,
                    'message' => 'Student profile not found. Please contact administrator.'
                ];
            }

            // Get the examinee's registration
            $registration = \App\Models\ExamineeRegistration::where('examinee_id', $examinee->id)
                ->where('status', 'assigned')
                ->first();

            if (!$registration || !$registration->assigned_exam_date) {
                return [
                    'isValid' => false,
                    'message' => 'No exam schedule assigned. Please contact administrator.'
                ];
            }

            // Get the exam schedule details
            $schedule = \App\Models\ExamSchedule::where('exam_date', $registration->assigned_exam_date)
                ->where('session', $registration->assigned_session)
                ->first();

            Log::info('[ExamController] Registration details:', [
                'examinee_id' => $examinee->id,
                'assigned_exam_date' => $registration->assigned_exam_date,
                'assigned_session' => $registration->assigned_session,
                'registration_status' => $registration->status
            ]);

            if (!$schedule) {
                Log::error('[ExamController] Schedule not found for registration:', [
                    'exam_date' => $registration->assigned_exam_date,
                    'session' => $registration->assigned_session
                ]);
                return [
                    'isValid' => false,
                    'message' => 'Exam schedule details not found. Please contact administrator.'
                ];
            }

            $now = now();
            $examDate = \Carbon\Carbon::parse($schedule->exam_date);
            
            // Handle the date format properly - exam_date might be stored as datetime
            $dateOnly = $examDate->format('Y-m-d');
            $startTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $dateOnly . ' ' . $schedule->start_time);
            $endTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $dateOnly . ' ' . $schedule->end_time);

            Log::info('[ExamController] Schedule validation details:', [
                'exam_date' => $schedule->exam_date,
                'date_only' => $dateOnly,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'session' => $schedule->session,
                'current_time' => $now->toDateTimeString(),
                'start_datetime' => $startTime->toDateTimeString(),
                'end_datetime' => $endTime->toDateTimeString()
            ]);

            // Force-allow override: if guidance enabled force allow for this examinee today, bypass time checks
            $forceKey = sprintf('exam_force_allow:%s:%s', $examinee->id, now()->toDateString());
            $isForceAllowedToday = \Illuminate\Support\Facades\Cache::get($forceKey, false);

            // Check if today is the exam date
            if (!$now->isSameDay($examDate)) {
                $examDateStr = $examDate->format('l, F j, Y');
                $sessionStr = ucfirst($schedule->session);
                $timeStr = \Carbon\Carbon::createFromFormat('H:i:s', $schedule->start_time)->format('g:i A') . 
                          ' - ' . \Carbon\Carbon::createFromFormat('H:i:s', $schedule->end_time)->format('g:i A');
                
                if ($now->lt($examDate)) {
                    return [
                        'isValid' => false,
                        'message' => "Your exam is scheduled for {$examDateStr} ({$sessionStr} Session: {$timeStr}). You cannot take the exam before your assigned date."
                    ];
                } else {
                    return [
                        'isValid' => false,
                        'message' => "Your exam was scheduled for {$examDateStr} ({$sessionStr} Session: {$timeStr}). The exam period has passed."
                    ];
                }
            }

            // Check if current time is within the exam session time
            if (!$isForceAllowedToday && $now->lt($startTime)) {
                $timeStr = \Carbon\Carbon::createFromFormat('H:i:s', $schedule->start_time)->format('g:i A');
                return [
                    'isValid' => false,
                    'message' => "Your exam session starts at {$timeStr}. Please wait until the scheduled time."
                ];
            }

            if (!$isForceAllowedToday && $now->gt($endTime)) {
                $timeStr = \Carbon\Carbon::createFromFormat('H:i:s', $schedule->end_time)->format('g:i A');
                return [
                    'isValid' => false,
                    'message' => "Your exam session ended at {$timeStr}. The exam period has passed."
                ];
            }

            // Check if the schedule status allows exam access
            if (!$isForceAllowedToday && $schedule->status === 'closed') {
                return [
                    'isValid' => false,
                    'message' => 'Your exam session has been closed. Please contact administrator.'
                ];
            }

            // All validations passed
            return [
                'isValid' => true,
                'message' => 'Exam access granted.',
                'schedule' => [
                    'date' => $examDate->format('Y-m-d'),
                    'session' => $schedule->session,
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time
                ]
            ];

        } catch (\Exception $e) {
            Log::error('[ExamController] Error validating exam schedule: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'examinee_id' => $examinee->id ?? 'not_found',
                'trace' => $e->getTraceAsString()
            ]);
            return [
                'isValid' => false,
                'message' => 'An error occurred while validating your exam schedule. Please try again.'
            ];
        }
    }

    /**
     * Get departmental exam questions for mobile app
     */
    public function getDepartmentalExamQuestions(Request $request, $examId): JsonResponse
    {
        try {
            $departmentalExam = DepartmentExam::with(['questions'])
                ->where('id', $examId)
                ->where('status', 1) // Active status
                ->first();

            if (!$departmentalExam) {
                return response()->json([
                    'success' => false,
                    'message' => 'Departmental exam not found or inactive.',
                    'data' => null
                ], 404);
            }

            Log::info('[ExamController] Fetching departmental exam questions for exam: ' . $examId);

            $questions = $departmentalExam->questions->map(function($question) {
                return [
                    'questionId' => $question->questionId,
                    'question' => $question->question,
                    'question_formatted' => $question->question_formatted,
                    'option1' => $question->option1,
                    'option1_formatted' => $question->option1_formatted,
                    'option1_image' => $question->option1_image,
                    'option2' => $question->option2,
                    'option2_formatted' => $question->option2_formatted,
                    'option2_image' => $question->option2_image,
                    'option3' => $question->option3,
                    'option3_formatted' => $question->option3_formatted,
                    'option3_image' => $question->option3_image,
                    'option4' => $question->option4,
                    'option4_formatted' => $question->option4_formatted,
                    'option4_image' => $question->option4_image,
                    'option5' => $question->option5,
                    'option5_formatted' => $question->option5_formatted,
                    'option5_image' => $question->option5_image,
                    'category' => $question->category,
                    'department' => $question->department,
                    'direction' => $question->direction,
                    'has_image' => !empty($question->image),
                    'image' => $question->image,
                    'has_option_images' => [
                        'option1' => !empty($question->option1_image),
                        'option2' => !empty($question->option2_image),
                        'option3' => !empty($question->option3_image),
                        'option4' => !empty($question->option4_image),
                        'option5' => !empty($question->option5_image)
                    ]
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Departmental exam questions retrieved successfully.',
                'data' => [
                    'exam' => [
                        'id' => $departmentalExam->id,
                        'exam_ref_no' => $departmentalExam->exam_ref_no,
                        'exam_title' => $departmentalExam->exam_title,
                        'time_limit' => $departmentalExam->time_limit,
                        'exam_type' => 'departmental'
                    ],
                    'questions' => $questions
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('[ExamController] Error retrieving departmental exam questions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving departmental exam questions: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    /**
     * Get exam questions for mobile app (download locally)
     */
    public function getExamQuestions(Request $request, $examId): JsonResponse
    {
        try {
            $exam = Exam::with(['questions', 'personalityQuestions'])
                ->where('examId', $examId)
                ->where('status', 'active')
                ->first();

            if (!$exam) {
                return response()->json([
                    'success' => false,
                    'message' => 'Exam not found or inactive.',
                    'data' => null
                ], 404);
            }

            Log::info('[ExamController] Fetching regular exam questions for exam: ' . $examId);
            Log::info('[ExamController] Include personality test: ' . ($exam->include_personality_test ? 'Yes' : 'No'));
            Log::info('[ExamController] Regular questions count: ' . $exam->questions->count());
            Log::info('[ExamController] Personality questions count: ' . $exam->personalityQuestions->count());

            // Regular exam questions
            $questions = $exam->questions->map(function($question) {
                return [
                    'questionId' => $question->questionId,
                    'question' => $question->question,
                    'question_formatted' => $question->question_formatted,
                    'option1' => $question->option1,
                    'option2' => $question->option2,
                    'option3' => $question->option3,
                    'option4' => $question->option4,
                    'option5' => $question->option5,
                    'category' => $question->category,
                    'direction' => $question->direction,
                    'has_image' => !empty($question->image),
                    'image' => $question->image,
                    'question_type' => 'regular',
                    'has_option_images' => [
                        'option1' => !empty($question->option1_image),
                        'option2' => !empty($question->option2_image),
                        'option3' => !empty($question->option3_image),
                        'option4' => !empty($question->option4_image),
                        'option5' => !empty($question->option5_image)
                    ],
                    'option_images' => [
                        'option1' => $question->option1_image,
                        'option2' => $question->option2_image,
                        'option3' => $question->option3_image,
                        'option4' => $question->option4_image,
                        'option5' => $question->option5_image
                    ]
                ];
            });

            // Personality test questions (if included)
            $personalityQuestions = collect();
            if ($exam->include_personality_test && $exam->personalityQuestions->count() > 0) {
                $personalityQuestions = $exam->personalityQuestions->map(function($question) {
                    return [
                        'questionId' => 'personality_' . $question->id, // Prefix to avoid conflicts
                        'personality_question_id' => $question->id,
                        'question' => $question->question,
                        'question_formatted' => null,
                        'option1' => $question->option1,
                        'option2' => $question->option2,
                        'option3' => null,
                        'option4' => null,
                        'option5' => null,
                        'category' => 'Personality Test',
                        'direction' => 'Choose the option that best describes you.',
                        'dichotomy' => $question->dichotomy,
                        'positive_side' => $question->positive_side,
                        'negative_side' => $question->negative_side,
                        'has_image' => false,
                        'image' => null,
                        'question_type' => 'personality',
                        'has_option_images' => [
                            'option1' => false,
                            'option2' => false,
                            'option3' => false,
                            'option4' => false,
                            'option5' => false
                        ],
                        'option_images' => [
                            'option1' => null,
                            'option2' => null,
                            'option3' => null,
                            'option4' => null,
                            'option5' => null
                        ]
                    ];
                });
            }

            // Combine questions
            $allQuestions = $questions->concat($personalityQuestions);

            return response()->json([
                'success' => true,
                'message' => 'Exam questions retrieved successfully.',
                'data' => [
                    'examId' => $exam->examId,
                    'exam_ref_no' => $exam->{'exam-ref-no'},
                    'time_limit' => $exam->time_limit,
                    'include_personality_test' => $exam->include_personality_test,
                    'questions' => $allQuestions,
                    'regular_questions_count' => $questions->count(),
                    'personality_questions_count' => $personalityQuestions->count(),
                    'total_questions' => $allQuestions->count(),
                    'exam_type' => 'regular'
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('[ExamController] Error retrieving exam questions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving exam questions: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    /**
     * Submit exam answers from mobile app
     */
    public function submitExamAnswers(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'examId' => 'required|integer',
                'answers' => 'required|array',
                'answers.*.questionId' => 'required',
                'answers.*.selected_answer' => 'nullable|string|max:1',
                'answers.*.time_spent_seconds' => 'nullable|integer|min:0',
                'answers.*.question_start_time' => 'nullable|date',
                'answers.*.question_end_time' => 'nullable|date'
            ]);

            $user = $request->user();
            $examinee = \App\Models\Examinee::where('accountId', $user->id)->first();

            if (!$examinee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Examinee profile not found.',
                    'data' => null
                ], 404);
            }

            // Check if already submitted (only block if Pass/Fail, allow retakes for In Progress)
            $existingResult = \App\Models\ExamResult::where('examineeId', $examinee->id)
                ->where('examId', $request->examId)
                ->first();

            if ($existingResult && ($existingResult->remarks === 'Pass' || $existingResult->remarks === 'Fail')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Exam already completed. You cannot retake it.',
                    'data' => null
                ], 400);
            }

            // Separate regular and personality answers
            $regularAnswers = [];
            $personalityAnswers = [];
            
            foreach ($request->answers as $answer) {
                if (is_string($answer['questionId']) && str_starts_with($answer['questionId'], 'personality_')) {
                    $personalityAnswers[] = $answer;
                } else {
                    $regularAnswers[] = $answer;
                }
            }

            Log::info('[ExamController] Regular answers count: ' . count($regularAnswers));
            Log::info('[ExamController] Personality answers count: ' . count($personalityAnswers));
            Log::info('[ExamController] Starting exam submission process...');

            // Use a transaction to ensure atomic persistence
            Log::info('[ExamController] Starting database transaction...');
            DB::beginTransaction();

            // Calculate score for regular questions only
            $correctAnswers = 0;
            $totalRegularQuestions = count($regularAnswers);
            $categoryStats = []; // Track per-category correct/total

            foreach ($regularAnswers as $answer) {
                // Be robust to primary key differences by querying on questionId column
                $question = \App\Models\QuestionBank::where('questionId', $answer['questionId'])->first();
                $selectedAnswer = $answer['selected_answer'] ?? null;
                $isCorrect = $question && $question->correct_answer === $selectedAnswer;
                if ($isCorrect) {
                    $correctAnswers++;
                }

                // Track per-category stats
                if ($question) {
                    $category = $question->category ?? 'Uncategorized';
                    if (!isset($categoryStats[$category])) {
                        $categoryStats[$category] = ['correct' => 0, 'total' => 0];
                    }
                    $categoryStats[$category]['total']++;
                    if ($isCorrect) {
                        $categoryStats[$category]['correct']++;
                    }
                }

                // Store regular answer with timing data
                Log::info('[ExamController] Storing answer for question: ' . $answer['questionId']);
                
                // Convert ISO datetime strings to MySQL format
                $questionStartTime = null;
                $questionEndTime = null;
                
                if (!empty($answer['question_start_time'])) {
                    try {
                        $questionStartTime = \Carbon\Carbon::parse($answer['question_start_time'])->format('Y-m-d H:i:s');
                    } catch (\Exception $e) {
                        Log::warning('[ExamController] Invalid question_start_time format: ' . $answer['question_start_time']);
                    }
                }
                
                if (!empty($answer['question_end_time'])) {
                    try {
                        $questionEndTime = \Carbon\Carbon::parse($answer['question_end_time'])->format('Y-m-d H:i:s');
                    } catch (\Exception $e) {
                        Log::warning('[ExamController] Invalid question_end_time format: ' . $answer['question_end_time']);
                    }
                }
                
                \App\Models\ExamineeAnswer::create([
                    'examineeId' => $examinee->id,
                    'questionId' => $answer['questionId'],
                    'examId' => $request->examId,
                    'selected_answer' => $selectedAnswer,
                    'is_correct' => $isCorrect,
                    'time_spent_seconds' => $answer['time_spent_seconds'] ?? null,
                    'question_start_time' => $questionStartTime,
                    'question_end_time' => $questionEndTime
                ]);
            }

            // Convert category stats to JSON array format
            $categoryBreakdown = [];
            foreach ($categoryStats as $category => $stats) {
                $categoryBreakdown[] = [
                    'category' => $category,
                    'correct' => $stats['correct'],
                    'total' => $stats['total']
                ];
            }
            Log::info('[ExamController] Category breakdown computed:', ['breakdown' => $categoryBreakdown]);

            // Handle personality test answers and calculate personality type
            $personalityResult = null;
            if (count($personalityAnswers) > 0) {
                $personalityResult = $this->processPersonalityTestAnswers($personalityAnswers, $examinee->id, $request->examId);
                // Compute MBTI type string from EI/SN/TF/JP since personality_type column is not stored
                $computedPersonalityType = $personalityResult->EI . $personalityResult->SN . $personalityResult->TF . $personalityResult->JP;
                // Attach a transient attribute for convenience in responses/logs
                $personalityResult->personality_type = $computedPersonalityType;
                Log::info('[ExamController] Personality result calculated:', ['personality_type' => $computedPersonalityType]);
            }

            $score = $totalRegularQuestions > 0 ? ($correctAnswers / $totalRegularQuestions) * 100 : 0;

            // Determine pass/fail (10% passing score for open admission)
            $remarks = $score >= 10 ? 'Pass' : 'Fail';

            // Calculate timing if provided
            $startedAt = $request->started_at ? \Carbon\Carbon::parse($request->started_at) : null;
            $finishedAt = now();
            $timeTakenSeconds = $request->time_taken ?? $request->time_taken_seconds ?? null;
            
            // If we don't have start time but have time_taken, calculate started_at
            if (!$startedAt && $timeTakenSeconds) {
                $startedAt = $finishedAt->copy()->subSeconds($timeTakenSeconds);
            }

            // Create or update exam result using existing ExamResult model structure (only for regular questions)
            if ($existingResult && $existingResult->remarks === 'In Progress') {
                // If this is a retake (In Progress -> Pass/Fail), clean up old answers first
                Log::info('[ExamController] Cleaning up old answers for regular exam retake', [
                    'examinee_id' => $examinee->id,
                    'exam_id' => $request->examId
                ]);
                
                // Delete old answers for this exam attempt
                \App\Models\ExamineeAnswer::where('examineeId', $examinee->id)
                    ->where('examId', $request->examId)
                    ->delete();
                
                // Update existing result
                $examResult = $existingResult;
                $examResult->update([
                    'total_items' => $totalRegularQuestions,
                    'correct' => $correctAnswers,
                    'remarks' => $remarks,
                    'started_at' => $startedAt,
                    'finished_at' => $finishedAt,
                    'time_taken_seconds' => $timeTakenSeconds,
                    'category_breakdown' => json_encode($categoryBreakdown)
                ]);
            } else {
                // Create new result
                $examResult = \App\Models\ExamResult::create([
                    'examineeId' => $examinee->id,
                    'examId' => $request->examId,
                    'total_items' => $totalRegularQuestions,
                    'correct' => $correctAnswers,
                    'remarks' => $remarks,
                    'started_at' => $startedAt,
                    'finished_at' => $finishedAt,
                    'time_taken_seconds' => $timeTakenSeconds,
                    'category_breakdown' => json_encode($categoryBreakdown)
                ]);
            }

            // Persist multiple course recommendations based on rules and latest personality
            try {
                $latestPersonality = \App\Models\PersonalityTestResult::where('examineeId', $examinee->id)->latest()->first();
                $insertedAnyRecommendation = false;
                if ($latestPersonality) {
                    $personalityType = $latestPersonality->personality_type ?? (($latestPersonality->EI ?? '') . ($latestPersonality->SN ?? '') . ($latestPersonality->TF ?? '') . ($latestPersonality->JP ?? ''));
                    $examScore = round($score, 2);

                    Log::info('[ExamController] Persisting recommendations', [
                        'examinee_id' => $examinee->id,
                        'result_id' => $examResult->resultId,
                        'personality_type' => $personalityType,
                        'exam_score' => $examScore,
                    ]);

                    $matchingRules = DB::table('course_recommendation_rules as crr')
                        ->join('courses as c', 'crr.recommended_course_id', '=', 'c.id')
                        ->select('crr.id as rule_id', 'c.id as course_id', 'c.passing_rate')
                        ->where('crr.personality_type', $personalityType)
                        ->where('crr.min_score', '<=', $examScore)
                        ->where('crr.max_score', '>=', $examScore)
                        ->get();

                    Log::info('[ExamController] Matching rules found', [
                        'rules_count' => $matchingRules->count()
                    ]);

                    foreach ($matchingRules as $rule) {
                        $courseId = (int) $rule->course_id;
                        $courseMin = (int)($rule->passing_rate ?? 10);
                        if ($examScore < $courseMin) {
                            Log::info('[ExamController] Skipping course due to passing rate', ['course_id' => $courseId, 'course_min' => $courseMin]);
                            continue;
                        }

                        Log::info('[ExamController] Inserting recommendation row', [
                            'examinee_id' => $examinee->id,
                            'exam_result_id' => $examResult->resultId,
                            'recommended_course_id' => $courseId,
                            'personality_result_id' => $latestPersonality->id,
                        ]);

                        $affected = DB::table('examinee_recommendations')->updateOrInsert(
                            [
                                'examinee_id' => $examinee->id,
                                'exam_result_id' => $examResult->resultId,
                                'recommended_course_id' => $courseId,
                            ],
                            [
                                'personality_result_id' => $latestPersonality->id,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]
                        );
                        // updateOrInsert doesn't return affected count, mark as inserted attempt
                        $insertedAnyRecommendation = true;
                    }
                } else {
                    Log::warning('[ExamController] No latest personality result found, skipping persisted recommendations', ['examinee_id' => $examinee->id]);
                }
            } catch (\Exception $e) {
                Log::warning('[ExamController] Failed to persist recommendations: ' . $e->getMessage());
            }

            // Update examinee registration status to 'completed'
            \App\Models\ExamineeRegistration::where('examinee_id', $examinee->id)
                ->where('status', 'assigned')
                ->update(['status' => 'completed']);

            Log::info('[ExamController] Exam registration status updated to completed for examinee: ' . $examinee->id);

            // Generate course recommendation if exam is passed and personality test exists (from this submit or previous)
            $recommendation = null;
            if ($examResult->isPassed()) {
                // If we already persisted one or more recommendations, skip the legacy single-course generator to avoid duplicates
                if (!isset($insertedAnyRecommendation) || $insertedAnyRecommendation === false) {
                    // Use personality result from this submission if present; otherwise fallback to the latest stored one
                    if (!$personalityResult) {
                        $personalityResult = \App\Models\PersonalityTestResult::where('examineeId', $examinee->id)
                            ->latest()->first();
                    }
                    if ($personalityResult) {
                        $recommendation = $this->generateCourseRecommendation($examinee->id, $examResult->resultId, $personalityResult->id, $score);
                    }
                    Log::info('[ExamController] Course recommendation generated (legacy path):', [
                        'recommendation_id' => $recommendation ? $recommendation->id : null,
                        'course_id' => $recommendation ? $recommendation->recommended_course_id : null
                    ]);
                } else {
                    Log::info('[ExamController] Skipping legacy single-course recommendation; multiple recommendations already persisted');
                }
            }

            // Commit all DB writes
            Log::info('[ExamController] Committing database transaction...');
            DB::commit();
            Log::info('[ExamController] Database transaction committed successfully!');

            return response()->json([
                'success' => true,
                'message' => 'Exam submitted successfully.',
                'data' => [
                    'resultId' => $examResult->resultId,
                    'score' => $score,
                    'correct_answers' => $correctAnswers,
                    'total_regular_questions' => $totalRegularQuestions,
                    'total_personality_questions' => count($personalityAnswers),
                    'percentage' => $score,
                    'is_passed' => $score >= 10,
                    'personality_type' => $personalityResult ? ($personalityResult->personality_type ?? ($personalityResult->EI . $personalityResult->SN . $personalityResult->TF . $personalityResult->JP)) : null,
                    'has_recommendation' => $recommendation !== null,
                    'recommended_course' => $recommendation ? [
                        'id' => $recommendation->recommendedCourse->id,
                        'course_code' => $recommendation->recommendedCourse->course_code,
                        'course_name' => $recommendation->recommendedCourse->course_name,
                        'description' => $recommendation->recommendedCourse->description
                    ] : null
                ]
            ], 200);

        } catch (\Exception $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            return response()->json([
                'success' => false,
                'message' => 'Error submitting exam: ' . $e->getMessage(),
                'data' => null,
                'debug_info' => [
                    'exception_class' => get_class($e),
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]
            ], 500);
        }
    }

    /**
     * Process personality test answers and calculate MBTI type
     */
    private function processPersonalityTestAnswers($personalityAnswers, $examineeId, $examId)
    {
        $dichotomyScores = [
            'E' => 0, 'I' => 0,  // Extraversion vs Introversion
            'S' => 0, 'N' => 0,  // Sensing vs Intuition
            'T' => 0, 'F' => 0,  // Thinking vs Feeling
            'J' => 0, 'P' => 0   // Judging vs Perceiving
        ];

        $processedCount = 0;
        foreach ($personalityAnswers as $answer) {
            // Normalize question id (support formats like 'personality_123')
            $personalityQuestionId = (int) preg_replace('/^personality_/i', '', (string) $answer['questionId']);

            // Get the personality question to determine which side is chosen
            $question = \App\Models\PersonalityTest::where('id', $personalityQuestionId)->first();

            if ($question) {
                // Determine which side of the dichotomy was chosen
                $chosenSide = '';
                if ($answer['selected_answer'] === 'A') { // "Yes" option (option1)
                    $chosenSide = $question->positive_side;
                } else { // "No" option (option2)
                    $chosenSide = $question->negative_side;
                }

                // Increment the score for the chosen side
                if (isset($dichotomyScores[$chosenSide])) {
                    $dichotomyScores[$chosenSide]++;
                }

                // Store individual personality answer
                \App\Models\PersonalityTestAnswer::create([
                    'examineeId' => $examineeId,
                    'questionId' => $personalityQuestionId,
                    'selected_answer' => $answer['selected_answer'],
                    'chosen_side' => $chosenSide
                ]);
                $processedCount++;
            } else {
                Log::warning('[ExamController] Personality question not found when saving answer', [
                    'raw_question_id' => $answer['questionId'] ?? null,
                    'normalized_id' => $personalityQuestionId
                ]);
            }
        }

        // Determine personality type based on highest scores in each dichotomy
        $personalityType = '';
        $personalityType .= ($dichotomyScores['E'] >= $dichotomyScores['I']) ? 'E' : 'I';
        $personalityType .= ($dichotomyScores['S'] >= $dichotomyScores['N']) ? 'S' : 'N';
        $personalityType .= ($dichotomyScores['T'] >= $dichotomyScores['F']) ? 'T' : 'F';
        $personalityType .= ($dichotomyScores['J'] >= $dichotomyScores['P']) ? 'J' : 'P';

        // Store personality test result (without personality_type column)
        $personalityResult = \App\Models\PersonalityTestResult::create([
            'examineeId' => $examineeId,
            'EI' => ($dichotomyScores['E'] >= $dichotomyScores['I']) ? 'E' : 'I',
            'SN' => ($dichotomyScores['S'] >= $dichotomyScores['N']) ? 'S' : 'N',
            'TF' => ($dichotomyScores['T'] >= $dichotomyScores['F']) ? 'T' : 'F',
            'JP' => ($dichotomyScores['J'] >= $dichotomyScores['P']) ? 'J' : 'P'
        ]);

        Log::info('[ExamController] Personality type calculated', [
            'examinee_id' => $examineeId,
            'personality_type' => $personalityType,
            'scores' => $dichotomyScores,
            'answers_processed' => $processedCount
        ]);

        // Attach computed MBTI string for downstream usage
        $personalityResult->personality_type = $personalityType;

        return $personalityResult;
    }

    /**
     * Generate course recommendation based on personality type and exam score
     */
    private function generateCourseRecommendation($examineeId, $examResultId, $personalityResultId, $examScore)
    {
        try {
            // Get personality result to determine type
            $personalityResult = \App\Models\PersonalityTestResult::find($personalityResultId);
            if (!$personalityResult) {
                Log::warning('[ExamController] Personality result not found for recommendation', ['personality_result_id' => $personalityResultId]);
                return null;
            }

            // Compute MBTI type string from stored dichotomies
            $personalityType = ($personalityResult->EI ?? '')
                . ($personalityResult->SN ?? '')
                . ($personalityResult->TF ?? '')
                . ($personalityResult->JP ?? '');

            // Find matching course recommendation rule
            $recommendationRule = \App\Models\CourseRecommendationRule::where('personality_type', $personalityType)
                ->where('min_score', '<=', $examScore)
                ->where('max_score', '>=', $examScore)
                ->first();

            if (!$recommendationRule) {
                Log::info('[ExamController] No matching recommendation rule found', [
                    'personality_type' => $personalityType,
                    'exam_score' => $examScore
                ]);
                return null;
            }

            // Create examinee recommendation
            $recommendation = \App\Models\ExamineeRecommendation::create([
                'examinee_id' => $examineeId,
                'exam_result_id' => $examResultId,
                'personality_result_id' => $personalityResultId,
                'recommended_course_id' => $recommendationRule->recommended_course_id
            ]);

            // Load the related course data
            $recommendation->load('recommendedCourse');

            Log::info('[ExamController] Course recommendation created', [
                'recommendation_id' => $recommendation->id,
                'examinee_id' => $examineeId,
                'personality_type' => $personalityType,
                'exam_score' => $examScore,
                'recommended_course_id' => $recommendationRule->recommended_course_id
            ]);

            return $recommendation;

        } catch (\Exception $e) {
            Log::error('[ExamController] Error generating course recommendation: ' . $e->getMessage(), [
                'examinee_id' => $examineeId,
                'exam_result_id' => $examResultId,
                'personality_result_id' => $personalityResultId,
                'exam_score' => $examScore
            ]);
            return null;
        }
    }

    /**
     * Submit personality test answers only (used when personality test is taken before academic exam)
     */
    public function submitPersonalityTestAnswers(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'examId' => 'nullable|integer',
                'answers' => 'required|array|min:1',
                'answers.*.questionId' => 'required',
                'answers.*.selected_answer' => 'required|string|in:A,B'
            ]);

            $user = $request->user();
            $examinee = \App\Models\Examinee::where('accountId', $user->id)->first();

            if (!$examinee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Examinee profile not found.',
                    'data' => null
                ], 404);
            }

            $personalityResult = $this->processPersonalityTestAnswers($request->answers, $examinee->id, $request->examId);
            $computedType = $personalityResult->personality_type ?? ($personalityResult->EI . $personalityResult->SN . $personalityResult->TF . $personalityResult->JP);

            return response()->json([
                'success' => true,
                'message' => 'Personality test submitted successfully.',
                'data' => [
                    'personality_result_id' => $personalityResult->id,
                    'examinee_id' => $examinee->id,
                    'exam_id' => $request->examId,
                    'EI' => $personalityResult->EI,
                    'SN' => $personalityResult->SN,
                    'TF' => $personalityResult->TF,
                    'JP' => $personalityResult->JP,
                    'personality_type' => $computedType
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('[ExamController] Error submitting personality test answers: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error submitting personality test answers: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * Get personality test questions for an exam (separate from academic questions)
     */
    public function getPersonalityTestQuestions(Request $request, $examId): JsonResponse
    {
        try {
            $exam = Exam::with(['personalityQuestions'])
                ->where('examId', $examId)
                ->where('status', 'active')
                ->first();

            if (!$exam) {
                return response()->json([
                    'success' => false,
                    'message' => 'Exam not found or inactive.',
                    'data' => null
                ], 404);
            }

            // Get personality questions - either exam-specific or all available questions
            $personalityQuestionsQuery = null;
            
            if ($exam->include_personality_test && $exam->personalityQuestions->count() > 0) {
                // Use exam-specific personality questions
                $personalityQuestionsQuery = $exam->personalityQuestions;
                Log::info('[ExamController] Using exam-specific personality questions: ' . $personalityQuestionsQuery->count());
            } else {
                // Use all available personality questions from the database
                $personalityQuestionsQuery = \App\Models\PersonalityTest::active()->get();
                Log::info('[ExamController] Using all available personality questions: ' . $personalityQuestionsQuery->count());
            }

            if ($personalityQuestionsQuery->count() === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'No personality test questions available.',
                    'data' => null
                ], 404);
            }

            // Format personality questions
            $personalityQuestions = $personalityQuestionsQuery->map(function($question) {
                return [
                    'questionId' => 'personality_' . $question->id,
                    'personality_question_id' => $question->id,
                    'question' => $question->question,
                    'option1' => $question->option1, // Yes
                    'option2' => $question->option2, // No
                    'dichotomy' => $question->dichotomy,
                    'positive_side' => $question->positive_side,
                    'negative_side' => $question->negative_side,
                    'question_type' => 'personality'
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Personality test questions retrieved successfully.',
                'data' => [
                    'examId' => $exam->examId,
                    'exam_ref_no' => $exam->{'exam-ref-no'},
                    'personality_questions' => $personalityQuestions,
                    'total_personality_questions' => $personalityQuestions->count()
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('[ExamController] Error retrieving personality test questions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving personality test questions: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    /**
     * Get all available personality test questions (not tied to specific exam)
     */
    public function getAllPersonalityTestQuestions(Request $request): JsonResponse
    {
        try {
            Log::info('[ExamController] Fetching all available personality test questions');

            // Get all active personality test questions
            $personalityQuestions = \App\Models\PersonalityTest::active()->get();

            if ($personalityQuestions->count() === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'No personality test questions available in the database.',
                    'data' => null
                ], 404);
            }

            // Format personality questions
            $formattedQuestions = $personalityQuestions->map(function($question) {
                return [
                    'questionId' => 'personality_' . $question->id,
                    'personality_question_id' => $question->id,
                    'question' => $question->question,
                    'option1' => $question->option1, // Yes
                    'option2' => $question->option2, // No
                    'dichotomy' => $question->dichotomy,
                    'positive_side' => $question->positive_side,
                    'negative_side' => $question->negative_side,
                    'question_type' => 'personality'
                ];
            });

            Log::info('[ExamController] Retrieved all personality questions: ' . $formattedQuestions->count());

            return response()->json([
                'success' => true,
                'message' => 'All personality test questions retrieved successfully.',
                'data' => [
                    'personality_questions' => $formattedQuestions,
                    'total_personality_questions' => $formattedQuestions->count()
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('[ExamController] Error retrieving all personality test questions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving all personality test questions: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    /**
     * Get academic exam questions only (separate from personality questions)
     */
    public function getAcademicExamQuestions(Request $request, $examId): JsonResponse
    {
        try {
            $exam = Exam::with(['questions'])
                ->where('examId', $examId)
                ->where('status', 'active')
                ->first();

            if (!$exam) {
                return response()->json([
                    'success' => false,
                    'message' => 'Exam not found or inactive.',
                    'data' => null
                ], 404);
            }

            // Academic exam questions only
            $questions = $exam->questions->map(function($question) {
                return [
                    'questionId' => $question->questionId,
                    'question' => $question->question,
                    'question_formatted' => $question->question_formatted,
                    'option1' => $question->option1,
                    'option2' => $question->option2,
                    'option3' => $question->option3,
                    'option4' => $question->option4,
                    'option5' => $question->option5,
                    'category' => $question->category,
                    'direction' => $question->direction,
                    'has_image' => !empty($question->image),
                    'image' => $question->image,
                    'question_type' => 'academic',
                    'has_option_images' => [
                        'option1' => !empty($question->option1_image),
                        'option2' => !empty($question->option2_image),
                        'option3' => !empty($question->option3_image),
                        'option4' => !empty($question->option4_image),
                        'option5' => !empty($question->option5_image)
                    ],
                    'option_images' => [
                        'option1' => $question->option1_image,
                        'option2' => $question->option2_image,
                        'option3' => $question->option3_image,
                        'option4' => $question->option4_image,
                        'option5' => $question->option5_image
                    ]
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Academic exam questions retrieved successfully.',
                'data' => [
                    'examId' => $exam->examId,
                    'exam_ref_no' => $exam->{'exam-ref-no'},
                    'time_limit' => $exam->time_limit,
                    'questions' => $questions,
                    'total_questions' => $questions->count(),
                    'exam_type' => 'academic'
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('[ExamController] Error retrieving academic exam questions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving academic exam questions: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    /**
     * Submit departmental exam answers
     */
    public function submitDepartmentalExamAnswers(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'department_exam_id' => 'required|integer',
                'answers' => 'required|array',
                'answers.*.questionId' => 'required|integer',
                'answers.*.selected_answer' => 'nullable|string|max:1',
                'answers.*.time_spent_seconds' => 'nullable|integer|min:0',
                'answers.*.question_start_time' => 'nullable|date',
                'answers.*.question_end_time' => 'nullable|date'
            ]);

            Log::info('[ExamController] Submitting departmental exam answers', [
                'department_exam_id' => $request->department_exam_id,
                'answers_count' => count($request->answers)
            ]);

            $user = $request->user();
            $examinee = \App\Models\Examinee::where('accountId', $user->id)->first();

            if (!$examinee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Examinee profile not found.',
                    'data' => null
                ], 404);
            }

            // Check if already submitted (only block if Pass/Fail, allow retakes for In Progress)
            $existingResult = DepartmentExamResult::where('examinee_id', $examinee->id)
                ->where('department_exam_id', $request->department_exam_id)
                ->first();

            if ($existingResult && ($existingResult->remarks === 'Pass' || $existingResult->remarks === 'Fail')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Departmental exam already completed. You cannot retake it.',
                    'data' => null
                ], 400);
            }

            // Verify departmental exam exists and is active
            $departmentalExam = DepartmentExam::where('id', $request->department_exam_id)
                ->where('status', 1)
                ->first();

            if (!$departmentalExam) {
                return response()->json([
                    'success' => false,
                    'message' => 'Departmental exam not found or inactive.',
                    'data' => null
                ], 404);
            }

            // Calculate score
            $correctAnswers = 0;
            $wrongAnswers = 0;
            $totalQuestions = count($request->answers);

            foreach ($request->answers as $answer) {
                $question = DepartmentExamBank::where('questionId', $answer['questionId'])->first();
                $selectedAnswer = $answer['selected_answer'] ?? null;
                $isCorrect = $question && $question->correct_answer === $selectedAnswer;
                
                if ($isCorrect) {
                    $correctAnswers++;
                } else {
                    $wrongAnswers++;
                }

                // Convert ISO datetimes to MySQL format if present
                $start = null; $end = null;
                if (!empty($answer['question_start_time'])) {
                    try { $start = \Carbon\Carbon::parse($answer['question_start_time'])->format('Y-m-d H:i:s'); } catch (\Exception $e) { Log::warning('[DeptExam] Invalid question_start_time', ['v'=>$answer['question_start_time']]); }
                }
                if (!empty($answer['question_end_time'])) {
                    try { $end = \Carbon\Carbon::parse($answer['question_end_time'])->format('Y-m-d H:i:s'); } catch (\Exception $e) { Log::warning('[DeptExam] Invalid question_end_time', ['v'=>$answer['question_end_time']]); }
                }

                // Store individual answer with timing
                DepartmentExamAnswer::create([
                    'examinee_id' => $examinee->id,
                    'department_exam_id' => $request->department_exam_id,
                    'question_id' => $answer['questionId'],
                    'selected_answer' => $selectedAnswer,
                    'time_spent_seconds' => $answer['time_spent_seconds'] ?? null,
                    'question_start_time' => $start,
                    'question_end_time' => $end
                ]);
            }

            $scorePercentage = ($correctAnswers / $totalQuestions) * 100;
            // Use per-exam passing score; fallback to 10 if not set or invalid
            $examPassing = (int)($departmentalExam->passing_score ?? 0);
            if ($examPassing <= 0 || $examPassing > 100) { $examPassing = 10; }
            $remarks = $scorePercentage >= $examPassing ? 'Pass' : 'Fail';

            // Update existing placeholder if present; otherwise create
            $examResult = DepartmentExamResult::where('examinee_id', $examinee->id)
                ->where('department_exam_id', $request->department_exam_id)
                ->first();

            if ($examResult) {
                // If this is a retake (In Progress -> Pass/Fail), clean up old answers first
                if ($examResult->remarks === 'In Progress') {
                    Log::info('[ExamController] Cleaning up old answers for retake', [
                        'examinee_id' => $examinee->id,
                        'department_exam_id' => $request->department_exam_id
                    ]);
                    
                    // Delete old answers for this exam attempt
                    DepartmentExamAnswer::where('examinee_id', $examinee->id)
                        ->where('department_exam_id', $request->department_exam_id)
                        ->delete();
                }
                
                $examResult->update([
                    'total_items' => $totalQuestions,
                    'correct_answers' => $correctAnswers,
                    'wrong_answers' => $wrongAnswers,
                    'score_percentage' => $scorePercentage,
                    'remarks' => $remarks
                ]);
            } else {
                $examResult = DepartmentExamResult::create([
                    'examinee_id' => $examinee->id,
                    'department_exam_id' => $request->department_exam_id,
                    'total_items' => $totalQuestions,
                    'correct_answers' => $correctAnswers,
                    'wrong_answers' => $wrongAnswers,
                    'score_percentage' => $scorePercentage,
                    'remarks' => $remarks
                ]);
            }

            // Do NOT update entrance exam registration status from departmental submissions
            Log::info('[ExamController] Departmental exam submitted; registration status unchanged for examinee: ' . $examinee->id);

            Log::info('[ExamController] Departmental exam submitted successfully', [
                'result_id' => $examResult->id,
                'score_percentage' => $scorePercentage,
                'remarks' => $remarks
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Departmental exam submitted successfully.',
                'data' => [
                    'resultId' => $examResult->id,
                    'department_exam_id' => $departmentalExam->id,
                    'exam_title' => $departmentalExam->exam_title,
                    'score_percentage' => $scorePercentage,
                    'correct_answers' => $correctAnswers,
                    'wrong_answers' => $wrongAnswers,
                    'total_questions' => $totalQuestions,
                    'remarks' => $remarks,
                    'is_passed' => $scorePercentage >= $examPassing
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('[ExamController] Error submitting departmental exam: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error submitting departmental exam: ' . $e->getMessage(),
                'data' => null,
                'debug_info' => [
                    'exception_class' => get_class($e),
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]
            ], 500);
        }
    }

    /**
     * Get exam results for mobile app
     */
    public function getExamResults(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $examinee = \App\Models\Examinee::where('accountId', $user->id)->first();

            if (!$examinee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Examinee profile not found.',
                    'data' => null
                ], 404);
            }

            // Get regular exam results
            $regularResults = \App\Models\ExamResult::with(['exam'])
                ->where('examineeId', $examinee->id)
                ->latest()
                ->get()
                ->map(function($result) use ($examinee) {
                    // Legacy single recommendation (if already created on submit)
                    $legacyRecommendation = \App\Models\ExamineeRecommendation::with(['recommendedCourse'])
                        ->where('exam_result_id', $result->resultId)
                        ->first();

                    $personalityType = null;
                    $personalityTypeDetails = null;
                    // Prefer latest personality result for consistency
                    $latestPersonality = \App\Models\PersonalityTestResult::where('examineeId', $examinee->id)->latest()->first();
                    if ($latestPersonality) {
                        $personalityType = $latestPersonality->personality_type ?? (($latestPersonality->EI ?? '') . ($latestPersonality->SN ?? '') . ($latestPersonality->TF ?? '') . ($latestPersonality->JP ?? ''));
                        $typeRow = \App\Models\PersonalityType::where('type', $personalityType)->first();
                        if ($typeRow) {
                            $personalityTypeDetails = [
                                'type' => $typeRow->type,
                                'title' => $typeRow->title,
                                'description' => $typeRow->description,
                            ];
                        }
                    } elseif ($legacyRecommendation) {
                        $personalityResult = \App\Models\PersonalityTestResult::find($legacyRecommendation->personality_result_id);
                        if ($personalityResult) {
                            $personalityType = ($personalityResult->EI ?? '') . ($personalityResult->SN ?? '') . ($personalityResult->TF ?? '') . ($personalityResult->JP ?? '');
                            $typeRow = \App\Models\PersonalityType::where('type', $personalityType)->first();
                            if ($typeRow) {
                                $personalityTypeDetails = [
                                    'type' => $typeRow->type,
                                    'title' => $typeRow->title,
                                    'description' => $typeRow->description,
                                ];
                            }
                        }
                    }

                    // Build list of suitable courses based on rules (non-persistent)
                    $recommendedCourses = [];
                    if ($personalityType) {
                        $examScore = (int) $result->percentage;
                        $matchingRules = DB::table('course_recommendation_rules as crr')
                            ->join('courses as c', 'crr.recommended_course_id', '=', 'c.id')
                            ->select('c.id', 'c.course_code', 'c.course_name', 'c.description', 'c.passing_rate')
                            ->where('crr.personality_type', $personalityType)
                            ->where('crr.min_score', '<=', $examScore)
                            ->where('crr.max_score', '>=', $examScore)
                            ->get();
                        foreach ($matchingRules as $course) {
                            $courseMin = (int)($course->passing_rate ?? 10);
                            if ($examScore < $courseMin) { continue; }
                            $recommendedCourses[$course->id] = [
                                'id' => $course->id,
                                'course_code' => $course->course_code,
                                'course_name' => $course->course_name,
                                'description' => $course->description,
                                'course_passing_rate' => $courseMin,
                            ];
                        }
                        $recommendedCourses = array_values($recommendedCourses);
                    }

                    return [
                        'resultId' => $result->resultId,
                        'examId' => $result->examId,
                        'exam_ref_no' => $result->exam->{'exam-ref-no'} ?? 'N/A',
                        'exam_title' => 'Regular Exam',
                        'total_items' => $result->total_items,
                        'correct' => $result->correct,
                        'incorrect' => $result->incorrect,
                        'percentage' => $result->percentage,
                        'is_passed' => $result->isPassed(),
                        'remarks' => $result->remarks,
                        'exam_type' => 'regular',
                        'created_at' => $result->created_at,
                        'category_breakdown' => $result->category_breakdown, // Per-category scores
                        'has_recommendation' => (count($recommendedCourses) > 0) || (bool) $legacyRecommendation,
                        // Backward-compat single item
                        'recommended_course' => (count($recommendedCourses) > 0) ? $recommendedCourses[0] : ($legacyRecommendation ? [
                            'id' => $legacyRecommendation->recommendedCourse->id ?? null,
                            'course_code' => $legacyRecommendation->recommendedCourse->course_code ?? null,
                            'course_name' => $legacyRecommendation->recommendedCourse->course_name ?? null,
                            'description' => $legacyRecommendation->recommendedCourse->description ?? null,
                        ] : null),
                        // New: full array of suitable courses
                        'recommended_courses' => $recommendedCourses,
                        'personality_type' => $personalityType,
                        'personality_type_details' => $personalityTypeDetails
                    ];
                });

            // Get departmental exam results
            $departmentalResults = DepartmentExamResult::with(['departmentExam'])
                ->where('examinee_id', $examinee->id)
                ->latest()
                ->get()
                ->map(function($result) {
                    $examPassing = (int)($result->departmentExam->passing_score ?? 10);
                    if ($examPassing <= 0 || $examPassing > 100) { $examPassing = 10; }
                    $isPassed = $result->score_percentage >= $examPassing;
                    return [
                        'resultId' => $result->id,
                        'examId' => $result->department_exam_id,
                        'exam_ref_no' => $result->departmentExam->exam_ref_no ?? 'N/A',
                        'exam_title' => $result->departmentExam->exam_title ?? 'Departmental Exam',
                        'total_items' => $result->total_items,
                        'correct' => $result->correct_answers,
                        'incorrect' => $result->wrong_answers,
                        'percentage' => $result->score_percentage,
                        'is_passed' => $isPassed,
                        'exam_passing_score' => $examPassing,
                        'remarks' => $result->remarks,
                        'exam_type' => 'departmental',
                        'created_at' => $result->created_at
                    ];
                });

            // Merge and sort all results by created_at
            $allResults = $regularResults->concat($departmentalResults)
                ->sortByDesc('created_at')
                ->values();

            return response()->json([
                'success' => true,
                'message' => 'Exam results retrieved successfully.',
                'data' => $allResults
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving exam results: ' . $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    /**
     * Normalize a code by removing non-alphanumerics and sorting characters
     * so shuffled variants of the same base map to the same key.
     */
    private function normalizeCodeForMatch(string $code): string
    {
        $clean = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $code));
        $chars = str_split($clean);
        sort($chars);
        return implode('', $chars);
    }

    /**
     * Mark exam as started for monitoring purposes
     */
    public function markExamStarted(Request $request): JsonResponse
    {
        try {
            Log::info('[ExamController] markExamStarted called', [
                'request_data' => $request->all(),
                'user_id' => $request->user()?->id
            ]);

            $request->validate([
                'examId' => 'required|integer',
                'examType' => 'required|string|in:regular,departmental,schedule',
                'phase' => 'nullable|string|in:personality,academic'
            ]);

            $user = $request->user();
            $examinee = \App\Models\Examinee::where('accountId', $user->id)->first();

            if (!$examinee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Examinee profile not found.',
                    'data' => null
                ], 404);
            }

            $examId = $request->examId;
            $examType = $request->examType;
            $phase = $request->phase ?? 'academic'; // Default to academic if not provided
            
            // Normalize 'schedule' to 'regular' for monitoring purposes
            if ($examType === 'schedule') {
                \Illuminate\Support\Facades\Log::info('[ExamController] Normalizing examType from schedule to regular for monitoring');
                $examType = 'regular';
            }

            // Determine the remarks based on phase
            $remarks = $phase === 'personality' ? 'Personality Test' : 'In Progress';

            if ($examType === 'regular') {
                // Check if exam result already exists
                $existingResult = \App\Models\ExamResult::where('examineeId', $examinee->id)
                    ->where('examId', $examId)
                    ->first();

                Log::info('[ExamController] Checking existing exam result', [
                    'examinee_id' => $examinee->id,
                    'exam_id' => $examId,
                    'phase' => $phase,
                    'remarks' => $remarks,
                    'existing_result' => $existingResult ? $existingResult->toArray() : null
                ]);

                if ($existingResult) {
                    // Update existing result with current phase
                    $existingResult->update([
                        'started_at' => now(),
                        'remarks' => $remarks
                    ]);
                    $examResult = $existingResult;
                    Log::info('[ExamController] Updated existing exam result with phase', ['phase' => $phase]);
                } else {
                    // Create new result with phase
                    $examResult = \App\Models\ExamResult::create([
                        'examineeId' => $examinee->id,
                        'examId' => $examId,
                        'started_at' => now(),
                        'total_items' => 0,
                        'correct' => 0,
                        'remarks' => $remarks
                    ]);
                    Log::info('[ExamController] Created new exam result with phase', ['phase' => $phase]);
                }

                Log::info('[ExamController] Regular exam started for monitoring', [
                    'examinee_id' => $examinee->id,
                    'examinee_name' => $examinee->full_name,
                    'exam_id' => $examId,
                    'exam_type' => 'regular',
                    'started_at' => $examResult->started_at,
                    'result_id' => $examResult->id
                ]);

            } else {
                // Departmental exam: ensure a placeholder result exists for monitoring
                Log::info('[ExamController] Departmental exam started for monitoring', [
                    'examinee_id' => $examinee->id,
                    'examinee_name' => $examinee->full_name,
                    'exam_id' => $examId,
                    'exam_type' => 'departmental',
                    'started_at' => now()
                ]);

                try {
                    $existingDeptResult = \App\Models\DepartmentExamResult::where('examinee_id', $examinee->id)
                        ->where('department_exam_id', $examId)
                        ->first();

                    if ($existingDeptResult) {
                        // Keep as is if already present
                        \Illuminate\Support\Facades\Log::info('[ExamController] Departmental placeholder already exists', [
                            'result_id' => $existingDeptResult->id
                        ]);
                    } else {
                        $placeholder = \App\Models\DepartmentExamResult::create([
                            'examinee_id' => $examinee->id,
                            'department_exam_id' => $examId,
                            'total_items' => 0,
                            'correct_answers' => 0,
                            'wrong_answers' => 0,
                            'score_percentage' => 0,
                            'remarks' => 'In Progress'
                        ]);
                        \Illuminate\Support\Facades\Log::info('[ExamController] Created departmental placeholder result', [
                            'result_id' => $placeholder->id
                        ]);
                    }
                } catch (\Throwable $t) {
                    \Illuminate\Support\Facades\Log::warning('[ExamController] Failed to ensure departmental placeholder: ' . $t->getMessage());
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Exam start marked successfully.',
                'data' => [
                    'exam_id' => $examId,
                    'exam_type' => $examType,
                    'started_at' => now()
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('[ExamController] Error marking exam as started: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark exam as started.',
                'data' => null
            ], 500);
        }
    }

    /**
     * Mark exam as stopped (e.g., screen unpinned / user exits) for monitoring purposes
     */
    public function markExamStopped(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'examId' => 'required|integer'
            ]);

            $user = $request->user();
            $examinee = \App\Models\Examinee::where('accountId', $user->id)->first();

            if (!$examinee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Examinee profile not found.',
                    'data' => null
                ], 404);
            }

            $examId = $request->examId;

            $result = \App\Models\ExamResult::where('examineeId', $examinee->id)
                ->where('examId', $examId)
                ->latest()
                ->first();

            if ($result) {
                // If the result is only a monitoring placeholder (no answers, not finished), remove it
                if ($result->finished_at === null && (int)($result->total_items ?? 0) === 0 && (int)($result->correct ?? 0) === 0) {
                    \Illuminate\Support\Facades\Log::info('[ExamController] Removing placeholder result on stop', [
                        'result_id' => $result->id,
                        'examinee_id' => $examinee->id,
                        'exam_id' => $examId
                    ]);
                    $result->delete();
                } else {
                    // Do not mark as stopped in exam_results to avoid persisting stop state
                    \Illuminate\Support\Facades\Log::info('[ExamController] Stop received; leaving existing result unchanged', [
                        'result_id' => $result->id,
                        'finished_at' => $result->finished_at,
                        'remarks' => $result->remarks
                    ]);
                }
            }

            \Illuminate\Support\Facades\Log::info('[ExamController] Exam stopped for monitoring', [
                'examinee_id' => $examinee->id,
                'exam_id' => $examId
            ]);

            // Also handle departmental placeholder removal if applicable
            try {
                $deptResult = \App\Models\DepartmentExamResult::where('examinee_id', $examinee->id)
                    ->where('department_exam_id', $examId)
                    ->first();
                if ($deptResult && ($deptResult->remarks === 'In Progress' || $deptResult->total_items == 0)) {
                    $deptResult->delete();
                    \Illuminate\Support\Facades\Log::info('[ExamController] Removed departmental placeholder on stop', [
                        'examinee_id' => $examinee->id,
                        'department_exam_id' => $examId
                    ]);
                }
            } catch (\Throwable $t) {
                \Illuminate\Support\Facades\Log::warning('[ExamController] Error removing departmental placeholder on stop: ' . $t->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Exam stop received.'
            ], 200);

        } catch (\Exception $e) {
            Log::error('[ExamController] Error marking exam as stopped: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark exam as stopped.',
                'data' => null
            ], 500);
        }
    }
}
