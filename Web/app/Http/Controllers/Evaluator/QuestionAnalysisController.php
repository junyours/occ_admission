<?php

namespace App\Http\Controllers\Evaluator;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class QuestionAnalysisController extends Controller
{
    public function getQuestionDifficultyAnalysis(Request $request)
    {
        try {
            $request->validate([
                'exam_id' => 'nullable|integer',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date',
                'time_threshold' => 'nullable|integer|min:1'
            ]);

            $examId = $request->exam_id;
            $dateFrom = $request->date_from;
            $dateTo = $request->date_to;
            $timeThreshold = $request->time_threshold ?? 60; // seconds
            // Use Auth facade to avoid helper resolution issues in some contexts
            // Scope to evaluator's department (string), not numeric id
            $departmentName = optional(Auth::user()->evaluator)->Department;

            // Base query for departmental answers with timing
            $query = DB::table('department_exam_answers as dea')
                ->join('department_exam_bank as qb', 'dea.question_id', '=', 'qb.questionId')
                ->join('department_exams as de', 'dea.department_exam_id', '=', 'de.id')
                ->join('evaluator as ev', 'de.evaluator_id', '=', 'ev.id')
                ->whereNotNull('dea.time_spent_seconds')
                ->where('dea.time_spent_seconds', '>', 0);

            if ($examId) {
                $query->where('dea.department_exam_id', $examId);
            }
            if (!empty($departmentName)) {
                $query->where('ev.Department', $departmentName);
            }
            if ($dateFrom) {
                $query->whereDate('dea.created_at', '>=', $dateFrom);
            }
            if ($dateTo) {
                $query->whereDate('dea.created_at', '<=', $dateTo);
            }

            // Question-level stats
            $questionStats = $query
                ->select([
                    'dea.question_id as questionId',
                    'qb.question',
                    'qb.category',
                    'de.exam_title',
                    DB::raw('COUNT(*) as total_attempts'),
                    DB::raw('AVG(dea.time_spent_seconds) as avg_time_seconds'),
                    DB::raw('MIN(dea.time_spent_seconds) as min_time_seconds'),
                    DB::raw('MAX(dea.time_spent_seconds) as max_time_seconds'),
                    DB::raw('COUNT(CASE WHEN dea.time_spent_seconds > ' . (int)$timeThreshold . ' THEN 1 END) as slow_attempts'),
                    DB::raw('ROUND((COUNT(CASE WHEN dea.time_spent_seconds > ' . (int)$timeThreshold . ' THEN 1 END) / COUNT(*)) * 100, 1) as slow_percentage')
                ])
                ->groupBy('dea.question_id', 'qb.question', 'qb.category', 'de.exam_title')
                ->orderBy('avg_time_seconds', 'desc')
                ->get();

            // Overall stats (fresh query without group by)
            $overallStats = DB::table('department_exam_answers as dea')
                ->join('department_exam_bank as qb', 'dea.question_id', '=', 'qb.questionId')
                ->join('department_exams as de', 'dea.department_exam_id', '=', 'de.id')
                ->join('evaluator as ev', 'de.evaluator_id', '=', 'ev.id')
                ->whereNotNull('dea.time_spent_seconds')
                ->where('dea.time_spent_seconds', '>', 0)
                ->when($examId, function ($q) use ($examId) {
                    return $q->where('dea.department_exam_id', $examId);
                })
                ->when(!empty($departmentName), function ($q) use ($departmentName) {
                    return $q->where('ev.Department', $departmentName);
                })
                ->when($dateFrom, function ($q) use ($dateFrom) {
                    return $q->whereDate('dea.created_at', '>=', $dateFrom);
                })
                ->when($dateTo, function ($q) use ($dateTo) {
                    return $q->whereDate('dea.created_at', '<=', $dateTo);
                })
                ->select([
                    DB::raw('COUNT(*) as total_answers'),
                    DB::raw('COUNT(DISTINCT dea.question_id) as total_questions'),
                    DB::raw('COUNT(DISTINCT dea.examinee_id) as total_examinees'),
                    DB::raw('AVG(dea.time_spent_seconds) as overall_avg_time'),
                    DB::raw('COUNT(CASE WHEN dea.time_spent_seconds > ' . (int)$timeThreshold . ' THEN 1 END) as total_slow_answers'),
                    DB::raw('ROUND((COUNT(CASE WHEN dea.time_spent_seconds > ' . (int)$timeThreshold . ' THEN 1 END) / COUNT(*)) * 100, 1) as overall_slow_percentage')
                ])
                ->first();

            // Examinee trends (per examinee)
            $dailyTrends = DB::table('department_exam_answers as dea')
                ->join('examinee as e', 'dea.examinee_id', '=', 'e.id')
                ->join('department_exams as de', 'dea.department_exam_id', '=', 'de.id')
                ->join('evaluator as ev', 'de.evaluator_id', '=', 'ev.id')
                ->whereNotNull('dea.time_spent_seconds')
                ->where('dea.time_spent_seconds', '>', 0)
                ->when($examId, function ($q) use ($examId) {
                    return $q->where('dea.department_exam_id', $examId);
                })
                ->when(!empty($departmentName), function ($q) use ($departmentName) {
                    return $q->where('ev.Department', $departmentName);
                })
                ->when($dateFrom, function ($q) use ($dateFrom) {
                    return $q->whereDate('dea.created_at', '>=', $dateFrom);
                })
                ->when($dateTo, function ($q) use ($dateTo) {
                    return $q->whereDate('dea.created_at', '<=', $dateTo);
                })
                ->select([
                    'dea.examinee_id as examineeId',
                    DB::raw("CONCAT(e.fname, ' ', COALESCE(e.mname, ''), ' ', e.lname) as examinee_name"),
                    DB::raw('COUNT(*) as total_answers'),
                    DB::raw('AVG(dea.time_spent_seconds) as avg_time'),
                    DB::raw('COUNT(CASE WHEN dea.time_spent_seconds > ' . (int)$timeThreshold . ' THEN 1 END) as slow_answers')
                ])
                ->groupBy('dea.examinee_id', 'e.fname', 'e.mname', 'e.lname')
                ->orderBy('dea.examinee_id')
                ->get();

            // Available exams for dropdown
            $availableExams = DB::table('department_exams as de')
                ->join('evaluator as ev', 'de.evaluator_id', '=', 'ev.id')
                ->when(!empty($departmentName), function ($q) use ($departmentName) {
                    return $q->where('ev.Department', $departmentName);
                })
                ->select(['de.id as examId', 'de.exam_title'])
                ->orderBy('exam_title')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'question_stats' => $questionStats,
                    'overall_stats' => $overallStats,
                    'daily_trends' => $dailyTrends,
                    'available_exams' => $availableExams,
                    'filters' => [
                        'exam_id' => $examId,
                        'date_from' => $dateFrom,
                        'date_to' => $dateTo,
                        'time_threshold' => $timeThreshold,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Evaluator Question Analysis error', [
                'message' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving question difficulty analysis: ' . $e->getMessage(),
            ], 500);
        }
    }
}


