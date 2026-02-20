<?php

namespace App\Http\Controllers\Guidance;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use App\Models\QuestionBank;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\PersonalityTest;
use App\Models\PersonalityType;
use App\Models\Course;

use App\Models\Examinee;
use App\Models\GuidanceCounselor;
use App\Models\User;
use App\Models\ExamRegistrationSetting;
use App\Models\ExamSchedule;
use App\Models\ExamRegistration;
use App\Models\ExamineeRegistration;
use App\Http\Controllers\Controller;
use Illuminate\Support\Str;

class GuidanceController extends Controller
{
    /**
     * Display the guidance dashboard
     */
    public function dashboard()
    {
        $user = Auth::user();
        $guidanceCounselor = $user->guidanceCounselor;

        $stats = [
            'total_questions' => QuestionBank::where('status', 1)->count(),
            'total_exams' => Exam::count(),
            'active_exams' => Exam::where('status', 'active')->count(),
            'total_results' => ExamResult::count(),
            'total_personality_tests' => PersonalityTest::count(),
            'total_courses' => Course::count(),
            // Total distinct students registered in the system
            'total_students' => Examinee::count(),
        ];

        $recent_exams = Exam::with('results')->latest()->take(5)->get();
        $recent_results = ExamResult::with(['examinee', 'exam'])->latest()->take(10)->get();

        return Inertia::render('Guidance/Dashboard', [
            'user' => $user,
            'guidanceCounselor' => $guidanceCounselor,
            'stats' => $stats,
            'recent_exams' => $recent_exams,
            'recent_results' => $recent_results
        ]);
    }




    /**
     * Display question bank management
     */
    public function questionBank(Request $request)
    {
        $user = Auth::user();
        $guidanceCounselor = $user->guidanceCounselor;
        
        // Get filter parameters from request
        $perPage = $request->get('per_page', 20);
        $category = $request->get('category');
        $sort = $request->get('sort', 'latest');
        $search = $request->get('search');
        
        // Build the query
        $query = QuestionBank::active();
        
        // Apply search filter if specified
        if ($search && $search !== '') {
            $query->where(function($q) use ($search) {
                $q->where('question', 'LIKE', "%{$search}%")
                  ->orWhere('option1', 'LIKE', "%{$search}%")
                  ->orWhere('option2', 'LIKE', "%{$search}%")
                  ->orWhere('option3', 'LIKE', "%{$search}%")
                  ->orWhere('option4', 'LIKE', "%{$search}%")
                  ->orWhere('option5', 'LIKE', "%{$search}%")
                  ->orWhere('category', 'LIKE', "%{$search}%")
                  ->orWhere('direction', 'LIKE', "%{$search}%")
                  ->orWhere('correct_answer', 'LIKE', "%{$search}%");
            });
        }
        
        // Apply category filter if specified
        if ($category && $category !== '') {
            $query->where('category', $category);
        }
        
        // Apply sorting
        if ($sort === 'latest') {
            $query->orderBy('created_at', 'desc');
        } else {
            $query->orderBy('created_at', 'asc');
        }
        
        // Handle pagination
        if ($perPage == -1) {
            $questions = $query->get();
            // Convert to pagination format for consistency
            $questions = new \Illuminate\Pagination\LengthAwarePaginator(
                $questions,
                $questions->count(),
                $questions->count(),
                1
            );
        } else {
            $questions = $query->paginate($perPage);
        }
        
        // Get all categories with counts for the dropdown
        $allCategories = QuestionBank::active()
            ->selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category')
            ->toArray();
        
        // Get unique categories for the dropdown
        $categories = QuestionBank::active()->distinct()->pluck('category');

        return Inertia::render('Guidance/QuestionBank', [
            'user' => $user,
            'guidanceCounselor' => $guidanceCounselor,
            'questions' => $questions,
            'categories' => $categories,
            'categoryCounts' => $allCategories,
            'currentFilters' => [
                'category' => $category,
                'sort' => $sort,
                'per_page' => $perPage,
                'search' => $search
            ]
        ]);
    }

    /**
     * Display archived questions
     */
    public function archivedQuestions(Request $request)
    {
        $user = Auth::user();
        $guidanceCounselor = $user->guidanceCounselor;
        
        // Get filter parameters from request
        $perPage = $request->get('per_page', 20);
        $category = $request->get('category');
        $sort = $request->get('sort', 'latest');
        
        // Build the query
        $query = QuestionBank::archived();
        
        // Apply category filter if specified
        if ($category && $category !== '') {
            $query->where('category', $category);
        }
        
        // Apply sorting
        if ($sort === 'latest') {
            $query->orderBy('created_at', 'desc');
        } else {
            $query->orderBy('created_at', 'asc');
        }
        
        // Handle pagination
        if ($perPage == -1) {
            $questions = $query->get();
            // Convert to pagination format for consistency
            $questions = new \Illuminate\Pagination\LengthAwarePaginator(
                $questions,
                $questions->count(),
                $questions->count(),
                1
            );
        } else {
            $questions = $query->paginate($perPage);
        }
        
        // Get all categories with counts for the dropdown
        $allCategories = QuestionBank::archived()
            ->selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category')
            ->toArray();
        
        // Get unique categories for the dropdown
        $categories = QuestionBank::archived()->distinct()->pluck('category');

        return Inertia::render('Guidance/ArchivedQuestions', [
            'user' => $user,
            'guidanceCounselor' => $guidanceCounselor,
            'questions' => $questions,
            'categories' => $categories,
            'categoryCounts' => $allCategories,
            'currentFilters' => [
                'category' => $category,
                'sort' => $sort,
                'per_page' => $perPage
            ]
        ]);
    }

