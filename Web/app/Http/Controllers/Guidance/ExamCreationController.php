<?php

namespace App\Http\Controllers\Guidance;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\QuestionBank;
use App\Models\PersonalityTest;

class ExamCreationController extends Controller
{
    /**
     * Create a new exam
     */
    public function createExam(Request $request)
    {
        $request->validate([
            'time_limit' => 'required|integer|min:1',
            'exam_type' => 'required|in:manual,random',
            'question_ids' => 'required_if:exam_type,manual|array',
            'category_counts' => 'required_if:exam_type,random|array',
            'include_personality_test' => 'boolean',
            'personality_question_ids' => 'nullable|array',
            'personality_exam_type' => 'nullable|in:manual,random',
            'personality_category_counts' => 'nullable|array'
        ]);

        try {
            DB::beginTransaction();

            // Generate a high-entropy unique numeric examId (microseconds + random)
            $examId = (int) (microtime(true) * 1000000) + random_int(1000, 9999);
            $examRefNo = Exam::generateExamRefNo();

            // Handle regular questions
            if ($request->exam_type === 'manual') {
                $questionIds = $request->question_ids;
            } else {
                // Random exam based on category counts
                $questionIds = [];
                Log::info('Random exam generation - category_counts:', $request->category_counts);
                
                foreach ($request->category_counts as $category => $count) {
                    $availableQuestions = QuestionBank::where('category', $category)->count();
                    Log::info("Category: {$category}, Requested: {$count}, Available: {$availableQuestions}");
                    
                    if ($availableQuestions < $count) {
                        throw new \Exception("Not enough questions available for category '{$category}'. Requested: {$count}, Available: {$availableQuestions}");
                    }
                    
                    $categoryQuestions = QuestionBank::where('category', $category)
                        ->inRandomOrder()
                        ->limit($count)
                        ->pluck('questionId')
                        ->toArray();
                    
                    Log::info("Selected questions for {$category}:", $categoryQuestions);
                    $questionIds = array_merge($questionIds, $categoryQuestions);
                }
            }

            if (empty($questionIds)) {
                throw new \Exception('No questions selected for the exam');
            }

            // Handle personality test questions
            $personalityQuestionIds = [];
            if ($request->include_personality_test && $request->personality_exam_type) {
                if ($request->personality_exam_type === 'manual') {
                    $personalityQuestionIds = $request->personality_question_ids ?? [];
                } else {
                    // Random personality questions based on dichotomy counts
                    $personalityQuestionIds = [];
                    Log::info('Random personality exam generation - category_counts:', $request->personality_category_counts);
                    
                    foreach ($request->personality_category_counts as $dichotomy => $count) {
                        $availableQuestions = PersonalityTest::where('dichotomy', $dichotomy)->count();
                        Log::info("Dichotomy: {$dichotomy}, Requested: {$count}, Available: {$availableQuestions}");
                        
                        if ($availableQuestions < $count) {
                            throw new \Exception("Not enough personality questions available for dichotomy '{$dichotomy}'. Requested: {$count}, Available: {$availableQuestions}");
                        }
                        
                        $dichotomyQuestions = PersonalityTest::where('dichotomy', $dichotomy)
                            ->inRandomOrder()
                            ->limit($count)
                            ->pluck('id')
                            ->toArray();
                        
                        Log::info("Selected personality questions for {$dichotomy}:", $dichotomyQuestions);
                        $personalityQuestionIds = array_merge($personalityQuestionIds, $dichotomyQuestions);
                    }
                }

                if (empty($personalityQuestionIds)) {
                    throw new \Exception('No personality test questions selected for the exam');
                }
            }

            // Log the data being created
            Log::info('Creating exam with data:', [
                'examId' => $examId,
                'exam_ref_no' => $examRefNo,
                'question_ids' => $questionIds,
                'time_limit' => $request->time_limit,
                'include_personality_test' => $request->include_personality_test,
                'personality_question_ids' => $personalityQuestionIds
            ]);

            $exam = Exam::create([
                'examId' => $examId,
                'exam-ref-no' => $examRefNo,
                'time_limit' => $request->time_limit,
                'status' => 'active',
                'include_personality_test' => $request->include_personality_test
            ]);

            // Attach regular questions to exam
            Log::info('Attaching questions to exam:', [
                'exam_id' => $exam->examId,
                'question_ids' => $questionIds
            ]);
            $exam->questions()->attach($questionIds);

            // Attach personality test questions to exam
            if ($request->include_personality_test && !empty($personalityQuestionIds)) {
                Log::info('Attaching personality questions to exam:', [
                    'exam_id' => $exam->examId,
                    'personality_question_ids' => $personalityQuestionIds
                ]);
                $exam->personalityQuestions()->attach($personalityQuestionIds);
            }

            DB::commit();

            return redirect()->route('guidance.exam-management')->with('success', 'Exam created successfully')->with('exam_ref_no', $examRefNo);

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error creating exam: ' . $e->getMessage(), [
                'request_data' => $request->all(),
                'exam_id' => $examId ?? null,
                'exam_ref_no' => $examRefNo ?? null,
                'question_ids' => $questionIds ?? [],
                'personality_question_ids' => $personalityQuestionIds ?? []
            ]);
            return back()->withErrors(['error' => 'Failed to create exam: ' . $e->getMessage()]);
        }
    }
}
