<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class PersonalityTestController extends Controller
{
    /**
     * Check if the current examinee already has a personality test result
     */
    public function checkStatus(Request $request): JsonResponse
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

            $lastResult = \App\Models\PersonalityTestResult::where('examineeId', $examinee->id)
                ->latest()->first();

            return response()->json([
                'success' => true,
                'message' => 'Status retrieved',
                'data' => [
                    'has_taken' => (bool) $lastResult,
                    'last_result' => $lastResult ? [
                        'id' => $lastResult->id,
                        'EI' => $lastResult->EI,
                        'SN' => $lastResult->SN,
                        'TF' => $lastResult->TF,
                        'JP' => $lastResult->JP,
                        'created_at' => $lastResult->created_at,
                    ] : null
                ]
            ], 200);
        } catch (\Exception $e) {
            Log::error('[PersonalityTestController] Error checking status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error checking personality test status: ' . $e->getMessage(),
                'data' => null,
            ], 500);
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
            Log::error('[PersonalityTestController] Error submitting personality test answers: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error submitting personality test answers: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * Internal: process and persist personality answers, compute EI/SN/TF/JP and store result
     */
    private function processPersonalityTestAnswers($personalityAnswers, $examineeId, $examId)
    {
        $dichotomyScores = [
            'E' => 0, 'I' => 0,
            'S' => 0, 'N' => 0,
            'T' => 0, 'F' => 0,
            'J' => 0, 'P' => 0
        ];

        $processedCount = 0;
        foreach ($personalityAnswers as $answer) {
            $personalityQuestionId = (int) preg_replace('/^personality_/i', '', (string) $answer['questionId']);
            $question = \App\Models\PersonalityTest::where('id', $personalityQuestionId)->first();

            if ($question) {
                $chosenSide = $answer['selected_answer'] === 'A' ? $question->positive_side : $question->negative_side;

                if (isset($dichotomyScores[$chosenSide])) {
                    $dichotomyScores[$chosenSide]++;
                }

                \App\Models\PersonalityTestAnswer::create([
                    'examineeId' => $examineeId,
                    'questionId' => $personalityQuestionId,
                    'selected_answer' => $answer['selected_answer'],
                    'chosen_side' => $chosenSide
                ]);
                $processedCount++;
            } else {
                Log::warning('[PersonalityTestController] Personality question not found when saving answer', [
                    'raw_question_id' => $answer['questionId'] ?? null,
                    'normalized_id' => $personalityQuestionId
                ]);
            }
        }

        $personalityType = '';
        $personalityType .= ($dichotomyScores['E'] >= $dichotomyScores['I']) ? 'E' : 'I';
        $personalityType .= ($dichotomyScores['S'] >= $dichotomyScores['N']) ? 'S' : 'N';
        $personalityType .= ($dichotomyScores['T'] >= $dichotomyScores['F']) ? 'T' : 'F';
        $personalityType .= ($dichotomyScores['J'] >= $dichotomyScores['P']) ? 'J' : 'P';

        $personalityResult = \App\Models\PersonalityTestResult::create([
            'examineeId' => $examineeId,
            'EI' => ($dichotomyScores['E'] >= $dichotomyScores['I']) ? 'E' : 'I',
            'SN' => ($dichotomyScores['S'] >= $dichotomyScores['N']) ? 'S' : 'N',
            'TF' => ($dichotomyScores['T'] >= $dichotomyScores['F']) ? 'T' : 'F',
            'JP' => ($dichotomyScores['J'] >= $dichotomyScores['P']) ? 'J' : 'P'
        ]);

        Log::info('[PersonalityTestController] Personality type calculated', [
            'examinee_id' => $examineeId,
            'personality_type' => $personalityType,
            'scores' => $dichotomyScores,
            'answers_processed' => $processedCount
        ]);

        $personalityResult->personality_type = $personalityType;

        return $personalityResult;
    }
}


