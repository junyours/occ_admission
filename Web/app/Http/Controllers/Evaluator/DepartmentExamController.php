<?php

namespace App\Http\Controllers\Evaluator;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Http\Controllers\Controller;
use App\Models\DepartmentExam;
use App\Models\DepartmentExamBank;
use App\Models\DepartmentExamResult;
use App\Models\DepartmentExamAnswer;

class DepartmentExamController extends Controller
{
    public function builder()
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        // Categories and available questions from the evaluator's department
        $categories = DepartmentExamBank::where('department', $evaluator->Department)
            ->where('status', 1)
            ->distinct()
            ->pluck('category');

        $questions = DepartmentExamBank::where('department', $evaluator->Department)
            ->where('status', 1)
            ->orderBy('category')
            ->orderBy('questionId')
            ->get([
                'questionId', 'question', 'question_formatted', 'category', 'direction', 'image',
                'option1','option1_formatted','option1_image',
                'option2','option2_formatted','option2_image',
                'option3','option3_formatted','option3_image',
                'option4','option4_formatted','option4_image',
                'option5','option5_formatted','option5_image',
                'correct_answer'
            ]);

        return Inertia::render('Evaluator/ExamBuilder', [
            'user' => $user,
            'evaluator' => $evaluator,
            'categories' => $categories,
            'questions' => $questions,
            'routes' => [
                'department_exams_store' => route('evaluator.department-exams.store'),
                'question_bank' => route('evaluator.question-bank'),
            ],
        ]);
    }

    public function index()
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;
        
        Log::info('DepartmentExamController@index - User accessing department exams', [
            'user_id' => $user->id,
            'evaluator_id' => $evaluator->id ?? null,
            'department' => $evaluator->Department ?? null
        ]);
        
        // Get department-specific exams using proper join
        $exams = DepartmentExam::with(['evaluator', 'questions', 'results'])
            ->whereHas('evaluator', function ($query) use ($evaluator) {
                $query->where('Department', $evaluator->Department);
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($exam) {
                Log::info('Processing exam', [
                    'exam_id' => $exam->id,
                    'exam_title' => $exam->exam_title,
                    'department' => $exam->evaluator->Department ?? 'Unknown'
                ]);
                
                return [
                    'id' => $exam->id,
                    'title' => $exam->exam_title,
                    'exam_ref_no' => $exam->exam_ref_no,
                    'department' => $exam->evaluator->Department ?? 'Unknown',
                    'status' => $exam->status ?? 1,
                    'time_limit' => $exam->time_limit ?? 60,
                    'total_questions' => $exam->questions->count(),
                    'total_students' => $exam->results->count(),
                    'created_at' => $exam->created_at->format('M d, Y H:i'),
                    'evaluator_name' => $exam->evaluator->name ?? 'Unknown'
                ];
            });

        // Fetch department-specific categories and questions for exam creation (manual selection)
        $categories = DepartmentExamBank::where('department', $evaluator->Department)
            ->where('status', 1)
            ->distinct()
            ->pluck('category');

        $questions = DepartmentExamBank::where('department', $evaluator->Department)
            ->where('status', 1)
            ->orderBy('category')
            ->orderBy('questionId')
            ->get([
                'questionId', 'question', 'question_formatted', 'category', 'direction', 'image',
                'option1','option1_formatted','option1_image',
                'option2','option2_formatted','option2_image',
                'option3','option3_formatted','option3_image',
                'option4','option4_formatted','option4_image',
                'option5','option5_formatted','option5_image',
                'correct_answer'
            ]);

        // Get question status counts for the department
        $questionStats = [
            'total' => DepartmentExamBank::where('department', $evaluator->Department)->count(),
            'active' => DepartmentExamBank::where('department', $evaluator->Department)->where('status', 1)->count(),
            'archived' => DepartmentExamBank::where('department', $evaluator->Department)->where('status', 0)->count()
        ];

        Log::info('DepartmentExamController@index - Exams retrieved', [
            'total_exams' => $exams->count(),
            'department' => $evaluator->Department,
            'question_stats' => $questionStats
        ]);

        return Inertia::render('Evaluator/DepartmentExams', [
            'user' => $user,
            'evaluator' => $evaluator,
            'exams' => $exams,
            'categories' => $categories,
            'questions' => $questions,
            'questionStats' => $questionStats
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        $request->validate([
            'exam_title' => 'required|string|max:255',
            'time_limit' => 'required|integer|min:1',
            'exam_type' => 'required|in:manual,random',
            'question_ids' => 'nullable|array',
            'question_ids.*' => 'integer|exists:department_exam_bank,questionId',
            'category_counts' => 'nullable|array',
            'passing_score' => 'required|integer|min:1|max:100'
        ]);

        Log::info('DepartmentExamController@store - Creating new exam', [
            'user_id' => $user->id,
            'department' => $evaluator->Department ?? null,
            'exam_title' => $request->exam_title,
            'category' => $request->category,
            'exam_type' => $request->exam_type
        ]);

        try {
            DB::beginTransaction();

            // Auto-generate 6-character reference code
            $examRef = strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 6));
            while (DepartmentExam::where('exam_ref_no', $examRef)->exists()) {
                $examRef = strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 6));
            }

            $exam = DepartmentExam::create([
                'exam_title' => $request->exam_title,
                'exam_ref_no' => $examRef,
                'evaluator_id' => $evaluator->id,
                'time_limit' => (int)$request->time_limit,
                'status' => 1,
                'passing_score' => (int) $request->passing_score,
            ]);

            // Build question ids based on exam type
            $questionIds = [];
            if ($request->exam_type === 'manual') {
                $questionIds = array_values(array_unique($request->question_ids ?? []));
                if (empty($questionIds)) {
                    throw new \RuntimeException('Please select at least one question for manual selection.');
                }
            } else {
                // Random generation based on category_counts
                $categoryCounts = $request->category_counts ?? [];
                foreach ($categoryCounts as $cat => $count) {
                    $count = (int)$count;
                    if ($count <= 0) continue;
                    $ids = DepartmentExamBank::where('department', $evaluator->Department)
                        ->where('status', 1)
                        ->where('category', $cat)
                        ->inRandomOrder()
                        ->limit($count)
                        ->pluck('questionId')
                        ->toArray();
                    $questionIds = array_merge($questionIds, $ids);
                }
                $questionIds = array_values(array_unique($questionIds));
                if (empty($questionIds)) {
                    throw new \RuntimeException('No questions available for the requested random configuration.');
                }
            }

            // Attach questions to exam
            $exam->questions()->attach($questionIds);

            DB::commit();

            Log::info('DepartmentExamController@store - Exam created successfully', [
                'exam_id' => $exam->id,
                'attached_questions' => count($questionIds)
            ]);

            return back()->with('success', 'Department exam created successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('DepartmentExamController@store - Error creating exam', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return back()->withErrors(['error' => 'Failed to create exam: ' . $e->getMessage()        ]);
        }
    }

    /**
     * Display department exam results for evaluator's department
     */
    public function examResults(Request $request)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        if (!$evaluator) {
            return redirect()->route('login')->with('error', 'Evaluator access required');
        }

        $department = $evaluator->Department;

        // Debug: Check basic department exam results without relationships
        $rawResults = DepartmentExamResult::all(['id', 'examinee_id', 'department_exam_id', 'score_percentage']);
        Log::info('Debug raw department exam results', [
            'raw_results' => $rawResults->toArray()
        ]);

        // Debug: Check if department_exam with id=1 exists
        $deptExam1 = DepartmentExam::find(1);
        Log::info('Debug department exam id=1', [
            'exists' => $deptExam1 ? 'yes' : 'no',
            'data' => $deptExam1 ? $deptExam1->toArray() : null
        ]);

        // Debug: Check if examinee with id=1 exists
        $examinee1 = \App\Models\Examinee::find(1);
        Log::info('Debug examinee id=1', [
            'exists' => $examinee1 ? 'yes' : 'no',
            'data' => $examinee1 ? $examinee1->toArray() : null
        ]);

        // Debug: Check if there are any department exams for this evaluator
        $deptExamsCount = DepartmentExam::whereHas('evaluator', function ($q) use ($department) {
            $q->where('Department', $department);
        })->count();
        Log::info('Debug department exams for evaluator', [
            'department' => $department,
            'department_exams_count' => $deptExamsCount
        ]);

        // Debug: Check all department exams and their evaluators
        $allDeptExams = DepartmentExam::with('evaluator')->get(['id', 'exam_title', 'evaluator_id']);
        Log::info('Debug all department exams', [
            'all_exams' => $allDeptExams->map(function($exam) {
                return [
                    'id' => $exam->id,
                    'title' => $exam->exam_title,
                    'evaluator_id' => $exam->evaluator_id,
                    'evaluator_department' => $exam->evaluator ? $exam->evaluator->Department : 'No evaluator'
                ];
            })->toArray()
        ]);

        // Department-scoped query
        $query = DepartmentExamResult::with(['examinee', 'departmentExam.evaluator'])
            ->whereHas('departmentExam.evaluator', function ($q) use ($department) {
                $q->where('Department', $department);
            })
            ->latest();

        // Debug: Try to load relationships step by step
        $testResult = DepartmentExamResult::first();
        if ($testResult) {
            Log::info('Debug first result found', [
                'result_id' => $testResult->id,
                'examinee_id' => $testResult->examinee_id,
                'department_exam_id' => $testResult->department_exam_id
            ]);
            
            // Test examinee relationship
            try {
                $examinee = $testResult->examinee;
                Log::info('Debug examinee relationship', [
                    'examinee_exists' => $examinee ? 'yes' : 'no',
                    'examinee_name' => $examinee ? $examinee->full_name : 'null'
                ]);
            } catch (\Exception $e) {
                Log::error('Debug examinee relationship failed', ['error' => $e->getMessage()]);
            }
            
            // Test department exam relationship
            try {
                $deptExam = $testResult->departmentExam;
                Log::info('Debug department exam relationship', [
                    'dept_exam_exists' => $deptExam ? 'yes' : 'no',
                    'dept_exam_title' => $deptExam ? $deptExam->exam_title : 'null',
                    'dept_exam_evaluator_id' => $deptExam ? $deptExam->evaluator_id : 'null'
                ]);
                
                if ($deptExam) {
                    // Test evaluator relationship
                    try {
                        $evaluator = $deptExam->evaluator;
                        Log::info('Debug evaluator relationship', [
                            'evaluator_exists' => $evaluator ? 'yes' : 'no',
                            'evaluator_department' => $evaluator ? $evaluator->Department : 'null'
                        ]);
                    } catch (\Exception $e) {
                        Log::error('Debug evaluator relationship failed', ['error' => $e->getMessage()]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Debug department exam relationship failed', ['error' => $e->getMessage()]);
            }
        } else {
            Log::info('Debug: No results found');
        }

        // Filter by student name if provided
        if ($request->filled('student_name')) {
            $query->whereHas('examinee', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->student_name . '%');
            });
        }

        // Filter by exam if provided
        if ($request->filled('exam_id')) {
            $query->where('department_exam_id', $request->exam_id);
        }

        $results = $query->paginate(15);

        // debug removed

        // Transform the results for frontend display (handle missing relationships)
        $mapped = $results->getCollection()->map(function ($result) {
            // Load relationships manually to avoid errors
            $exam = null;
            $examinee = null;
            
            try {
                $exam = DepartmentExam::find($result->department_exam_id);
                $examinee = \App\Models\Examinee::find($result->examinee_id);
            } catch (\Exception $e) {
                Log::warning('Error loading relationships for result ' . $result->id, ['error' => $e->getMessage()]);
            }

            return [
                'id' => $result->id,
                'student_name' => $examinee ? $examinee->full_name : ('Student ID: ' . $result->examinee_id),
                'exam_title' => $exam ? $exam->exam_title : 'Unknown Exam',
                'exam_ref_no' => $exam ? $exam->exam_ref_no : ('Exam ID: ' . $result->department_exam_id),
                'score_percentage' => round($result->score_percentage, 2),
                'correct_answers' => $result->correct_answers,
                'total_items' => $result->total_items,
                'remarks' => $result->remarks,
                'date_taken' => optional($result->created_at)->format('M d, Y') ?? '',
                'time_taken' => optional($result->created_at)->format('H:i') ?? '',
            ];
        });
        // Replace the paginator's collection with the mapped data so Inertia gets standard pagination shape
        $results->setCollection($mapped);
        $examResults = $results;

        // Get available exams for the filter dropdown (scoped to evaluator's department)
        $availableExams = DepartmentExam::whereHas('evaluator', function ($q) use ($department) {
            $q->where('Department', $department);
        })->get(['id', 'exam_title', 'exam_ref_no']);

        // Get statistics (scoped to evaluator's department)
        $totalResults = $results->total();
        $scopedStatsQuery = DepartmentExamResult::whereHas('departmentExam.evaluator', function ($q) use ($department) {
            $q->where('Department', $department);
        });
        $avgScore = $scopedStatsQuery->avg('score_percentage');
        $passedCount = (clone $scopedStatsQuery)->where('remarks', 'Pass')->count();

        $stats = [
            'total_results' => $totalResults,
            'average_score' => round($avgScore ?? 0, 2),
            'passed_count' => $passedCount,
            'pass_rate' => $totalResults > 0 ? round(($passedCount / $totalResults) * 100, 2) : 0
        ];

        return Inertia::render('Evaluator/ExamResults', [
            'user' => $user,
            'evaluator' => $evaluator,  
            'department' => $department,
            'examResults' => $examResults,
            'availableExams' => $availableExams,
            'stats' => $stats,
            'filters' => $request->only(['student_name', 'exam_id'])
        ]);
    }

    /**
     * Get detailed exam result with answers
     */
    public function showExamResult($id)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        if (!$evaluator) {
            return redirect()->route('login')->with('error', 'Evaluator access required');
        }

        $department = $evaluator->Department;

        // Get the specific result with relationships
        $result = DepartmentExamResult::with(['examinee', 'departmentExam.evaluator', 'answers.question'])
            ->whereHas('departmentExam.evaluator', function ($q) use ($department) {
                $q->where('Department', $department);
            })
            ->findOrFail($id);

        // Get all answers with question details
        $answers = DepartmentExamAnswer::with(['question'])
            ->where('examinee_id', $result->examinee_id)
            ->where('department_exam_id', $result->department_exam_id)
            ->get()
            ->map(function ($answer) {
                $question = $answer->question;
                $isCorrect = $question && $question->correct_answer === $answer->selected_answer;

                return [
                    'question_id' => $answer->question_id,
                    'question' => $question->question ?? 'N/A',
                    'student_answer' => $answer->selected_answer,
                    'correct_answer' => $question->correct_answer ?? 'N/A',
                    'is_correct' => $isCorrect,
                    'options' => [
                        'A' => $question->option1 ?? '',
                        'B' => $question->option2 ?? '',
                        'C' => $question->option3 ?? '',
                        'D' => $question->option4 ?? '',
                        'E' => $question->option5 ?? '',
                    ]
                ];
            });

        $resultData = [
            'id' => $result->id,
            'student_name' => $result->examinee->full_name ?? 'N/A',
            'exam_title' => $result->departmentExam->exam_title ?? 'N/A',
            'exam_ref_no' => $result->departmentExam->exam_ref_no ?? 'N/A',
            'score_percentage' => round($result->score_percentage, 2),
            'correct_answers' => $result->correct_answers,
            'wrong_answers' => $result->wrong_answers,
            'total_items' => $result->total_items,
            'remarks' => $result->remarks,
            'date_taken' => $result->created_at->format('M d, Y H:i'),
        ];

        if (request()->wantsJson() || request()->query('as') === 'json') {
            return response()->json([
                'result' => $resultData,
                'answers' => $answers
            ]);
        }

        return Inertia::render('Evaluator/ExamResultDetail', [
            'user' => $user,
            'evaluator' => $evaluator,
            'result' => $resultData,
            'answers' => $answers
        ]);
    }

    /**
     * Export a single exam result (department exam) as print-friendly HTML for PDF.
     */
    public function exportSinglePdf($id)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;
        if (!$evaluator) {
            return redirect()->route('login')->with('error', 'Evaluator access required');
        }

        $department = $evaluator->Department;

        $result = DepartmentExamResult::with(['examinee', 'departmentExam.evaluator', 'answers.question'])
            ->whereHas('departmentExam.evaluator', function ($q) use ($department) {
                $q->where('Department', $department);
            })
            ->findOrFail($id);

        $answers = DepartmentExamAnswer::with(['question'])
            ->where('examinee_id', $result->examinee_id)
            ->where('department_exam_id', $result->department_exam_id)
            ->get()
            ->map(function ($answer) {
                $question = $answer->question;
                $isCorrect = $question && $question->correct_answer === $answer->selected_answer;
                return [
                    'question_id' => $answer->question_id,
                    'question' => $question->question ?? 'N/A',
                    'student_answer' => $answer->selected_answer,
                    'correct_answer' => $question->correct_answer ?? 'N/A',
                    'is_correct' => $isCorrect,
                ];
            });

        $resultData = [
            'id' => $result->id,
            'student_name' => $result->examinee->full_name ?? 'N/A',
            'exam_title' => $result->departmentExam->exam_title ?? 'N/A',
            'exam_ref_no' => $result->departmentExam->exam_ref_no ?? 'N/A',
            'score_percentage' => round($result->score_percentage, 2),
            'correct_answers' => $result->correct_answers,
            'wrong_answers' => $result->wrong_answers,
            'total_items' => $result->total_items,
            'remarks' => $result->remarks,
            'date_taken' => $result->created_at->format('M d, Y H:i'),
        ];

        // Department logo
        $dept = strtoupper((string) $department);
        $logo = null;
        if (str_contains($dept, 'BSIT')) { $logo = 'BSIT.jpg'; }
        elseif (str_contains($dept, 'EDUC')) { $logo = 'EDUC.jpg'; }
        elseif (str_contains($dept, 'BSBA')) { $logo = 'BSBA.jpg'; }

        return response()->view('evaluator.exam_result_detail_pdf', [
            'evaluator' => $evaluator,
            'department' => $department,
            'result' => $resultData,
            'answers' => $answers,
            'generatedAt' => now()->format('M d, Y H:i'),
            'logo' => $logo,
        ]);
    }

    public function show($id)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        Log::info('DepartmentExamController@show - Viewing exam details', [
            'user_id' => $user->id,
            'exam_id' => $id,
            'department' => $evaluator->Department ?? null
        ]);

        $exam = DepartmentExam::with(['evaluator', 'questions', 'results.examinee'])
            ->where('id', $id)
            ->whereHas('evaluator', function ($query) use ($evaluator) {
                $query->where('Department', $evaluator->Department);
            })
            ->firstOrFail();

        Log::info('DepartmentExamController@show - Exam details retrieved', [
            'exam_id' => $exam->id,
            'questions_count' => $exam->questions->count(),
            'results_count' => $exam->results->count()
        ]);

        // If JSON requested (for modal preview), return structured data
        if (request()->wantsJson() || request()->query('as') === 'json') {
            $data = [
                'id' => $exam->id,
                'exam_ref_no' => $exam->exam_ref_no,
                'exam_title' => $exam->exam_title,
                'time_limit' => $exam->time_limit,
                'status' => $exam->status ?? 1,
                'questions' => $exam->questions->map(function ($q) {
                    return [
                        'questionId' => $q->questionId,
                        'question' => $q->question,
                        'correct_answer' => $q->correct_answer,
                        'option1' => $q->option1,
                        'option2' => $q->option2,
                        'option3' => $q->option3,
                        'option4' => $q->option4,
                        'option5' => $q->option5,
                        'image' => $q->image, // Main question image
                        'option1_image' => $q->option1_image,
                        'option2_image' => $q->option2_image,
                        'option3_image' => $q->option3_image,
                        'option4_image' => $q->option4_image,
                        'option5_image' => $q->option5_image,
                        'has_image' => !empty($q->image),
                        'has_option_images' => [
                            'option1' => !empty($q->option1_image),
                            'option2' => !empty($q->option2_image),
                            'option3' => !empty($q->option3_image),
                            'option4' => !empty($q->option4_image),
                            'option5' => !empty($q->option5_image)
                        ]
                    ];
                })->values(),
            ];
            return response()->json($data);
        }

        return Inertia::render('Evaluator/ExamDetail', [
            'user' => $user,
            'evaluator' => $evaluator,
            'exam' => $exam
        ]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'exam_title' => 'sometimes|string|max:255',
            'exam_ref_no' => 'sometimes|string|max:255|unique:department_exams,exam_ref_no,' . $id,
            'status' => 'sometimes|in:0,1',
            'time_limit' => 'sometimes|integer|min:1',
            'passing_score' => 'sometimes|integer|min:1|max:100'
        ]);

        $user = Auth::user();
        $evaluator = $user->evaluator;

        Log::info('DepartmentExamController@update - Updating exam', [
            'user_id' => $user->id,
            'exam_id' => $id,
            'department' => $evaluator->Department ?? null
        ]);

        $exam = DepartmentExam::where('id', $id)
            ->whereHas('evaluator', function ($query) use ($evaluator) {
                $query->where('Department', $evaluator->Department);
            })
            ->firstOrFail();

        $exam->update($request->only(['exam_title', 'exam_ref_no', 'status', 'time_limit', 'passing_score']));

        Log::info('DepartmentExamController@update - Exam updated successfully', [
            'exam_id' => $exam->id
        ]);

        return back()->with('success', 'Exam updated successfully');
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        Log::info('DepartmentExamController@destroy - Deleting exam', [
            'user_id' => $user->id,
            'exam_id' => $id,
            'department' => $evaluator->Department ?? null
        ]);

        $exam = DepartmentExam::where('id', $id)
            ->whereHas('evaluator', function ($query) use ($evaluator) {
                $query->where('Department', $evaluator->Department);
            })
            ->firstOrFail();

        $exam->delete();

        Log::info('DepartmentExamController@destroy - Exam deleted successfully', [
            'exam_id' => $id
        ]);

        return back()->with('success', 'Exam deleted successfully');
    }

    /**
     * Download department exam as PDF
     */
    public function downloadExamPdf($id)
    {
        try {
            $user = Auth::user();
            $evaluator = $user->evaluator;

            if (!$evaluator) {
                return redirect()->route('login')->with('error', 'Evaluator access required');
            }

            Log::info('DepartmentExamController@downloadExamPdf - Generating exam PDF', [
                'user_id' => $user->id,
                'exam_id' => $id,
                'department' => $evaluator->Department ?? null
            ]);

            $exam = DepartmentExam::with(['evaluator', 'questions'])
                ->where('id', $id)
                ->whereHas('evaluator', function ($query) use ($evaluator) {
                    $query->where('Department', $evaluator->Department);
                })
                ->firstOrFail();

        // Get exam questions with all image data
        $questions = $exam->questions->map(function ($q) {
            return [
                'questionId' => $q->questionId,
                'question' => $q->question,
                'correct_answer' => $q->correct_answer,
                'option1' => $q->option1,
                'option2' => $q->option2,
                'option3' => $q->option3,
                'option4' => $q->option4,
                'option5' => $q->option5,
                'image' => $q->image,
                'option1_image' => $q->option1_image,
                'option2_image' => $q->option2_image,
                'option3_image' => $q->option3_image,
                'option4_image' => $q->option4_image,
                'option5_image' => $q->option5_image,
                'has_image' => !empty($q->image),
                'has_option_images' => [
                    'option1' => !empty($q->option1_image),
                    'option2' => !empty($q->option2_image),
                    'option3' => !empty($q->option3_image),
                    'option4' => !empty($q->option4_image),
                    'option5' => !empty($q->option5_image)
                ]
            ];
        });

        $examData = [
            'id' => $exam->id,
            'exam_ref_no' => $exam->exam_ref_no,
            'exam_title' => $exam->exam_title,
            'time_limit' => $exam->time_limit,
            'passing_score' => $exam->passing_score,
            'status' => $exam->status ?? 1,
            'created_at' => $exam->created_at->format('M d, Y H:i'),
            'evaluator_name' => $exam->evaluator->name ?? 'Unknown',
            'department' => $exam->evaluator->Department ?? 'Unknown'
        ];

        // Department logo mapping
        $dept = strtoupper((string) $evaluator->Department);
        $logo = null;
        if (str_contains($dept, 'BSIT') || str_contains($dept, 'INFORMATION') || str_contains($dept, 'TECHNOLOGY')) { 
            $logo = asset('BSIT.jpg'); 
        }
        elseif (str_contains($dept, 'EDUC') || str_contains($dept, 'TEACHER')) { 
            $logo = asset('EDUC.jpg'); 
        }
        elseif (str_contains($dept, 'BSBA') || str_contains($dept, 'BUSINESS') || str_contains($dept, 'ADMINISTRATION')) { 
            $logo = asset('BSBA.jpg'); 
        }
        elseif (str_contains($dept, 'TESTER')) { 
            $logo = asset('TESTER.jpg'); 
        }
        
        // Main OCC logo
        $mainLogo = asset('OCC logo.png');

        Log::info('DepartmentExamController@downloadExamPdf - PDF data prepared', [
            'exam_title' => $examData['exam_title'],
            'questions_count' => count($questions),
            'logo' => $logo,
            'department' => $evaluator->Department,
            'first_question' => $questions->first() ? [
                'questionId' => $questions->first()['questionId'],
                'has_image' => $questions->first()['has_image'],
                'has_option_images' => $questions->first()['has_option_images']
            ] : null
        ]);

            return response()->view('evaluator.department_exam_pdf_simple', [
                'evaluator' => $evaluator,
                'department' => $evaluator->Department,
                'exam' => $examData,
                'questions' => $questions,
                'generatedAt' => now()->format('M d, Y H:i'),
                'logo' => $mainLogo,
                'deptLogo' => $logo,
            ])->header('Content-Type', 'text/html; charset=utf-8');
        } catch (\Exception $e) {
            Log::error('DepartmentExamController@downloadExamPdf - Error generating PDF', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'exam_id' => $id
            ]);
            
            return response()->json([
                'error' => 'Failed to generate PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export department exam results as a print-friendly HTML (save as PDF in browser)
     */
    public function exportPdf(Request $request)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;
        if (!$evaluator) {
            return redirect()->route('login')->with('error', 'Evaluator access required');
        }

        $department = $evaluator->Department;

        $query = DepartmentExamResult::with(['examinee', 'departmentExam'])
            ->whereHas('departmentExam.evaluator', function ($q) use ($department) {
                $q->where('Department', $department);
            })
            ->latest();

        if ($request->filled('student_name')) {
            $query->whereHas('examinee', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->student_name . '%');
            });
        }
        if ($request->filled('exam_id')) {
            $query->where('department_exam_id', $request->exam_id);
        }

        $results = $query->get()->map(function ($result) {
            return [
                'student_name' => $result->examinee->full_name ?? 'N/A',
                'exam_ref_no' => $result->departmentExam->exam_ref_no ?? 'N/A',
                'exam_title' => $result->departmentExam->exam_title ?? 'N/A',
                'score_percentage' => round($result->score_percentage, 2),
                'correct_answers' => $result->correct_answers,
                'total_items' => $result->total_items,
                'remarks' => $result->remarks,
                'date_taken' => optional($result->created_at)->format('M d, Y H:i'),
            ];
        });

        // Department logo mapping
        $dept = strtoupper((string) $department);
        $logo = null;
        if (str_contains($dept, 'BSIT')) { $logo = 'BSIT.jpg'; }
        elseif (str_contains($dept, 'EDUC')) { $logo = 'EDUC.jpg'; }
        elseif (str_contains($dept, 'BSBA')) { $logo = 'BSBA.jpg'; }

        return response()->view('evaluator.exam_results_pdf', [
            'evaluator' => $evaluator,
            'department' => $department,
            'results' => $results,
            'generatedAt' => now()->format('M d, Y H:i'),
            'logo' => $logo,
        ]);
    }
}
