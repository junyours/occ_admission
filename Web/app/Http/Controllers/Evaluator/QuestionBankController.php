<?php

namespace App\Http\Controllers\Evaluator;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Http\Controllers\Controller;
use App\Models\DepartmentExamBank;

class QuestionBankController extends Controller
{
    public function builder(Request $request)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        $categories = DepartmentExamBank::where('department', $evaluator->Department)
            ->where('status', 1)
            ->distinct()
            ->pluck('category');

        return Inertia::render('Evaluator/QuestionBuilder', [
            'user' => $user,
            'evaluator' => $evaluator,
            'categories' => $categories,
            'routes' => [
                'question_bank_store' => route('evaluator.question-bank.store'),
                'question_bank_bulk_store' => route('evaluator.question-bank.bulk-store'),
                'question_bank' => route('evaluator.question-bank'),
            ],
        ]);
    }
    public function index(Request $request)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;
        
        $query = DepartmentExamBank::where('department', $evaluator->Department)
            ->where('status', 1);

        // Filter by category if provided
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // Search functionality (search across question, options, category, direction, correct_answer)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('question', 'like', "%{$search}%")
                  ->orWhere('option1', 'like', "%{$search}%")
                  ->orWhere('option2', 'like', "%{$search}%")
                  ->orWhere('option3', 'like', "%{$search}%")
                  ->orWhere('option4', 'like', "%{$search}%")
                  ->orWhere('option5', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%")
                  ->orWhere('direction', 'like', "%{$search}%")
                  ->orWhere('correct_answer', 'like', "%{$search}%");
            });
        }

        $questions = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 20))
            ->through(function ($question) {
                return [
                    'questionId' => $question->questionId,
                    'question' => $question->question,
                    'question_formatted' => $question->question_formatted,
                    'category' => $question->category,
                    'direction' => $question->direction,
                    'image' => $question->image,
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
                    'correct_answer' => $question->correct_answer,
                    'created_at' => $question->created_at->format('M d, Y H:i')
                ];
            });

        // Get unique categories for filter
        $categories = DepartmentExamBank::where('department', $evaluator->Department)
            ->where('status', 1)
            ->distinct()
            ->pluck('category');

        return Inertia::render('Evaluator/QuestionBank', [
            'user' => $user,
            'evaluator' => $evaluator,
            'questions' => $questions,
            'categories' => $categories,
            'filters' => $request->only(['search', 'category']),
            'routes' => [
                'question_bank_store' => route('evaluator.question-bank.store'),
                'question_bank_bulk_store' => route('evaluator.question-bank.bulk-store'),
                'question_builder' => route('evaluator.question-builder'),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'question' => 'required|string',
            'question_formatted' => 'nullable|string',
            'option1' => 'nullable|string',
            'option1_formatted' => 'nullable|string',
            'option1_image' => 'nullable|string',
            'option2' => 'nullable|string',
            'option2_formatted' => 'nullable|string',
            'option2_image' => 'nullable|string',
            'option3' => 'nullable|string',
            'option3_formatted' => 'nullable|string',
            'option3_image' => 'nullable|string',
            'option4' => 'nullable|string',
            'option4_formatted' => 'nullable|string',
            'option4_image' => 'nullable|string',
            'option5' => 'nullable|string',
            'option5_formatted' => 'nullable|string',
            'option5_image' => 'nullable|string',
            'correct_answer' => 'nullable|string|in:A,B,C,D,E',
            'category' => 'required|string',
            'image' => 'nullable|string',
            'direction' => 'nullable|string'
        ]);

        $user = Auth::user();
        $evaluator = $user->evaluator;

        try {
            $question = DepartmentExamBank::create([
                'question' => $request->question,
                'question_formatted' => $request->question_formatted,
                'option1' => $request->option1,
                'option1_formatted' => $request->option1_formatted,
                'option1_image' => $request->option1_image,
                'option2' => $request->option2,
                'option2_formatted' => $request->option2_formatted,
                'option2_image' => $request->option2_image,
                'option3' => $request->option3,
                'option3_formatted' => $request->option3_formatted,
                'option3_image' => $request->option3_image,
                'option4' => $request->option4,
                'option4_formatted' => $request->option4_formatted,
                'option4_image' => $request->option4_image,
                'option5' => $request->option5,
                'option5_formatted' => $request->option5_formatted,
                'option5_image' => $request->option5_image,
                'correct_answer' => $request->correct_answer,
                'category' => $request->category,
                'department' => $evaluator->Department,
                'image' => $request->image,
                'direction' => $request->direction,
                'status' => 1
            ]);

            return back()->with('success', 'Question created successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to create question: ' . $e->getMessage()]);
        }
    }

    public function bulkStore(Request $request)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        $request->validate([
            'questions' => 'required|string' // JSON string of questions
        ]);

        $items = json_decode($request->input('questions'), true) ?? [];
        if (!is_array($items) || empty($items)) {
            return back()->withErrors(['error' => 'Invalid questions payload']);
        }

        $created = 0;
        foreach ($items as $q) {
            // Per your rule, validate against actual columns to avoid unknown column errors
            if (!(isset($q['question']) && isset($q['category']) && isset($q['correct_answer']))) {
                continue;
            }

            DepartmentExamBank::create([
                'question' => $q['question'] ?? null,
                'question_formatted' => $q['question_formatted'] ?? null,
                'option1' => $q['option1'] ?? null,
                'option1_formatted' => $q['option1_formatted'] ?? null,
                'option1_image' => $q['option1_image'] ?? null,
                'option2' => $q['option2'] ?? null,
                'option2_formatted' => $q['option2_formatted'] ?? null,
                'option2_image' => $q['option2_image'] ?? null,
                'option3' => $q['option3'] ?? null,
                'option3_formatted' => $q['option3_formatted'] ?? null,
                'option3_image' => $q['option3_image'] ?? null,
                'option4' => $q['option4'] ?? null,
                'option4_formatted' => $q['option4_formatted'] ?? null,
                'option4_image' => $q['option4_image'] ?? null,
                'option5' => $q['option5'] ?? null,
                'option5_formatted' => $q['option5_formatted'] ?? null,
                'option5_image' => $q['option5_image'] ?? null,
                'correct_answer' => $q['correct_answer'] ?? null,
                'category' => $q['category'] ?? null,
                'department' => $evaluator->Department,
                'image' => $q['image'] ?? null,
                'direction' => $q['direction'] ?? null,
                'status' => 1,
            ]);
            $created++;
        }

        return back()->with('success', $created . ' questions created successfully');
    }

    public function show($id)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        $question = DepartmentExamBank::where('questionId', $id)
            ->where('department', $evaluator->Department)
            ->firstOrFail();

        return response()->json($question);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'question' => 'required|string',
            'question_formatted' => 'nullable|string',
            'option1' => 'nullable|string',
            'option1_formatted' => 'nullable|string',
            'option1_image' => 'nullable|string',
            'option2' => 'nullable|string',
            'option2_formatted' => 'nullable|string',
            'option2_image' => 'nullable|string',
            'option3' => 'nullable|string',
            'option3_formatted' => 'nullable|string',
            'option3_image' => 'nullable|string',
            'option4' => 'nullable|string',
            'option4_formatted' => 'nullable|string',
            'option4_image' => 'nullable|string',
            'option5' => 'nullable|string',
            'option5_formatted' => 'nullable|string',
            'option5_image' => 'nullable|string',
            'correct_answer' => 'nullable|string|in:A,B,C,D,E',
            'category' => 'required|string',
            'image' => 'nullable|string',
            'direction' => 'nullable|string'
        ]);

        $user = Auth::user();
        $evaluator = $user->evaluator;

        $question = DepartmentExamBank::where('questionId', $id)
            ->where('department', $evaluator->Department)
            ->firstOrFail();

        $payload = $request->only([
            'question','question_formatted','option1','option1_formatted','option1_image',
            'option2','option2_formatted','option2_image','option3','option3_formatted','option3_image',
            'option4','option4_formatted','option4_image','option5','option5_formatted','option5_image',
            'correct_answer','category','image','direction'
        ]);
        $question->update($payload);

        return back()->with('success', 'Question updated successfully');
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        $question = DepartmentExamBank::where('questionId', $id)
            ->where('department', $evaluator->Department)
            ->firstOrFail();

        // Soft delete by setting status to 0
        $question->update(['status' => 0]);

        return back()->with('success', 'Question deleted successfully');
    }

    // Bulk archive
    public function bulkArchive(Request $request)
    {
        $request->validate([
            'questionIds' => 'required|array',
            'questionIds.*' => 'integer'
        ]);

        $user = Auth::user();
        $evaluator = $user->evaluator;

        DepartmentExamBank::whereIn('questionId', $request->questionIds)
            ->where('department', $evaluator->Department)
            ->update(['status' => 0]);

        return back()->with('success', 'Selected questions archived successfully');
    }

    // Archived list
    public function archivedQuestions(Request $request)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        $query = DepartmentExamBank::where('department', $evaluator->Department)
            ->where('status', 0);

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        $questions = $query->orderBy('updated_at', 'desc')
            ->paginate($request->integer('per_page', 20))
            ->through(function ($question) {
                return [
                    'questionId' => $question->questionId,
                    'question' => $question->question,
                    'question_formatted' => $question->question_formatted,
                    'category' => $question->category,
                    'direction' => $question->direction,
                    'image' => $question->image,
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
                    'correct_answer' => $question->correct_answer,
                    'updated_at' => $question->updated_at->format('M d, Y H:i')
                ];
            });

        $categories = DepartmentExamBank::where('department', $evaluator->Department)
            ->distinct()
            ->pluck('category');

        return Inertia::render('Evaluator/ArchivedQuestions', [
            'user' => $user,
            'evaluator' => $evaluator,
            'questions' => $questions,
            'categories' => $categories,
            'filters' => $request->only(['category'])
        ]);
    }

    // Restore single
    public function restore($id)
    {
        $user = Auth::user();
        $evaluator = $user->evaluator;

        $question = DepartmentExamBank::where('questionId', $id)
            ->where('department', $evaluator->Department)
            ->firstOrFail();

        $question->update(['status' => 1]);

        return back()->with('success', 'Question restored successfully');
    }

    // Bulk restore
    public function bulkRestore(Request $request)
    {
        $request->validate([
            'questionIds' => 'required|array',
            'questionIds.*' => 'integer'
        ]);

        $user = Auth::user();
        $evaluator = $user->evaluator;

        DepartmentExamBank::whereIn('questionId', $request->questionIds)
            ->where('department', $evaluator->Department)
            ->update(['status' => 1]);

        return back()->with('success', 'Selected questions restored successfully');
    }
}
