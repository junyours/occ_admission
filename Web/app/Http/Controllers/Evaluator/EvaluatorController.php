<?php

namespace App\Http\Controllers\Evaluator;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Http\Controllers\Controller;

class EvaluatorController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        if (!$evaluator) {
            return redirect()->route('login')->with('error', 'Evaluator access required');
        }

        $department = strtoupper((string) $evaluator->Department);

        // Map department to course_code filter for academic recommendations
        // Count students who passed entrance exam and were recommended to courses in this department
        $totalStudents = DB::table('examinee_recommendations as er')
            ->join('courses as c', 'er.recommended_course_id', '=', 'c.id')
            ->join('exam_results as xr', 'er.exam_result_id', '=', 'xr.resultId')
            ->join('examinee as e', 'er.examinee_id', '=', 'e.id')
            ->where(function ($q) use ($department) {
                if (str_contains($department, 'BSIT')) {
                    $q->where('c.course_code', 'like', 'BSIT%');
                } elseif (str_contains($department, 'BSBA')) {
                    $q->where('c.course_code', 'like', 'BSBA%');
                } elseif (str_contains($department, 'EDUC')) {
                    $q->whereIn('c.course_code', ['BSed', 'BEed']);
                } else {
                    // For other departments, check if course_code contains department name
                    $q->where('c.course_code', 'like', '%' . $department . '%');
                }
            })
            ->distinct('er.examinee_id')
            ->count('er.examinee_id');

        // Department-scoped counts
        $activeExams = DB::table('department_exams as de')
            ->join('evaluator as ev', 'de.evaluator_id', '=', 'ev.id')
            ->where('ev.Department', $department)
            ->where('de.status', 1)
            ->count();

        $completed = DB::table('department_exam_results as der')
            ->join('department_exams as de', 'der.department_exam_id', '=', 'de.id')
            ->join('evaluator as ev', 'de.evaluator_id', '=', 'ev.id')
            ->where('ev.Department', $department)
            ->count();

        // Placeholder for pending reviews if needed later
        $pendingReviews = 0;

        $stats = [
            'activeExams' => $activeExams,
            'totalStudents' => $totalStudents,
            'pendingResults' => $pendingReviews,
            'completedResults' => $completed,
        ];

        // Debug logging
        Log::info('[Dashboard] Stats calculated', [
            'department' => $department,
            'activeExams' => $activeExams,
            'totalStudents' => $totalStudents,
            'completed' => $completed,
        ]);

        // Build recent activities (mixed: exams created, results submitted)
        $examActivities = DB::table('department_exams as de')
            ->join('evaluator as ev', 'de.evaluator_id', '=', 'ev.id')
            ->where('ev.Department', $department)
            ->orderByDesc('de.created_at')
            ->limit(8)
            ->get([
                DB::raw("'exam_created' as kind"),
                DB::raw("CONCAT('Exam created: ', de.exam_title, ' (', de.exam_ref_no, ')') as label"),
                'de.created_at as time',
            ]);

        $resultActivities = DB::table('department_exam_results as der')
            ->join('department_exams as de', 'der.department_exam_id', '=', 'de.id')
            ->join('evaluator as ev', 'de.evaluator_id', '=', 'ev.id')
            ->where('ev.Department', $department)
            ->orderByDesc('der.created_at')
            ->limit(8)
            ->get([
                DB::raw("'exam_result' as kind"),
                DB::raw("CONCAT('Result submitted for: ', de.exam_title) as label"),
                'der.created_at as time',
            ]);

        $activities = collect($examActivities)
            ->merge($resultActivities)
            ->sortByDesc('time')
            ->take(10)
            ->values()
            ->map(function ($a) {
                return [
                    'kind' => $a->kind,
                    'label' => $a->label,
                    'time' => $a->time,
                ];
            })->all();

        // Get recent department exam results for charts
        $recentResults = DB::table('department_exam_results as der')
            ->join('department_exams as de', 'der.department_exam_id', '=', 'de.id')
            ->join('evaluator as ev', 'de.evaluator_id', '=', 'ev.id')
            ->join('examinee as e', 'der.examinee_id', '=', 'e.id')
            ->where('ev.Department', $department)
            ->orderByDesc('der.created_at')
            ->limit(100)
            ->get([
                'der.score_percentage',
                'der.remarks',
                'e.fname',
                'e.mname', 
                'e.lname',
                'de.exam_title',
                'de.passing_score',
                'der.created_at'
            ])
            ->map(function ($result) {
                // Construct full name from separate fields
                $fullName = $result->fname;
                if (!empty($result->mname)) {
                    $fullName .= ' ' . $result->mname;
                }
                $fullName .= ' ' . $result->lname;
                
                return [
                    'score' => (int) $result->score_percentage,
                    'score_percentage' => (int) $result->score_percentage,
                    'exam_passing_score' => (int) ($result->passing_score ?? 75),
                    'remarks' => $result->remarks,
                    'student_name' => $fullName,
                    'exam_title' => $result->exam_title,
                    'created_at' => $result->created_at,
                ];
            });

        // Get department exams for charts
        $departmentExams = DB::table('department_exams as de')
            ->join('evaluator as ev', 'de.evaluator_id', '=', 'ev.id')
            ->where('ev.Department', $department)
            ->get(['de.status', 'de.exam_title', 'de.created_at'])
            ->map(function ($exam) {
                return [
                    'status' => $exam->status,
                    'exam_title' => $exam->exam_title,
                    'created_at' => $exam->created_at,
                ];
            });

        return Inertia::render('Evaluator/Dashboard', [
            'user' => $user,
            'evaluator' => $evaluator,
            'routes' => [
                'evaluator.department-exams' => route('evaluator.department-exams'),
                'evaluator.question-bank' => route('evaluator.question-bank'),
                'evaluator.exam-results' => route('evaluator.exam-results'),
                'evaluator.student-results' => route('evaluator.student-results'),
                'evaluator.profile' => route('evaluator.profile'),
            ],
            'stats' => $stats,
            'activities' => $activities,
            'recentResults' => $recentResults,
            'departmentExams' => $departmentExams,
        ]);
    }

    public function profile()
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        return Inertia::render('Evaluator/Profile', [
            'user' => $user,
            'evaluator' => $evaluator,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'department' => 'nullable|string|max:50'
        ]);

        $user = Auth::user();
        $evaluator = $user->evaluator;

        if ($evaluator) {
            $evaluator->update([
                'name' => $request->name,
                'Department' => $request->department ?: $evaluator->Department,
            ]);
        }

        return back()->with('success', 'Profile updated successfully');
    }

    public function exams()
    {
        $user = Auth::user();
        
        return Inertia::render('Evaluator/Exams', [
            'user' => $user,
        ]);
    }

    public function results()
    {
        $user = Auth::user();
        
        return Inertia::render('Evaluator/Results', [
            'user' => $user,
        ]);
    }

    public function students()
    {
        $user = Auth::user();
        
        return Inertia::render('Evaluator/Students', [
            'user' => $user,
        ]);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!Hash::check($request->current_password, $user->password)) {
            return back()->withErrors(['current_password' => 'Current password is incorrect']);
        }

        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        return back()->with('success', 'Password updated successfully');
    }
}