<?php

namespace App\Http\Controllers\Evaluator;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Http\Controllers\Controller;
use App\Models\ExamResult;
use App\Models\DepartmentExamResult;

class ExamResultsController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;
        
        // Debug logging
        Log::info('ExamResultsController::index called', [
            'user_id' => $user->id,
            'evaluator_department' => $evaluator->Department ?? 'null'
        ]);
        
        // Get department exam results for the evaluator's department
        $query = DepartmentExamResult::with(['examinee', 'departmentExam'])
            ->whereHas('departmentExam', function ($q) use ($evaluator) {
                $q->whereHas('evaluator', function ($subQ) use ($evaluator) {
                    $subQ->where('Department', $evaluator->Department);
                });
            });

        // Filter by date range
        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        // Filter by student name
        if ($request->filled('student_name')) {
            $query->whereHas('examinee', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->student_name . '%');
            });
        }

        // Filter by score range
        if ($request->filled('min_score')) {
            $query->where('score', '>=', $request->min_score);
        }
        
        if ($request->filled('max_score')) {
            $query->where('score', '<=', $request->max_score);
        }

        $results = $query->orderBy('created_at', 'desc')
            ->paginate(15)
            ->through(function ($result) {
                return [
                    'resultId' => $result->id,
                    'examinee_name' => $result->examinee->full_name ?? 'N/A',
                    'examinee_email' => $result->examinee->email ?? 'N/A',
                    'exam_title' => $result->departmentExam->exam_title ?? 'N/A',
                    'score' => $result->correct_answers,
                    'total_questions' => $result->total_items,
                    'percentage' => $result->score_percentage,
                    'passed' => $result->remarks === 'Pass' ? 'Yes' : 'No',
                    'created_at' => $result->created_at->format('M d, Y H:i'),
                    'duration_taken' => 'N/A'
                ];
            });

        // Get recent department exam results for quick view
        $recentResults = DepartmentExamResult::with(['examinee', 'departmentExam'])
            ->whereHas('departmentExam', function ($q) use ($evaluator) {
                $q->whereHas('evaluator', function ($subQ) use ($evaluator) {
                    $subQ->where('Department', $evaluator->Department);
                });
            })
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($result) {
                return [
                    'id' => $result->id,
                    'examinee_name' => $result->examinee->full_name ?? 'N/A',
                    'exam_title' => $result->departmentExam->exam_title ?? 'N/A',
                    'score' => $result->correct_answers,
                    'total_questions' => $result->total_items,
                    'percentage' => $result->score_percentage,
                    'passed' => $result->remarks === 'Pass' ? 'Yes' : 'No',
                    'created_at' => $result->created_at->format('M d, Y H:i')
                ];
            });

        // Get statistics
        $stats = [
            'total_students' => $query->count(),
            'passed_students' => $query->where('remarks', 'Pass')->count(),
            'failed_students' => $query->where('remarks', 'Fail')->count(),
            'average_score' => round($query->avg('correct_answers'), 2),
            'average_percentage' => round($query->avg('score_percentage'), 2)
        ];

        return Inertia::render('Evaluator/ExamResults', [
            'user' => $user,
            'evaluator' => $evaluator,
            'results' => $results,
            'departmentResults' => $recentResults,
            'stats' => $stats,
            'filters' => $request->only(['start_date', 'end_date', 'student_name', 'min_score', 'max_score'])
        ]);
    }

    public function show($id)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        $result = DepartmentExamResult::with(['examinee', 'departmentExam', 'answers.question'])
            ->where('id', $id)
            ->whereHas('departmentExam', function ($q) use ($evaluator) {
                $q->whereHas('evaluator', function ($subQ) use ($evaluator) {
                    $subQ->where('Department', $evaluator->Department);
                });
            })
            ->firstOrFail();

        $answers = $result->answers->map(function ($answer) {
            return [
                'question' => $answer->question->question ?? 'N/A',
                'student_answer' => $answer->selected_answer,
                'correct_answer' => $answer->question->correct_answer ?? 'N/A',
                'is_correct' => $answer->selected_answer === $answer->question->correct_answer ? 'Yes' : 'No'
            ];
        });

        return Inertia::render('Evaluator/ExamResultDetail', [
            'user' => $user,
            'evaluator' => $evaluator,
            'result' => [
                'resultId' => $result->id,
                'examinee_name' => $result->examinee->full_name ?? 'N/A',
                'examinee_email' => $result->examinee->email ?? 'N/A',
                'exam_title' => $result->departmentExam->exam_title ?? 'N/A',
                'score' => $result->correct_answers,
                'total_questions' => $result->total_items,
                'percentage' => $result->score_percentage,
                'passed' => $result->remarks === 'Pass' ? 'Yes' : 'No',
                'created_at' => $result->created_at->format('M d, Y H:i'),
                'duration_taken' => 'N/A'
            ],
            'answers' => $answers
        ]);
    }

    public function export(Request $request)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;
        
        $query = DepartmentExamResult::with(['examinee', 'departmentExam'])
            ->whereHas('departmentExam', function ($q) use ($evaluator) {
                $q->whereHas('evaluator', function ($subQ) use ($evaluator) {
                    $subQ->where('Department', $evaluator->Department);
                });
            });

        // Apply filters
        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        $results = $query->orderBy('created_at', 'desc')->get();

        $filename = $evaluator->Department . '_exam_results_' . date('Y-m-d') . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function() use ($results) {
            $file = fopen('php://output', 'w');
            
            // Add headers
            fputcsv($file, [
                'Student Name', 'Email', 'Exam Title', 'Score', 
                'Total Questions', 'Percentage', 'Passed', 'Date Taken'
            ]);

            // Add data
            foreach ($results as $result) {
                fputcsv($file, [
                    $result->examinee->full_name ?? 'N/A',
                    $result->examinee->email ?? 'N/A',
                    $result->departmentExam->exam_title ?? 'N/A',
                    $result->correct_answers,
                    $result->total_items,
                    $result->score_percentage,
                    $result->remarks === 'Pass' ? 'Yes' : 'No',
                    $result->created_at->format('M d, Y H:i')
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