    /**
     * Bulk archive questions
     */
    public function bulkArchive(Request $request)
    {
        $request->validate([
            'questionIds' => 'required|array',
            'questionIds.*' => 'exists:question_bank,questionId'
        ]);

        try {
            QuestionBank::whereIn('questionId', $request->questionIds)->update(['status' => 0]);
            return back()->with('success', count($request->questionIds) . ' questions archived successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to archive questions: ' . $e->getMessage()]);
        }
    }

    /**
     * Bulk restore questions
     */
    public function bulkRestore(Request $request)
    {
        $request->validate([
            'questionIds' => 'required|array',
            'questionIds.*' => 'exists:question_bank,questionId'
        ]);

        try {
            QuestionBank::whereIn('questionId', $request->questionIds)->update(['status' => 1]);
            return back()->with('success', count($request->questionIds) . ' questions restored successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to restore questions: ' . $e->getMessage()]);
        }
    }

    /**
     * Archive a single question
     */
    public function archiveQuestion($id)
    {
        try {
            QuestionBank::where('questionId', $id)->update(['status' => 0]);
            return back()->with('success', 'Question archived successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to archive question']);
        }
    }

    /**
     * Restore a single question
     */
    public function restoreQuestion($id)
    {
        try {
            QuestionBank::where('questionId', $id)->update(['status' => 1]);
            return back()->with('success', 'Question restored successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to restore question']);
        }
    }







    private function stripDataUrlPrefix(string $data): string
    {
        if (strpos($data, 'data:image') === 0) {
            $parts = explode(',', $data, 2);
            return $parts[1] ?? $data;
        }
        return $data;
    }

    /**
     * Get MIME type from drawing
     */
    private function getMimeTypeFromDrawing($drawing)
    {
        $extension = strtolower(pathinfo($drawing->getName(), PATHINFO_EXTENSION));
        
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
            'webp' => 'image/webp'
        ];
        
        return $mimeTypes[$extension] ?? 'image/jpeg';
    }















    /**
     * Delete a question
     */
    public function deleteQuestion($id)
    {
        try {
            QuestionBank::where('questionId', $id)->delete();
            return back()->with('success', 'Question deleted successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to delete question']);
        }
    }

    /**
     * Update a question
     */
    public function updateQuestion(Request $request, $id)
    {
        $request->validate([
            'question' => 'required|string',
            'option1' => 'required|string',
            'option2' => 'nullable|string',
            'option3' => 'nullable|string',
            'option4' => 'nullable|string',
            'option5' => 'nullable|string',
            'correct_answer' => 'required|string|max:1|in:A,B,C,D,E',
            'category' => 'required|string',
            'direction' => 'nullable|string',
            'image' => 'nullable|string',
            'option1_image' => 'nullable|string',
            'option2_image' => 'nullable|string',
            'option3_image' => 'nullable|string',
            'option4_image' => 'nullable|string',
            'option5_image' => 'nullable|string',
            'question_formatted' => 'nullable|string',
            'option1_formatted' => 'nullable|string',
            'option2_formatted' => 'nullable|string',
            'option3_formatted' => 'nullable|string',
            'option4_formatted' => 'nullable|string',
            'option5_formatted' => 'nullable|string'
        ]);

        // Validate correct answer against available options
        $availableOptions = [];
        if (!empty($request->option1) && trim($request->option1) !== '') $availableOptions[] = 'A';
        if (!empty($request->option2) && trim($request->option2) !== '') $availableOptions[] = 'B';
        if (!empty($request->option3) && trim($request->option3) !== '') $availableOptions[] = 'C';
        if (!empty($request->option4) && trim($request->option4) !== '') $availableOptions[] = 'D';
        if (!empty($request->option5) && trim($request->option5) !== '') $availableOptions[] = 'E';
        
        // Debug logging
        Log::info('Question Update Validation', [
            'option1' => $request->option1,
            'option2' => $request->option2,
            'option3' => $request->option3,
            'option4' => $request->option4,
            'option5' => $request->option5,
            'correct_answer' => $request->correct_answer,
            'available_options' => $availableOptions
        ]);
        
        if (!in_array($request->correct_answer, $availableOptions)) {
            return back()->withErrors(['correct_answer' => 'Correct answer must be one of the available options: ' . implode(', ', $availableOptions)]);
        }

        try {
            $updateData = $request->all();
            
            // Handle image data if provided
            if ($request->has('image')) {
                if (!empty($request->image)) {
                    $imageData = $request->image;
                    // Check if it's a base64 encoded image
                    if (strpos($imageData, 'data:image') === 0) {
                        // Extract base64 data
                        $imageData = explode(',', $imageData)[1] ?? $imageData;
                    }
                    $updateData['image'] = $imageData;
                } else {
                    // If image is empty or null, set it to null to remove the image
                    $updateData['image'] = null;
                }
            }
            
            // Handle option image data if provided
            for ($i = 1; $i <= 5; $i++) {
                $imageField = "option{$i}_image";
                if ($request->has($imageField)) {
                    if (!empty($request->$imageField)) {
                        $imageData = $request->$imageField;
                        // Check if it's a base64 encoded image
                        if (strpos($imageData, 'data:image') === 0) {
                            // Extract base64 data
                            $imageData = explode(',', $imageData)[1] ?? $imageData;
                        }
                        $updateData[$imageField] = $imageData;
                    } else {
                        // If image is empty or null, set it to null to remove the image
                        $updateData[$imageField] = null;
                    }
                }
            }
            
            QuestionBank::where('questionId', $id)->update($updateData);
            return back()->with('success', 'Question updated successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to update question']);
        }
    }

    /**
     * Display exam management
     */
    public function examManagement(Request $request)
    {
        try {
            $user = Auth::user();
            $guidanceCounselor = $user->guidanceCounselor;
            
            // Get items per page from request, default to 20
            $perPage = $request->get('per_page', 20);
            
            // Handle "All" option (-1 means show all)
            if ($perPage == -1) {
                $exams = Exam::with(['questions', 'personalityQuestions', 'results'])->latest()->get();
                // Convert to pagination format for consistency
                $exams = new \Illuminate\Pagination\LengthAwarePaginator(
                    $exams,
                    $exams->count(),
                    $exams->count(),
                    1
                );
            } else {
                $exams = Exam::with(['questions', 'personalityQuestions', 'results'])->latest()->paginate($perPage);
            }
            
            // Ensure relationships are loaded for Inertia serialization
            $exams->getCollection()->load(['questions', 'personalityQuestions', 'results']);
            
            // Convert to array to ensure relationships are included in serialization
            $examsArray = $exams->toArray();
            $examsArray['data'] = $exams->getCollection()->map(function($exam) {
                return [
                    'examId' => $exam->examId,
                    'exam-ref-no' => $exam->{'exam-ref-no'},
                    'time_limit' => $exam->time_limit,
                    'status' => $exam->status,
                    'include_personality_test' => $exam->include_personality_test,
                    'created_at' => $exam->created_at,
                    'updated_at' => $exam->updated_at,
                    'questions' => $exam->questions->toArray(),
                    'personalityQuestions' => $exam->personalityQuestions->toArray(),
                    'results' => $exam->results->toArray(),
                ];
            })->toArray();
            
            $categories = QuestionBank::active()->distinct()->pluck('category');
            $questions = QuestionBank::active()->get();
            
            // Get personality test data
            $personalityDichotomies = PersonalityTest::active()->distinct()->pluck('dichotomy');
            $personalityQuestions = PersonalityTest::active()->get();

            // Log the data being passed for debugging
            Log::info('examManagement data:', [
                'user_id' => $user->id,
                'guidance_counselor' => $guidanceCounselor ? $guidanceCounselor->id : null,
                'exams_count' => $exams->count(),
                'categories_count' => $categories->count(),
                'questions_count' => $questions->count(),
                'personality_dichotomies_count' => $personalityDichotomies->count(),
                'personality_questions_count' => $personalityQuestions->count()
            ]);





            return Inertia::render('Guidance/ExamManagement', [
                'user' => $user,
                'guidanceCounselor' => $guidanceCounselor,
                'exams' => $examsArray,
                'categories' => $categories,
                'questions' => $questions,
                'personalityDichotomies' => $personalityDichotomies,
                'personalityQuestions' => $personalityQuestions
            ]);
        } catch (\Exception $e) {
            Log::error('Error in examManagement: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to load exam management: ' . $e->getMessage()]);
        }
    }

    /**
     * Toggle exam status
     */
    public function toggleExamStatus(Request $request, $examId)
    {
        try {
            $exam = Exam::findOrFail($examId);
            $newStatus = $exam->status === 'active' ? 'inactive' : 'active';
            $exam->update(['status' => $newStatus]);
            
            return back()->with('success', "Exam status updated to {$newStatus}");
        } catch (\Exception $e) {
            Log::error('Error toggling exam status: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to update exam status']);
        }
    }



    /**
     * Display personality test management
     */
    public function personalityTestManagement(Request $request)
    {
        try {
            $user = Auth::user();
            $guidanceCounselor = $user->guidanceCounselor;
            
            // Get items per page from request, default to 20
            $perPage = $request->get('per_page', 20);
            
            // Handle "All" option (-1 means show all)
            if ($perPage == -1) {
                $questions = PersonalityTest::active()->orderBy('created_at', 'desc')->get();
                // Convert to pagination format for consistency
                $questions = new \Illuminate\Pagination\LengthAwarePaginator(
                    $questions,
                    $questions->count(),
                    $questions->count(),
                    1
                );
            } else {
                $questions = PersonalityTest::active()->orderBy('created_at', 'desc')->paginate($perPage);
            }
            
            $personalityTypes = PersonalityType::all();

            // Log the data being passed for debugging
            Log::info('personalityTestManagement data:', [
                'user_id' => $user->id,
                'guidance_counselor' => $guidanceCounselor ? $guidanceCounselor->id : null,
                'questions_count' => $questions->count(),
                'personality_types_count' => $personalityTypes->count()
            ]);

            return Inertia::render('Guidance/PersonalityTestManagement', [
                'user' => $user,
                'guidanceCounselor' => $guidanceCounselor,
                'questions' => $questions,
                'personalityTypes' => $personalityTypes
            ]);
        } catch (\Exception $e) {
            Log::error('Error in personalityTestManagement: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to load personality test management: ' . $e->getMessage()]);
        }
    }

    /**
     * Create personality test questions
     */
    public function createPersonalityQuestion(Request $request)
    {
        $request->validate([
            'question' => 'required|string',
            'dichotomy' => 'required|in:E/I,S/N,T/F,J/P',
            'positive_side' => 'required|string|max:1',
            'negative_side' => 'required|string|max:1'
        ]);

        $question = PersonalityTest::create([
            'question' => $request->question,
            'option1' => 'Yes',
            'option2' => 'No',
            'dichotomy' => $request->dichotomy,
            'positive_side' => $request->positive_side,
            'negative_side' => $request->negative_side
        ]);

        return redirect()->route('guidance.personality-test-management')->with('success', 'Personality question created successfully');
    }

    /**
     * Update personality test question
     */
    public function updatePersonalityQuestion(Request $request, $id)
    {
        $request->validate([
            'question' => 'required|string',
            'dichotomy' => 'required|in:E/I,S/N,T/F,J/P',
            'positive_side' => 'required|string|max:1',
            'negative_side' => 'required|string|max:1'
        ]);

        try {
            PersonalityTest::find($id)->update($request->all());
            return back()->with('success', 'Personality question updated successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to update personality question']);
        }
    }

    /**
     * Delete personality test question
     */
    public function deletePersonalityQuestion($id)
    {
        try {
            PersonalityTest::find($id)->delete();
            return back()->with('success', 'Personality question deleted successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to delete personality question']);
        }
    }

    /**
     * Upload personality questions via CSV file
     */
    public function uploadPersonalityQuestions(Request $request)
    {
        $request->validate([
            'csv_file' => 'required|file|mimes:csv,txt|max:2048'
        ]);

        try {
            $file = $request->file('csv_file');
            $path = $file->store('temp');
            $fullPath = Storage::path($path);

            $questions = [];
            if (($handle = fopen($fullPath, "r")) !== FALSE) {
                // Skip header row
                fgetcsv($handle);
                
                while (($data = fgetcsv($handle)) !== FALSE) {
                    if (count($data) >= 5) {
                        $questions[] = [
                            'question' => $data[0],
                            'dichotomy' => $data[1],
                            'positive_side' => $data[2],
                            'negative_side' => $data[3],
                            'option1' => 'Yes',
                            'option2' => 'No',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                }
                fclose($handle);
            }

            // Delete the temporary file
            Storage::delete($path);

            if (!empty($questions)) {
                PersonalityTest::insert($questions);
                return back()->with('success', count($questions) . ' personality questions uploaded successfully');
            } else {
                return back()->withErrors(['error' => 'No valid questions found in CSV file']);
            }
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to upload CSV file: ' . $e->getMessage()]);
        }
    }

    /**
     * Display course management
     */
    public function courseManagement()
    {
        $user = Auth::user();
        $guidanceCounselor = $user->guidanceCounselor;
        $courses = Course::orderBy('created_at', 'desc')->get();

        return Inertia::render('Guidance/CourseManagement', [
            'user' => $user,
            'guidanceCounselor' => $guidanceCounselor,
            'courses' => $courses
        ]);
    }

    /**
     * Create a course
     */
    public function createCourse(Request $request)
    {
        $request->validate([
            'course_code' => 'required|string|unique:courses,course_code',
            'course_name' => 'required|string',
            'description' => 'nullable|string',
            'passing_rate' => 'required|integer|min:10|max:100'
        ]);

        $course = Course::create($request->all());

        return redirect()->route('guidance.course-management')->with('success', 'Course created successfully. Use "Generate All Rules" button to create recommendation rules.');
    }

    /**
     * Update a course
     */
    public function updateCourse(Request $request, $id)
    {
        $request->validate([
            'course_code' => 'required|string|unique:courses,course_code,' . $id,
            'course_name' => 'required|string',
            'description' => 'nullable|string',
            'passing_rate' => 'required|integer|min:10|max:100'
        ]);

        try {
            Course::find($id)->update($request->all());
            return back()->with('success', 'Course updated successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to update course']);
        }
    }

    /**
     * Delete a course
     */
    public function deleteCourse($id)
    {
        try {
            Course::find($id)->delete();
            return back()->with('success', 'Course deleted successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to delete course']);
        }
    }



    /**
     * Display exam results
     */
    public function examResults(Request $request)
    {
        $user = Auth::user();
        $guidanceCounselor = $user->guidanceCounselor;

        $year = $request->get('year');
        $includeArchived = filter_var($request->get('include_archived', 'false'), FILTER_VALIDATE_BOOLEAN);
        $startDate = $request->get('start_date'); // YYYY-MM-DD
        $endDate = $request->get('end_date');     // YYYY-MM-DD

        // Optimize eager loading - only load necessary fields to reduce memory usage
        $query = ExamResult::with([
            'examinee:id,accountId,lname,fname,mname,address,preferred_course',
            // NOTE: Profile excluded - loading it for all results causes memory exhaustion (512MB+)
            'exam:examId,exam-ref-no'
        ])->latest('finished_at');
        
        if (!$includeArchived) {
            $query->where('is_archived', 0); // Show only non-archived results (archived = 0)
        } else {
            $query->where('is_archived', 1); // Show only archived results (archived = 1)
        }
        if ($year) {
            $query->whereYear('finished_at', (int) $year);
        }
        // Apply date range on finished_at if provided (inclusive)
        if ($startDate) {
            $query->whereDate('finished_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('finished_at', '<=', $endDate);
        }
        
        // CRITICAL PERFORMANCE FIX: Use database pagination instead of loading all records
        // This prevents loading thousands of records into memory which causes 32s+ LCP
        $perPage = 20;
        $currentPage = $request->get('page', 1);
        
        // Get total count BEFORE pagination (lightweight operation)
        $totalCount = (clone $query)->count();
        
        // Use database pagination - only loads 20 records per page from database
        $results = $query->paginate($perPage)->withQueryString();
        
        // OPTIMIZATION: Load allResults efficiently for frontend filtering
        $allResultsQuery = ExamResult::with([
            'examinee:id,accountId,lname,fname,mname,address,preferred_course',
            // Profile excluded - causes memory exhaustion when loading hundreds of results
            'exam:examId,exam-ref-no'
        ]);
        
        // Apply same filters as main query
        if (!$includeArchived) {
            $allResultsQuery->where('is_archived', 0);
        } else {
            $allResultsQuery->where('is_archived', 1);
        }
        if ($year) {
            $allResultsQuery->whereYear('finished_at', (int) $year);
        }
        if ($startDate) {
            $allResultsQuery->whereDate('finished_at', '>=', $startDate);
        }
        if ($endDate) {
            $allResultsQuery->whereDate('finished_at', '<=', $endDate);
        }
        
        // Load all results (needed for frontend filtering)
        // This is still needed but we'll optimize by preventing N+1 queries
        $allResults = $allResultsQuery->get();

        // Attach recommended_courses and personality to ALL results (so Detailed Report has Math + Recommended Courses)
        $allResultIds = $allResults->pluck('resultId')->all();
        $allExamineeIds = $allResults->pluck('examineeId')->unique()->values()->all();
        if (!empty($allResultIds)) {
            $recsAll = DB::table('examinee_recommendations as er')
                ->join('courses as c', 'er.recommended_course_id', '=', 'c.id')
                ->select('er.exam_result_id', 'c.id as course_id', 'c.course_name', 'c.course_code')
                ->whereIn('er.exam_result_id', $allResultIds)
                ->get()
                ->groupBy('exam_result_id');
            $allResults->each(function ($result) use ($recsAll) {
                $attached = $recsAll->get($result->resultId) ?? collect();
                $result->recommended_courses = $attached->map(function ($r) {
                    return [
                        'course_id' => $r->course_id,
                        'course_name' => $r->course_name,
                        'course_code' => $r->course_code,
                    ];
                })->values();
            });
        }
        if (!empty($allExamineeIds)) {
            $personalitiesAll = DB::table('personality_test_results')
                ->select('examineeId', 'EI', 'SN', 'TF', 'JP', 'created_at')
                ->whereIn('examineeId', $allExamineeIds)
                ->orderBy('created_at', 'desc')
                ->get()
                ->groupBy('examineeId')
                ->map(function ($rows) { return $rows->first(); });
            $allResults->each(function ($result) use ($personalitiesAll) {
                if ($personalitiesAll->has($result->examineeId)) {
                    $p = $personalitiesAll->get($result->examineeId);
                    $result->personality_type = strtoupper(($p->EI ?? '').($p->SN ?? '').($p->TF ?? '').($p->JP ?? ''));
                    $result->personality_result = [
                        'EI' => $p->EI ?? null,
                        'SN' => $p->SN ?? null,
                        'TF' => $p->TF ?? null,
                        'JP' => $p->JP ?? null,
                    ];
                }
            });
        }

        // Pre-load registration data to reduce N+1 from semester/school_year accessors
        if ($allResults->isNotEmpty()) {
            DB::table('examinee_registrations')
                ->whereIn('examinee_id', $allExamineeIds)
                ->orderBy('registration_date', 'desc')
                ->get();
        }

        // Attach recommended courses for paginated results (for table display)
        $resultIds = $results->getCollection()->pluck('resultId')->all();
        if (!empty($resultIds)) {
            $recs = DB::table('examinee_recommendations as er')
                ->join('courses as c', 'er.recommended_course_id', '=', 'c.id')
                ->select('er.exam_result_id', 'c.id as course_id', 'c.course_name', 'c.course_code')
                ->whereIn('er.exam_result_id', $resultIds)
                ->get()
                ->groupBy('exam_result_id');

            // Attach latest personality test result per examinee
            $examineeIds = $results->getCollection()->pluck('examineeId')->unique()->values()->all();
            $personalities = collect();
            if (!empty($examineeIds)) {
                $personalities = DB::table('personality_test_results')
                    ->select('examineeId', 'EI', 'SN', 'TF', 'JP', 'created_at')
                    ->whereIn('examineeId', $examineeIds)
                    ->orderBy('created_at', 'desc')
                    ->get()
                    ->groupBy('examineeId')
                    ->map(function($rows){ return $rows->first(); });
            }

            $results->getCollection()->transform(function($result) use ($recs, $personalities) {
                $attached = $recs->get($result->resultId) ?? collect();
                $result->recommended_courses = $attached->map(function($r){
                    return [
                        'course_id' => $r->course_id,
                        'course_name' => $r->course_name,
                        'course_code' => $r->course_code,
                    ];
                })->values();

                // Add derived personality info if available
                if ($personalities->has($result->examineeId)) {
                    $p = $personalities->get($result->examineeId);
                    $type = strtoupper(($p->EI ?? '').($p->SN ?? '').($p->TF ?? '').($p->JP ?? ''));
                    $result->personality_type = $type;
                    $result->personality_result = [
                        'EI' => $p->EI ?? null,
                        'SN' => $p->SN ?? null,
                        'TF' => $p->TF ?? null,
                        'JP' => $p->JP ?? null,
                    ];
                }
                return $result;
            });
        }

        // Years list for filters
        $years = DB::table('exam_results')
            ->selectRaw('DISTINCT YEAR(finished_at) as y')
            ->whereNotNull('finished_at')
            ->orderBy('y', 'desc')
            ->pluck('y');

        return Inertia::render('Guidance/ExamResults', [
            'user' => $user,
            'guidanceCounselor' => $guidanceCounselor,
            'results' => $results,
            'allResults' => $allResults, // Pass all results for frontend filtering
            'filters' => [
                'year' => $year,
                'include_archived' => $includeArchived,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'years' => $years,
        ]);
    }

    /**
     * Serve examinee profile image on-demand (avoids loading all images at once)
     */
    public function getExamineeProfileImage($id)
    {
        $examinee = Examinee::select(['id', 'Profile'])->find($id);
        if (!$examinee || !$examinee->Profile) {
            return response('', 404);
        }
        try {
            $decoded = base64_decode($examinee->Profile, true);
            if ($decoded === false) {
                return response('', 404);
            }
            $imageInfo = @getimagesizefromstring($decoded);
            $mimeType = ($imageInfo && isset($imageInfo['mime'])) ? $imageInfo['mime'] : 'image/jpeg';
            return response($decoded, 200, [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'public, max-age=86400',
            ]);
        } catch (\Throwable $e) {
            Log::warning('Examinee profile image decode failed', ['examinee_id' => $id, 'error' => $e->getMessage()]);
            return response('', 404);
        }
    }

    /**
     * Get detailed exam result data: questions and student's answers
     */
    public function getExamResultDetails($resultId)
    {
        try {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            if (!$user || !$user->guidanceCounselor) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }

            $examResult = ExamResult::with(['examinee', 'exam'])->where('resultId', $resultId)->first();
            if (!$examResult) {
                return response()->json(['success' => false, 'message' => 'Exam result not found'], 404);
            }

            // Fetch examinee answers joined with questions
            $answers = DB::table('examinee_answer as ea')
                ->join('question_bank as q', 'ea.questionId', '=', 'q.questionId')
                ->select(
                    'ea.questionId',
                    'ea.selected_answer as student_answer',
                    'ea.is_correct',
                    'q.question',
                    'q.correct_answer',
                    'q.option1', 'q.option2', 'q.option3', 'q.option4', 'q.option5'
                )
                ->where('ea.examId', $examResult->examId)
                ->where('ea.examineeId', $examResult->examineeId)
                ->orderBy('ea.questionId')
                ->get()
                ->map(function($row, $idx) {
                    return [
                        'no' => $idx + 1,
                        'question_id' => $row->questionId,
                        'question' => $row->question,
                        'choices' => array_filter([
                            $row->option1, $row->option2, $row->option3, $row->option4, $row->option5
                        ]),
                        'student_answer' => $row->student_answer,
                        'correct_answer' => $row->correct_answer,
                        'is_correct' => (bool) ($row->is_correct ?? (strtoupper((string)$row->student_answer) === strtoupper((string)$row->correct_answer)))
                    ];
                });

            // Fetch persisted recommended courses for this exam result
            $recommendedCourses = DB::table('examinee_recommendations as er')
                ->join('courses as c', 'er.recommended_course_id', '=', 'c.id')
                ->select('c.id as course_id', 'c.course_name', 'c.course_code', 'c.passing_rate')
                ->where('er.exam_result_id', $examResult->resultId)
                ->get();

            // Fetch latest personality result
            $p = DB::table('personality_test_results')
                ->select('EI','SN','TF','JP','created_at')
                ->where('examineeId', $examResult->examineeId)
                ->orderBy('created_at','desc')
                ->first();
            $personalityType = $p ? strtoupper(($p->EI ?? '').($p->SN ?? '').($p->TF ?? '').($p->JP ?? '')) : null;

            return response()->json([
                'success' => true,
                'message' => 'Exam result details retrieved',
                'data' => [
                    'exam_ref_no' => optional($examResult->exam)->{'exam-ref-no'} ?? 'N/A',
                    'examinee' => [
                        'id' => $examResult->examineeId,
                        'name' => $examResult->examinee ? ($examResult->examinee->fname . ' ' . ($examResult->examinee->mname ? $examResult->examinee->mname . ' ' : '') . $examResult->examinee->lname) : 'Unknown',
                    ],
                    'score' => $examResult->percentage,
                    'correct_answers' => $examResult->correct,
                    'total_questions' => $examResult->total_items,
                    'time_taken' => $examResult->time_taken,
                    'time_taken_seconds' => $examResult->time_taken_seconds,
                    'created_at' => $examResult->created_at,
                    'category_breakdown' => $examResult->category_breakdown, // Per-category scores
                    'personality_type' => $personalityType,
                    'personality_result' => $p ? [ 'EI' => $p->EI, 'SN' => $p->SN, 'TF' => $p->TF, 'JP' => $p->JP ] : null,
                    'recommended_courses' => $recommendedCourses,
                    'answers' => $answers,
                    'semester' => $examResult->semester,
                    'school_year' => $examResult->school_year,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to load details: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Render full-page preview for a single exam result (Inertia page)
     */
    public function examResultPreview($resultId)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user || !$user->guidanceCounselor) {
            abort(403);
        }

        $examResult = ExamResult::with(['examinee', 'exam'])->where('resultId', $resultId)->firstOrFail();

        // Build answers dataset
        $answers = DB::table('examinee_answer as ea')
            ->join('question_bank as q', 'ea.questionId', '=', 'q.questionId')
            ->select(
                'ea.questionId',
                'ea.selected_answer as student_answer',
                'ea.is_correct',
                'q.question',
                'q.correct_answer',
                'q.option1', 'q.option2', 'q.option3', 'q.option4', 'q.option5'
            )
            ->where('ea.examId', $examResult->examId)
            ->where('ea.examineeId', $examResult->examineeId)
            ->orderBy('ea.questionId')
            ->get()
            ->map(function($row, $idx) {
                return [
                    'no' => $idx + 1,
                    'question_id' => $row->questionId,
                    'question' => $row->question,
                    'choices' => array_filter([
                        $row->option1, $row->option2, $row->option3, $row->option4, $row->option5
                    ]),
                    'student_answer' => $row->student_answer,
                    'correct_answer' => $row->correct_answer,
                    'is_correct' => (bool) ($row->is_correct ?? (strtoupper((string)$row->student_answer) === strtoupper((string)$row->correct_answer)))
                ];
            });

        // Fetch recommended courses
        $recommendedCourses = DB::table('examinee_recommendations as er')
            ->join('courses as c', 'er.recommended_course_id', '=', 'c.id')
            ->select('c.id as course_id', 'c.course_name', 'c.course_code', 'c.passing_rate', 'c.description')
            ->where('er.exam_result_id', $examResult->resultId)
            ->get();

        // Latest personality
        $p = DB::table('personality_test_results')
            ->select('EI','SN','TF','JP','created_at')
            ->where('examineeId', $examResult->examineeId)
            ->orderBy('created_at','desc')
            ->first();
        $personalityType = $p ? strtoupper(($p->EI ?? '').($p->SN ?? '').($p->TF ?? '').($p->JP ?? '')) : null;

        return Inertia::render('Guidance/ExamResultPreview', [
            'user' => $user,
            'result' => [
                'resultId' => $examResult->resultId,
                'exam_ref_no' => optional($examResult->exam)->{'exam-ref-no'} ?? 'N/A',
                'examinee' => [
                    'id' => $examResult->examineeId,
                    'name' => optional($examResult->examinee)->full_name,
                ],
                'score' => $examResult->percentage,
                'correct_answers' => $examResult->correct,
                'total_questions' => $examResult->total_items,
                'time_taken_seconds' => $examResult->time_taken_seconds,
                'created_at' => $examResult->created_at,
                'semester' => $examResult->semester,
                'school_year' => $examResult->school_year,
                'category_breakdown' => $examResult->category_breakdown,
                'personality_type' => $personalityType,
                'recommended_courses' => $recommendedCourses,
                'answers' => $answers,
            ]
        ]);
    }

    /**
     * Get recommended courses for an examinee based on their score and personality
     */
    private function getRecommendedCoursesForExaminee($examineeId, $score)
    {
        try {
            // Get the examinee's personality type
            $personalityResult = DB::table('personality_test_results')
                ->where('examineeId', $examineeId)
                ->orderBy('created_at', 'desc')
                ->first();
            
            if (!$personalityResult) {
                return [];
            }
            
            $personalityType = $personalityResult->EI . $personalityResult->SN . 
                              $personalityResult->TF . $personalityResult->JP;
            
            // Get recommendation rules that match the personality type and score
            $rules = DB::table('recommendation_rules as rr')
                ->join('courses as c', 'rr.course_id', '=', 'c.course_id')
                ->select('c.course_id', 'c.course_name', 'c.course_description', 'c.passing_rate', 'rr.min_score', 'rr.max_score')
                ->where('rr.personality_type', $personalityType)
                ->where('rr.min_score', '<=', $score)
                ->where('rr.max_score', '>=', $score)
                ->where('c.passing_rate', '<=', $score) // Student score must meet course passing rate
                ->orderBy('rr.min_score', 'desc')
                ->get()
                ->map(function($rule) use ($score) {
                    return [
                        'course_id' => $rule->course_id,
                        'course_name' => $rule->course_name,
                        'course_description' => $rule->course_description,
                        'passing_rate' => $rule->passing_rate,
                        'score_range' => $rule->min_score . '% - ' . $rule->max_score . '%',
                        'student_score' => $score
                    ];
                });
            
            return $rules->toArray();
        } catch (\Exception $e) {
            Log::error('[GuidanceController] Error getting recommended courses: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Process exam results and generate recommendations
     */
    public function processResults()
    {
        try {
            DB::beginTransaction();

            // Get all examinees with exam results but no recommendations
            $examinees = Examinee::whereHas('examResults', function($query) {
                $query->where('status', 'completed');
            })->whereDoesntHave('recommendations')->get();

            $recommendationController = new \App\Http\Controllers\Guidance\AI\RecommendationRulesController();
            foreach ($examinees as $examinee) {
                $recommendationController->generateRecommendations($examinee);
            }

            DB::commit();

            return back()->with('success', 'Results processed successfully')->with('processed_count', $examinees->count());

        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Failed to process results: ' . $e->getMessage()]);
        }
    }

    /**
     * Archive all exam results by year
     */
    public function archiveResultsByYear(Request $request)
    {
        $request->validate([
            'year' => 'required|digits:4'
        ]);

        $year = (int) $request->year;
        $count = ExamResult::where('is_archived', 1)
            ->whereNotNull('finished_at')
            ->whereYear('finished_at', $year)
            ->update(['is_archived' => 0]);

        return back()->with('success', "Archived {$count} results for {$year}");
    }

    /**
     * Archive all exam results (no year filter)
     */
    public function archiveAllResults()
    {
        $count = ExamResult::query()->update(['is_archived' => 1]);
        return back()->with('success', "Archived {$count} results");
    }

    /**
     * Unarchive all exam results by year
     */
    public function unarchiveResultsByYear(Request $request)
    {
        $request->validate([
            'year' => 'required|digits:4'
        ]);

        $year = (int) $request->year;
        $count = ExamResult::where('is_archived', 1)
            ->where(function ($q) use ($year) {
                $q->whereYear('finished_at', $year)
                    ->orWhere(function ($q2) use ($year) {
                        $q2->whereNull('finished_at')->whereYear('created_at', $year);
                    });
            })
            ->update(['is_archived' => 0]);

        return back()->with('success', "Unarchived {$count} results for {$year}");
    }

    /**
     * Unarchive all exam results for a specific finished_at date (YYYY-MM-DD)
     */
    public function unarchiveResultsByDate(Request $request)
    {
        $request->validate([
            'date' => 'required|date_format:Y-m-d'
        ]);

        $date = $request->input('date');
        $count = ExamResult::where('is_archived', 1)
            ->whereDate('finished_at', $date)
            ->update(['is_archived' => 0]);

        return back()->with('success', "Unarchived {$count} results for {$date}");
    }

    /**
     * Export examinee info (lname, fname, mname, gender, age, school_name, parent_name, parent_phone, phone, address)
     * as Excel for examinees that have at least one non-archived exam result.
     */
    public function exportExamineeInfo()
    {
        $examineeIds = ExamResult::where('is_archived', 0)
            ->distinct()
            ->pluck('examineeId');

        $examinees = Examinee::whereIn('id', $examineeIds)
            ->select('lname', 'fname', 'mname', 'gender', 'age', 'school_name', 'parent_name', 'parent_phone', 'phone', 'address')
            ->orderBy('lname')
            ->orderBy('fname')
            ->get();

        try {
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $worksheet = $spreadsheet->getActiveSheet();
            $worksheet->setTitle('Examinee Info');

            $headers = ['Last Name', 'First Name', 'Middle Name', 'Gender', 'Age', 'School Name', 'Parent Name', 'Parent Phone', 'Phone', 'Address'];
            foreach ($headers as $colIndex => $header) {
                $worksheet->setCellValue(\PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIndex + 1) . '1', $header);
            }
            $worksheet->getStyle('A1:J1')->getFont()->setBold(true);
            $worksheet->getStyle('A1:J1')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID);
            $worksheet->getStyle('A1:J1')->getFill()->getStartColor()->setRGB('E0E7FF');

            $row = 2;
            foreach ($examinees as $e) {
                $worksheet->setCellValue('A' . $row, $e->lname ?? '');
                $worksheet->setCellValue('B' . $row, $e->fname ?? '');
                $worksheet->setCellValue('C' . $row, $e->mname ?? '');
                $worksheet->setCellValue('D' . $row, $e->gender ?? '');
                $worksheet->setCellValue('E' . $row, $e->age ?? '');
                $worksheet->setCellValue('F' . $row, $e->school_name ?? '');
                $worksheet->setCellValue('G' . $row, $e->parent_name ?? '');
                $worksheet->setCellValue('H' . $row, $e->parent_phone ?? '');
                $worksheet->setCellValue('I' . $row, $e->phone ?? '');
                $worksheet->setCellValue('J' . $row, $e->address ?? '');
                $row++;
            }

            foreach (range('A', 'J') as $col) {
                $worksheet->getColumnDimension($col)->setAutoSize(true);
            }

            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $filename = 'examinee_info_' . date('Y-m-d_His') . '.xlsx';
            $filepath = storage_path('app/' . $filename);
            $writer->save($filepath);

            $response = response()->download($filepath, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ]);
            return $response->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            Log::error('[GuidanceController] exportExamineeInfo failed: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to export examinee info: ' . $e->getMessage()]);
        }
    }

    /**
     * Show archived exam results page.
     * Optimized: limit allResults, exclude Profile, bulk-load semester/school_year to avoid memory exhaustion.
     */
    public function archivedExamResults(Request $request)
    {
        $user = Auth::user();
        $guidanceCounselor = $user->guidanceCounselor;

        $year = $request->get('year');

        // Eager load without Profile (large base64) to reduce memory
        $examineeSelect = 'id,accountId,lname,fname,mname,gender,age,school_name,parent_name,parent_phone,phone,address';
        $query = ExamResult::with([
            'examinee:' . $examineeSelect,
            'exam:examId,exam-ref-no'
        ])->where('is_archived', 1)->latest();

        if ($year) {
            $query->whereNotNull('finished_at')->whereYear('finished_at', (int) $year);
        }

        $allResultsQuery = (clone $query)->limit(1500);
        $allResults = $allResultsQuery->get();
        $results = $query->paginate(20);

        // Bulk load recommendations and personalities for paginated results
        $resultIds = $results->getCollection()->pluck('resultId')->all();
        if (!empty($resultIds)) {
            $recs = DB::table('examinee_recommendations as er')
                ->join('courses as c', 'er.recommended_course_id', '=', 'c.id')
                ->select('er.exam_result_id', 'c.id as course_id', 'c.course_name', 'c.course_code')
                ->whereIn('er.exam_result_id', $resultIds)
                ->get()
                ->groupBy('exam_result_id');

            $examineeIds = $results->getCollection()->pluck('examineeId')->unique()->values()->all();
            $personalities = collect();
            if (!empty($examineeIds)) {
                $personalities = DB::table('personality_test_results')
                    ->select('examineeId', 'EI', 'SN', 'TF', 'JP', 'created_at')
                    ->whereIn('examineeId', $examineeIds)
                    ->orderBy('created_at', 'desc')
                    ->get()
                    ->groupBy('examineeId')
                    ->map(function ($rows) { return $rows->first(); });
            }

            $results->getCollection()->transform(function ($result) use ($recs, $personalities) {
                $attached = $recs->get($result->resultId) ?? collect();
                $result->recommended_courses = $attached->map(function ($r) {
                    return [
                        'course_id' => $r->course_id,
                        'course_name' => $r->course_name,
                        'course_code' => $r->course_code,
                    ];
                })->values();

                if ($personalities->has($result->examineeId)) {
                    $p = $personalities->get($result->examineeId);
                    $type = strtoupper(($p->EI ?? '').($p->SN ?? '').($p->TF ?? '').($p->JP ?? ''));
                    $result->personality_type = $type;
                    $result->personality_result = [
                        'EI' => $p->EI ?? null,
                        'SN' => $p->SN ?? null,
                        'TF' => $p->TF ?? null,
                        'JP' => $p->JP ?? null,
                    ];
                }
                return $result;
            });
        }

        // Build allResults as plain arrays to avoid N+1 from semester/school_year accessors and reduce memory
        $allResultIds = $allResults->pluck('resultId')->all();
        $allExamineeIds = $allResults->pluck('examineeId')->unique()->values()->all();

        $recsAll = collect();
        $personalitiesAll = collect();
        if (!empty($allResultIds)) {
            $recsAll = DB::table('examinee_recommendations as er')
                ->join('courses as c', 'er.recommended_course_id', '=', 'c.id')
                ->select('er.exam_result_id', 'c.id as course_id', 'c.course_name', 'c.course_code')
                ->whereIn('er.exam_result_id', $allResultIds)
                ->get()
                ->groupBy('exam_result_id');
        }
        if (!empty($allExamineeIds)) {
            $personalitiesAll = DB::table('personality_test_results')
                ->select('examineeId', 'EI', 'SN', 'TF', 'JP', 'created_at')
                ->whereIn('examineeId', $allExamineeIds)
                ->orderBy('created_at', 'desc')
                ->get()
                ->groupBy('examineeId')
                ->map(function ($rows) { return $rows->first(); });
        }

        // One query for semester/school_year instead of 2 per result
        $registrationMap = [];
        if (!empty($allExamineeIds)) {
            $regs = DB::table('examinee_registrations')
                ->whereIn('examinee_id', $allExamineeIds)
                ->select('examinee_id', 'assigned_exam_date', 'semester', 'school_year')
                ->orderBy('registration_date', 'desc')
                ->get();
            foreach ($regs as $r) {
                $date = $r->assigned_exam_date instanceof \DateTimeInterface
                    ? $r->assigned_exam_date->format('Y-m-d')
                    : substr((string) $r->assigned_exam_date, 0, 10);
                $key = $r->examinee_id . '|' . $date;
                if (!isset($registrationMap[$key])) {
                    $registrationMap[$key] = [
                        'semester' => $r->semester ?? null,
                        'school_year' => $r->school_year ?? null,
                    ];
                }
            }
        }

        $allResultsArray = $allResults->map(function ($result) use ($recsAll, $personalitiesAll, $registrationMap) {
            $finishedAt = $result->finished_at ?? $result->created_at;
            $resultDate = $finishedAt ? (\Carbon\Carbon::parse($finishedAt)->format('Y-m-d')) : null;
            $regKey = $resultDate ? ($result->examineeId . '|' . $resultDate) : null;
            $reg = $regKey ? ($registrationMap[$regKey] ?? null) : null;

            $percentage = $result->total_items > 0
                ? round((float) $result->correct / (float) $result->total_items * 100, 2)
                : 0;

            $attached = $recsAll->get($result->resultId) ?? collect();
            $recommended_courses = $attached->map(function ($r) {
                return [
                    'course_id' => $r->course_id,
                    'course_name' => $r->course_name,
                    'course_code' => $r->course_code,
                ];
            })->values()->all();

            $personality_type = null;
            $personality_result = null;
            if ($personalitiesAll->has($result->examineeId)) {
                $p = $personalitiesAll->get($result->examineeId);
                $personality_type = strtoupper(($p->EI ?? '').($p->SN ?? '').($p->TF ?? '').($p->JP ?? ''));
                $personality_result = [
                    'EI' => $p->EI ?? null,
                    'SN' => $p->SN ?? null,
                    'TF' => $p->TF ?? null,
                    'JP' => $p->JP ?? null,
                ];
            }

            return [
                'resultId' => $result->resultId,
                'examineeId' => $result->examineeId,
                'examId' => $result->examId,
                'total_items' => $result->total_items,
                'correct' => $result->correct,
                'remarks' => $result->remarks,
                'started_at' => $result->started_at?->toIso8601String(),
                'finished_at' => $result->finished_at?->toIso8601String(),
                'time_taken_seconds' => $result->time_taken_seconds,
                'category_breakdown' => $result->category_breakdown,
                'is_archived' => $result->is_archived,
                'created_at' => $result->created_at?->toIso8601String(),
                'examinee' => $result->relationLoaded('examinee') && $result->examinee
                    ? array_merge($result->examinee->only(['id', 'lname', 'fname', 'mname', 'gender', 'age', 'school_name', 'parent_name', 'parent_phone', 'phone', 'address']), [
                        'full_name' => trim(($result->examinee->fname ?? '') . ' ' . ($result->examinee->mname ?? '') . ' ' . ($result->examinee->lname ?? '')),
                    ])
                    : null,
                'exam' => $result->relationLoaded('exam') && $result->exam
                    ? $result->exam->only(['examId', 'exam-ref-no'])
                    : null,
                'recommended_courses' => $recommended_courses,
                'personality_type' => $personality_type,
                'personality_result' => $personality_result,
                'semester' => $reg ? ($reg['semester'] ?? null) : null,
                'school_year' => $reg ? ($reg['school_year'] ?? null) : null,
                'percentage' => $percentage,
                'score' => $percentage,
            ];
        })->values()->all();

        $years = DB::table('exam_results')
            ->where('is_archived', 1)
            ->whereNotNull('finished_at')
            ->selectRaw('DISTINCT YEAR(finished_at) as y')
            ->orderBy('y', 'desc')
            ->pluck('y');

        return Inertia::render('Guidance/ExamResultsArchived', [
            'user' => $user,
            'guidanceCounselor' => $guidanceCounselor,
            'results' => $results,
            'allResults' => $allResultsArray,
            'filters' => [ 'year' => $year ],
            'years' => $years,
        ]);
    }

    /**
     * Fetch personality type metadata (title, description) by type code (e.g., ENTJ)
     */
    public function getPersonalityType($type)
    {
        try {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            if (!$user || !$user->guidanceCounselor) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }

            $code = strtoupper(trim($type));
            $row = DB::table('personality_types')->where('type', $code)->first();
            if (!$row) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'type' => $code,
                        'title' => $code,
                        'description' => null,
                    ]
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'type' => $row->type,
                    'title' => $row->title,
                    'description' => $row->description,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to load personality type'], 500);
        }
    }

    /**
     * Unarchive a single exam result
     */
    public function unarchiveResult($id)
    {
        $updated = ExamResult::where('resultId', $id)->update(['is_archived' => 0]);
        if ($updated) {
            return back()->with('success', 'Result unarchived');
        }
        return back()->withErrors(['error' => 'Result not found']);
    }


    /**
     * Archive a single exam result
     */
    public function archiveResult(Request $request, $id = null)
    {
        $resultId = $id ?? (int) $request->input('id');
        if (!$resultId) {
            return back()->withErrors(['error' => 'Missing result id']);
        }

        $updated = ExamResult::where('resultId', $resultId)->update(['is_archived' => 1]);
        if ($updated) {
            return back()->with('success', 'Result archived');
        }

        return back()->withErrors(['error' => 'Failed to archive result']);
    }


    // Legacy methods for backward compatibility
    public function profile()
    {
        $user = Auth::user();
        $guidanceCounselor = $user->guidanceCounselor;

        return Inertia::render('Guidance/Profile', [
            'user' => $user,
            'guidanceCounselor' => $guidanceCounselor,
        ]);
    }

    /**
     * Update guidance counselor profile
     */
    public function updateProfile(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $guidanceCounselor = $user->guidanceCounselor;

        $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username,' . $user->id,
            'email' => 'required|email|unique:users,email,' . $user->id,
            'address' => 'nullable|string|max:500'
        ]);

        try {
            DB::beginTransaction();

            // Update user information
            $user->update([
                'username' => $request->username,
                'email' => $request->email
            ]);

            // Update guidance counselor information
            if ($guidanceCounselor) {
                $guidanceCounselor->update([
                    'name' => $request->name,
                    'address' => $request->address
                ]);
            } else {
                // Create guidance counselor record if it doesn't exist
                GuidanceCounselor::create([
                    'accountId' => $user->id,
                    'name' => $request->name,
                    'address' => $request->address
                ]);
            }

            DB::commit();
            return back()->with('success', 'Profile updated successfully');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Failed to update profile: ' . $e->getMessage()]);
        }
    }

    public function students()
    {
        $user = Auth::user();
        
        return Inertia::render('Guidance/Students', [
            'user' => $user,
        ]);
    }

    public function recommendations()
    {
        $user = Auth::user();
        
        return Inertia::render('Guidance/Recommendations', [
            'user' => $user,
        ]);
    }

    public function reports()
    {
        $user = Auth::user();
        
        return Inertia::render('Guidance/Reports', [
            'user' => $user,
        ]);
    }

    /**
     * Display exam registration management
     */
    public function examRegistrationManagement()
    {
        $user = Auth::user();
        $guidanceCounselor = $user->guidanceCounselor;
        
        // Note: Schedule count syncing is now done inline for better performance
        
        $settings = ExamRegistrationSetting::getCurrentSettings();
        
        // If no settings exist in database, create initial settings
        if (!$settings->exists) {
            $settings = ExamRegistrationSetting::create([
                'registration_open' => false,
                'students_per_day' => 40,
                'exam_start_date' => null,
                'exam_end_date' => null,
                'registration_message' => null
            ]);
        }
        
        // Auto-close registration if exam period has ended
        $this->autoCloseRegistrationIfExpired($settings);
        
        // Refresh settings after potential auto-close
        $settings->refresh();
        
        // Get selected exam dates from existing exam schedules
        // Only fetch dates with status != 'closed' so that closed dates can be reselected
        $selectedExamDates = [];
        if ($settings->exam_start_date && $settings->exam_end_date) {
            $selectedExamDates = ExamSchedule::whereBetween('exam_date', [$settings->exam_start_date, $settings->exam_end_date])
                ->where('status', '!=', 'closed')
                ->distinct()
                ->pluck('exam_date')
                ->toArray();
        }

        // Add selected_exam_dates to settings for frontend
        $settings->selected_exam_dates = $selectedExamDates;
        
        // OPTIMIZED: Get registrations with minimal data for better performance
        // Reduced per_page to improve initial load time
        $perPage = request('per_page', 100); // Reduced from 1000 to 100 for better performance
        $registrations = ExamineeRegistration::with(['examinee:id,accountId,school_name', 'examinee.user:id,username'])
            ->select('id', 'examinee_id', 'assigned_exam_date', 'assigned_session', 'registration_date', 'status', 'created_at')
            ->latest()
            ->paginate($perPage);
        
        // OPTIMIZED: Get schedules with registration counts in a single query
        $schedules = ExamSchedule::select('id', 'exam_date', 'session', 'start_time', 'end_time', 'max_capacity', 'current_registrations', 'status', 'exam_code')
            ->orderBy('exam_date')
            ->orderBy('session')
            ->get();

        // Get all registration counts in a single optimized query
        $registrationCounts = ExamineeRegistration::selectRaw('assigned_exam_date, assigned_session, COUNT(*) as count')
            ->whereNotNull('assigned_exam_date')
            ->whereNotNull('assigned_session')
            ->groupBy('assigned_exam_date', 'assigned_session')
            ->get()
            ->keyBy(function ($item) {
                return $item->assigned_exam_date . '|' . $item->assigned_session;
            })
            ->map(function ($item) {
                return $item->count;
            });

        // Process schedules with pre-calculated counts
        $schedules = $schedules->map(function ($schedule) use ($registrationCounts) {
            $key = $schedule->exam_date . '|' . $schedule->session;
            $actualCount = $registrationCounts->get($key, 0);
            
            // Update the current_registrations field if it's out of sync
            if ($schedule->current_registrations != $actualCount) {
                $schedule->update(['current_registrations' => $actualCount]);
            }
            
            // Set the correct count
            $schedule->current_registrations = $actualCount;
            
            // Only auto-update status if it's not manually set to 'closed'
            // Preserve manual status changes to 'full' or 'open'
            if ($schedule->status !== 'closed') {
                $newStatus = null;
                
                // Only change status if there's a logical reason to do so
                if ($actualCount >= $schedule->max_capacity && $schedule->status === 'open') {
                    $newStatus = 'full';
                } elseif ($actualCount < $schedule->max_capacity && $schedule->status === 'full') {
                    $newStatus = 'open';
                }
                
                // Only update the database if status actually needs to change
                if ($newStatus && $newStatus !== $schedule->status) {
                    $schedule->update(['status' => $newStatus]);
                    $schedule->status = $newStatus;
                }
            }
            
            return $schedule;
        })->groupBy('exam_date'); // Group schedules by date for easier frontend handling

        // Calculate total registrations
        $totalRegistrations = ExamineeRegistration::count();

        return Inertia::render('Guidance/ExamRegistrationManagement', [
            'user' => $user,
            'guidanceCounselor' => $guidanceCounselor,
            'settings' => $settings,
            'registrations' => [
                'data' => $registrations->items(),
                'total' => $totalRegistrations,
                'current_page' => $registrations->currentPage(),
                'last_page' => $registrations->lastPage(),
                'per_page' => $registrations->perPage()
            ],
            'schedules' => $schedules
        ]);
    }

    /**
     * Dedicated page for Examinee Registrations list
     */
    public function examineeRegistrations()
    {
        $user = Auth::user();
        $settings = ExamRegistrationSetting::getCurrentSettings();

        // AUTO-MARK: Automatically mark expired examinees as no-show (runs on page load)
        $this->autoMarkExpiredExaminees();

        // Load all records to see complete data
        $perPage = request('per_page', 1000);

        $query = ExamineeRegistration::with([
                'examinee:id,accountId,school_name',
                'examinee.user:id,username'
            ])
            ->select('id', 'examinee_id', 'assigned_exam_date', 'assigned_session', 'registration_date', 'status', 'created_at')
            ->latest();

        if ($search = request('search')) {
            $query->whereHas('examinee.user', function($q) use ($search) {
                $q->where('username', 'like', "%{$search}%");
            })->orWhereHas('examinee', function($q) use ($search) {
                $q->where('school_name', 'like', "%{$search}%");
            });
        }

        if ($status = request('status')) {
            if (in_array($status, ['assigned','registered','completed','cancelled'])) {
                $query->where('status', $status);
            }
        }

        $registrations = $query->paginate($perPage);
        
        // Debug: Log the actual data being sent
        Log::info('ExamineeRegistrations Debug', [
            'total_records' => $registrations->total(),
            'current_page_records' => $registrations->count(),
            'status_distribution' => $registrations->groupBy('status')->map->count()
        ]);

        // Dedicated dataset for unassigned registered examinees (limited for performance)
        $unassigned = ExamineeRegistration::with([
                'examinee:id,accountId,school_name',
                'examinee.user:id,username'
            ])
            ->select('id', 'examinee_id', 'assigned_exam_date', 'assigned_session', 'registration_date', 'status', 'created_at')
            ->where('status', 'registered')
            ->whereNull('assigned_exam_date')
            ->orderByDesc('registration_date')
            ->limit(50) // Limit to prevent memory issues
            ->get();

        $schedules = ExamSchedule::select('id', 'exam_date', 'session', 'start_time', 'end_time', 'max_capacity', 'current_registrations', 'status', 'exam_code')
            ->orderBy('exam_date')
            ->orderBy('session')
            ->get()
            ->groupBy('exam_date');

        return Inertia::render('Guidance/ExamineeRegistrations', [
            'user' => $user,
            'settings' => $settings,
            'registrations' => $registrations,
            'unassigned' => $unassigned,
            'schedules' => $schedules,
            'flash' => [
                'success' => session('success'),
                'error' => session('error')
            ]
        ]);
    }

    /**
     * Assign a registration to a specific exam date and session
     */
    public function assignRegistration(Request $request)
    {
        $validated = $request->validate([
            'registration_id' => 'required|exists:examinee_registrations,id',
            'assigned_exam_date' => 'required|date',
            'assigned_session' => 'required|in:morning,afternoon',
        ]);

        $registration = ExamineeRegistration::findOrFail($validated['registration_id']);

        // Find the matching schedule
        $schedule = ExamSchedule::where('exam_date', $validated['assigned_exam_date'])
            ->where('session', $validated['assigned_session'])
            ->first();

        if (!$schedule) {
            return back()->with('error', 'Selected schedule was not found.');
        }

        // Capacity check
        if ($schedule->status === 'closed' || ($schedule->current_registrations >= $schedule->max_capacity)) {
            return back()->with('error', 'Selected schedule is full or closed.');
        }

        // Assign and mark status
        $registration->assigned_exam_date = $validated['assigned_exam_date'];
        $registration->assigned_session = $validated['assigned_session'];
        $registration->status = 'assigned';
        $registration->save();

        // Increment capacity
        $schedule->increment('current_registrations');

        // Redirect back to registrations page, keep filters
        return redirect()->route('guidance.examinee-registrations')
            ->with('success', 'Examinee assigned successfully.');
    }

    /**
     * Bulk assign multiple registrations to the same schedule
     */
    public function bulkAssignRegistrations(Request $request)
    {
        $validated = $request->validate([
            'registration_ids' => 'required|array|min:1',
            'registration_ids.*' => 'exists:examinee_registrations,id',
            'assigned_exam_date' => 'required|date',
            'assigned_session' => 'required|in:morning,afternoon',
        ]);

        // Find the matching schedule
        $schedule = ExamSchedule::where('exam_date', $validated['assigned_exam_date'])
            ->where('session', $validated['assigned_session'])
            ->first();

        if (!$schedule) {
            return back()->with('error', 'Selected schedule was not found.');
        }

        // Check if there's enough capacity for all registrations
        $requestedCount = count($validated['registration_ids']);
        $availableCapacity = $schedule->max_capacity - $schedule->current_registrations;

        if ($schedule->status === 'closed') {
            return back()->with('error', 'Selected schedule is closed.');
        }

        if ($availableCapacity < $requestedCount) {
            return back()->with('error', "Not enough capacity. Available: {$availableCapacity}, Requested: {$requestedCount}");
        }

        // Get all registrations
        $registrations = ExamineeRegistration::whereIn('id', $validated['registration_ids'])
            ->where('status', 'registered') // Only assign unassigned registrations
            ->get();

        if ($registrations->count() !== $requestedCount) {
            return back()->with('error', 'Some selected registrations are no longer available for assignment.');
        }

        // Assign all registrations
        foreach ($registrations as $registration) {
            $registration->assigned_exam_date = $validated['assigned_exam_date'];
            $registration->assigned_session = $validated['assigned_session'];
            $registration->status = 'assigned';
            $registration->save();
        }

        // Update schedule capacity
        $schedule->increment('current_registrations', $requestedCount);

        // Redirect back to registrations page
        return redirect()->route('guidance.examinee-registrations')
            ->with('success', "Successfully assigned {$requestedCount} examinee(s) to the schedule.");
    }

    /**
     * Display the exam date selection page
     */
    public function examDateSelection()
    {
        $user = Auth::user();
        $guidanceCounselor = $user->guidanceCounselor;
        
        $settings = ExamRegistrationSetting::getCurrentSettings();
        
        // If no settings exist in database, create initial settings
        if (!$settings->exists) {
            $settings = ExamRegistrationSetting::create([
                'registration_open' => false,
                'students_per_day' => 40,
                'exam_start_date' => null,
                'exam_end_date' => null,
                'registration_message' => null
            ]);
        }

        // Get selected exam dates from existing exam schedules
        // Only fetch dates with status != 'closed' so that closed dates can be reselected
        $existingExamDates = [];
        if ($settings->exam_start_date && $settings->exam_end_date) {
            $existingExamDates = ExamSchedule::whereBetween('exam_date', [$settings->exam_start_date, $settings->exam_end_date])
                ->where('status', '!=', 'closed')
                ->distinct()
                ->pluck('exam_date')
                ->toArray();
        }

        // Attach existing exam dates to settings for frontend
        // These represent dates that already have active/open exam_schedules records
        $settings->existing_exam_dates = $existingExamDates;

        return Inertia::render('Guidance/ExamDateSelection', [
            'user' => $user,
            'guidanceCounselor' => $guidanceCounselor,
            'settings' => $settings
        ]);
    }

    /**
     * Debug method to check closed schedules data
     */
    public function debugClosedSchedules()
    {
        $allSchedules = ExamSchedule::all();
        $closedSchedules = ExamSchedule::where('status', 'closed')->get();
        $allRegistrations = ExamineeRegistration::all();
        
        return response()->json([
            'total_schedules' => $allSchedules->count(),
            'closed_schedules' => $closedSchedules->count(),
            'total_registrations' => $allRegistrations->count(),
            'all_schedule_ids' => $allSchedules->pluck('id')->toArray(),
            'closed_schedule_ids' => $closedSchedules->pluck('id')->toArray(),
            'closed_schedules_data' => $closedSchedules->map(function($schedule) {
                $registrations = ExamineeRegistration::where('assigned_exam_date', $schedule->exam_date)
                    ->where('assigned_session', $schedule->session)
                    ->get();
                
                return [
                    'id' => $schedule->id,
                    'exam_date' => $schedule->exam_date,
                    'session' => $schedule->session,
                    'status' => $schedule->status,
                    'registrations_count' => $registrations->count(),
                    'registrations' => $registrations->map(function($reg) {
                        return [
                            'id' => $reg->id,
                            'assigned_exam_date' => $reg->assigned_exam_date,
                            'assigned_session' => $reg->assigned_session,
                            'status' => $reg->status
                        ];
                    })
                ];
            }),
            'all_registrations' => $allRegistrations->map(function($reg) {
                return [
                    'id' => $reg->id,
                    'assigned_exam_date' => $reg->assigned_exam_date,
                    'assigned_session' => $reg->assigned_session,
                    'status' => $reg->status
                ];
            })
        ]);
    }

    /**
     * Display closed exam schedules page
     */
    public function closedExamSchedules()
    {
        $user = Auth::user();
        $guidanceCounselor = $user->guidanceCounselor;

        $settings = ExamRegistrationSetting::getCurrentSettings();

        // Get only closed schedules (temporarily remove pagination for debugging)
        $closedSchedules = ExamSchedule::where('status', 'closed')
            ->select('id', 'exam_date', 'session', 'start_time', 'end_time', 'max_capacity', 'current_registrations', 'status', 'exam_code')
            ->orderBy('exam_date', 'desc')
            ->orderBy('session')
            ->get();

        // Debug: Log the schedules being sent to frontend
        Log::info('[GuidanceController] Closed schedules data', [
            'total_schedules' => $closedSchedules->count(),
            'schedule_ids' => $closedSchedules->pluck('id')->toArray(),
            'schedule_statuses' => $closedSchedules->pluck('status')->unique()->toArray()
        ]);

        // Load archived registrations to display alongside closed schedules
        $archivedRegistrations = ExamineeRegistration::with(['examinee.user'])
            ->where('status', 'archived')
            ->orderBy('assigned_exam_date', 'desc')
            ->get()
            ->map(function ($reg) {
                return [
                    'id' => $reg->id,
                    'assigned_exam_date' => $reg->assigned_exam_date,
                    'assigned_session' => $reg->assigned_session,
                    'status' => $reg->status,
                    'registration_date' => $reg->registration_date,
                    'examinee_name' => optional(optional($reg->examinee)->user)->username,
                    'school_name' => optional($reg->examinee)->school_name,
                ];
            });

        return Inertia::render('Guidance/ClosedExamSchedules', [
            'user' => $user,
            'guidanceCounselor' => $guidanceCounselor,
            'settings' => $settings,
            'closedSchedules' => [
                'data' => $closedSchedules->toArray(),
                'total' => $closedSchedules->count(),
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => $closedSchedules->count()
            ],
            'archivedRegistrations' => [
                'data' => $archivedRegistrations->toArray(),
                'total' => $archivedRegistrations->count(),
            ],
            'flash' => [
                'success' => session('success'),
                'error' => session('error')
            ]
        ]);
    }

    /**
     * Archive completed and cancelled registrations when closing schedules
     */
    private function archiveCompletedAndCancelledRegistrations()
    {
        try {
            set_time_limit(120);

            $countToArchive = ExamineeRegistration::whereIn('status', ['completed', 'finished', 'cancelled'])->count();

            if ($countToArchive === 0) {
                return 0;
            }

            ExamineeRegistration::whereIn('status', ['completed', 'finished', 'cancelled'])
                ->update(['status' => 'archived']);

            Log::info('[GuidanceController] Archived completed and cancelled registrations during schedule closure', [
                'archived_count' => $countToArchive,
            ]);

            return $countToArchive;
        } catch (\Exception $e) {
            Log::error('[GuidanceController] Failed to archive completed and cancelled registrations during schedule closure', [
                'error' => $e->getMessage(),
            ]);
            return 0;
        }
    }

    /**
     * Archive all completed/finished registrations by setting status to 'archived'.
     */
    public function archiveCompletedRegistrations()
    {
        try {
            set_time_limit(120);

            $countToArchive = ExamineeRegistration::whereIn('status', ['completed', 'finished', 'cancelled'])->count();

            if ($countToArchive === 0) {
                return back()->with('success', 'No completed or cancelled registrations to archive.');
            }

            ExamineeRegistration::whereIn('status', ['completed', 'finished', 'cancelled'])
                ->update(['status' => 'archived']);

            Log::info('[GuidanceController] Archived completed and cancelled registrations', [
                'archived_count' => $countToArchive,
            ]);

            return back()->with('success', "Archived {$countToArchive} completed and cancelled registrations.");
        } catch (\Exception $e) {
            Log::error('[GuidanceController] Failed to archive completed and cancelled registrations', [
                'error' => $e->getMessage(),
            ]);
            return back()->withErrors(['error' => 'Failed to archive completed and cancelled registrations.']);
        }
    }

    /**
     * Unarchive a single registration by changing its status from 'archived' to 'cancelled'
     * This will make it visible in the main registration management page
     */
    public function unarchiveRegistration($id)
    {
        try {
            $registration = ExamineeRegistration::findOrFail($id);
            
            if ($registration->status !== 'archived') {
                return back()->withErrors(['error' => 'Registration is not archived.']);
            }

            // Change status from 'archived' to 'cancelled' so it shows in the main view
            $registration->update(['status' => 'cancelled']);

            Log::info('[GuidanceController] Unarchived registration', [
                'registration_id' => $id,
                'examinee_name' => $registration->examinee->user->username ?? 'Unknown',
            ]);

            return back()->with('success', 'Registration unarchived successfully. It will now appear in the main registration list.');
        } catch (\Exception $e) {
            Log::error('[GuidanceController] Failed to unarchive registration', [
                'registration_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return back()->withErrors(['error' => 'Failed to unarchive registration.']);
        }
    }

    /**
     * Bulk unarchive multiple registrations by changing their status from 'archived' to 'cancelled'
     */
    public function bulkUnarchiveRegistrations(Request $request)
    {
        $request->validate([
            'registration_ids' => 'required|array',
            'registration_ids.*' => 'exists:examinee_registrations,id'
        ]);

        try {
            $registrationIds = $request->registration_ids;
            
            // Check if all registrations are actually archived
            $archivedCount = ExamineeRegistration::whereIn('id', $registrationIds)
                ->where('status', 'archived')
                ->count();
            
            if ($archivedCount === 0) {
                return back()->withErrors(['error' => 'No archived registrations found in the selection.']);
            }

            if ($archivedCount !== count($registrationIds)) {
                return back()->withErrors(['error' => 'Some selected registrations are not archived.']);
            }

            // Update all selected registrations from 'archived' to 'cancelled'
            ExamineeRegistration::whereIn('id', $registrationIds)
                ->update(['status' => 'cancelled']);

            Log::info('[GuidanceController] Bulk unarchived registrations', [
                'registration_ids' => $registrationIds,
                'count' => $archivedCount,
            ]);

            return back()->with('success', "Successfully restored {$archivedCount} archived registrations. They will now appear in the main registration list.");
        } catch (\Exception $e) {
            Log::error('[GuidanceController] Failed to bulk unarchive registrations', [
                'registration_ids' => $request->registration_ids ?? [],
                'error' => $e->getMessage(),
            ]);
            return back()->withErrors(['error' => 'Failed to restore selected registrations.']);
        }
    }

    /**
     * Bulk archive multiple registrations by changing their status to 'archived'
     */
    public function bulkArchiveRegistrations(Request $request)
    {
        $request->validate([
            'registration_ids' => 'required|array',
            'registration_ids.*' => 'exists:examinee_registrations,id'
        ]);

        try {
            $registrationIds = $request->registration_ids;
            
            // Check if registrations exist and are not already archived
            $registrations = ExamineeRegistration::whereIn('id', $registrationIds)
                ->where('status', '!=', 'archived')
                ->get();
            
            if ($registrations->isEmpty()) {
                return back()->withErrors(['error' => 'No registrations found to archive. All selected registrations may already be archived.']);
            }

            $count = $registrations->count();
            
            // Update all selected registrations to 'archived'
            ExamineeRegistration::whereIn('id', $registrations->pluck('id'))
                ->update(['status' => 'archived']);

            // If some registrations were already archived, inform the user
            $alreadyArchivedCount = count($registrationIds) - $count;
            $message = "Successfully archived {$count} registration" . ($count !== 1 ? 's' : '') . ".";
            if ($alreadyArchivedCount > 0) {
                $message .= " {$alreadyArchivedCount} registration" . ($alreadyArchivedCount !== 1 ? 's were' : ' was') . " already archived.";
            }

            Log::info('[GuidanceController] Bulk archived registrations', [
                'registration_ids' => $registrationIds,
                'archived_count' => $count,
                'already_archived_count' => $alreadyArchivedCount,
            ]);

            return back()->with('success', $message);
        } catch (\Exception $e) {
            Log::error('[GuidanceController] Failed to bulk archive registrations', [
                'registration_ids' => $request->registration_ids ?? [],
                'error' => $e->getMessage(),
            ]);
            return back()->withErrors(['error' => 'Failed to archive selected registrations.']);
        }
    }

    /**
     * Mark past-due assigned registrations as cancelled (no-shows).
     * A registration is considered a no-show if:
     *  - status = 'assigned'
     *  - assigned_exam_date is before today
     */
    public function cancelNoShowRegistrations()
    {
        try {
            set_time_limit(60);

            $today = now()->startOfDay();
            $todayString = $today->toDateString();

            // Get registrations that need to be cancelled
            // A registration is past due if the assigned date is before today (not including today)
            $pastDueRegistrations = ExamineeRegistration::where('status', 'assigned')
                ->whereNotNull('assigned_exam_date')
                ->whereDate('assigned_exam_date', '<', $todayString)
                ->with(['examinee.user']) // Load related data for logging
                ->get();

            $count = $pastDueRegistrations->count();

            if ($count === 0) {
                Log::info('[GuidanceController] No past-due assigned registrations found', [
                    'check_date' => $todayString,
                    'run_at' => now()->toDateTimeString(),
                ]);
                return back()->with('success', 'No past-due assigned registrations to cancel.');
            }

            // Update the registrations
            $updatedCount = ExamineeRegistration::where('status', 'assigned')
                ->whereNotNull('assigned_exam_date')
                ->whereDate('assigned_exam_date', '<', $todayString)
                ->update([
                    'status' => 'cancelled',
                    'updated_at' => now() // Ensure updated_at is refreshed
                ]);

            // Log detailed information about cancelled registrations
            $cancelledDetails = $pastDueRegistrations->map(function ($registration) use ($today) {
                return [
                    'id' => $registration->id,
                    'examinee_name' => $registration->examinee->user->username ?? 'Unknown',
                    'assigned_date' => $registration->assigned_exam_date,
                    'assigned_session' => $registration->assigned_session,
                    'days_overdue' => $today->diffInDays($registration->assigned_exam_date)
                ];
            });

            Log::info('[GuidanceController] Successfully cancelled past-due assigned registrations', [
                'cancelled_count' => $updatedCount,
                'check_date' => $todayString,
                'run_at' => now()->toDateTimeString(),
                'cancelled_registrations' => $cancelledDetails->toArray()
            ]);

            // After cancelling registrations, check if any schedules should be closed
            $this->checkAndCloseSchedulesAfterCancellation();

            return back()->with('success', "Successfully marked {$updatedCount} no-show registrations as cancelled.");
        } catch (\Exception $e) {
            Log::error('[GuidanceController] Failed to cancel no-show registrations', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'run_at' => now()->toDateTimeString(),
            ]);
            return back()->withErrors(['error' => 'Failed to cancel no-show registrations: ' . $e->getMessage()]);
        }
    }

    /**
     * Check and close schedules where all registrations are cancelled (no-shows)
     */
    private function checkAndCloseSchedulesAfterCancellation()
    {
        try {
            // Get all active schedules
            $schedules = ExamSchedule::where('status', '!=', 'closed')->get();
            $closedCount = 0;

            foreach ($schedules as $schedule) {
                // Get all registrations for this schedule
                $allRegistrations = ExamineeRegistration::where('assigned_exam_date', $schedule->exam_date)
                    ->where('assigned_session', $schedule->session)
                    ->count();

                if ($allRegistrations === 0) {
                    continue; // No registrations for this schedule
                }

                // Count cancelled registrations
                $cancelledRegistrations = ExamineeRegistration::where('assigned_exam_date', $schedule->exam_date)
                    ->where('assigned_session', $schedule->session)
                    ->where('status', 'cancelled')
                    ->count();

                // If all registrations are cancelled, close the schedule
                if ($cancelledRegistrations === $allRegistrations) {
                    $schedule->update(['status' => 'closed']);
                    $closedCount++;
                    
                    Log::info('[GuidanceController] Schedule closed - all examinees cancelled (no-shows)', [
                        'exam_date' => $schedule->exam_date,
                        'session' => $schedule->session,
                        'total_registrations' => $allRegistrations,
                        'cancelled_registrations' => $cancelledRegistrations,
                        'schedule_id' => $schedule->id
                    ]);
                }
            }

            if ($closedCount > 0) {
                Log::info('[GuidanceController] Closed schedules after cancellation check', [
                    'closed_schedules' => $closedCount
                ]);
                
                // Check if registration window should be closed after closing schedules
                $this->checkAndCloseRegistrationWindowIfAllSchedulesClosed();
            }

        } catch (\Exception $e) {
            Log::error('[GuidanceController] Failed to check and close schedules after cancellation', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Check if all exam schedules are closed and automatically close the registration window
     */
    private function checkAndCloseRegistrationWindowIfAllSchedulesClosed()
    {
        try {
            // Get current settings
            $settings = ExamRegistrationSetting::getCurrentSettings();
            
            // Only proceed if registration is currently open
            if (!$settings->registration_open) {
                return;
            }

            // Check if there are any open schedules
            $openSchedules = ExamSchedule::where('status', '!=', 'closed')->count();
            
            if ($openSchedules === 0) {
                // All schedules are closed, close the registration window
                $settings->update([
                    'registration_open' => false,
                    'registration_message' => 'REGISTRATION CLOSED - All exam schedules have been closed'
                ]);
                
                Log::info('[GuidanceController] Registration window auto-closed - all schedules closed', [
                    'settings_id' => $settings->id,
                    'closed_at' => now(),
                    'reason' => 'all_schedules_closed'
                ]);
            }

        } catch (\Exception $e) {
            Log::error('[GuidanceController] Failed to check and close registration window', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Generate or regenerate an exam code for a specific exam date.
     * Applies the same code to both sessions for that date.
     */
    public function generateScheduleExamCode(Request $request)
    {
        $request->validate([
            'exam_date' => 'required|date',
            'exam_id' => 'nullable|exists:exams,examId'
        ]);

        $examDate = $request->input('exam_date');
        $examId = $request->input('exam_id');
        
        // If exam_id is provided, use that specific exam; otherwise, choose a random active exam
        if ($examId) {
            $exam = Exam::where('examId', $examId)->where('status', 'active')->first();
            if (!$exam) {
                return back()->withErrors(['error' => 'Selected exam is not active or does not exist.']);
            }
        } else {
            // Choose a random active exam and use a shuffled variant of its exam-ref-no as the code
            $activeExams = Exam::where('status', 'active')->get();
            if ($activeExams->isEmpty()) {
                return back()->withErrors(['error' => 'No active exams available. Please create an exam first.']);
            }
            $exam = $activeExams->random();
        }

        $baseRef = $exam->{'exam-ref-no'};
        $code = $this->generateUniqueShuffledCode($baseRef);

        // Update all sessions for the date
        ExamSchedule::where('exam_date', $examDate)->update(['exam_code' => $code]);

        Log::info('[GuidanceController] Assigned existing exam-ref-no to schedule', [
            'exam_date' => $examDate,
            'exam_code' => $code,
            'exam_id' => $exam->examId,
            'manually_selected' => $examId ? true : false
        ]);

        return back()->with('success', 'Exam code assigned for ' . $examDate)->with('exam_code', $code);
    }

    /**
     * Bulk-generate exam codes for a date range (overwrites existing).
     */
    public function bulkGenerateScheduleExamCodes(Request $request)
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'exam_id' => 'nullable|integer'
        ]);

        $start = \Carbon\Carbon::parse($request->start_date);
        $end = \Carbon\Carbon::parse($request->end_date);

        $activeExams = Exam::where('status', 'active')->get();
        if ($activeExams->isEmpty()) {
            return back()->withErrors(['error' => 'No active exams available. Please create an exam first.']);
        }

        // If a specific exam is selected, validate and use it
        $selectedExam = null;
        if ($request->filled('exam_id')) {
            $selectedExam = $activeExams->firstWhere('examId', (int) $request->exam_id);
            if (!$selectedExam) {
                return back()->withErrors(['error' => 'Selected exam is not active or does not exist.']);
            }
        }

        $dates = ExamSchedule::whereBetween('exam_date', [$start->format('Y-m-d'), $end->format('Y-m-d')])
            ->distinct()
            ->pluck('exam_date');

        $generated = 0;
        foreach ($dates as $date) {
            $exam = $selectedExam ?: $activeExams->random();
            $baseRef = $exam->{'exam-ref-no'};
            $code = $this->generateUniqueShuffledCode($baseRef);
            ExamSchedule::where('exam_date', $date)->update(['exam_code' => $code]);
            $generated++;
        }

        Log::info('[GuidanceController] Bulk generated schedule exam codes', [
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'count' => $generated
        ]);

        return back()->with('success', "Generated exam codes for {$generated} dates");
    }

    /**
     * Return a lightweight list of active exams with summary info for UI selection.
     */
    public function getExamSummaries()
    {
        try {
            $exams = Exam::where('status', 'active')
                ->withCount(['questions as questions_count', 'personalityQuestions as personality_questions_count'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($exam) {
                    return [
                        'examId' => $exam->examId,
                        'ref' => $exam->{'exam-ref-no'},
                        'questions_count' => (int) ($exam->questions_count ?? 0),
                        'include_personality_test' => (bool) $exam->include_personality_test,
                        'personality_questions_count' => (int) ($exam->personality_questions_count ?? 0),
                        'time_limit' => $exam->time_limit,
                    ];
                });

            return response()->json([
                'data' => $exams,
            ]);
        } catch (\Exception $e) {
            Log::error('[GuidanceController] getExamSummaries failed', [
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'error' => 'Failed to load exams',
            ], 500);
        }
    }

    /**
     * Generate a unique shuffled code derived from a base exam-ref-no.
     * Keeps format of 4-8 with a dash after the 4th character.
     */
    private function generateUniqueShuffledCode(string $examRef): string
    {
        // Remove dash and uppercase
        $raw = strtoupper(str_replace('-', '', $examRef));
        $chars = str_split($raw);
        // Try up to 20 shuffles to avoid rare uniqueness collisions
        for ($i = 0; $i < 20; $i++) {
            shuffle($chars);
            $shuffled = implode('', $chars);
            $code = substr($shuffled, 0, 4) . '-' . substr($shuffled, 4);
            if (!ExamSchedule::where('exam_code', $code)->exists()) {
                return $code;
            }
        }
        // Fallback: append a random suffix from base ref to break ties (still same character set mostly)
        $suffix = substr(strtoupper(Str::random(2)), 0, 2);
        $fallback = substr($raw, 0, 4) . '-' . substr($raw, 4, 6) . $suffix;
        if (!ExamSchedule::where('exam_code', $fallback)->exists()) {
            return $fallback;
        }
        // Last resort: use a pure random code (keeps 4-8 format)
        $random = strtoupper(Str::random(12));
        return substr($random, 0, 4) . '-' . substr($random, 4);
    }

    /**
     * OPTIMIZED: Sync all schedule counts with actual registrations
     */
    private function syncAllScheduleCounts()
    {
        Log::info('[GuidanceController] Starting optimized schedule count sync');
        
        // Get all schedules
        $schedules = ExamSchedule::all();
        
        // Get all registration counts in a single query
        $registrationCounts = ExamineeRegistration::selectRaw('assigned_exam_date, assigned_session, COUNT(*) as count')
            ->whereNotNull('assigned_exam_date')
            ->whereNotNull('assigned_session')
            ->groupBy('assigned_exam_date', 'assigned_session')
            ->get()
            ->keyBy(function ($item) {
                return $item->assigned_exam_date . '|' . $item->assigned_session;
            })
            ->map(function ($item) {
                return $item->count;
            });
        
        $syncedCount = 0;
        $updates = [];
        
        // Process schedules with pre-calculated counts
        foreach ($schedules as $schedule) {
            $key = $schedule->exam_date . '|' . $schedule->session;
            $actualCount = $registrationCounts->get($key, 0);
            
            if ($schedule->current_registrations != $actualCount) {
                // Only update status if the schedule is not closed
                $updateData = ['current_registrations' => $actualCount];
                if ($schedule->status !== 'closed') {
                    $updateData['status'] = $actualCount >= $schedule->max_capacity ? 'full' : 'open';
                }
                
                $updates[] = [
                    'id' => $schedule->id,
                    'data' => $updateData
                ];
                
                $syncedCount++;
            }
        }
        
        // Batch update all schedules at once
        if (!empty($updates)) {
            foreach ($updates as $update) {
                ExamSchedule::where('id', $update['id'])->update($update['data']);
            }
        }
        
        Log::info('[GuidanceController] Optimized schedule count sync completed', [
            'total_schedules' => $schedules->count(),
            'synced_schedules' => $syncedCount
        ]);
    }

    /**
     * Auto-close registration if exam period has ended
     */
    private function autoCloseRegistrationIfExpired($settings)
    {
        // Check if there's an end date set
        if (!$settings->exam_end_date) {
            return;
        }

        $today = now()->startOfDay();
        $endDate = \Carbon\Carbon::parse($settings->exam_end_date)->endOfDay();

        // If today is after the exam end date, close registration and schedules
        if ($today->gt($endDate)) {
            Log::info('Auto-closing exam registration and schedules - exam period ended', [
                'exam_end_date' => $settings->exam_end_date,
                'today' => $today->format('Y-m-d'),
                'settings_id' => $settings->id,
                'registration_was_open' => $settings->registration_open
            ]);

            // Close the registration settings if it was open
            if ($settings->registration_open) {
                $settings->update([
                    'registration_open' => false,
                    'registration_message' => 'REGISTRATION CLOSED - Exam period has ended'
                ]);
            } else {
                // Even if registration was already closed, update the message
                $settings->update([
                    'registration_message' => 'REGISTRATION CLOSED - Exam period has ended'
                ]);
            }

            // Close all exam schedules that are in the past or on the end date
            $closedSchedules = $this->closePreviousExamSchedules($settings);

            Log::info('Exam registration auto-closed and schedules closed successfully', [
                'settings_id' => $settings->id,
                'closed_at' => now(),
                'schedules_closed' => $closedSchedules,
                'registration_closed' => $settings->registration_open ? false : true
            ]);
        }
    }

    /**
     * Manually trigger auto-close for all expired registrations
     */
    public function triggerAutoClose()
    {
        try {
            $settings = ExamRegistrationSetting::getCurrentSettings();
            $this->autoCloseRegistrationIfExpired($settings);
            
            return back()->with('success', 'Auto-close check completed successfully');
        } catch (\Exception $e) {
            Log::error('Failed to trigger auto-close', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['error' => 'Failed to trigger auto-close: ' . $e->getMessage()]);
        }
    }

    /**
     * Manually close all exam schedules for a specific date range
     */
    public function closeExamSchedules(Request $request)
    {
        try {
            $request->validate([
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date'
            ]);

            // Get schedules to close
            $schedulesToClose = ExamSchedule::whereBetween('exam_date', [$request->start_date, $request->end_date])
                ->where('status', '!=', 'closed')
                ->get();

            $closedCount = 0;
            $skippedCount = 0;
            $errors = [];

            foreach ($schedulesToClose as $schedule) {
                // Check if there are any registrations for this schedule
                $registrationsCount = ExamineeRegistration::where('assigned_exam_date', $schedule->exam_date)
                    ->where('assigned_session', $schedule->session)
                    ->count();

                if ($registrationsCount > 0) {
                    $skippedCount++;
                    $errors[] = "Schedule {$schedule->exam_date} ({$schedule->session}) has {$registrationsCount} registration(s) and was skipped";
                    continue;
                }

                // No registrations, safe to close
                $schedule->update(['status' => 'closed']);
                $closedCount++;
            }

            Log::info('Manually closed exam schedules', [
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'schedules_closed' => $closedCount,
                'schedules_skipped' => $skippedCount,
                'errors' => $errors
            ]);

            $message = "Successfully closed {$closedCount} exam schedules";
            if ($skippedCount > 0) {
                $message .= ". {$skippedCount} schedule(s) were skipped due to existing registrations.";
            }

            return back()->with('success', $message);
        } catch (\Exception $e) {
            Log::error('Failed to close exam schedules', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['error' => 'Failed to close exam schedules: ' . $e->getMessage()]);
        }
    }

    /**
     * Update registration message to indicate closure
     */
    public function updateRegistrationMessage(Request $request)
    {
        try {
            $request->validate([
                'message' => 'required|string|max:1000'
            ]);

            $settings = ExamRegistrationSetting::getCurrentSettings();
            $settings->update(['registration_message' => $request->message]);

            Log::info('Registration message updated', [
                'new_message' => $request->message,
                'settings_id' => $settings->id
            ]);

            return back()->with('success', 'Registration message updated successfully');
        } catch (\Exception $e) {
            Log::error('Failed to update registration message', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['error' => 'Failed to update registration message: ' . $e->getMessage()]);
        }
    }

    /**
     * Update exam registration settings
     */
    public function updateRegistrationSettings(Request $request)
    {
        Log::info('[GuidanceController] updateRegistrationSettings - Request received', [
            'request_data' => $request->all()
        ]);

        // Basic validation first
        $request->validate([
            'registration_open' => 'required|boolean',
            'academic_year' => 'nullable|string|max:20',
            'semester' => 'nullable|string|in:1st,2nd,Summer',
            'exam_start_date' => 'nullable|date',
            'exam_end_date' => 'nullable|date',
            'selected_exam_dates' => 'nullable|array',
            'selected_exam_dates.*' => 'date',
            'students_per_day' => 'required|integer|min:1|max:100',
            'registration_message' => 'nullable|string|max:1000',
            'delete_previous_schedules' => 'nullable|boolean',
            'morning_start_time' => 'nullable|date_format:H:i',
            'morning_end_time' => 'nullable|date_format:H:i',
            'afternoon_start_time' => 'nullable|date_format:H:i',
            'afternoon_end_time' => 'nullable|date_format:H:i'
        ]);

        // Additional validation only when opening registration
        // Allow existing exam windows that may have started in the past,
        // but always require a valid date range (end on or after start).
        if ($request->registration_open) {
            $request->validate([
                'exam_start_date' => 'required|date',
                'exam_end_date' => 'required|date|after_or_equal:exam_start_date'
            ]);
        }

        try {
            $settings = ExamRegistrationSetting::getCurrentSettings();
            $wasOpen = $settings->registration_open;
            $isBeingClosed = $wasOpen && !$request->registration_open;
            
            Log::info('[GuidanceController] updateRegistrationSettings - Processing', [
                'was_open' => $wasOpen,
                'is_being_closed' => $isBeingClosed,
                'delete_previous_schedules' => $request->delete_previous_schedules
            ]);
            
            // Update settings but exclude selected_exam_dates (it's not stored in settings table)
            $settingsData = $request->except(['selected_exam_dates']);
            $settings->update($settingsData);

            // Close previous schedules if the checkbox is ticked,
            // even if registration was already closed previously
            $closedSchedulesCount = 0;
            $archivedRegistrationsCount = 0;
            if ($request->delete_previous_schedules) {
                $closedSchedulesCount = $this->closePreviousExamSchedules($settings);
                $archivedRegistrationsCount = $this->archiveCompletedAndCancelledRegistrations();
            }

            // When registration is being closed, clear the current exam window
            // from exam_registration_settings so previous exam window is removed,
            // but only AFTER closePreviousExamSchedules has used the original end date.
            if ($isBeingClosed) {
                $settings->update([
                    'exam_start_date' => null,
                    'exam_end_date' => null,
                ]);
            }

            // If registration is being opened, generate exam schedules
            if ($request->registration_open && $request->exam_start_date && $request->exam_end_date) {
                $selectedDates = $request->selected_exam_dates ?? [];
                $timeSettings = [
                    'morning_start_time' => $request->morning_start_time ?? '08:00:00',
                    'morning_end_time' => $request->morning_end_time ?? '11:00:00',
                    'afternoon_start_time' => $request->afternoon_start_time ?? '13:00:00',
                    'afternoon_end_time' => $request->afternoon_end_time ?? '16:00:00'
                ];
                $this->generateExamSchedules($request->exam_start_date, $request->exam_end_date, $request->students_per_day, $selectedDates, $timeSettings);
            }

            // If registration is being closed, delete the current exam_registration_settings row
            // The singleton row will be recreated with defaults next time the page is opened.
            if ($isBeingClosed) {
                $settings->delete();
            }

            $message = 'Registration settings updated successfully';
            if ($request->delete_previous_schedules) {
                $message .= " and {$closedSchedulesCount} exam schedule(s) have been closed";
                if ($archivedRegistrationsCount > 0) {
                    $message .= " and {$archivedRegistrationsCount} completed/cancelled registration(s) have been archived";
                }
                $message .= " (including schedules where all examinees completed their exams or were cancelled)";
            }

            return back()->with('success', $message);
        } catch (\Exception $e) {
            Log::error('[GuidanceController] updateRegistrationSettings - Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return back()->withErrors(['error' => 'Failed to update settings: ' . $e->getMessage()]);
        }
    }

    /**
     * Close previous exam schedules when registration is closed
     */
    private function closePreviousExamSchedules($settings)
    {
        try {
            // Get all exam schedules that are in the past or on the end date
            $schedulesToClose = ExamSchedule::where('exam_date', '<=', $settings->exam_end_date)
                ->where('status', '!=', 'closed')
                ->get();
            
            $closedCount = 0;
            $skippedCount = 0;
            $closedSchedules = [];
            $skippedSchedules = [];
            
            foreach ($schedulesToClose as $schedule) {
                // Check if there are any registrations for this schedule
                $allRegistrations = ExamineeRegistration::where('assigned_exam_date', $schedule->exam_date)
                    ->where('assigned_session', $schedule->session)
                    ->get();

                $registrationsCount = $allRegistrations->count();

                if ($registrationsCount > 0) {
                    // Check registration statuses
                    $completedRegistrations = $allRegistrations->whereIn('status', ['completed', 'finished'])->count();
                    $cancelledRegistrations = $allRegistrations->where('status', 'cancelled')->count();
                    $activeRegistrations = $allRegistrations->whereIn('status', ['assigned', 'registered'])->count();
                    
                    // Close if all registrations are completed/finished OR all are cancelled
                    if ($completedRegistrations === $registrationsCount) {
                        // All registrations are completed, safe to close
                        $closedSchedules[] = [
                            'id' => $schedule->id,
                            'exam_date' => $schedule->exam_date,
                            'session' => $schedule->session,
                            'current_registrations' => $schedule->current_registrations,
                            'max_capacity' => $schedule->max_capacity,
                            'previous_status' => $schedule->status,
                            'registrations_count' => $registrationsCount,
                            'completed_count' => $completedRegistrations,
                            'cancelled_count' => $cancelledRegistrations,
                            'reason' => 'all_completed'
                        ];
                        
                        $schedule->update(['status' => 'closed']);
                        $closedCount++;
                        continue;
                    } elseif ($cancelledRegistrations === $registrationsCount) {
                        // All registrations are cancelled (no-shows), safe to close
                        $closedSchedules[] = [
                            'id' => $schedule->id,
                            'exam_date' => $schedule->exam_date,
                            'session' => $schedule->session,
                            'current_registrations' => $schedule->current_registrations,
                            'max_capacity' => $schedule->max_capacity,
                            'previous_status' => $schedule->status,
                            'registrations_count' => $registrationsCount,
                            'completed_count' => $completedRegistrations,
                            'cancelled_count' => $cancelledRegistrations,
                            'reason' => 'all_cancelled'
                        ];
                        
                        $schedule->update(['status' => 'closed']);
                        $closedCount++;
                        continue;
                    } elseif (($completedRegistrations + $cancelledRegistrations) === $registrationsCount) {
                        // Mix of completed and cancelled, but no active registrations, safe to close
                        $closedSchedules[] = [
                            'id' => $schedule->id,
                            'exam_date' => $schedule->exam_date,
                            'session' => $schedule->session,
                            'current_registrations' => $schedule->current_registrations,
                            'max_capacity' => $schedule->max_capacity,
                            'previous_status' => $schedule->status,
                            'registrations_count' => $registrationsCount,
                            'completed_count' => $completedRegistrations,
                            'cancelled_count' => $cancelledRegistrations,
                            'reason' => 'completed_and_cancelled'
                        ];
                        
                        $schedule->update(['status' => 'closed']);
                        $closedCount++;
                        continue;
                    } else {
                        // Has active registrations, skip closing
                        $skippedCount++;
                        $skippedSchedules[] = [
                            'id' => $schedule->id,
                            'exam_date' => $schedule->exam_date,
                            'session' => $schedule->session,
                            'current_registrations' => $schedule->current_registrations,
                            'max_capacity' => $schedule->max_capacity,
                            'previous_status' => $schedule->status,
                            'registrations_count' => $registrationsCount,
                            'completed_count' => $completedRegistrations,
                            'cancelled_count' => $cancelledRegistrations,
                            'active_count' => $activeRegistrations,
                            'reason' => 'has_active_registrations'
                        ];
                        continue;
                    }
                }

                // No registrations, safe to close
                $closedSchedules[] = [
                    'id' => $schedule->id,
                    'exam_date' => $schedule->exam_date,
                    'session' => $schedule->session,
                    'current_registrations' => $schedule->current_registrations,
                    'max_capacity' => $schedule->max_capacity,
                    'previous_status' => $schedule->status,
                    'registrations_count' => 0,
                    'reason' => 'no_registrations'
                ];
                
                $schedule->update(['status' => 'closed']);
                $closedCount++;
            }
            
            // Log the closure operation
            Log::info('Previous exam schedules closed due to registration closure', [
                'settings_id' => $settings->id,
                'exam_end_date' => $settings->exam_end_date,
                'closed_count' => $closedCount,
                'skipped_count' => $skippedCount,
                'closed_schedules' => $closedSchedules,
                'skipped_schedules' => $skippedSchedules,
                'closed_at' => now()
            ]);
            
            return $closedCount;
        } catch (\Exception $e) {
            Log::error('Failed to close previous exam schedules', [
                'settings_id' => $settings->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Generate exam schedules for the given date range
     */
    private function generateExamSchedules($startDate, $endDate, $studentsPerDay, $selectedDates = [], $timeSettings = [])
    {
        $start = \Carbon\Carbon::parse($startDate);
        $end = \Carbon\Carbon::parse($endDate);

        $halfCapacity = $studentsPerDay / 2;
        
        // If no specific dates are selected, fall back to all weekdays in the range
        if (empty($selectedDates)) {
            // Generate new schedules for all weekdays (morning and afternoon sessions)
            for ($date = $start; $date->lte($end); $date->addDay()) {
                // Skip weekends (Saturday = 6, Sunday = 0)
                if ($date->dayOfWeek !== 0 && $date->dayOfWeek !== 6) {
                    $this->createExamSessionsForDate($date, $halfCapacity, $timeSettings);
                }
            }
        } else {
            // Generate schedules only for the specifically selected dates
            foreach ($selectedDates as $selectedDate) {
                $date = \Carbon\Carbon::parse($selectedDate);
                // Only create if the date is within the exam window
                if ($date->between($start, $end)) {
                    $this->createExamSessionsForDate($date, $halfCapacity, $timeSettings);
                }
            }
        }
    }
    
    /**
     * Create morning and afternoon exam sessions for a specific date
     * If the schedule exists and is closed, reopen it
     */
    private function createExamSessionsForDate($date, $halfCapacity, $timeSettings = [])
    {
        // Default times if not provided
        $defaultTimes = [
            'morning_start_time' => '08:00:00',
            'morning_end_time' => '11:00:00',
            'afternoon_start_time' => '13:00:00',
            'afternoon_end_time' => '16:00:00'
        ];
        
        $times = array_merge($defaultTimes, $timeSettings);

        $examDate = $date->format('Y-m-d');

        // Morning session - create if doesn't exist, or reopen if closed
        $existingMorning = ExamSchedule::where('exam_date', $examDate)
            ->where('session', 'morning')
            ->first();

        if (!$existingMorning) {
            ExamSchedule::create([
                'exam_date' => $examDate,
                'session' => 'morning',
                'start_time' => $times['morning_start_time'],
                'end_time' => $times['morning_end_time'],
                'max_capacity' => $halfCapacity,
                'current_registrations' => 0,
                'status' => 'open'
            ]);
        } elseif ($existingMorning->status === 'closed') {
            // Reopen closed schedule, update times and capacity
            $existingMorning->update([
                'start_time' => $times['morning_start_time'],
                'end_time' => $times['morning_end_time'],
                'max_capacity' => $halfCapacity,
                'status' => 'open'
            ]);
            Log::info('[GuidanceController] Reopened closed morning schedule', [
                'exam_date' => $examDate,
                'session' => 'morning',
                'exam_code' => $existingMorning->exam_code
            ]);
        }
        
        // Afternoon session - create if doesn't exist, or reopen if closed
        $existingAfternoon = ExamSchedule::where('exam_date', $examDate)
            ->where('session', 'afternoon')
            ->first();

        if (!$existingAfternoon) {
            ExamSchedule::create([
                'exam_date' => $examDate,
                'session' => 'afternoon',
                'start_time' => $times['afternoon_start_time'],
                'end_time' => $times['afternoon_end_time'],
                'max_capacity' => $halfCapacity,
                'current_registrations' => 0,
                'status' => 'open'
            ]);
        } elseif ($existingAfternoon->status === 'closed') {
            // Reopen closed schedule, update times and capacity
            $existingAfternoon->update([
                'start_time' => $times['afternoon_start_time'],
                'end_time' => $times['afternoon_end_time'],
                'max_capacity' => $halfCapacity,
                'status' => 'open'
            ]);
            Log::info('[GuidanceController] Reopened closed afternoon schedule', [
                'exam_date' => $examDate,
                'session' => 'afternoon',
                'exam_code' => $existingAfternoon->exam_code
            ]);
        }
    }

    /**
     * Assign students to exam dates
     */
    public function assignStudentsToExams()
    {
        try {
            $unassignedStudents = ExamineeRegistration::registered()->get();
            $availableSchedules = ExamSchedule::open()->orderBy('exam_date')->get();

            $assignedCount = 0;
            foreach ($unassignedStudents as $student) {
                foreach ($availableSchedules as $schedule) {
                    if ($schedule->hasAvailableSlots()) {
                        $student->update([
                            'assigned_exam_date' => $schedule->exam_date,
                            'status' => 'assigned'
                        ]);

                        $schedule->increment('current_registrations');
                        if ($schedule->current_registrations >= $schedule->max_capacity) {
                            $schedule->update(['status' => 'full']);
                        }

                        $assignedCount++;
                        break;
                    }
                }
            }

            return back()->with('success', "Successfully assigned {$assignedCount} examinees to exam dates");
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to assign examinees: ' . $e->getMessage()]);
        }
    }

    /**
     * Update exam date for a specific registration
     */
    public function updateExamDate(Request $request, $id)
    {
        $request->validate([
            'assigned_exam_date' => 'required|date',
            'assigned_session' => 'required|in:morning,afternoon',
            'status' => 'nullable|in:registered,assigned,completed,cancelled',
        ]);

        try {
            $registration = ExamineeRegistration::findOrFail($id);
            $oldExamDate = $registration->assigned_exam_date;
            $oldSession = $registration->assigned_session;
            
            Log::info('[GuidanceController] updateExamDate - Moving registration', [
                'registration_id' => $id,
                'old_date' => $oldExamDate,
                'old_session' => $oldSession,
                'old_status' => $registration->status,
                'new_date' => $request->assigned_exam_date,
                'new_session' => $request->assigned_session,
                'new_status' => $request->status
            ]);
            
            // Get the target schedule
            $targetSchedule = ExamSchedule::where('exam_date', $request->assigned_exam_date)
                ->where('session', $request->assigned_session)
                ->first();
            
            if ($targetSchedule) {
                // Schedule exists - allow assignment regardless of capacity
                // Note: Capacity validation removed to allow guidance counselors to override full sessions
                Log::info('[GuidanceController] updateExamDate - Target schedule found', [
                    'date' => $request->assigned_exam_date,
                    'session' => $request->assigned_session,
                    'current_capacity' => $targetSchedule->current_registrations,
                    'max_capacity' => $targetSchedule->max_capacity,
                    'status' => $targetSchedule->status
                ]);
            } else {
                // Schedule doesn't exist, create it
                $settings = ExamRegistrationSetting::getCurrentSettings();
                $halfCapacity = ($settings->students_per_day ?? 100) / 2;
                
                $targetSchedule = ExamSchedule::create([
                    'exam_date' => $request->assigned_exam_date,
                    'session' => $request->assigned_session,
                    'start_time' => $request->assigned_session === 'morning' ? '08:00:00' : '13:00:00',
                    'end_time' => $request->assigned_session === 'morning' ? '11:00:00' : '16:00:00',
                    'max_capacity' => $halfCapacity,
                    'current_registrations' => 0,
                    'status' => 'open'
                ]);
            }
            
            // If there's an old exam date/session, decrement its count
            if ($oldExamDate && $oldSession && 
                ($oldExamDate !== $request->assigned_exam_date || $oldSession !== $request->assigned_session)) {
                $oldSchedule = ExamSchedule::where('exam_date', $oldExamDate)
                    ->where('session', $oldSession)
                    ->first();
                    
                if ($oldSchedule && $oldSchedule->current_registrations > 0) {
                    $oldSchedule->decrement('current_registrations');
                    
                    // Update status of old schedule if it's no longer full
                    if ($oldSchedule->current_registrations < $oldSchedule->max_capacity && $oldSchedule->status === 'full') {
                        $oldSchedule->update(['status' => 'open']);
                    }
                    
                    Log::info('[GuidanceController] updateExamDate - Decremented old schedule', [
                        'old_date' => $oldExamDate,
                        'old_session' => $oldSession,
                        'new_count' => $oldSchedule->current_registrations
                    ]);
                }
            }
            
            // Update the registration
            $updateData = [
                'assigned_exam_date' => $request->assigned_exam_date,
                'assigned_session' => $request->assigned_session,
            ];
            
            // Only update status if provided, otherwise keep current status
            if ($request->has('status') && $request->status) {
                $updateData['status'] = $request->status;
            } else {
                // Default to 'assigned' if no status provided (backward compatibility)
                $updateData['status'] = 'assigned';
            }
            
            $registration->update($updateData);
            
            // If the registration was marked as cancelled, check if the schedule should be closed
            if ($request->has('status') && $request->status === 'cancelled') {
                $this->checkAndCloseSchedulesAfterCancellation();
            }
            
            Log::info('[GuidanceController] updateExamDate - Registration updated', [
                'registration_id' => $id,
                'updated_data' => $updateData,
                'final_status' => $registration->fresh()->status
            ]);

            // Increment the schedule capacity for the new date/session
            $targetSchedule->increment('current_registrations');
            
            // Check if schedule is now full
            if ($targetSchedule->current_registrations >= $targetSchedule->max_capacity) {
                $targetSchedule->update(['status' => 'full']);
            }
            
            Log::info('[GuidanceController] updateExamDate - Incremented new schedule', [
                'new_date' => $request->assigned_exam_date,
                'new_session' => $request->assigned_session,
                'new_count' => $targetSchedule->current_registrations,
                'status' => $targetSchedule->status
            ]);

            return back()->with('success', 'Exam date and session updated successfully');
        } catch (\Exception $e) {
            Log::error('[GuidanceController] updateExamDate - Error', [
                'registration_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return back()->withErrors(['error' => 'Failed to update exam date: ' . $e->getMessage()]);
        }
    }

    /**
     * Force allow an examinee to take the exam today even if the session time passed
     */
    public function forceAllowExamToday(Request $request)
    {
        $validated = $request->validate([
            'registration_id' => 'required|exists:examinee_registrations,id',
        ]);

        $registration = ExamineeRegistration::with('examinee')
            ->findOrFail($validated['registration_id']);

        if (!$registration->assigned_exam_date) {
            return back()->with('error', 'Registration has no assigned date.');
        }

        $today = \Carbon\Carbon::today();
        $assignedDate = \Carbon\Carbon::parse($registration->assigned_exam_date);
        if (!$assignedDate->isSameDay($today)) {
            return back()->with('error', 'Force allow is only available on the assigned exam date.');
        }

        $examineeId = $registration->examinee_id;
        $cacheKey = sprintf('exam_force_allow:%s:%s', $examineeId, $today->toDateString());
        // Allow until end of the day
        $ttl = \Carbon\Carbon::now()->endOfDay();
        Cache::put($cacheKey, true, $ttl);

        Log::info('[GuidanceController] Force allow set', [
            'registration_id' => $registration->id,
            'examinee_id' => $examineeId,
            'date' => $today,
            'cache_key' => $cacheKey,
        ]);

        return back()->with('success', 'Force allow enabled for today. The examinee can start the exam.');
    }

    /**
     * Bulk force allow multiple examinees to take the exam today
     */
    public function bulkForceAllowExamToday(Request $request)
    {
        $validated = $request->validate([
            'registration_ids' => 'required|array|min:1',
            'registration_ids.*' => 'exists:examinee_registrations,id',
        ]);

        $today = \Carbon\Carbon::today();
        $successCount = 0;
        $errorCount = 0;
        $errors = [];

        foreach ($validated['registration_ids'] as $registrationId) {
            try {
                $registration = ExamineeRegistration::with('examinee')
                    ->findOrFail($registrationId);

                if (!$registration->assigned_exam_date) {
                    $errors[] = "Registration ID {$registrationId}: No assigned date";
                    $errorCount++;
                    continue;
                }

                $assignedDate = \Carbon\Carbon::parse($registration->assigned_exam_date);
                if (!$assignedDate->isSameDay($today)) {
                    $errors[] = "Registration ID {$registrationId}: Not assigned for today";
                    $errorCount++;
                    continue;
                }

                $examineeId = $registration->examinee_id;
                $cacheKey = sprintf('exam_force_allow:%s:%s', $examineeId, $today->toDateString());
                $ttl = \Carbon\Carbon::now()->endOfDay();
                Cache::put($cacheKey, true, $ttl);

                Log::info('[GuidanceController] Bulk force allow set', [
                    'registration_id' => $registration->id,
                    'examinee_id' => $examineeId,
                    'date' => $today,
                    'cache_key' => $cacheKey,
                ]);

                $successCount++;
            } catch (\Exception $e) {
                $errors[] = "Registration ID {$registrationId}: " . $e->getMessage();
                $errorCount++;
            }
        }

        if ($successCount > 0) {
            $message = "Force allow enabled for {$successCount} examinee(s).";
            if ($errorCount > 0) {
                $message .= " {$errorCount} failed: " . implode(', ', $errors);
            }
            return back()->with('success', $message);
        } else {
            return back()->with('error', 'No examinees could be force allowed. Errors: ' . implode(', ', $errors));
        }
    }

    /**
     * Bulk reschedule multiple registrations
     */
    public function bulkRescheduleRegistrations(Request $request)
    {
        $validated = $request->validate([
            'registration_ids' => 'required|array|min:1',
            'registration_ids.*' => 'exists:examinee_registrations,id',
            'assigned_exam_date' => 'required|date',
            'assigned_session' => 'required|in:morning,afternoon',
        ]);

        // Find the matching schedule
        $schedule = ExamSchedule::where('exam_date', $validated['assigned_exam_date'])
            ->where('session', $validated['assigned_session'])
            ->first();

        if (!$schedule) {
            return back()->with('error', 'Selected schedule was not found.');
        }

        // Check if there's enough capacity for all registrations
        $requestedCount = count($validated['registration_ids']);
        $availableCapacity = $schedule->max_capacity - $schedule->current_registrations;

        if ($schedule->status === 'closed') {
            return back()->with('error', 'Selected schedule is closed.');
        }

        if ($availableCapacity < $requestedCount) {
            return back()->with('error', "Not enough capacity. Available: {$availableCapacity}, Requested: {$requestedCount}");
        }

        $successCount = 0;
        $errorCount = 0;
        $errors = [];

        foreach ($validated['registration_ids'] as $registrationId) {
            try {
                $registration = ExamineeRegistration::findOrFail($registrationId);
                
                // Update the registration
                $registration->update([
                    'assigned_exam_date' => $validated['assigned_exam_date'],
                    'assigned_session' => $validated['assigned_session'],
                    'status' => 'assigned',
                ]);

                $successCount++;
            } catch (\Exception $e) {
                $errors[] = "Registration ID {$registrationId}: " . $e->getMessage();
                $errorCount++;
            }
        }

        // Update schedule capacity
        if ($successCount > 0) {
            $schedule->increment('current_registrations', $successCount);
        }

        if ($successCount > 0) {
            $message = "Successfully rescheduled {$successCount} examinee(s).";
            if ($errorCount > 0) {
                $message .= " {$errorCount} failed: " . implode(', ', $errors);
            }
            return back()->with('success', $message);
        } else {
            return back()->with('error', 'No registrations could be rescheduled. Errors: ' . implode(', ', $errors));
        }
    }

    /**
     * Update exam schedule details
     */
    public function updateExamSchedule(Request $request, $id)
    {
        $request->validate([
            'exam_date' => 'required|date',
            'start_time' => 'required|string',
            'end_time' => 'required|string',
            'max_capacity' => 'required|integer|min:1|max:100',
            'status' => 'required|in:open,full,closed',
        ]);

        try {
            $schedule = ExamSchedule::findOrFail($id);
            
            // Update the schedule
            $schedule->update([
                'exam_date' => $request->exam_date,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'max_capacity' => $request->max_capacity,
                'status' => $request->status
            ]);

            return back()->with('success', 'Exam schedule updated successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to update exam schedule: ' . $e->getMessage()]);
        }
    }

    /**
     * Reschedule examinees from one date to another
     */
    public function rescheduleExaminees(Request $request)
    {
        $request->validate([
            'from_date' => 'required|date',
            'to_date' => 'required|date',
            'to_session' => 'required|in:morning,afternoon',
        ]);

        try {
            $fromDate = $request->from_date;
            $toDate = $request->to_date;
            $toSession = $request->to_session;

            // Find all registrations assigned to the from_date
            $registrations = ExamineeRegistration::where('assigned_exam_date', $fromDate)
                ->whereIn('status', ['assigned', 'registered'])
                ->get();

            if ($registrations->isEmpty()) {
                return back()->with('error', 'No examinees found for the specified date.');
            }

            // Check if target schedule can accommodate all examinees
            $targetSchedule = ExamSchedule::where('exam_date', $toDate)
                ->where('session', $toSession)
                ->first();

            if (!$targetSchedule) {
                return back()->with('error', 'Target schedule not found for the specified date and session.');
            }

            $availableSlots = $targetSchedule->max_capacity - $targetSchedule->current_registrations;
            $examineeCount = $registrations->count();

            if ($availableSlots < $examineeCount) {
                return back()->with('error', "Cannot reschedule: Target session only has {$availableSlots} available slots, but {$examineeCount} examinees need to be moved.");
            }

            // Update all registrations
            $updatedCount = 0;
            foreach ($registrations as $registration) {
                $registration->update([
                    'assigned_exam_date' => $toDate,
                    'assigned_session' => $toSession,
                    'status' => 'assigned'
                ]);
                $updatedCount++;
            }

            // Update schedule counts
            $this->syncScheduleCounts();

            $successMessage = "Successfully rescheduled {$updatedCount} examinees from " . 
                           \Carbon\Carbon::parse($fromDate)->format('M d, Y') . 
                           " to " . \Carbon\Carbon::parse($toDate)->format('M d, Y') . 
                           " ({$toSession} session).";

            return back()->with('success', $successMessage);

        } catch (\Exception $e) {
            Log::error('Reschedule examinees failed: ' . $e->getMessage());
            return back()->with('error', 'Failed to reschedule examinees: ' . $e->getMessage());
        }
    }



    /**
     * Update guidance counselor password
     */
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

    /**
     * Fix data consistency - update status to 'assigned' for registrations that have schedules but status is 'registered'
     */
    public function fixRegistrationStatuses()
    {
        try {
            // Find registrations that have assigned_exam_date and assigned_session but status is 'registered'
            $inconsistentRegistrations = ExamineeRegistration::where('status', 'registered')
                ->whereNotNull('assigned_exam_date')
                ->whereNotNull('assigned_session')
                ->get();

            $updatedCount = 0;
            foreach ($inconsistentRegistrations as $registration) {
                $registration->update(['status' => 'assigned']);
                $updatedCount++;
                
                Log::info('[GuidanceController] fixRegistrationStatuses - Updated registration', [
                    'registration_id' => $registration->id,
                    'examinee_id' => $registration->examinee_id,
                    'assigned_date' => $registration->assigned_exam_date,
                    'assigned_session' => $registration->assigned_session,
                    'old_status' => 'registered',
                    'new_status' => 'assigned'
                ]);
            }

            return back()->with('success', "Fixed {$updatedCount} registration statuses. All registrations with assigned schedules now have 'assigned' status.");
        } catch (\Exception $e) {
            Log::error('[GuidanceController] fixRegistrationStatuses - Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return back()->withErrors(['error' => 'Failed to fix registration statuses: ' . $e->getMessage()]);
        }
    }

    /**
     * Automatically mark expired examinees as no-show (internal method)
     */
    private function autoMarkExpiredExaminees()
    {
        try {
            $today = now()->toDateString();
            
            // Find examinees who have passed their assigned exam date and are still assigned/registered
            $expiredRegistrations = ExamineeRegistration::where('assigned_exam_date', '<', $today)
                ->whereIn('status', ['assigned', 'registered'])
                ->get();
            
            $markedCount = 0;
            foreach ($expiredRegistrations as $registration) {
                $registration->update(['status' => 'cancelled']);
                $markedCount++;
            }
            
            if ($markedCount > 0) {
                Log::info('[GuidanceController] Auto-marked expired examinees as no-show', [
                    'marked_count' => $markedCount,
                    'today' => $today,
                    'triggered_by' => 'page_load'
                ]);
            }
            
        } catch (\Exception $e) {
            Log::error('[GuidanceController] Error during auto-marking expired examinees', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Auto-mark examinees as no-show if they have passed their assigned exam date (public method for manual trigger)
     */
    public function autoMarkNoShows()
    {
        try {
            $today = now()->toDateString();
            
            // Find examinees who have passed their assigned exam date and are still assigned/registered
            $expiredRegistrations = ExamineeRegistration::where('assigned_exam_date', '<', $today)
                ->whereIn('status', ['assigned', 'registered'])
                ->get();
            
            $markedCount = 0;
            $markedExaminees = [];
            
            foreach ($expiredRegistrations as $registration) {
                $registration->update(['status' => 'cancelled']);
                $markedCount++;
                $markedExaminees[] = [
                    'id' => $registration->id,
                    'examinee_name' => $registration->examinee->user->username ?? 'Unknown',
                    'assigned_date' => $registration->assigned_exam_date,
                    'assigned_session' => $registration->assigned_session
                ];
            }
            
            Log::info('[GuidanceController] autoMarkNoShows - Marked examinees as no-show', [
                'marked_count' => $markedCount,
                'today' => $today,
                'marked_examinees' => $markedExaminees
            ]);
            
            $message = $markedCount > 0 
                ? "Successfully marked {$markedCount} examinees as no-show"
                : "No examinees found that need to be marked as no-show";
            
            return back()->with('success', $message);
            
        } catch (\Exception $e) {
            Log::error('[GuidanceController] autoMarkNoShows - Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->with('error', 'Failed to auto-mark no-shows: ' . $e->getMessage());
        }
    }

    /**
     * Bulk update cancelled examinees (allow retake or reschedule)
     */
    public function bulkUpdateCancelled(Request $request)
    {
        try {
            $registrationIds = $request->input('registration_ids', []);
            $action = $request->input('action');
            $assignedExamDate = $request->input('assigned_exam_date');
            $assignedSession = $request->input('assigned_session');

            if (empty($registrationIds) || !$action) {
                return back()->with('error', 'Invalid request parameters');
            }

            $updatedCount = 0;
            $updatedExaminees = [];
            $deletedCount = 0;

            foreach ($registrationIds as $id) {
                $registration = ExamineeRegistration::find($id);
                
                if (!$registration) {
                    continue;
                }

                // For delete action, skip status check and delete directly
                if ($action === 'delete') {
                    try {
                        $examineeName = $registration->examinee->user->username ?? 'Unknown';
                        $registrationId = $registration->id;
                        
                        Log::info('[GuidanceController] bulkUpdateCancelled - Deleting registration', [
                            'registration_id' => $registrationId,
                            'examinee_name' => $examineeName
                        ]);
                        
                        $registration->delete();
                        $deletedCount++;
                        $updatedExaminees[] = [
                            'id' => $registrationId,
                            'examinee_name' => $examineeName,
                            'action' => 'deleted'
                        ];
                    } catch (\Exception $e) {
                        Log::error('[GuidanceController] bulkUpdateCancelled - Failed to delete registration', [
                            'registration_id' => $id,
                            'error' => $e->getMessage()
                        ]);
                    }
                    continue;
                }

                // For other actions, check if status is cancelled
                if ($registration->status !== 'cancelled') {
                    continue;
                }

                $updateData = [];
                
                if ($action === 'retake') {
                    // Allow retake - change status to 'registered' and clear assigned date
                    $updateData = [
                        'status' => 'registered',
                        'assigned_exam_date' => null,
                        'assigned_session' => null
                    ];
                } elseif ($action === 'reschedule') {
                    // Reschedule - change status to 'assigned' and set new date/session
                    if (!$assignedExamDate || !$assignedSession) {
                        continue;
                    }
                    $updateData = [
                        'status' => 'assigned',
                        'assigned_exam_date' => $assignedExamDate,
                        'assigned_session' => $assignedSession
                    ];
                } elseif ($action === 'archive') {
                    // Archive - change status to 'archived'
                    $updateData = [
                        'status' => 'archived'
                    ];
                }

                if (!empty($updateData)) {
                    $registration->update($updateData);
                    $updatedCount++;
                    $updatedExaminees[] = [
                        'id' => $registration->id,
                        'examinee_name' => $registration->examinee->user->username ?? 'Unknown',
                        'action' => $action
                    ];
                }
            }

            Log::info('[GuidanceController] bulkUpdateCancelled - Processed cancelled examinees', [
                'action' => $action,
                'updated_count' => $updatedCount,
                'deleted_count' => $deletedCount,
                'updated_examinees' => $updatedExaminees,
                'assigned_exam_date' => $assignedExamDate,
                'assigned_session' => $assignedSession
            ]);

            if ($action === 'delete') {
                $message = "Successfully deleted {$deletedCount} examinee registration" . ($deletedCount !== 1 ? 's' : '') . " from the database";
            } else {
                $message = $action === 'retake' 
                    ? "Successfully allowed {$updatedCount} examinee" . ($updatedCount !== 1 ? 's' : '') . " to retake the exam"
                    : ($action === 'archive'
                        ? "Successfully archived {$updatedCount} examinee" . ($updatedCount !== 1 ? 's' : '') . ""
                        : "Successfully rescheduled {$updatedCount} examinee" . ($updatedCount !== 1 ? 's' : '') . " to new date");
            }

            return back()->with('success', $message);

        } catch (\Exception $e) {
            Log::error('[GuidanceController] bulkUpdateCancelled - Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return back()->with('error', 'Failed to update examinees: ' . $e->getMessage());
        }
    }

    /**
     * Manual trigger to sync all schedule counts (for testing/admin purposes)
     */
    public function syncScheduleCounts()
    {
        try {
            $this->syncAllScheduleCounts();
            return back()->with('success', 'Schedule counts have been synchronized successfully');
        } catch (\Exception $e) {
            Log::error('[GuidanceController] Manual sync failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return back()->withErrors(['error' => 'Failed to sync schedule counts: ' . $e->getMessage()]);
        }
    }

    /**
     * Manually check and close schedules where all examinees are completed
     */
    public function closeCompletedSchedules()
    {
        try {
            $closedCount = 0;
            $checkedSchedules = 0;
            
            // Get all schedules that are not already closed
            $schedules = ExamSchedule::where('status', '!=', 'closed')->get();
            
            foreach ($schedules as $schedule) {
                $checkedSchedules++;
                
                // Get all registrations for this schedule
                $allRegistrations = ExamineeRegistration::where('assigned_exam_date', $schedule->exam_date)
                    ->where('assigned_session', $schedule->session)
                    ->count();

                if ($allRegistrations === 0) {
                    continue; // No registrations for this schedule
                }

                // Count completed registrations
                $completedRegistrations = ExamineeRegistration::where('assigned_exam_date', $schedule->exam_date)
                    ->where('assigned_session', $schedule->session)
                    ->whereIn('status', ['completed', 'finished'])
                    ->count();

                // If all registrations are completed, close the schedule
                if ($completedRegistrations === $allRegistrations) {
                    $schedule->update(['status' => 'closed']);
                    $closedCount++;
                    
                    Log::info('[GuidanceController] Schedule closed - all examinees completed', [
                        'exam_date' => $schedule->exam_date,
                        'session' => $schedule->session,
                        'total_registrations' => $allRegistrations,
                        'completed_registrations' => $completedRegistrations,
                        'schedule_id' => $schedule->id
                    ]);
                }
            }
            
            // After closing schedules, check if all schedules are now closed
            $this->checkAndCloseRegistrationWindowIfAllSchedulesClosed();

            Log::info('[GuidanceController] Manual close completed schedules check finished', [
                'checked_schedules' => $checkedSchedules,
                'closed_schedules' => $closedCount
            ]);
            
            return back()->with('success', "Checked {$checkedSchedules} schedules. Closed {$closedCount} schedules where all examinees completed their exams.");
        } catch (\Exception $e) {
            Log::error('[GuidanceController] Failed to close completed schedules', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors(['error' => 'Failed to close completed schedules: ' . $e->getMessage()]);
        }
    }

    /**
     * Display evaluator management page
     */
    public function evaluatorManagement()
    {
        $user = Auth::user();
        $guidanceCounselor = $user->guidanceCounselor;

        $evaluators = User::where('role', 'evaluator')
            ->with('evaluator')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'name' => $user->evaluator->name ?? 'N/A',
                    'department' => $user->evaluator->Department ?? 'N/A',
                    'created_at' => $user->created_at->format('M d, Y'),
                ];
            });

        return Inertia::render('Guidance/EvaluatorManagement', [
            'user' => $user,
            'guidanceCounselor' => $guidanceCounselor,
            'evaluators' => $evaluators
        ]);
    }

    /**
     * Create a new evaluator account
     */
    public function createEvaluator(Request $request)
    {
        $request->validate([
            'username' => 'required|string|unique:users,username|min:3|max:50',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'name' => 'required|string|max:255',
            'department' => 'required|string|max:255',
        ]);

        try {
            DB::beginTransaction();

            // Create user account
            $user = User::create([
                'username' => $request->username,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => 'evaluator'
            ]);

            // Create evaluator profile
            $user->evaluator()->create([
                'name' => $request->name,
                'Department' => $request->department
            ]);

            DB::commit();

            return back()->with('success', 'Evaluator account created successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to create evaluator account: ' . $e->getMessage()]);
        }
    }

    /**
     * Delete an evaluator account
     */
    public function deleteEvaluator($id)
    {
        try {
            $user = User::where('role', 'evaluator')->findOrFail($id);
            
            // Delete the user (this will cascade delete the evaluator profile)
            $user->delete();

            return back()->with('success', 'Evaluator account deleted successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to delete evaluator account: ' . $e->getMessage()]);
        }
    }

    /**
     * Display the question builder page
     */
    public function questionBuilder()
    {
        $user = Auth::user();
        
        // Get existing categories for suggestions
        $categories = QuestionBank::select('category')
            ->distinct()
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->orderBy('category')
            ->pluck('category')
            ->toArray();

        return Inertia::render('Guidance/QuestionBuilder', [
            'user' => $user,
            'categories' => $categories
        ]);
    }

    /**
     * Bulk create questions from the question builder
     */
    public function bulkCreateQuestions(Request $request)
    {
        try {
            $questionsData = json_decode($request->input('questions'), true);
            
            if (!$questionsData || !is_array($questionsData)) {
                return back()->withErrors(['error' => 'Invalid questions data']);
            }

            $createdCount = 0;
            $errors = [];

            DB::beginTransaction();

            foreach ($questionsData as $index => $questionData) {
                try {
                    // Validate required fields
                    if (empty($questionData['question']) || empty($questionData['category'])) {
                        $errors[] = "Question " . ($index + 1) . ": Missing required fields (question text and category)";
                        continue;
                    }

                    // Create the question
                    $question = QuestionBank::create([
                        'question' => $questionData['question'],
                        'option1' => $questionData['option1'] ?? '',
                        'option2' => $questionData['option2'] ?? '',
                        'option3' => $questionData['option3'] ?? '',
                        'option4' => $questionData['option4'] ?? '',
                        'option5' => $questionData['option5'] ?? '',
                        'correct_answer' => $questionData['correct_answer'] ?? 'A',
                        'category' => $questionData['category'],
                        'direction' => $questionData['direction'] ?? '',
                        'image' => $questionData['image'] ?? null,
                        'option1_image' => $questionData['option1_image'] ?? null,
                        'option2_image' => $questionData['option2_image'] ?? null,
                        'option3_image' => $questionData['option3_image'] ?? null,
                        'option4_image' => $questionData['option4_image'] ?? null,
                        'option5_image' => $questionData['option5_image'] ?? null,
                        'status' => 1, // Active
                        'created_by' => Auth::id(),
                    ]);

                    $createdCount++;
                } catch (\Exception $e) {
                    $errors[] = "Question " . ($index + 1) . ": " . $e->getMessage();
                }
            }

            if ($createdCount > 0) {
                DB::commit();
                return back()->with('success', "Successfully created {$createdCount} question(s)");
            } else {
                DB::rollBack();
                return back()->withErrors(['error' => 'No questions were created. Errors: ' . implode(', ', $errors)]);
            }

        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to create questions: ' . $e->getMessage()]);
        }
    }

    /**
     * Display the exam monitoring page
     */
    public function examMonitoring()
    {
        $user = Auth::user();
        return Inertia::render('Guidance/ExamMonitoring', [
            'user' => $user
        ]);
    }

    /**
     * Get current exam statuses for regular exams
     */
    public function getExamStatuses()
    {
        try {
            Log::info('[ExamMonitoring] getExamStatuses called');
            
            // Filter scope: if the logged-in user is an evaluator, limit to their department exams (departmental)
            $evaluatorDepartment = null;
            try {
                $userId = Auth::id();
                if ($userId) {
                    $evaluator = \App\Models\Evaluator::where('accountId', $userId)->first();
                    if ($evaluator && !empty($evaluator->Department)) {
                        $evaluatorDepartment = $evaluator->Department;
                    }
                }
            } catch (\Throwable $t) {}

            // First, let's check all exam results with started_at
            $allStartedResults = ExamResult::whereNotNull('started_at')->get();
            Log::info('[ExamMonitoring] All exam results with started_at:', [
                'count' => $allStartedResults->count(),
                'results' => $allStartedResults->map(function($r) {
                    return [
                        'id' => $r->id,
                        'examineeId' => $r->examineeId,
                        'examId' => $r->examId,
                        'started_at' => $r->started_at,
                        'finished_at' => $r->finished_at
                    ];
                })->toArray()
            ]);
            
            // Get exam results that are currently active (started but not finished, or finished within last minute)
            // NOTE: The exams table uses `examId` as PK and the column for human label is `exam-ref-no` (no exam_title).
            //       Select the proper columns and alias `exam-ref-no` for convenient access.
            $examQuery = ExamResult::with(['examinee:id,lname,fname,mname', 'exam:examId,exam-ref-no as exam_ref_no'])
                ->whereNotNull('started_at')
                ->where(function($query) {
                    $query->whereNull('finished_at') // Currently taking
                          ->orWhere('finished_at', '>', now()->subMinute()); // Done (last minute)
                })
                ->select('examineeId', 'examId', 'started_at', 'finished_at', 'remarks');

            // Regular entrance exams are not departmental; do NOT filter those by evaluator department
            $examStatuses = $examQuery
                ->get()
                ->map(function($result) {
                    return [
                        'examinee_id' => $result->examineeId,
                        'examinee_name' => $result->examinee ? ($result->examinee->fname . ' ' . ($result->examinee->mname ? $result->examinee->mname . ' ' : '') . $result->examinee->lname) : 'Unknown',
                        'exam_id' => $result->examId,
                        // Use exam reference number as the display title for entrance exams
                        'exam_title' => $result->exam->exam_ref_no ?? 'Entrance Exam',
                        'started_at' => $result->started_at,
                        'finished_at' => $result->finished_at,
                        'status' => $result->finished_at ? 'done' : 'taking',
                        'exam_type' => 'regular',
                        'remarks' => $result->remarks // Include phase information
                    ];
                });

            Log::info('[ExamMonitoring] Regular exam statuses fetched', [
                'count' => $examStatuses->count(),
                'taking' => $examStatuses->where('status', 'taking')->count(),
                'done' => $examStatuses->where('status', 'done')->count(),
                'data' => $examStatuses->toArray()
            ]);

            return response()->json([
                'success' => true,
                'data' => $examStatuses
            ]);

        } catch (\Exception $e) {
            Log::error('[ExamMonitoring] Error fetching regular exam statuses: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch exam statuses',
                'data' => []
            ], 500);
        }
    }

    /**
     * Get current exam statuses for departmental exams
     */
    public function getDepartmentalExamStatuses()
    {
        try {
            // Determine evaluator department (if user is an evaluator)
            $evaluatorDepartment = null;
            try {
                $userId = Auth::id();
                if ($userId) {
                    $evaluator = \App\Models\Evaluator::where('accountId', $userId)->first();
                    if ($evaluator && !empty($evaluator->Department)) {
                        $evaluatorDepartment = $evaluator->Department;
                    }
                }
            } catch (\Throwable $t) {
                // No-op: default to showing all if evaluator not found
            }

            // Get departmental exam results that are currently active (created within last 2 hours, or finished within last minute)
            $query = \App\Models\DepartmentExamResult::with([
                'examinee:id,lname,fname,mname', 
                'departmentExam:id,exam_title,evaluator_id',
                'departmentExam.evaluator:id,Department'
            ]);

            // If current user is an evaluator, restrict to their department
            if ($evaluatorDepartment) {
                $query->whereHas('departmentExam.evaluator', function($q) use ($evaluatorDepartment) {
                    $q->where('Department', $evaluatorDepartment);
                });
            }

            $departmentalStatuses = $query
                // Keep only rows that are effectively "active":
                // - placeholders with remarks In Progress (taking)
                // - or recently updated (done within last minute)
                ->where(function($q) {
                    $q->where('remarks', 'In Progress')
                      ->orWhere('updated_at', '>', now()->subMinute());
                })
                ->select('examinee_id', 'department_exam_id', 'created_at')
                ->get()
                ->map(function($result) {
                    // Determine status based on timing
                    $isTaking = ($result->remarks === 'In Progress');
                    $isRecent = $result->updated_at > now()->subMinute();
                    $status = $isTaking ? 'taking' : ($isRecent ? 'done' : 'taking');
                    
                    return [
                        'examinee_id' => $result->examinee_id,
                        'examinee_name' => $result->examinee ? ($result->examinee->fname . ' ' . ($result->examinee->mname ? $result->examinee->mname . ' ' : '') . $result->examinee->lname) : 'Unknown',
                        'exam_id' => $result->department_exam_id,
                        'exam_title' => $result->departmentExam->exam_title ?? 'Unknown Exam',
                        'department' => optional(optional($result->departmentExam)->evaluator)->Department ?? 'Unknown',
                        'started_at' => $result->created_at,
                        'finished_at' => !$isTaking && $isRecent ? $result->updated_at : null,
                        'status' => $status,
                        'exam_type' => 'departmental'
                    ];
                });

            Log::info('[ExamMonitoring] Departmental exam statuses fetched', [
                'count' => $departmentalStatuses->count(),
                'taking' => $departmentalStatuses->where('status', 'taking')->count(),
                'done' => $departmentalStatuses->where('status', 'done')->count()
            ]);

            return response()->json([
                'success' => true,
                'data' => $departmentalStatuses
            ]);

        } catch (\Exception $e) {
            Log::error('[ExamMonitoring] Error fetching departmental exam statuses: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch departmental exam statuses',
                'data' => []
            ], 500);
        }
    }

    /**
     * Helper function to format image data properly
     */
    private function formatImageData($imageData)
    {
        if (empty($imageData)) {
            Log::info('formatImageData: Empty image data');
            return null;
        }
        
        // Check if it's already a data URI
        if (str_starts_with($imageData, 'data:')) {
            // Validate that it's a proper data URI
            if (str_contains($imageData, 'base64,')) {
                $base64Part = substr($imageData, strpos($imageData, 'base64,') + 7);
                // Test if the base64 data is valid
                if (base64_decode($base64Part, true) !== false) {
                    Log::info('formatImageData: Valid data URI', [
                        'length' => strlen($imageData),
                        'start' => substr($imageData, 0, 50)
                    ]);
                    return $imageData;
                } else {
                    Log::warning('formatImageData: Invalid base64 data in data URI', [
                        'length' => strlen($imageData),
                        'start' => substr($imageData, 0, 50)
                    ]);
                    return null;
                }
            } else {
                Log::warning('formatImageData: Data URI without base64', [
                    'length' => strlen($imageData),
                    'start' => substr($imageData, 0, 50)
                ]);
                return null;
            }
        }
        
        // Check if it's already base64 encoded but without data URI prefix
        if (base64_decode($imageData, true) !== false && strlen($imageData) > 100) {
            // It's likely base64 encoded data without the data URI prefix
            $encoded = 'data:image/png;base64,' . $imageData;
            Log::info('formatImageData: Added data URI prefix to base64 data', [
                'original_length' => strlen($imageData),
                'encoded_length' => strlen($encoded),
                'encoded_start' => substr($encoded, 0, 50)
            ]);
            return $encoded;
        }
        
        // If it's raw binary data, encode it
        $encoded = 'data:image/png;base64,' . base64_encode($imageData);
        Log::info('formatImageData: Encoded raw binary data', [
            'original_length' => strlen($imageData),
            'encoded_length' => strlen($encoded),
            'encoded_start' => substr($encoded, 0, 50)
        ]);
        return $encoded;
    }

    /**
     * Download exam as PDF for guidance
     */
    public function downloadExamPdf($id)
    {
        try {
            // Get the exam with questions
            $exam = Exam::with(['questions', 'personalityQuestions'])->findOrFail($id);
            
            // Get the guidance counselor info
            $user = Auth::user();
            $guidanceCounselor = $user->guidanceCounselor;
            
            // Prepare exam data
            $examData = [
                'exam_ref_no' => $exam->exam_ref_no,
                'exam_title' => 'Guidance Assessment Exam',
                'time_limit' => $exam->time_limit,
                'total_questions' => $exam->questions->count(),
                'include_personality_test' => $exam->include_personality_test,
                'personality_questions_count' => $exam->personalityQuestions->count(),
            ];
            
        // Define the desired category order
        $categoryOrder = ['English', 'Filipino', 'Mathematics', 'Science', 'Abstract Reasoning'];
        
        // Prepare questions data and organize by categories
        $questionsByCategory = $exam->questions->groupBy('category')->sortBy(function ($categoryQuestions, $category) use ($categoryOrder) {
            $index = array_search($category, $categoryOrder);
            return $index !== false ? $index : 999; // Put unknown categories at the end
        })->map(function ($categoryQuestions, $category) {
            return $categoryQuestions->map(function ($question) {
                // Debug logging for image data
                Log::info('Processing question images', [
                    'question_id' => $question->id,
                    'category' => $question->category,
                    'has_main_image' => !empty($question->image),
                    'main_image_length' => $question->image ? strlen($question->image) : 0,
                    'main_image_start' => $question->image ? substr($question->image, 0, 50) : 'null',
                    'has_option1_image' => !empty($question->option1_image),
                    'option1_image_length' => $question->option1_image ? strlen($question->option1_image) : 0,
                    'option1_image_start' => $question->option1_image ? substr($question->option1_image, 0, 50) : 'null',
                ]);
                    
                return [
                    'question' => $question->question,
                    'option1' => $question->option1,
                    'option2' => $question->option2,
                    'option3' => $question->option3,
                    'option4' => $question->option4,
                    'option5' => $question->option5,
                    'correct_answer' => $question->correct_answer,
                    'category' => $question->category,
                    'direction' => $question->direction,
                    'image' => $this->formatImageData($question->image),
                    'option1_image' => $this->formatImageData($question->option1_image),
                    'option2_image' => $this->formatImageData($question->option2_image),
                    'option3_image' => $this->formatImageData($question->option3_image),
                    'option4_image' => $this->formatImageData($question->option4_image),
                    'option5_image' => $this->formatImageData($question->option5_image),
                    'has_image' => !empty($question->image),
                    'has_option_images' => [
                        'option1' => !empty($question->option1_image),
                        'option2' => !empty($question->option2_image),
                        'option3' => !empty($question->option3_image),
                        'option4' => !empty($question->option4_image),
                        'option5' => !empty($question->option5_image)
                    ],
                ];
            })->toArray();
        })->toArray();
        
        // Flatten all questions for answer key - MUST match the display order in $questionsByCategory
        $allQuestions = [];
        foreach ($questionsByCategory as $category => $questions) {
            foreach ($questions as $question) {
                $allQuestions[] = [
                    'correct_answer' => $question['correct_answer'],
                    'category' => $question['category'],
                ];
            }
        }
            
            // Main OCC logo
            $mainLogo = asset('OCC logo.png');
            
        Log::info('Generating guidance exam PDF', [
            'exam_id' => $id,
            'exam_ref_no' => $exam->exam_ref_no,
            'categories' => array_keys($questionsByCategory),
            'total_questions' => count($allQuestions),
            'logo_path' => $mainLogo,
            'questions_by_category' => array_map(function($cat) { return count($cat); }, $questionsByCategory)
        ]);
            
            return response()->view('guidance.exam_pdf', [
                'guidanceCounselor' => $guidanceCounselor,
                'exam' => $examData,
                'questionsByCategory' => $questionsByCategory,
                'allQuestions' => $allQuestions,
                'generatedAt' => now()->format('M d, Y H:i'),
                'logo' => $mainLogo,
            ])->header('Content-Type', 'text/html; charset=utf-8');
            
        } catch (\Exception $e) {
            Log::error('Error generating guidance exam PDF', [
                'exam_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json(['error' => 'Failed to generate PDF'], 500);
        }
    }

    /**
     * Get question difficulty analysis for guidance dashboard
     */
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
            $timeThreshold = $request->time_threshold ?? 60; // Default 1 minute

            // Build the base query
            $query = DB::table('examinee_answer as ea')
                ->join('question_bank as qb', 'ea.questionId', '=', 'qb.questionId')
                ->join('exams as e', 'ea.examId', '=', 'e.examId')
                ->whereNotNull('ea.time_spent_seconds')
                ->where('ea.time_spent_seconds', '>', 0);

            // Apply filters
            if ($examId) {
                $query->where('ea.examId', $examId);
            }

            if ($dateFrom) {
                $query->whereDate('ea.created_at', '>=', $dateFrom);
            }

            if ($dateTo) {
                $query->whereDate('ea.created_at', '<=', $dateTo);
            }

                   // Get question difficulty statistics
                   $questionStats = $query
                       ->select([
                           'ea.questionId',
                           'qb.question',
                           'qb.category',
                           'e.exam-ref-no as exam_ref_no',
                           DB::raw('COUNT(*) as total_attempts'),
                           DB::raw('AVG(ea.time_spent_seconds) as avg_time_seconds'),
                           DB::raw('MIN(ea.time_spent_seconds) as min_time_seconds'),
                           DB::raw('MAX(ea.time_spent_seconds) as max_time_seconds'),
                           DB::raw('COUNT(CASE WHEN ea.time_spent_seconds > ' . $timeThreshold . ' THEN 1 END) as slow_attempts'),
                           DB::raw('ROUND((COUNT(CASE WHEN ea.time_spent_seconds > ' . $timeThreshold . ' THEN 1 END) / COUNT(*)) * 100, 1) as slow_percentage'),
                           DB::raw('COUNT(CASE WHEN (ea.is_correct = 0 OR (ea.is_correct IS NULL AND UPPER(TRIM(COALESCE(ea.selected_answer, \'\'))) != UPPER(TRIM(COALESCE(qb.correct_answer, \'\'))))) THEN 1 END) as wrong_attempts'),
                           DB::raw('COUNT(CASE WHEN (ea.is_correct = 1 OR (ea.is_correct IS NULL AND UPPER(TRIM(COALESCE(ea.selected_answer, \'\'))) = UPPER(TRIM(COALESCE(qb.correct_answer, \'\'))))) THEN 1 END) as correct_attempts'),
                           DB::raw('ROUND((COUNT(CASE WHEN (ea.is_correct = 0 OR (ea.is_correct IS NULL AND UPPER(TRIM(COALESCE(ea.selected_answer, \'\'))) != UPPER(TRIM(COALESCE(qb.correct_answer, \'\'))))) THEN 1 END) * 100.0 / COUNT(*)), 1) as wrong_percentage'),
                           DB::raw('ROUND((COUNT(CASE WHEN (ea.is_correct = 1 OR (ea.is_correct IS NULL AND UPPER(TRIM(COALESCE(ea.selected_answer, \'\'))) = UPPER(TRIM(COALESCE(qb.correct_answer, \'\'))))) THEN 1 END) * 100.0 / COUNT(*)), 1) as correct_percentage')
                       ])
                       ->groupBy('ea.questionId', 'qb.question', 'qb.category', 'e.exam-ref-no')
                       ->orderByRaw('(COUNT(CASE WHEN (ea.is_correct = 0 OR (ea.is_correct IS NULL AND UPPER(TRIM(COALESCE(ea.selected_answer, \'\'))) != UPPER(TRIM(COALESCE(qb.correct_answer, \'\'))))) THEN 1 END) * 100.0 / COUNT(*)) DESC, ea.questionId ASC')
                       ->get();

                   // Get overall statistics (create a fresh query without GROUP BY)
                   $overallStats = DB::table('examinee_answer as ea')
                       ->join('question_bank as qb', 'ea.questionId', '=', 'qb.questionId')
                       ->join('exams as e', 'ea.examId', '=', 'e.examId')
                       ->whereNotNull('ea.time_spent_seconds')
                       ->where('ea.time_spent_seconds', '>', 0)
                       ->when($examId, function($q) use ($examId) {
                           return $q->where('ea.examId', $examId);
                       })
                       ->when($dateFrom, function($q) use ($dateFrom) {
                           return $q->whereDate('ea.created_at', '>=', $dateFrom);
                       })
                       ->when($dateTo, function($q) use ($dateTo) {
                           return $q->whereDate('ea.created_at', '<=', $dateTo);
                       })
                       ->select([
                           DB::raw('COUNT(*) as total_answers'),
                           DB::raw('COUNT(DISTINCT ea.questionId) as total_questions'),
                           DB::raw('COUNT(DISTINCT ea.examineeId) as total_examinees'),
                           DB::raw('AVG(ea.time_spent_seconds) as overall_avg_time'),
                           DB::raw('COUNT(CASE WHEN ea.time_spent_seconds > ' . $timeThreshold . ' THEN 1 END) as total_slow_answers'),
                           DB::raw('ROUND((COUNT(CASE WHEN ea.time_spent_seconds > ' . $timeThreshold . ' THEN 1 END) / COUNT(*)) * 100, 1) as overall_slow_percentage')
                       ])
                       ->first();

            // Get examinee trends (grouped by individual examinee)
            $dailyTrends = DB::table('examinee_answer as ea')
                ->join('examinee as e', 'ea.examineeId', '=', 'e.id')
                ->whereNotNull('ea.time_spent_seconds')
                ->where('ea.time_spent_seconds', '>', 0)
                ->when($examId, function($q) use ($examId) {
                    return $q->where('ea.examId', $examId);
                })
                ->when($dateFrom, function($q) use ($dateFrom) {
                    return $q->whereDate('ea.created_at', '>=', $dateFrom);
                })
                ->when($dateTo, function($q) use ($dateTo) {
                    return $q->whereDate('ea.created_at', '<=', $dateTo);
                })
                ->select([
                    'ea.examineeId',
                    DB::raw('CONCAT(e.fname, " ", COALESCE(e.mname, ""), " ", e.lname) as examinee_name'),
                    DB::raw('COUNT(*) as total_answers'),
                    DB::raw('AVG(ea.time_spent_seconds) as avg_time'),
                    DB::raw('COUNT(CASE WHEN ea.time_spent_seconds > ' . $timeThreshold . ' THEN 1 END) as slow_answers')
                ])
                ->groupBy('ea.examineeId', 'e.fname', 'e.mname', 'e.lname')
                ->orderBy('ea.examineeId')
                ->get();

                   // Get available exams for filter dropdown
                   $availableExams = DB::table('exams')
                       ->select(['examId', 'exam-ref-no', 'status'])
                       ->orderBy('exam-ref-no')
                       ->get()
                       ->map(function($exam) {
                           return [
                               'examId' => $exam->examId,
                               'exam_ref_no' => $exam->{'exam-ref-no'},
                               'status' => $exam->status
                           ];
                       });
                       
                   // Log for debugging
                   Log::info('Available exams for question analysis', [
                       'count' => $availableExams->count(),
                       'exams' => $availableExams->toArray()
                   ]);

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
                        'time_threshold' => $timeThreshold
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting question difficulty analysis', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error retrieving question difficulty analysis: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate summarized report using Blade template
     */
    public function generateSummarizedReport(Request $request)
    {
        try {
            $data = $request->validate([
                'studentName' => 'required|string',
                'studentAddress' => 'required|string',
                'examDate' => 'required|string',
                'englishScore' => 'required|integer',
                'filipinoScore' => 'required|integer',
                'mathScore' => 'required|integer',
                'scienceScore' => 'required|integer',
                'abstractScore' => 'required|integer',
                'totalScore' => 'required|integer',
                'qualifiedPrograms' => 'required|array'
            ]);

            return view('guidance.summarized_report', $data);

        } catch (\Exception $e) {
            Log::error('Error generating summarized report', [
                'error' => $e->getMessage(),
                'data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error generating summarized report: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate a combined summarized report for multiple students, preserving Blade design
     */
    public function generateSummarizedReportBatch(Request $request)
    {
        try {
            $payload = $request->validate([
                'items' => 'required|array|min:1',
                'items.*.studentName' => 'required|string',
                'items.*.studentAddress' => 'required|string',
                'items.*.examDate' => 'required|string',
                'items.*.englishScore' => 'required|integer',
                'items.*.filipinoScore' => 'required|integer',
                'items.*.mathScore' => 'required|integer',
                'items.*.scienceScore' => 'required|integer',
                'items.*.abstractScore' => 'required|integer',
                'items.*.totalScore' => 'required|integer',
                'items.*.qualifiedPrograms' => 'required|array',
                'items.*.preferredCourse' => 'nullable|string',
                // New: optional semester information per examinee
                'items.*.semester' => 'nullable|string',
            ]);

            $pageBreakCss = '@media print { .page-break { page-break-after: always; } }';

            $pages = array_map(function ($item) {
                $html = view('guidance.summarized_report', [
                    'studentName' => $item['studentName'],
                    'studentAddress' => $item['studentAddress'],
                    'examDate' => $item['examDate'],
                    'englishScore' => $item['englishScore'],
                    'filipinoScore' => $item['filipinoScore'],
                    'mathScore' => $item['mathScore'],
                    'scienceScore' => $item['scienceScore'],
                    'abstractScore' => $item['abstractScore'],
                    'totalScore' => $item['totalScore'],
                    'qualifiedPrograms' => $item['qualifiedPrograms'],
                    'preferredCourse' => $item['preferredCourse'] ?? null,
                    // Pass semester to the individual page as well (optional)
                    'semester' => $item['semester'] ?? null,
                ])->render();

                // Extract body
                if (preg_match('/<body[^>]*>([\s\S]*?)<\/body>/i', $html, $m)) {
                    $content = $m[1];
                } else {
                    $content = $html;
                }
                return '<div class="page-break">' . $content . '</div>';
            }, $payload['items']);

            // Use the first template's styles plus our page-break
            $first = view('guidance.summarized_report', [
                'studentName' => 'Sample',
                'studentAddress' => 'Address',
                'examDate' => now()->format('m/d/Y'),
                'englishScore' => 0,
                'filipinoScore' => 0,
                'mathScore' => 0,
                'scienceScore' => 0,
                'abstractScore' => 0,
                'totalScore' => 0,
                'qualifiedPrograms' => [],
                'preferredCourse' => null,
            ])->render();

            $styles = '';
            if (preg_match('/<style[^>]*>([\s\S]*?)<\/style>/i', $first, $m)) {
                $styles = $m[1];
            }

            // Build cover page based on dates present in payload (items[*].examDate in m/d/Y)
            $dates = array_map(function ($i) {
                return $i['examDate'] ?? null;
            }, $payload['items']);
            $dates = array_values(array_filter($dates));
            // Normalize to DateTime objects
            $dateObjects = array_map(function ($d) {
                try {
                    // Accept both m/d/Y and mm/dd/yyyy variants
                    $dt = \DateTime::createFromFormat('m/d/Y', $d);
                    if ($dt === false) return null;
                    $dt->setTime(0, 0, 0);
                    return $dt;
                } catch (\Throwable $e) {
                    return null;
                }
            }, $dates);
            $dateObjects = array_values(array_filter($dateObjects));

            $onText = '';
            if (count($dateObjects) > 0) {
                // Sort and get min/max
                usort($dateObjects, function ($a, $b) { return $a <=> $b; });
                $min = $dateObjects[0];
                $max = $dateObjects[count($dateObjects) - 1];
                if ($min->format('Y-m-d') === $max->format('Y-m-d')) {
                    $onText = $min->format('F d, Y');
                } else {
                    $onText = $min->format('F d, Y') . ' To ' . $max->format('F d, Y');
                }
            }

            // Collect unique semesters from payload for display on the cover page
            $semesters = array_map(function ($i) {
                return isset($i['semester']) && trim($i['semester']) !== '' ? trim($i['semester']) : null;
            }, $payload['items']);
            $semesters = array_values(array_unique(array_filter($semesters)));
            $semesterText = '';
            if (count($semesters) === 1) {
                $semesterText = $semesters[0];
            } elseif (count($semesters) > 1) {
                $semesterText = implode(', ', $semesters);
            }

            $coverHtml = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:85vh;text-align:center;">'
                . '<img src="/OCC logo.png" alt="OCC Logo" style="height:72px;width:72px;object-fit:contain;margin-bottom:16px;" />'
                . '<div style="font-size:26px;font-weight:800;letter-spacing:1px;">ENTRANCE EXAM RESULT</div>'
                . '<div style="margin-top:12px;font-size:18px;color:#374151;">'
                    . (strlen($onText) ? ('ON \"' . e($onText) . '\"') : 'SUMMARY')
                . '</div>'
                // New: show semester information on the first page if available
                . (strlen($semesterText)
                    ? '<div style="margin-top:6px;font-size:14px;color:#4b5563;">SEMESTER: ' . e($semesterText) . '</div>'
                    : '')
                . '</div>'
                . '<div class="page-break"></div>';

            $combined = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Summarized Reports</title><style>' . $styles . '</style><style>' . $pageBreakCss . '</style></head><body>' . $coverHtml . implode('', $pages) . '</body></html>';

            return response($combined);
        } catch (\Exception $e) {
            Log::error('Error generating summarized report batch', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Batch generation failed'], 500);
        }
    }

} 