<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\ExamProgress;
use App\Models\Examinee;

class ExamProgressController extends Controller
{
    // POST /api/mobile/exam-progress/upsert
    public function upsert(Request $request)
    {
        $user = $request->user();
        $examinee = Examinee::where('accountId', $user->id)->firstOrFail();

        $data = $request->validate([
            'exam_ref_no' => 'required|string|max:64',
            'question_id' => 'required|integer',
            'selected_answer' => 'nullable|string|max:255',
            'remaining_seconds' => 'required|integer|min:0',
        ]);

        $payload = [
            'examinee_id' => $examinee->id,
            'exam_ref_no' => $data['exam_ref_no'],
            'question_id' => $data['question_id'],
        ];

        $values = [
            'selected_answer' => $data['selected_answer'] ?? null,
            'remaining_seconds' => $data['remaining_seconds'],
            'updated_at' => now(),
        ];

        // Upsert
        DB::table('exam_progress')->updateOrInsert($payload, array_merge($values, [
            'created_at' => now(),
        ]));

        return response()->json(['success' => true]);
    }

    // GET /api/mobile/exam-progress?exam_ref_no=...
    public function fetch(Request $request)
    {
        $user = $request->user();
        $examinee = Examinee::where('accountId', $user->id)->firstOrFail();

        $request->validate([
            'exam_ref_no' => 'required|string|max:64',
        ]);

        $examRef = $request->query('exam_ref_no');

        $rows = ExamProgress::where('examinee_id', $examinee->id)
            ->where('exam_ref_no', $examRef)
            ->get(['question_id', 'selected_answer', 'remaining_seconds', 'updated_at']);

        if ($rows->isEmpty()) {
            return response()->json([
                'success' => true,
                'answers' => [],
                'remaining_seconds' => null,
            ]);
        }

        $latestRemaining = $rows->sortByDesc('updated_at')->first()->remaining_seconds ?? null;

        return response()->json([
            'success' => true,
            'answers' => $rows->map(fn($r) => [
                'question_id' => (int)$r->question_id,
                'selected_answer' => $r->selected_answer,
            ])->values(),
            'remaining_seconds' => $latestRemaining,
        ]);
    }

    // POST /api/mobile/exam-progress/clear
    public function clear(Request $request)
    {
        $user = $request->user();
        $examinee = Examinee::where('accountId', $user->id)->firstOrFail();

        $data = $request->validate([
            'exam_ref_no' => 'required|string|max:64',
        ]);

        ExamProgress::where('examinee_id', $examinee->id)
            ->where('exam_ref_no', $data['exam_ref_no'])
            ->delete();

        return response()->json(['success' => true]);
    }
}


