<?php

namespace App\Http\Controllers\Evaluator;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Http\Controllers\Controller;
use App\Models\ExamineeRecommendation;
use App\Models\ExamResult;
use App\Models\PersonalityTestResult;

class StudentResultsController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;
        
        if (!$evaluator) {
            return redirect()->route('login')->with('error', 'Evaluator access required');
        }

        $department = $evaluator->Department;
        Log::info('Filtering by department', ['department' => $department]);

        // Follow guidance controller pattern: Start with ExamResult, then attach recommendations
        $query = ExamResult::with(['examinee', 'exam'])->where('is_archived', 0)->latest();

        // Filter by student name
        if ($request->filled('student_name')) {
            $query->whereHas('examinee', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->student_name . '%');
            });
        }

        // Only get results that have recommendations for this evaluator's department
        $query->whereExists(function ($subQuery) use ($department) {
            $subQuery->select(DB::raw(1))
                ->from('examinee_recommendations as er')
                ->join('courses as c', 'er.recommended_course_id', '=', 'c.id')
                ->whereColumn('er.exam_result_id', 'exam_results.resultId')
                ->where(function ($q) use ($department) {
                    if (str_contains($department, 'BSIT')) {
                        $q->where('c.course_code', 'like', 'BSIT%');
                    } elseif (str_contains($department, 'BSBA')) {
                        $q->where('c.course_code', 'like', 'BSBA%');
                    } elseif (str_contains($department, 'EDUC')) {
                        $q->whereIn('c.course_code', ['BSed', 'BEed']);
                    } else {
                        $q->where('c.course_code', 'like', '%' . $department . '%');
                    }
                });
        });

        // Filter by course (within the department)
        if ($request->filled('course')) {
            $query->whereExists(function ($subQuery) use ($department, $request) {
                $subQuery->select(DB::raw(1))
                    ->from('examinee_recommendations as er')
                    ->join('courses as c', 'er.recommended_course_id', '=', 'c.id')
                    ->whereColumn('er.exam_result_id', 'exam_results.resultId')
                    ->where(function ($q) use ($department) {
                        if (str_contains($department, 'BSIT')) {
                            $q->where('c.course_code', 'like', 'BSIT%');
                        } elseif (str_contains($department, 'BSBA')) {
                            $q->where('c.course_code', 'like', 'BSBA%');
                        } elseif (str_contains($department, 'EDUC')) {
                            $q->whereIn('c.course_code', ['BSed', 'BEed']);
                        } else {
                            $q->where('c.course_code', 'like', '%' . $department . '%');
                        }
                    })
                    ->where('c.course_name', 'like', '%' . $request->course . '%');
            });
        }

        $results = $query->paginate(15);

        // Attach recommended courses for each exam result (filtered by department)
        $resultIds = $results->getCollection()->pluck('resultId')->all();
        $departmentRecommendations = collect();
        
        if (!empty($resultIds)) {
            $departmentRecommendations = DB::table('examinee_recommendations as er')
                ->join('courses as c', 'er.recommended_course_id', '=', 'c.id')
                ->select('er.exam_result_id', 'c.id as course_id', 'c.course_name', 'c.course_code')
                ->whereIn('er.exam_result_id', $resultIds)
                ->where(function ($q) use ($department) {
                    if (str_contains($department, 'BSIT')) {
                        $q->where('c.course_code', 'like', 'BSIT%');
                    } elseif (str_contains($department, 'BSBA')) {
                        $q->where('c.course_code', 'like', 'BSBA%');
                    } elseif (str_contains($department, 'EDUC')) {
                        $q->whereIn('c.course_code', ['BSed', 'BEed']);
                    } else {
                        $q->where('c.course_code', 'like', '%' . $department . '%');
                    }
                })
                ->get()
                ->groupBy('exam_result_id');
        }

        $recommendations = $results->through(function ($result) use ($departmentRecommendations) {
            $exam = $result->exam ?? null;
            $timeSeconds = $result->time_taken_seconds ?? $result->time_taken ?? null;
            $timeFormatted = $timeSeconds !== null ? (int) floor($timeSeconds / 60) . ':' . str_pad((string) ($timeSeconds % 60), 2, '0', STR_PAD_LEFT) : 'N/A';

            // Get department-specific recommendations for this result
            $deptRecs = $departmentRecommendations->get($result->resultId, collect());
            $recommendedCourse = $deptRecs->isNotEmpty() ? $deptRecs->pluck('course_name')->join(', ') : 'N/A';

            return [
                'id' => $result->resultId,
                'name' => $result->examinee->full_name ?? 'N/A',
                'exam_ref_no' => $exam?->{'exam-ref-no'} ?? 'N/A',
                'recommended_course' => $recommendedCourse,
                'score' => $result->percentage ?? 0,
                'correct' => $result->correct ?? 0,
                'semester' => $result->semester ?? null,
                'time' => $timeFormatted,
                'date' => optional($result->created_at)->format('M d, Y') ?? 'N/A',
            ];
        });

        // Get statistics for the department only
        $totalCount = $results->total();
        $avgScore = 0;
        if (!empty($resultIds)) {
            $avgScore = round(DB::table('exam_results')
                ->whereIn('resultId', $resultIds)
                ->avg('correct') ?? 0, 2);
        }

        $stats = [
            'total_recommendations' => $totalCount,
            'department_recommendations' => $totalCount,
            'average_academic_score' => $avgScore
        ];

        // Get personality distribution for department recommendations
        $personalityDistribution = collect();
        if (!empty($resultIds)) {
            // First get the personality distribution data
            $personalityData = DB::table('examinee_recommendations as er')
                ->join('personality_test_results as ptr', 'er.personality_result_id', '=', 'ptr.id')
                ->join('courses as c', 'er.recommended_course_id', '=', 'c.id')
                ->whereIn('er.exam_result_id', $resultIds)
                ->where(function ($q) use ($department) {
                    if (str_contains($department, 'BSIT')) {
                        $q->where('c.course_code', 'like', 'BSIT%');
                    } elseif (str_contains($department, 'BSBA')) {
                        $q->where('c.course_code', 'like', 'BSBA%');
                    } elseif (str_contains($department, 'EDUC')) {
                        $q->whereIn('c.course_code', ['BSed', 'BEed']);
                    } else {
                        $q->where('c.course_code', 'like', '%' . $department . '%');
                    }
                })
                ->selectRaw('CONCAT(ptr.EI, ptr.SN, ptr.TF, ptr.JP) as type, COUNT(*) as count')
                ->groupBy('ptr.EI', 'ptr.SN', 'ptr.TF', 'ptr.JP')
                ->orderBy('count', 'desc')
                ->get();
            
            // Calculate the total count from the personality data itself
            $personalityTotalCount = $personalityData->sum('count');
            
            $personalityDistribution = $personalityData->map(function ($item) use ($personalityTotalCount) {
                return [
                    'type' => $item->type,
                    'count' => $item->count,
                    'percentage' => $personalityTotalCount > 0 ? round(($item->count / $personalityTotalCount) * 100, 1) : 0
                ];
            });
        }

        return Inertia::render('Evaluator/StudentResults', [
            'user' => $user,
            'evaluator' => $evaluator,
            'recommendations' => $recommendations,
            'stats' => $stats,
            'personalityDistribution' => $personalityDistribution,
            'filters' => $request->only(['student_name', 'course', 'personality_type'])
        ]);
    }

    public function show($id)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        $recommendation = ExamineeRecommendation::with([
            'examinee', 
            'examResult.exam', 
            'examResult.answers.question',
            'personalityResult.personalityType',
            'personalityResult.answers.question',
            'recommendedCourse'
        ])
        ->where('id', $id)
        ->whereHas('examResult.exam', function ($q) use ($evaluator) {
            $q->where('department', $evaluator->Department);
        })
        ->firstOrFail();

        // Academic exam answers
        $academicAnswers = $recommendation->examResult->answers->map(function ($answer) {
            return [
                'question' => $answer->question->question ?? 'N/A',
                'student_answer' => $answer->answer,
                'correct_answer' => $answer->question->correct_answer ?? 'N/A',
                'is_correct' => $answer->is_correct ? 'Yes' : 'No'
            ];
        });

        // Personality test answers
        $personalityAnswers = $recommendation->personalityResult->answers->map(function ($answer) {
            return [
                'question' => $answer->question->question ?? 'N/A',
                'student_answer' => $answer->selected_answer ?? 'N/A',
                'answer_value' => $answer->chosen_side ?? 'N/A'
            ];
        });

        return Inertia::render('Evaluator/StudentResultDetail', [
            'user' => $user,
            'evaluator' => $evaluator,
            'recommendation' => [
                'id' => $recommendation->id,
                'examinee_name' => $recommendation->examinee->full_name ?? 'N/A',
                'examinee_email' => $recommendation->examinee->email ?? 'N/A',
                'academic_score' => $recommendation->examResult->correct ?? 'N/A',
                'academic_percentage' => $recommendation->examResult->percentage ?? 'N/A',
                'academic_passed' => $recommendation->examResult->isPassed() ? 'Yes' : 'No',
                'personality_type' => $recommendation->personalityResult->personalityType->type ?? 'N/A',
                'personality_description' => $recommendation->personalityResult->personalityType->description ?? 'N/A',
                'recommended_course' => $recommendation->recommendedCourse->course_name ?? 'N/A',
                'course_description' => $recommendation->recommendedCourse->description ?? 'N/A',
                'created_at' => $recommendation->created_at->format('M d, Y H:i')
            ],
            'academicAnswers' => $academicAnswers,
            'personalityAnswers' => $personalityAnswers
        ]);
    }

    public function verifyStudent($id)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        $recommendation = ExamineeRecommendation::with([
            'examinee', 
            'examResult', 
            'personalityResult',
            'recommendedCourse'
        ])
        ->where('id', $id)
        ->whereHas('examResult.exam', function ($q) use ($evaluator) {
            $q->where('department', $evaluator->Department);
        })
        ->firstOrFail();

        // Check if student meets requirements
        $academicPassed = $recommendation->examResult->isPassed();
        $personalitySuitable = $this->checkPersonalitySuitability(
            $recommendation->personalityResult->personalityType->type ?? '',
            $recommendation->recommendedCourse->course_name ?? ''
        );

        $verification = [
            'student_name' => $recommendation->examinee->full_name ?? 'N/A',
            'recommended_course' => $recommendation->recommendedCourse->course_name ?? 'N/A',
            'academic_passed' => $academicPassed,
            'personality_suitable' => $personalitySuitable,
            'overall_eligible' => $academicPassed && $personalitySuitable,
            'verification_date' => now()->format('M d, Y H:i'),
            'verified_by' => $evaluator->name
        ];

        return response()->json($verification);
    }

    private function checkPersonalitySuitability($personalityType, $courseName)
    {
        // Define personality-course compatibility rules
        $compatibility = [
            'INTJ' => ['BSIT', 'Computer Science', 'Engineering'],
            'INTP' => ['BSIT', 'Computer Science', 'Mathematics'],
            'ENTJ' => ['BSBA', 'Business Administration', 'Management'],
            'ENTP' => ['BSBA', 'Entrepreneurship', 'Marketing'],
            'INFJ' => ['EDUC', 'Psychology', 'Counseling'],
            'INFP' => ['EDUC', 'Arts', 'Literature'],
            'ENFJ' => ['EDUC', 'Teaching', 'Leadership'],
            'ENFP' => ['EDUC', 'Communication', 'Creative Arts'],
            'ISTJ' => ['BSBA', 'Accounting', 'Finance'],
            'ISFJ' => ['EDUC', 'Nursing', 'Healthcare'],
            'ESTJ' => ['BSBA', 'Management', 'Administration'],
            'ESFJ' => ['EDUC', 'Teaching', 'Social Work'],
            'ISTP' => ['BSIT', 'Technical', 'Engineering'],
            'ISFP' => ['EDUC', 'Arts', 'Design'],
            'ESTP' => ['BSBA', 'Business', 'Sales'],
            'ESFP' => ['EDUC', 'Performing Arts', 'Tourism']
        ];

        $suitableCourses = $compatibility[$personalityType] ?? [];
        
        foreach ($suitableCourses as $course) {
            if (stripos($courseName, $course) !== false) {
                return true;
            }
        }

        return false;
    }

    public function export(Request $request)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;
        
        $query = ExamineeRecommendation::with([
            'examinee', 
            'examResult.exam', 
            'personalityResult.personalityType',
            'recommendedCourse'
        ])
        ->whereHas('examResult.exam', function ($q) use ($evaluator) {
            $q->where('department', $evaluator->Department);
        });

        // Apply filters
        if ($request->filled('student_name')) {
            $query->whereHas('examinee', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->student_name . '%');
            });
        }

        $recommendations = $query->orderBy('created_at', 'desc')->get();

        $filename = $evaluator->Department . '_student_recommendations_' . date('Y-m-d') . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function() use ($recommendations) {
            $file = fopen('php://output', 'w');
            
            // Add headers
            fputcsv($file, [
                'Student Name', 'Email', 'Academic Score', 'Academic Percentage', 
                'Academic Passed', 'Personality Type', 'Recommended Course', 'Date'
            ]);

            // Add data
            foreach ($recommendations as $recommendation) {
                fputcsv($file, [
                    $recommendation->examinee->full_name ?? 'N/A',
                    $recommendation->examinee->email ?? 'N/A',
                    $recommendation->examResult->correct ?? 'N/A',
                    $recommendation->examResult->percentage ?? 'N/A',
                    $recommendation->examResult->isPassed() ? 'Yes' : 'No',
                    $recommendation->personalityResult->personalityType->type ?? 'N/A',
                    $recommendation->recommendedCourse->course_name ?? 'N/A',
                    $recommendation->created_at->format('M d, Y H:i')
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
