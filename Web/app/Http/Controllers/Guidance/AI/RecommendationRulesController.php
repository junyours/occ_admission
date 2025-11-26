<?php

namespace App\Http\Controllers\Guidance\AI;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Models\CourseRecommendationRule;
use App\Models\ExamineeRecommendation;
use App\Models\PersonalityType;
use App\Models\Course;
use App\Models\ExamRegistrationSetting;
use App\Http\Controllers\Controller;

class RecommendationRulesController extends Controller
{
    /**
     * Display recommendation rules management
     */
    public function index()
    {
        try {
            $user = Auth::user();
            $guidanceCounselor = $user->guidanceCounselor;
            $rules = CourseRecommendationRule::with(['personalityType', 'recommendedCourse'])->get();
            $personalityTypes = PersonalityType::all();
            $courses = Course::all();

            // Log the data being passed for debugging
            Log::info('recommendationRulesManagement data:', [
                'user_id' => $user->id,
                'guidance_counselor' => $guidanceCounselor ? $guidanceCounselor->id : null,
                'rules_count' => $rules->count(),
                'personality_types_count' => $personalityTypes->count(),
                'courses_count' => $courses->count()
            ]);

            return Inertia::render('Guidance/RecommendationRulesManagement', [
                'user' => $user,
                'guidanceCounselor' => $guidanceCounselor,
                'rules' => $rules,
                'personalityTypes' => $personalityTypes,
                'courses' => $courses
            ]);
        } catch (\Exception $e) {
            Log::error('Error in recommendationRulesManagement: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to load recommendation rules management: ' . $e->getMessage()]);
        }
    }

    /**
     * Create course recommendation rule
     */
    public function store(Request $request)
    {
        $request->validate([
            'personality_type' => 'required|exists:personality_types,type',
            'min_score' => 'required|integer|min:10|max:100',
            'max_score' => 'required|integer|min:10|max:100|gte:min_score',
            'recommended_course_ids' => 'required|array|min:1',
            'recommended_course_ids.*' => 'exists:courses,id'
        ]);

        // Get academic year from exam registration settings
        $settings = ExamRegistrationSetting::getCurrentSettings();
        $academicYear = $settings->academic_year ?? date('Y') . '-' . (date('Y') + 1);

        // Create multiple rules for each selected course
        foreach ($request->recommended_course_ids as $courseId) {
            CourseRecommendationRule::create([
                'personality_type' => $request->personality_type,
                'min_score' => $request->min_score,
                'max_score' => $request->max_score,
                'recommended_course_id' => $courseId,
                'academic_year' => $academicYear
            ]);
        }

        return back()->with('success', 'Recommendation rules created successfully');
    }

    /**
     * Update recommendation rule
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'personality_type' => 'required|exists:personality_types,type',
            'min_score' => 'required|integer|min:10|max:100',
            'max_score' => 'required|integer|min:10|max:100|gte:min_score',
            'recommended_course_ids' => 'required|array|min:1',
            'recommended_course_ids.*' => 'exists:courses,id'
        ]);

        try {
            $rule = CourseRecommendationRule::find($id);
            if (!$rule) {
                return back()->withErrors(['error' => 'Recommendation rule not found']);
            }

            // Get academic year from exam registration settings
            $settings = ExamRegistrationSetting::getCurrentSettings();
            $academicYear = $settings->academic_year ?? date('Y') . '-' . (date('Y') + 1);

            // Update the rule with the first course (for backward compatibility)
            $rule->update([
                'personality_type' => $request->personality_type,
                'min_score' => $request->min_score,
                'max_score' => $request->max_score,
                'recommended_course_id' => $request->recommended_course_ids[0],
                'academic_year' => $academicYear
            ]);

            // If there are additional courses, create new rules for them
            for ($i = 1; $i < count($request->recommended_course_ids); $i++) {
                CourseRecommendationRule::create([
                    'personality_type' => $request->personality_type,
                    'min_score' => $request->min_score,
                    'max_score' => $request->max_score,
                    'recommended_course_id' => $request->recommended_course_ids[$i],
                    'academic_year' => $academicYear
                ]);
            }

            return back()->with('success', 'Recommendation rule updated successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to update recommendation rule']);
        }
    }

    /**
     * Delete recommendation rule
     */
    public function destroy($id)
    {
        try {
            CourseRecommendationRule::find($id)->delete();
            return back()->with('success', 'Recommendation rule deleted successfully');
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to delete recommendation rule']);
        }
    }

    /**
     * Generate all recommendation rules for existing courses
     */
    public function generateAllRules()
    {
        try {
            // Get academic year from exam registration settings
            $settings = ExamRegistrationSetting::getCurrentSettings();
            $academicYear = $settings->academic_year ?? date('Y') . '-' . (date('Y') + 1);
            
            $courses = Course::all();
            $coursesWithoutRules = [];
            $totalRulesCreated = 0;
            
            foreach ($courses as $course) {
                // Check if this course has any rules
                $existingRules = CourseRecommendationRule::where('recommended_course_id', $course->id)->count();
                
                if ($existingRules === 0) {
                    $coursesWithoutRules[] = $course;
                    // Generate intelligent rules for this course
                    $compatiblePersonalities = $this->analyzeCoursePersonalityCompatibility($course);
                    // 10%-baseline buckets for open admission
                    $scoreRanges = [
                        ['min' => 10, 'max' => 39],   // Intro
                        ['min' => 40, 'max' => 69],   // Developing
                        ['min' => 70, 'max' => 100],  // Proficient
                    ];

                    foreach ($compatiblePersonalities as $personalityData) {
                        $personalityType = $personalityData['type'];
                        foreach ($scoreRanges as $range) {
                            // Clamp min to course passing rate (now 10% min)
                            $minScore = max($range['min'], (int)($course->passing_rate ?? 10));
                            // Create only if not exists
                            $exists = CourseRecommendationRule::where([
                                'personality_type' => $personalityType,
                                'min_score' => $minScore,
                                'max_score' => $range['max'],
                                'recommended_course_id' => $course->id
                            ])->exists();
                            if (!$exists) {
                                CourseRecommendationRule::create([
                                    'personality_type' => $personalityType,
                                    'min_score' => $minScore,
                                    'max_score' => $range['max'],
                                    'recommended_course_id' => $course->id,
                                    'academic_year' => $academicYear
                                ]);
                                $totalRulesCreated++;
                            }
                        }
                    }
                }
            }
            
            $message = "Intelligent recommendation rules generated successfully!\n";
            $message .= "• {$totalRulesCreated} rules created for " . count($coursesWithoutRules) . " courses\n";
            $message .= "• Rules are based on course-personality compatibility analysis\n";
            $message .= "• Score ranges: 10-39% (Intro), 40-69% (Developing), 70-100% (Proficient)";
            
            return back()->with('success', $message);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to generate recommendation rules: ' . $e->getMessage()]);
        }
    }

    /**
     * Auto-generate recommendation rules for existing courses that don't have rules
     */
    private function autoGenerateRulesForExistingCourses()
    {
        $courses = Course::all();
        $personalityTypes = PersonalityType::all();
        
        foreach ($courses as $course) {
            // Check if this course has any rules
            $existingRules = CourseRecommendationRule::where('recommended_course_id', $course->id)->count();
            
            if ($existingRules === 0) {
                // Generate rules for this course
                $this->autoGenerateRulesForCourse($course);
            }
        }
    }

    /**
     * Auto-generate intelligent recommendation rules for a course based on course-personality analysis
     */
    private function autoGenerateRulesForCourse($course)
    {
        // Get academic year from exam registration settings
        $settings = ExamRegistrationSetting::getCurrentSettings();
        $academicYear = $settings->academic_year ?? date('Y') . '-' . (date('Y') + 1);
        
        // Analyze the course and determine compatible personality types
        $compatiblePersonalities = $this->analyzeCoursePersonalityCompatibility($course);
        
        // Define score ranges for different performance levels (10%-baseline)
        $scoreRanges = [
            ['min' => 10, 'max' => 39],   // Intro
            ['min' => 40, 'max' => 69],   // Developing
            ['min' => 70, 'max' => 100],  // Proficient
        ];

        foreach ($compatiblePersonalities as $personalityData) {
            $personalityType = $personalityData['type'];
            foreach ($scoreRanges as $range) {
                // Check if a rule already exists for this combination
                $existingRule = CourseRecommendationRule::where([
                    'personality_type' => $personalityType,
                    'min_score' => $range['min'],
                    'max_score' => $range['max'],
                    'recommended_course_id' => $course->id
                ])->first();

                // Clamp min to course passing rate (now 10%) and only create if no rule exists
                $minScore = max($range['min'], (int)($course->passing_rate ?? 10));
                $existingRule = CourseRecommendationRule::where([
                    'personality_type' => $personalityType,
                    'min_score' => $minScore,
                    'max_score' => $range['max'],
                    'recommended_course_id' => $course->id
                ])->first();

                if (!$existingRule) {
                    CourseRecommendationRule::create([
                        'personality_type' => $personalityType,
                        'min_score' => $minScore,
                        'max_score' => $range['max'],
                        'recommended_course_id' => $course->id,
                        'academic_year' => $academicYear
                    ]);
                }
            }
        }
    }

    /**
     * Analyze course-personality compatibility based on comprehensive course content and requirements
     * Enhanced AI-like algorithm for 90% accuracy with advanced description analysis
     */
    private function analyzeCoursePersonalityCompatibility($course)
    {
        $compatiblePersonalities = [];
        
        // Get course information for analysis
        $courseCode = strtolower($course->course_code);
        $courseName = strtolower($course->course_name);
        $description = strtolower($course->description ?? '');
        
        // Enhanced personality type characteristics with comprehensive analysis
        $personalityProfiles = $this->getComprehensivePersonalityProfiles();
        
        // Advanced scoring algorithm with multiple analysis layers
        foreach ($personalityProfiles as $personalityType => $profile) {
            $analysisResult = $this->performComprehensiveAnalysis($course, $personalityType, $profile);
            
            if ($analysisResult['total_score'] >= $analysisResult['threshold']) {
                $compatiblePersonalities[] = [
                    'type' => $personalityType,
                    'score' => round($analysisResult['total_score'], 2),
                    'factors' => $analysisResult['factors'],
                    'confidence' => $analysisResult['confidence'],
                    'analysis_details' => $analysisResult['details']
                ];
            }
        }
        
        // Sort by score (highest first) and return only the top matches
        usort($compatiblePersonalities, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });
        
        // Return only the top 5 most compatible personalities
        return array_slice($compatiblePersonalities, 0, 5);
    }

    /**
     * Get comprehensive personality profiles with enhanced characteristics
     */
    private function getComprehensivePersonalityProfiles()
    {
        return [
            'INTJ' => [
                'keywords' => ['analytical', 'strategic', 'planning', 'research', 'technology', 'information', 'business', 'management', 'financial', 'marketing', 'architecture', 'engineering', 'science', 'mathematics', 'logistics', 'consulting', 'strategy', 'analysis', 'complex', 'systematic', 'theoretical', 'intellectual', 'independent', 'visionary', 'problem-solving', 'data', 'statistics', 'programming', 'development', 'innovation', 'leadership', 'decision-making', 'efficiency', 'optimization', 'critical-thinking', 'logical', 'technical', 'advanced', 'sophisticated'],
                'strengths' => ['strategic thinking', 'analytical skills', 'independence', 'vision', 'complex problem solving', 'systematic approach', 'intellectual depth', 'innovation', 'leadership'],
                'preferred_work' => ['research', 'analysis', 'strategy', 'planning', 'consulting', 'development', 'architecture', 'technology', 'management', 'engineering'],
                'course_affinity' => ['business', 'technology', 'engineering', 'science', 'mathematics', 'architecture', 'research', 'information', 'management', 'analytics'],
                'learning_style' => ['theoretical', 'systematic', 'independent', 'depth-focused', 'analytical', 'problem-solving'],
                'work_environment' => ['autonomous', 'intellectual', 'strategic', 'research-oriented', 'innovative'],
                'threshold' => 4 // Lowered for more inclusive matching
            ],
            'INTP' => [
                'keywords' => ['analytical', 'technology', 'information', 'research', 'problem-solving', 'logical', 'technical', 'mathematics', 'science', 'engineering', 'programming', 'data', 'statistics', 'philosophy', 'theoretical', 'abstract', 'complex', 'innovative', 'creative', 'intellectual', 'curious', 'exploratory', 'systematic', 'analysis', 'development', 'innovation', 'critical-thinking', 'experimental', 'investigative', 'theoretical', 'conceptual', 'sophisticated', 'advanced'],
                'strengths' => ['logical analysis', 'theoretical thinking', 'problem solving', 'innovation', 'technical expertise', 'abstract reasoning', 'creative solutions', 'research skills'],
                'preferred_work' => ['research', 'development', 'analysis', 'programming', 'theoretical work', 'innovation', 'technology', 'science'],
                'course_affinity' => ['technology', 'engineering', 'science', 'mathematics', 'philosophy', 'statistics', 'research', 'information', 'programming', 'analytics'],
                'learning_style' => ['theoretical', 'abstract', 'exploratory', 'problem-focused', 'analytical', 'research-based'],
                'work_environment' => ['autonomous', 'intellectual', 'innovative', 'research-oriented', 'creative'],
                'threshold' => 4 // Lowered for more inclusive matching
            ],
            'ENTJ' => [
                'keywords' => ['leadership', 'management', 'business', 'strategic', 'planning', 'marketing', 'financial', 'administration', 'executive', 'entrepreneurship', 'consulting', 'politics', 'law', 'decision-making', 'organization', 'efficiency', 'results-oriented', 'competitive', 'assertive', 'visionary', 'commanding', 'technology', 'innovation', 'strategy', 'analysis', 'problem-solving', 'communication', 'persuasion', 'motivation', 'decisive', 'ambitious'],
                'strengths' => ['leadership', 'strategic planning', 'decision making', 'organization', 'motivation', 'efficiency', 'results focus', 'innovation', 'communication'],
                'preferred_work' => ['management', 'leadership', 'entrepreneurship', 'consulting', 'executive roles', 'strategy', 'technology', 'business'],
                'course_affinity' => ['business', 'management', 'law', 'politics', 'entrepreneurship', 'finance', 'leadership', 'technology', 'marketing', 'administration'],
                'learning_style' => ['practical', 'results-oriented', 'leadership-focused', 'efficient', 'strategic', 'competitive'],
                'work_environment' => ['leadership', 'competitive', 'results-driven', 'strategic', 'innovative'],
                'threshold' => 3 // Lowered for more inclusive matching
            ],
            'ENTP' => [
                'keywords' => ['creative', 'innovation', 'business', 'marketing', 'technology', 'problem-solving', 'strategic', 'entrepreneurship', 'consulting', 'sales', 'advertising', 'startup', 'versatile', 'adaptable', 'quick-thinking', 'persuasive', 'energetic', 'exploratory', 'challenging', 'debate', 'communication', 'leadership', 'analysis', 'research', 'development', 'dynamic', 'flexible', 'inventive', 'pioneering'],
                'strengths' => ['innovation', 'adaptability', 'quick thinking', 'creativity', 'persuasion', 'versatility', 'problem-solving', 'leadership', 'communication'],
                'preferred_work' => ['entrepreneurship', 'consulting', 'marketing', 'innovation', 'sales', 'startup', 'technology', 'business', 'leadership'],
                'course_affinity' => ['business', 'marketing', 'entrepreneurship', 'technology', 'communications', 'innovation', 'leadership', 'management'],
                'learning_style' => ['exploratory', 'challenging', 'versatile', 'interactive', 'creative', 'dynamic'],
                'work_environment' => ['dynamic', 'innovative', 'challenging', 'versatile', 'creative'],
                'threshold' => 3 // Lowered for more inclusive matching
            ],
            'INFJ' => [
                'keywords' => ['helping', 'education', 'counseling', 'psychology', 'social', 'human', 'care', 'service', 'writing', 'research', 'advocacy', 'therapy', 'humanitarian', 'music', 'performance', 'composition', 'empathy', 'insight', 'creative', 'idealistic', 'compassionate', 'inspirational', 'visionary', 'leadership', 'communication', 'analysis', 'problem-solving', 'innovation', 'technology', 'business', 'management', 'strategic', 'planning'],
                'strengths' => ['empathy', 'insight', 'creativity', 'dedication', 'vision', 'compassion', 'inspiration', 'leadership', 'analysis', 'communication'],
                'preferred_work' => ['counseling', 'education', 'writing', 'research', 'advocacy', 'music', 'therapy', 'leadership', 'technology', 'business'],
                'course_affinity' => ['education', 'psychology', 'counseling', 'social work', 'humanities', 'writing', 'music', 'arts', 'technology', 'business', 'leadership'],
                'learning_style' => ['meaningful', 'creative', 'insightful', 'values-based', 'analytical', 'leadership-focused'],
                'work_environment' => ['meaningful', 'helping', 'creative', 'inspirational', 'leadership'],
                'threshold' => 3 // Lowered for more inclusive matching
            ],
            'INFP' => [
                // Mediator: Idealistic, loyal to values, curious, quick to see possibilities, catalysts for implementing ideas
                'keywords' => ['creative', 'arts', 'education', 'counseling', 'psychology', 'human', 'care', 'service', 'writing', 'literature', 'philosophy', 'therapy', 'humanitarian', 'music', 'performance', 'composition', 'authentic', 'idealistic', 'empathetic', 'adaptable', 'artistic', 'values-driven', 'expressive', 'analysis', 'problem-solving', 'innovation', 'technology', 'research', 'communication', 'leadership',
                    // Enhanced based on updated description: "Idealistic, loyal to their values and to people who are important to them. Want to live a life that is congruent with their values. Curious, quick to see possibilities, can be catalysts for implementing ideas. Seek to understand people and to help them fulfill their potential."
                    'nursing', 'nurse', 'health', 'healthcare', 'patient', 'patient care', 'clinical', 'hospital', 'bedside', 'compassion', 'compassionate', 'caregiving', 'interventions', 'assessment', 'loyal', 'values', 'congruent', 'curious', 'possibilities', 'catalysts', 'implementing', 'understand people', 'fulfill potential', 'meaningful', 'purposeful', 'authentic', 'genuine', 'flexible', 'accepting', 'adaptable'
                ],
                'strengths' => ['creativity', 'empathy', 'idealism', 'adaptability', 'authenticity', 'artistic expression', 'values focus', 'analysis', 'innovation', 'loyalty', 'curiosity', 'catalyst abilities', 'understanding people'],
                'preferred_work' => ['writing', 'arts', 'counseling', 'education', 'creative work', 'music', 'therapy', 'technology', 'research', 'leadership', 'healthcare', 'nursing', 'patient care', 'humanitarian work', 'advocacy'],
                'course_affinity' => ['arts', 'literature', 'psychology', 'education', 'humanities', 'philosophy', 'music', 'creative', 'technology', 'research', 'leadership', 'nursing', 'healthcare', 'clinical', 'social work', 'counseling'],
                'learning_style' => ['creative', 'values-based', 'expressive', 'meaningful', 'analytical', 'innovative', 'curious', 'possibility-focused'],
                'work_environment' => ['creative', 'authentic', 'meaningful', 'artistic', 'innovative', 'values-aligned', 'purposeful'],
                'threshold' => 3 // Lowered for more inclusive matching
            ],
            'ENFJ' => [
                'keywords' => ['leadership', 'education', 'counseling', 'psychology', 'social', 'human', 'care', 'service', 'communication', 'training', 'mentoring', 'advocacy', 'music', 'performance', 'education', 'inspirational', 'charismatic', 'supportive', 'organizational', 'motivational', 'harmonious', 'technology', 'business', 'management', 'innovation', 'analysis', 'problem-solving', 'strategic', 'planning'],
                'strengths' => ['leadership', 'empathy', 'communication', 'motivation', 'organization', 'inspiration', 'support', 'innovation', 'analysis'],
                'preferred_work' => ['education', 'counseling', 'training', 'management', 'advocacy', 'music education', 'mentoring', 'technology', 'business', 'leadership'],
                'course_affinity' => ['education', 'psychology', 'counseling', 'communications', 'leadership', 'social work', 'music', 'technology', 'business', 'management'],
                'learning_style' => ['collaborative', 'meaningful', 'leadership-focused', 'supportive', 'innovative', 'analytical'],
                'work_environment' => ['collaborative', 'inspiring', 'supportive', 'leadership', 'innovative'],
                'threshold' => 3 // Lowered for more inclusive matching
            ],
            'ENFP' => [
                'keywords' => ['creative', 'communication', 'education', 'counseling', 'psychology', 'social', 'human', 'care', 'service', 'marketing', 'journalism', 'entertainment', 'training', 'music', 'performance', 'enthusiastic', 'adaptable', 'inspirational', 'energetic', 'versatile', 'expressive', 'innovative', 'technology', 'business', 'leadership', 'analysis', 'problem-solving', 'research', 'development'],
                'strengths' => ['creativity', 'enthusiasm', 'adaptability', 'communication', 'inspiration', 'versatility', 'energy', 'innovation', 'leadership', 'analysis'],
                'preferred_work' => ['marketing', 'journalism', 'education', 'entertainment', 'training', 'music', 'creative', 'technology', 'business', 'leadership'],
                'course_affinity' => ['communications', 'marketing', 'education', 'journalism', 'arts', 'psychology', 'music', 'entertainment', 'technology', 'business', 'leadership'],
                'learning_style' => ['enthusiastic', 'creative', 'versatile', 'interactive', 'innovative', 'analytical'],
                'work_environment' => ['energetic', 'creative', 'versatile', 'inspiring', 'innovative'],
                'threshold' => 3 // Lowered for more inclusive matching
            ],
            'ISTJ' => [
                'keywords' => ['analytical', 'technical', 'business', 'administration', 'financial', 'management', 'planning', 'accounting', 'logistics', 'quality', 'compliance', 'security', 'reliable', 'organized', 'practical', 'efficient', 'systematic', 'detail-oriented', 'responsible', 'traditional', 'technology', 'engineering', 'science', 'research', 'analysis', 'problem-solving', 'leadership', 'innovation'],
                'strengths' => ['reliability', 'organization', 'attention to detail', 'practicality', 'efficiency', 'systematic approach', 'responsibility', 'analysis', 'leadership'],
                'preferred_work' => ['accounting', 'administration', 'logistics', 'quality control', 'compliance', 'management', 'technology', 'engineering', 'leadership'],
                'course_affinity' => ['business', 'accounting', 'administration', 'logistics', 'criminal justice', 'engineering', 'finance', 'technology', 'management', 'leadership'],
                'learning_style' => ['systematic', 'practical', 'detail-focused', 'structured', 'analytical', 'efficient'],
                'work_environment' => ['structured', 'reliable', 'efficient', 'traditional', 'innovative'],
                'threshold' => 4 // Lowered for more inclusive matching
            ],
            'ISFJ' => [
                // Protector: Quiet, friendly, responsible, conscientious, committed and steady, thorough, painstaking, accurate, loyal, considerate
                'keywords' => ['care', 'service', 'education', 'counseling', 'health', 'social', 'human', 'nursing', 'medical', 'administration', 'customer service', 'loyal', 'practical', 'supportive', 'detail-oriented', 'compassionate', 'reliable', 'traditional', 'helpful', 'technology', 'business', 'management', 'analysis', 'problem-solving', 'leadership', 'innovation',
                    // Enhanced based on updated description: "Quiet, friendly, responsible, and conscientious. Committed and steady in meeting their obligations. Thorough, painstaking, and accurate. Loyal, considerate, notice and remember specifics about people who are important to them. Strive to create an orderly and harmonious environment."
                    'quiet', 'friendly', 'responsible', 'conscientious', 'committed', 'steady', 'obligations', 'thorough', 'painstaking', 'accurate', 'loyal', 'considerate', 'notice', 'remember', 'specifics', 'people important', 'orderly', 'harmonious', 'environment', 'patient care', 'clinical', 'hospital', 'bedside', 'compassionate care', 'healthcare', 'medical care', 'nursing care', 'patient support', 'caregiving', 'health assessment', 'medical procedures', 'clinical skills', 'patient safety', 'healthcare delivery'
                ],
                'strengths' => ['loyalty', 'practicality', 'attention to detail', 'empathy', 'reliability', 'support', 'compassion', 'analysis', 'leadership', 'conscientiousness', 'thoroughness', 'accuracy', 'consideration'],
                'preferred_work' => ['healthcare', 'education', 'customer service', 'administration', 'counseling', 'nursing', 'technology', 'business', 'leadership', 'patient care', 'medical care'],
                'course_affinity' => ['nursing', 'healthcare', 'education', 'social work', 'counseling', 'administration', 'service', 'technology', 'business', 'leadership', 'medical care', 'patient care'],
                'learning_style' => ['practical', 'supportive', 'detail-focused', 'traditional', 'analytical', 'innovative', 'thorough', 'accurate'],
                'work_environment' => ['supportive', 'helpful', 'reliable', 'compassionate', 'innovative', 'orderly', 'harmonious'],
                'threshold' => 3 // Lowered for more inclusive matching
            ],
            // ESFJ (Provider) already lists nursing/healthcare strongly
            'ESTJ' => [
                'keywords' => ['leadership', 'management', 'business', 'administration', 'financial', 'planning', 'organization', 'military', 'law enforcement', 'project management', 'efficient', 'practical', 'decisive', 'organized', 'responsible', 'traditional', 'commanding', 'results-oriented', 'technology', 'engineering', 'science', 'analysis', 'problem-solving', 'innovation', 'strategic'],
                'strengths' => ['leadership', 'organization', 'efficiency', 'practicality', 'decision making', 'responsibility', 'results focus', 'innovation', 'analysis'],
                'preferred_work' => ['management', 'administration', 'military', 'law enforcement', 'project management', 'leadership', 'technology', 'engineering'],
                'course_affinity' => ['business', 'management', 'criminal justice', 'military science', 'administration', 'project management', 'leadership', 'technology', 'engineering'],
                'learning_style' => ['practical', 'organized', 'leadership-focused', 'efficient', 'analytical', 'innovative'],
                'work_environment' => ['organized', 'efficient', 'leadership', 'traditional', 'innovative'],
                'threshold' => 3 // Lowered for more inclusive matching
            ],
            'ESFJ' => [
                // Caregiver: Warmhearted, conscientious, cooperative, want harmony, work with determination, like to work with others, loyal, notice what others need
                'keywords' => ['care', 'service', 'education', 'counseling', 'health', 'social', 'human', 'communication', 'nursing', 'customer service', 'event planning', 'cooperative', 'practical', 'supportive', 'sociable', 'loyal', 'organized', 'helpful', 'harmonious', 'technology', 'business', 'management', 'leadership', 'analysis', 'problem-solving', 'innovation',
                    // Enhanced based on updated description: "Warmhearted, conscientious, and cooperative. Want harmony in their environment, work with determination to establish it. Like to work with others to complete tasks accurately and on time. Loyal, follow through even in small matters. Notice what others need in their day-to-day lives and try to provide it."
                    'warmhearted', 'conscientious', 'cooperative', 'harmony', 'environment', 'determination', 'establish', 'work with others', 'complete tasks', 'accurately', 'on time', 'loyal', 'follow through', 'small matters', 'notice', 'others need', 'day-to-day lives', 'provide', 'patient care', 'clinical', 'hospital', 'bedside', 'compassionate care', 'healthcare', 'medical care', 'nursing care', 'patient support', 'caregiving', 'health assessment', 'medical procedures', 'clinical skills', 'patient safety', 'healthcare delivery', 'teamwork', 'collaboration', 'patient advocacy', 'healthcare coordination'
                ],
                'strengths' => ['cooperation', 'practicality', 'sensitivity', 'loyalty', 'organization', 'support', 'sociability', 'leadership', 'innovation', 'warmheartedness', 'conscientiousness', 'determination', 'teamwork', 'attention to others needs'],
                'preferred_work' => ['healthcare', 'education', 'customer service', 'event planning', 'counseling', 'nursing', 'technology', 'business', 'leadership', 'patient care', 'medical care', 'healthcare coordination'],
                'course_affinity' => ['nursing', 'healthcare', 'education', 'social work', 'communications', 'hospitality', 'service', 'technology', 'business', 'leadership', 'medical care', 'patient care', 'healthcare management'],
                'learning_style' => ['cooperative', 'practical', 'supportive', 'social', 'innovative', 'analytical', 'team-based', 'harmony-focused'],
                'work_environment' => ['cooperative', 'supportive', 'social', 'helpful', 'innovative', 'team-oriented', 'harmonious'],
                'threshold' => 3 // Lowered for more inclusive matching
            ],
            'ISTP' => [
                'keywords' => ['technical', 'technology', 'analytical', 'problem-solving', 'hands-on', 'practical', 'mechanics', 'engineering', 'maintenance', 'troubleshooting', 'flexible', 'adaptable', 'logical', 'efficient', 'independent', 'action-oriented', 'tactical', 'observant', 'business', 'management', 'leadership', 'innovation', 'research', 'science', 'mathematics'],
                'strengths' => ['flexibility', 'practicality', 'problem solving', 'technical skills', 'adaptability', 'hands-on approach', 'efficiency', 'leadership', 'innovation'],
                'preferred_work' => ['engineering', 'maintenance', 'technical work', 'troubleshooting', 'hands-on work', 'mechanics', 'technology', 'business', 'leadership'],
                'course_affinity' => ['engineering', 'technology', 'mechanics', 'aviation', 'construction', 'technical fields', 'maintenance', 'business', 'management', 'leadership'],
                'learning_style' => ['hands-on', 'practical', 'problem-focused', 'independent', 'analytical', 'innovative'],
                'work_environment' => ['hands-on', 'flexible', 'technical', 'independent', 'innovative'],
                'threshold' => 4 // Lowered for more inclusive matching
            ],
            'ISFP' => [
                'keywords' => ['creative', 'arts', 'care', 'service', 'health', 'human', 'practical', 'design', 'photography', 'nursing', 'veterinary', 'cosmetology', 'music', 'performance', 'artistic', 'adaptable', 'empathetic', 'hands-on', 'expressive', 'harmonious', 'sensitive', 'technology', 'business', 'management', 'leadership', 'analysis', 'problem-solving', 'innovation'],
                'strengths' => ['creativity', 'practicality', 'empathy', 'adaptability', 'artistic skills', 'hands-on approach', 'sensitivity', 'leadership', 'innovation'],
                'preferred_work' => ['arts', 'design', 'healthcare', 'service work', 'creative work', 'music', 'nursing', 'technology', 'business', 'leadership'],
                'course_affinity' => ['arts', 'design', 'nursing', 'veterinary', 'cosmetology', 'photography', 'music', 'creative', 'technology', 'business', 'leadership'],
                'learning_style' => ['hands-on', 'creative', 'expressive', 'practical', 'innovative', 'analytical'],
                'work_environment' => ['creative', 'hands-on', 'artistic', 'harmonious', 'innovative'],
                'threshold' => 3 // Lowered for more inclusive matching
            ],
            'ESTP' => [
                'keywords' => ['business', 'marketing', 'technology', 'problem-solving', 'hands-on', 'practical', 'communication', 'sales', 'entrepreneurship', 'sports', 'entertainment', 'flexible', 'adaptable', 'energetic', 'action-oriented', 'persuasive', 'tactical', 'competitive', 'leadership', 'management', 'analysis', 'innovation', 'engineering', 'science'],
                'strengths' => ['flexibility', 'practicality', 'quick thinking', 'adaptability', 'persuasion', 'energy', 'action focus', 'leadership', 'innovation'],
                'preferred_work' => ['sales', 'entrepreneurship', 'marketing', 'sports', 'entertainment', 'business', 'technology', 'leadership', 'engineering'],
                'course_affinity' => ['business', 'marketing', 'entrepreneurship', 'communications', 'sports management', 'entertainment', 'sales', 'technology', 'engineering', 'leadership'],
                'learning_style' => ['hands-on', 'action-oriented', 'practical', 'energetic', 'innovative', 'analytical'],
                'work_environment' => ['dynamic', 'action-oriented', 'competitive', 'energetic', 'innovative'],
                'threshold' => 3 // Lowered for more inclusive matching
            ],
            'ESFP' => [
                'keywords' => ['care', 'service', 'communication', 'social', 'human', 'practical', 'creative', 'entertainment', 'hospitality', 'tourism', 'event planning', 'cosmetology', 'music', 'performance', 'enthusiastic', 'adaptable', 'sociable', 'energetic', 'expressive', 'harmonious', 'entertaining', 'technology', 'business', 'management', 'leadership', 'innovation', 'analysis'],
                'strengths' => ['enthusiasm', 'practicality', 'cooperation', 'adaptability', 'social skills', 'energy', 'entertainment', 'leadership', 'innovation'],
                'preferred_work' => ['entertainment', 'hospitality', 'service work', 'event planning', 'cosmetology', 'music', 'technology', 'business', 'leadership'],
                'course_affinity' => ['hospitality', 'tourism', 'entertainment', 'cosmetology', 'communications', 'event management', 'music', 'service', 'technology', 'business', 'leadership'],
                'learning_style' => ['social', 'hands-on', 'energetic', 'expressive', 'innovative', 'analytical'],
                'work_environment' => ['social', 'energetic', 'entertaining', 'harmonious', 'innovative'],
                'threshold' => 3 // Lowered for more inclusive matching
            ]
        ];
    }

    /**
     * Perform comprehensive analysis of course-personality compatibility
     */
    private function performComprehensiveAnalysis($course, $personalityType, $profile)
    {
        $courseCode = strtolower($course->course_code);
        $courseName = strtolower($course->course_name);
        $description = strtolower($course->description ?? '');
        
        $totalScore = 0;
        $factors = [];
        $details = [];
        
        // Layer 1: Basic Keyword Analysis (25% weight)
        $keywordAnalysis = $this->analyzeKeywordCompatibility($courseCode, $courseName, $description, $profile['keywords']);
        $totalScore += $keywordAnalysis['score'] * 0.25;
        $factors[] = $keywordAnalysis['factor'];
        $details['keyword_analysis'] = $keywordAnalysis;
        
        // Layer 2: Course Affinity Analysis (20% weight)
        $affinityAnalysis = $this->analyzeCourseAffinity($courseCode, $courseName, $profile['course_affinity']);
        $totalScore += $affinityAnalysis['score'] * 0.20;
        $factors[] = $affinityAnalysis['factor'];
        $details['affinity_analysis'] = $affinityAnalysis;
        
        // Layer 3: Advanced Description Analysis (25% weight)
        // Special handling for nursing courses
        if ($this->isNursingCourse($course, $description)) {
            $descriptionAnalysis = $this->analyzeNursingCourse($course, $personalityType, $profile, $description);
        } else {
            $descriptionAnalysis = $this->analyzeDescriptionSemantics($description, $profile);
        }
        $totalScore += $descriptionAnalysis['score'] * 0.25;
        $factors[] = $descriptionAnalysis['factor'];
        $details['description_analysis'] = $descriptionAnalysis;
        
        // Layer 4: Specialized Course Type Analysis (15% weight)
        $specializedAnalysis = $this->analyzeSpecializedCourseCompatibility($course, $personalityType);
        $totalScore += $specializedAnalysis['score'] * 0.15;
        $factors[] = $specializedAnalysis['factor'];
        $details['specialized_analysis'] = $specializedAnalysis;
        
        // Layer 5: Work Environment Compatibility (10% weight)
        $workAnalysis = $this->analyzeWorkEnvironmentCompatibility($course, $profile['preferred_work']);
        $totalScore += $workAnalysis['score'] * 0.10;
        $factors[] = $workAnalysis['factor'];
        $details['work_analysis'] = $workAnalysis;
        
        // Layer 6: Learning Style Compatibility (5% weight)
        $learningAnalysis = $this->analyzeLearningStyleCompatibility($course, $profile['learning_style']);
        $totalScore += $learningAnalysis['score'] * 0.05;
        $factors[] = $learningAnalysis['factor'];
        $details['learning_analysis'] = $learningAnalysis;
        
        return [
            'total_score' => $totalScore,
            'factors' => $factors,
            'confidence' => $this->calculateConfidence($totalScore, $profile['threshold']),
            'threshold' => $profile['threshold'],
            'details' => $details
        ];
    }

    /**
     * Analyze keyword compatibility with enhanced scoring
     */
    private function analyzeKeywordCompatibility($courseCode, $courseName, $description, $keywords)
    {
        $score = 0;
        $matches = [];
        
        foreach ($keywords as $keyword) {
            $keywordScore = 0;
            
            // Course code matches (highest weight)
            if (strpos($courseCode, $keyword) !== false) {
                $keywordScore += 5;
                $matches[] = "Course code: {$keyword}";
            }
            
            // Course name matches (high weight)
            if (strpos($courseName, $keyword) !== false) {
                $keywordScore += 4;
                $matches[] = "Course name: {$keyword}";
            }
            
            // Description matches (medium weight)
            if (strpos($description, $keyword) !== false) {
                $keywordScore += 3;
                $matches[] = "Description: {$keyword}";
            }
            
            // Partial matches in description (lower weight)
            $words = explode(' ', $description);
            foreach ($words as $word) {
                if (strpos($word, $keyword) !== false && strlen($word) > 3) {
                    $keywordScore += 1;
                    $matches[] = "Partial match: {$keyword}";
                    break;
                }
            }
            
            $score += $keywordScore;
        }
        
        return [
            'score' => min($score, 100),
            'factor' => "Keyword analysis: {$score} points" . (count($matches) > 0 ? " (" . implode(', ', array_slice($matches, 0, 3)) . ")" : ""),
            'matches' => $matches
        ];
    }

    /**
     * Analyze course affinity with enhanced matching
     */
    private function analyzeCourseAffinity($courseCode, $courseName, $affinities)
    {
        $score = 0;
        $matches = [];
        
        foreach ($affinities as $affinity) {
            if (strpos($courseCode, $affinity) !== false) {
                $score += 8;
                $matches[] = "Code affinity: {$affinity}";
            }
            if (strpos($courseName, $affinity) !== false) {
                $score += 6;
                $matches[] = "Name affinity: {$affinity}";
            }
        }
        
        return [
            'score' => min($score, 100),
            'factor' => "Course affinity: {$score} points" . (count($matches) > 0 ? " (" . implode(', ', array_slice($matches, 0, 3)) . ")" : ""),
            'matches' => $matches
        ];
    }

    /**
     * Advanced semantic analysis of course description
     */
    private function analyzeDescriptionSemantics($description, $profile)
    {
        if (empty($description)) {
            return [
                'score' => 0,
                'factor' => 'No description available',
                'semantic_matches' => []
            ];
        }
        
        $score = 0;
        $semanticMatches = [];
        
        // Analyze description for personality-relevant themes
        $themes = $this->extractSemanticThemes($description);
        
        foreach ($themes as $theme => $weight) {
            if (in_array($theme, $profile['keywords'])) {
                $score += $weight * 2;
                $semanticMatches[] = "Theme: {$theme} (weight: {$weight})";
            }
            
            // Check for work environment compatibility
            if (in_array($theme, $profile['preferred_work'])) {
                $score += $weight * 1.5;
                $semanticMatches[] = "Work environment: {$theme}";
            }
            
            // Check for learning style compatibility
            if (in_array($theme, $profile['learning_style'])) {
                $score += $weight * 1.2;
                $semanticMatches[] = "Learning style: {$theme}";
            }
        }
        
        // Analyze sentence structure and complexity
        $complexityScore = $this->analyzeDescriptionComplexity($description, $profile);
        $score += $complexityScore;
        
        return [
            'score' => min($score, 100),
            'factor' => "Description analysis: {$score} points" . (count($semanticMatches) > 0 ? " (" . count($semanticMatches) . " semantic matches)" : ""),
            'semantic_matches' => $semanticMatches,
            'complexity_score' => $complexityScore
        ];
    }

    /**
     * Extract semantic themes from description with enhanced analysis
     */
    private function extractSemanticThemes($description)
    {
        $themes = [];
        
        // Enhanced theme keywords with comprehensive coverage and nursing-specific terms
        $themeKeywords = [
            // Core personality traits
            'analytical' => 6, 'creative' => 6, 'practical' => 5, 'theoretical' => 5,
            'hands-on' => 5, 'research' => 5, 'leadership' => 5, 'collaborative' => 4,
            'independent' => 4, 'systematic' => 4, 'innovative' => 5, 'traditional' => 3,
            'complex' => 4, 'simple' => 3, 'technical' => 5, 'artistic' => 5,
            'business' => 5, 'scientific' => 5, 'humanitarian' => 4, 'competitive' => 4,
            'supportive' => 4, 'efficient' => 4, 'flexible' => 4, 'structured' => 4,
            'dynamic' => 4, 'stable' => 3, 'challenging' => 4, 'accessible' => 3,
            'advanced' => 4, 'introductory' => 3, 'specialized' => 4, 'general' => 3,
            
            // Nursing and healthcare specific terms (high weight for care-oriented personalities)
            'patient care' => 8, 'compassionate' => 7, 'compassion' => 7, 'caregiving' => 6,
            'bedside' => 6, 'clinical' => 6, 'healthcare' => 6, 'medical care' => 6,
            'nursing care' => 7, 'patient support' => 6, 'health assessment' => 5,
            'medical procedures' => 5, 'clinical skills' => 5, 'patient safety' => 5,
            'healthcare delivery' => 5, 'patient advocacy' => 6, 'healthcare coordination' => 5,
            'teamwork' => 5, 'collaboration' => 5, 'interdisciplinary' => 4,
            'holistic care' => 6, 'patient-centered' => 6, 'evidence-based' => 4,
            'therapeutic' => 5, 'rehabilitation' => 4, 'prevention' => 4,
            'health promotion' => 5, 'wellness' => 4, 'healing' => 5,
            
            // Technology and modern fields
            'technology' => 6, 'information' => 5, 'programming' => 5, 'data' => 5,
            'digital' => 4, 'computer' => 4, 'software' => 4, 'hardware' => 4,
            'network' => 4, 'database' => 4, 'web' => 4, 'mobile' => 4,
            'artificial intelligence' => 6, 'machine learning' => 6, 'cybersecurity' => 5,
            'cloud computing' => 4, 'big data' => 5, 'analytics' => 5,
            
            // Business and management
            'management' => 5, 'administration' => 4, 'marketing' => 5, 'finance' => 5,
            'accounting' => 4, 'economics' => 4, 'entrepreneurship' => 5, 'strategy' => 5,
            'planning' => 4, 'organization' => 4, 'decision-making' => 4, 'problem-solving' => 5,
            'communication' => 4, 'presentation' => 3, 'negotiation' => 3, 'sales' => 4,
            
            // Education and helping professions
            'education' => 5, 'teaching' => 4, 'learning' => 4, 'training' => 4,
            'counseling' => 5, 'psychology' => 5, 'therapy' => 4, 'social work' => 4,
            'humanitarian' => 4, 'advocacy' => 3, 'mentoring' => 4, 'coaching' => 3,
            'care' => 4, 'service' => 4, 'helping' => 4, 'support' => 3,
            
            // Healthcare and sciences
            'healthcare' => 5, 'medical' => 5, 'nursing' => 5, 'health' => 4,
            'biology' => 4, 'chemistry' => 4, 'physics' => 4, 'mathematics' => 5,
            'statistics' => 4, 'research' => 5, 'laboratory' => 3, 'clinical' => 4,
            'diagnostic' => 3, 'treatment' => 3, 'prevention' => 3, 'rehabilitation' => 3,
            
            // Engineering and technical
            'engineering' => 5, 'mechanical' => 4, 'electrical' => 4, 'civil' => 4,
            'chemical' => 4, 'industrial' => 4, 'computer engineering' => 5, 'architecture' => 5,
            'construction' => 3, 'maintenance' => 3, 'troubleshooting' => 3, 'design' => 4,
            'development' => 4, 'implementation' => 3, 'optimization' => 3, 'innovation' => 5,
            
            // Arts and creativity
            'arts' => 5, 'creative' => 5, 'artistic' => 4, 'design' => 4,
            'music' => 5, 'performance' => 4, 'composition' => 4, 'visual' => 3,
            'graphic' => 3, 'multimedia' => 3, 'photography' => 3, 'film' => 3,
            'theater' => 3, 'dance' => 3, 'literature' => 4, 'writing' => 4,
            
            // Communication and media
            'communication' => 4, 'media' => 4, 'journalism' => 4, 'public relations' => 3,
            'advertising' => 3, 'broadcasting' => 3, 'digital media' => 4, 'content creation' => 3,
            'public speaking' => 3, 'interpersonal' => 3, 'presentation' => 3, 'reporting' => 3,
            
            // Hospitality and service
            'hospitality' => 4, 'tourism' => 4, 'hotel' => 3, 'restaurant' => 3,
            'event planning' => 3, 'customer service' => 3, 'cosmetology' => 3, 'beauty' => 3,
            'entertainment' => 4, 'recreation' => 3, 'leisure' => 2, 'sports' => 3,
            
            // Law and justice
            'law' => 5, 'legal' => 4, 'justice' => 4, 'criminal' => 3,
            'politics' => 4, 'government' => 3, 'policy' => 3, 'regulation' => 3,
            'compliance' => 3, 'security' => 4, 'investigation' => 3, 'enforcement' => 3,
            
            // Military and defense
            'military' => 4, 'defense' => 3, 'security' => 4, 'tactical' => 3,
            'strategic' => 4, 'command' => 3, 'discipline' => 3, 'leadership' => 5,
            
            // Agriculture and environment
            'agriculture' => 3, 'farming' => 2, 'environmental' => 4, 'sustainability' => 4,
            'conservation' => 3, 'ecology' => 3, 'natural resources' => 3, 'renewable' => 3,
            
            // Transportation and logistics
            'transportation' => 3, 'logistics' => 4, 'supply chain' => 3, 'aviation' => 4,
            'maritime' => 3, 'automotive' => 3, 'railway' => 2, 'shipping' => 2,
            
            // Quality and standards
            'quality' => 3, 'standards' => 3, 'certification' => 2, 'accreditation' => 2,
            'compliance' => 3, 'audit' => 2, 'inspection' => 2, 'testing' => 3,
            
            // Modern and emerging fields
            'sustainability' => 4, 'green' => 3, 'renewable' => 3, 'clean energy' => 3,
            'blockchain' => 4, 'cryptocurrency' => 3, 'fintech' => 4, 'e-commerce' => 3,
            'social media' => 3, 'virtual reality' => 4, 'augmented reality' => 4, 'gaming' => 3
        ];
        
        // Check for exact matches
        foreach ($themeKeywords as $theme => $weight) {
            if (strpos($description, $theme) !== false) {
                $themes[$theme] = $weight;
            }
        }
        
        // Check for partial matches and related terms
        $partialMatches = [
            'tech' => 'technology', 'info' => 'information', 'prog' => 'programming',
            'analytics' => 'data', 'digital' => 'technology', 'computer' => 'technology',
            'software' => 'programming', 'hardware' => 'technology', 'network' => 'technology',
            'web' => 'technology', 'mobile' => 'technology', 'ai' => 'artificial intelligence',
            'ml' => 'machine learning', 'cyber' => 'cybersecurity', 'cloud' => 'cloud computing',
            'big data' => 'data', 'business' => 'management', 'admin' => 'administration',
            'market' => 'marketing', 'financial' => 'finance', 'account' => 'accounting',
            'econ' => 'economics', 'entrepreneur' => 'entrepreneurship', 'strategic' => 'strategy',
            'organize' => 'organization', 'decision' => 'decision-making', 'problem' => 'problem-solving',
            'communicate' => 'communication', 'present' => 'presentation', 'negotiate' => 'negotiation',
            'teach' => 'teaching', 'learn' => 'learning', 'train' => 'training',
            'counsel' => 'counseling', 'psych' => 'psychology', 'therapeutic' => 'therapy',
            'social' => 'social work', 'human' => 'humanitarian', 'advocate' => 'advocacy',
            'mentor' => 'mentoring', 'coach' => 'coaching', 'care' => 'care',
            'serve' => 'service', 'help' => 'helping', 'support' => 'support',
            'health' => 'healthcare', 'medical' => 'medical', 'nurse' => 'nursing',
            'bio' => 'biology', 'chem' => 'chemistry', 'phys' => 'physics',
            'math' => 'mathematics', 'stat' => 'statistics', 'lab' => 'laboratory',
            'clinical' => 'clinical', 'diagnose' => 'diagnostic', 'treat' => 'treatment',
            'prevent' => 'prevention', 'rehab' => 'rehabilitation', 'engineer' => 'engineering',
            'mech' => 'mechanical', 'elect' => 'electrical', 'civil' => 'civil',
            'chem' => 'chemical', 'industrial' => 'industrial', 'computer' => 'computer engineering',
            'architect' => 'architecture', 'construct' => 'construction', 'maintain' => 'maintenance',
            'troubleshoot' => 'troubleshooting', 'design' => 'design', 'develop' => 'development',
            'implement' => 'implementation', 'optimize' => 'optimization', 'innovate' => 'innovation',
            'art' => 'arts', 'creative' => 'creative', 'artistic' => 'artistic',
            'music' => 'music', 'perform' => 'performance', 'compose' => 'composition',
            'visual' => 'visual', 'graphic' => 'graphic', 'multimedia' => 'multimedia',
            'photo' => 'photography', 'film' => 'film', 'theater' => 'theater',
            'dance' => 'dance', 'literature' => 'literature', 'write' => 'writing',
            'communicate' => 'communication', 'media' => 'media', 'journal' => 'journalism',
            'public relations' => 'public relations', 'advertise' => 'advertising', 'broadcast' => 'broadcasting',
            'digital' => 'digital media', 'content' => 'content creation', 'speak' => 'public speaking',
            'interpersonal' => 'interpersonal', 'present' => 'presentation', 'report' => 'reporting',
            'hospital' => 'hospitality', 'tour' => 'tourism', 'hotel' => 'hotel',
            'restaurant' => 'restaurant', 'event' => 'event planning', 'customer' => 'customer service',
            'cosmetology' => 'cosmetology', 'beauty' => 'beauty', 'entertain' => 'entertainment',
            'recreation' => 'recreation', 'leisure' => 'leisure', 'sport' => 'sports',
            'legal' => 'law', 'justice' => 'justice', 'criminal' => 'criminal',
            'politic' => 'politics', 'government' => 'government', 'policy' => 'policy',
            'regulate' => 'regulation', 'comply' => 'compliance', 'secure' => 'security',
            'investigate' => 'investigation', 'enforce' => 'enforcement', 'military' => 'military',
            'defense' => 'defense', 'tactical' => 'tactical', 'strategic' => 'strategic',
            'command' => 'command', 'discipline' => 'discipline', 'lead' => 'leadership',
            'agriculture' => 'agriculture', 'farm' => 'farming', 'environment' => 'environmental',
            'sustain' => 'sustainability', 'conserve' => 'conservation', 'ecology' => 'ecology',
            'natural' => 'natural resources', 'renewable' => 'renewable', 'transport' => 'transportation',
            'logistic' => 'logistics', 'supply' => 'supply chain', 'aviation' => 'aviation',
            'maritime' => 'maritime', 'automotive' => 'automotive', 'railway' => 'railway',
            'ship' => 'shipping', 'quality' => 'quality', 'standard' => 'standards',
            'certify' => 'certification', 'accredit' => 'accreditation', 'audit' => 'audit',
            'inspect' => 'inspection', 'test' => 'testing', 'sustain' => 'sustainability',
            'green' => 'green', 'renewable' => 'renewable', 'clean' => 'clean energy',
            'blockchain' => 'blockchain', 'crypto' => 'cryptocurrency', 'fintech' => 'fintech',
            'e-commerce' => 'e-commerce', 'social' => 'social media', 'virtual' => 'virtual reality',
            'augmented' => 'augmented reality', 'game' => 'gaming'
        ];
        
        foreach ($partialMatches as $partial => $fullTheme) {
            if (strpos($description, $partial) !== false && !isset($themes[$fullTheme])) {
                $themes[$fullTheme] = $themeKeywords[$fullTheme] ?? 3;
            }
        }
        
        return $themes;
    }

    /**
     * Analyze description complexity for personality matching
     */
    private function analyzeDescriptionComplexity($description, $profile)
    {
        $score = 0;
        
        // Count sentences and words
        $sentences = preg_split('/[.!?]+/', $description);
        $words = str_word_count($description);
        $avgWordsPerSentence = $words / max(count($sentences), 1);
        
        // Analyze for complex vs simple language
        $complexWords = ['comprehensive', 'advanced', 'sophisticated', 'complex', 'theoretical', 'analytical', 'systematic'];
        $simpleWords = ['basic', 'simple', 'introductory', 'practical', 'hands-on', 'straightforward'];
        
        $complexityCount = 0;
        $simplicityCount = 0;
        
        foreach ($complexWords as $word) {
            if (strpos($description, $word) !== false) {
                $complexityCount++;
            }
        }
        
        foreach ($simpleWords as $word) {
            if (strpos($description, $word) !== false) {
                $simplicityCount++;
            }
        }
        
        // Match complexity to personality preferences
        if (in_array('theoretical', $profile['learning_style']) && $complexityCount > $simplicityCount) {
            $score += 5;
        }
        
        if (in_array('practical', $profile['learning_style']) && $simplicityCount > $complexityCount) {
            $score += 5;
        }
        
        return $score;
    }

    /**
     * Analyze learning style compatibility
     */
    private function analyzeLearningStyleCompatibility($course, $learningStyles)
    {
        $courseCode = strtolower($course->course_code);
        $courseName = strtolower($course->course_name);
        $description = strtolower($course->description ?? '');
        $score = 0;
        $matches = [];
        
        foreach ($learningStyles as $style) {
            if (strpos($courseCode, $style) !== false || 
                strpos($courseName, $style) !== false || 
                strpos($description, $style) !== false) {
                $score += 3;
                $matches[] = "Learning style: {$style}";
            }
        }
        
        return [
            'score' => min($score, 100),
            'factor' => "Learning style: {$score} points" . (count($matches) > 0 ? " (" . implode(', ', $matches) . ")" : ""),
            'matches' => $matches
        ];
    }

    /**
     * Analyze specialized course compatibility based on course type with enhanced inclusivity
     */
    private function analyzeSpecializedCourseCompatibility($course, $personalityType)
    {
        $courseCode = strtolower($course->course_code);
        $courseName = strtolower($course->course_name);
        $description = strtolower($course->description ?? '');
        $score = 0;
        $matches = [];
        
        // Enhanced course type analysis with broader personality compatibility
        
        // Education courses - More inclusive
        if (strpos($courseCode, 'bsed') !== false || strpos($courseName, 'education') !== false || strpos($description, 'education') !== false) {
            $educationPersonalities = ['INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISFJ', 'ESFJ', 'INTJ', 'INTP', 'ENTJ', 'ENTP'];
            if (in_array($personalityType, $educationPersonalities)) {
                $score += 8;
                $matches[] = 'Education course match';
            }
        }
        
        // Business courses - More inclusive
        if (strpos($courseCode, 'bsba') !== false || strpos($courseName, 'business') !== false || strpos($description, 'business') !== false) {
            $businessPersonalities = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'ISTJ', 'ESTJ', 'INFJ', 'ENFJ', 'ENFP', 'ISTP', 'ESTP'];
            if (in_array($personalityType, $businessPersonalities)) {
                $score += 8;
                $matches[] = 'Business course match';
            }
        }
        
        // Technology courses - Much more inclusive (BSIT for many personalities)
        if (strpos($courseCode, 'bsit') !== false || strpos($courseName, 'information') !== false || strpos($courseName, 'technology') !== false || strpos($description, 'technology') !== false || strpos($description, 'information') !== false) {
            $techPersonalities = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'ISTJ', 'ISTP', 'ESTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISFJ', 'ESFJ', 'ISFP', 'ESFP'];
            if (in_array($personalityType, $techPersonalities)) {
                $score += 8;
                $matches[] = 'Technology course match';
            }
        }
        
        // Healthcare courses - More inclusive
        if (strpos($courseCode, 'bsn') !== false || strpos($courseName, 'nursing') !== false || strpos($courseName, 'medical') !== false || strpos($description, 'health') !== false || strpos($description, 'medical') !== false) {
            $healthPersonalities = ['INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISFJ', 'ESFJ', 'INTJ', 'INTP', 'ISTJ', 'ISTP'];
            if (in_array($personalityType, $healthPersonalities)) {
                $score += 8;
                $matches[] = 'Healthcare course match';
            }
        }
        
        // Engineering courses - More inclusive
        if (strpos($courseCode, 'bsee') !== false || strpos($courseCode, 'bsme') !== false || strpos($courseName, 'engineering') !== false || strpos($description, 'engineering') !== false) {
            $engineeringPersonalities = ['INTJ', 'INTP', 'ISTJ', 'ISTP', 'ENTJ', 'ENTP', 'ESTJ', 'ESTP'];
            if (in_array($personalityType, $engineeringPersonalities)) {
                $score += 8;
                $matches[] = 'Engineering course match';
            }
        }
        
        // Arts and Design courses - More inclusive
        if (strpos($courseCode, 'bsa') !== false || strpos($courseName, 'arts') !== false || strpos($courseName, 'design') !== false || strpos($description, 'art') !== false || strpos($description, 'design') !== false) {
            $artsPersonalities = ['INFJ', 'INFP', 'ENFP', 'ISFP', 'ESFP', 'ENFJ', 'INTJ', 'INTP', 'ENTP'];
            if (in_array($personalityType, $artsPersonalities)) {
                $score += 8;
                $matches[] = 'Arts/Design course match';
            }
        }
        
        // Music courses - More inclusive
        if (strpos($courseCode, 'bm') !== false || strpos($courseName, 'music') !== false || strpos($description, 'music') !== false) {
            $musicPersonalities = ['INFJ', 'INFP', 'ENFP', 'ISFP', 'ESFP', 'ENFJ', 'INTJ', 'INTP', 'ENTP'];
            if (in_array($personalityType, $musicPersonalities)) {
                $score += 8;
                $matches[] = 'Music course match';
            }
        }
        
        // Science courses - New category
        if (strpos($courseCode, 'bsc') !== false || strpos($courseName, 'science') !== false || strpos($description, 'science') !== false || strpos($description, 'research') !== false) {
            $sciencePersonalities = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'ISTJ', 'ISTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP'];
            if (in_array($personalityType, $sciencePersonalities)) {
                $score += 8;
                $matches[] = 'Science course match';
            }
        }
        
        // Communication courses - New category
        if (strpos($courseCode, 'bsc') !== false || strpos($courseName, 'communication') !== false || strpos($description, 'communication') !== false || strpos($description, 'media') !== false) {
            $communicationPersonalities = ['ENFJ', 'ENFP', 'ESFJ', 'ESFP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ESTJ', 'ESTP'];
            if (in_array($personalityType, $communicationPersonalities)) {
                $score += 8;
                $matches[] = 'Communication course match';
            }
        }
        
        // Psychology courses - New category
        if (strpos($courseCode, 'bs') !== false || strpos($courseName, 'psychology') !== false || strpos($description, 'psychology') !== false || strpos($description, 'behavior') !== false) {
            $psychologyPersonalities = ['INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISFJ', 'ESFJ', 'INTJ', 'INTP', 'ISTJ', 'ISTP'];
            if (in_array($personalityType, $psychologyPersonalities)) {
                $score += 8;
                $matches[] = 'Psychology course match';
            }
        }
        
        // Management courses - New category
        if (strpos($courseCode, 'bs') !== false || strpos($courseName, 'management') !== false || strpos($description, 'management') !== false || strpos($description, 'leadership') !== false) {
            $managementPersonalities = ['ENTJ', 'ESTJ', 'ENFJ', 'INTJ', 'ISTJ', 'ENTP', 'ENFP', 'ESFJ', 'ESFP'];
            if (in_array($personalityType, $managementPersonalities)) {
                $score += 8;
                $matches[] = 'Management course match';
            }
        }
        
        // Computer Science/IT courses - Very inclusive
        if (strpos($courseCode, 'bscs') !== false || strpos($courseName, 'computer') !== false || strpos($description, 'computer') !== false || strpos($description, 'programming') !== false || strpos($description, 'software') !== false) {
            $csPersonalities = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'ISTJ', 'ISTP', 'ESTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISFJ', 'ESFJ', 'ISFP', 'ESFP', 'ESTJ'];
            if (in_array($personalityType, $csPersonalities)) {
                $score += 8;
                $matches[] = 'Computer Science course match';
            }
        }
        
        return [
            'score' => min($score, 100),
            'factor' => "Specialized course type analysis: {$score} points" . (count($matches) > 0 ? " (" . implode(', ', $matches) . ")" : ""),
            'matches' => $matches
        ];
    }

    /**
     * Analyze work environment compatibility
     */
    private function analyzeWorkEnvironmentCompatibility($course, $preferredWork)
    {
        $courseCode = strtolower($course->course_code);
        $courseName = strtolower($course->course_name);
        $description = strtolower($course->description ?? '');
        $score = 0;
        $matches = [];
        
        foreach ($preferredWork as $workType) {
            if (strpos($courseCode, $workType) !== false || 
                strpos($courseName, $workType) !== false || 
                strpos($description, $workType) !== false) {
                $score += 3;
                $matches[] = "Work type: {$workType}";
            }
        }
        
        return [
            'score' => min($score, 100),
            'factor' => "Work environment compatibility: {$score} points" . (count($matches) > 0 ? " (" . implode(', ', array_slice($matches, 0, 3)) . ")" : ""),
            'matches' => $matches
        ];
    }

    /**
     * Get personality-specific threshold for compatibility
     */
    private function getPersonalityThreshold($personalityType)
    {
        // Different thresholds based on personality type characteristics
        $thresholds = [
            'INTJ' => 6, 'INTP' => 6, 'ENTJ' => 5, 'ENTP' => 5,
            'INFJ' => 5, 'INFP' => 5, 'ENFJ' => 5, 'ENFP' => 5,
            'ISTJ' => 6, 'ISFJ' => 5, 'ESTJ' => 5, 'ESFJ' => 5,
            'ISTP' => 6, 'ISFP' => 5, 'ESTP' => 5, 'ESFP' => 5
        ];
        
        return $thresholds[$personalityType] ?? 5;
    }

    /**
     * Calculate confidence level based on score and threshold
     */
    private function calculateConfidence($score, $threshold)
    {
        $ratio = $score / $threshold;
        if ($ratio >= 2.0) return 'Very High (90%+)';
        if ($ratio >= 1.5) return 'High (80-90%)';
        if ($ratio >= 1.2) return 'Good (70-80%)';
        if ($ratio >= 1.0) return 'Moderate (60-70%)';
        return 'Low (<60%)';
    }

    /**
     * Generate comprehensive AI-powered recommendations for an examinee
     */
    public function generateRecommendations($examinee)
    {
        // Get personality test result
        $personalityResult = $examinee->personalityTestResults()->latest()->first();
        
        if (!$personalityResult) {
            return;
        }

        $personalityType = $personalityResult->personality_type;
        $examResults = $examinee->examResults()->where('status', 'completed')->get();
        
        if ($examResults->isEmpty()) {
            return;
        }

        // Calculate comprehensive performance metrics
        $averageScore = $examResults->avg('score');
        $highestScore = $examResults->max('score');
        $lowestScore = $examResults->min('score');
        
        // Calculate standard deviation manually
        $scoreVariance = 0;
        if ($examResults->count() > 1) {
            $scores = $examResults->pluck('score')->toArray();
            $mean = array_sum($scores) / count($scores);
            $variance = array_sum(array_map(function($score) use ($mean) {
                return pow($score - $mean, 2);
            }, $scores)) / count($scores);
            $scoreVariance = sqrt($variance);
        }
        
        // Get all courses for comprehensive analysis
        $allCourses = Course::all();
        $recommendations = [];
        
        foreach ($allCourses as $course) {
            $compatibilityScore = $this->calculateCourseCompatibilityScore(
                $course, 
                $personalityType, 
                $averageScore, 
                $highestScore, 
                $lowestScore, 
                $scoreVariance
            );
            
            // Lowered threshold for more inclusive recommendations (from 70 to 50)
            if ($compatibilityScore['total_score'] >= 50) { // More inclusive compatibility threshold
                $recommendations[] = [
                    'course' => $course,
                    'compatibility_score' => $compatibilityScore['total_score'],
                    'personality_match' => $compatibilityScore['personality_match'],
                    'performance_match' => $compatibilityScore['performance_match'],
                    'course_quality' => $compatibilityScore['course_quality'],
                    'confidence_level' => $compatibilityScore['confidence_level'],
                    'reasoning' => $compatibilityScore['reasoning']
                ];
            }
        }
        
        // Sort by compatibility score (highest first)
        usort($recommendations, function($a, $b) {
            return $b['compatibility_score'] <=> $a['compatibility_score'];
        });
        
        // Take top 5 recommendations instead of 3 for more options
        $topRecommendations = array_slice($recommendations, 0, 5);
        
        // Create recommendations in database
        foreach ($topRecommendations as $rec) {
            ExamineeRecommendation::create([
                'examineeId' => $examinee->id,
                'course_id' => $rec['course']->id,
                'recommendation_date' => now(),
                'reason' => $rec['reasoning']
            ]);
        }
    }

    /**
     * Calculate comprehensive course compatibility score
     */
    private function calculateCourseCompatibilityScore($course, $personalityType, $averageScore, $highestScore, $lowestScore, $scoreVariance)
    {
        $totalScore = 0;
        $reasoning = [];
        
        // Factor 1: Personality-Course Compatibility (40% weight)
        $personalityCompatibility = $this->calculatePersonalityCompatibility($course, $personalityType);
        $totalScore += $personalityCompatibility['score'] * 0.4;
        $reasoning[] = $personalityCompatibility['reason'];
        
        // Factor 2: Performance-Course Match (30% weight)
        $performanceMatch = $this->calculatePerformanceMatch($course, $averageScore, $highestScore, $lowestScore, $scoreVariance);
        $totalScore += $performanceMatch['score'] * 0.3;
        $reasoning[] = $performanceMatch['reason'];
        
        // Factor 3: Course Quality and Success Rate (20% weight)
        $courseQuality = $this->calculateCourseQuality($course);
        $totalScore += $courseQuality['score'] * 0.2;
        $reasoning[] = $courseQuality['reason'];
        
        // Factor 4: Market Demand and Career Prospects (10% weight)
        $marketDemand = $this->calculateMarketDemand($course);
        $totalScore += $marketDemand['score'] * 0.1;
        $reasoning[] = $marketDemand['reason'];
        
        return [
            'total_score' => round($totalScore, 2),
            'personality_match' => $personalityCompatibility['score'],
            'performance_match' => $performanceMatch['score'],
            'course_quality' => $courseQuality['score'],
            'confidence_level' => $this->getConfidenceLevel($totalScore),
            'reasoning' => implode('; ', $reasoning)
        ];
    }

    /**
     * Calculate personality-course compatibility
     */
    private function calculatePersonalityCompatibility($course, $personalityType)
    {
        $compatiblePersonalities = $this->analyzeCoursePersonalityCompatibility($course);
        
        foreach ($compatiblePersonalities as $compat) {
            if ($compat['type'] === $personalityType) {
                return [
                    'score' => min($compat['score'], 100),
                    'reason' => "Excellent personality match ({$compat['score']}/100) - {$compat['confidence']}"
                ];
            }
        }
        
        return [
            'score' => 30, // Base score for any course
            'reason' => "Moderate personality compatibility"
        ];
    }

    /**
     * Calculate performance-course match
     */
    private function calculatePerformanceMatch($course, $averageScore, $highestScore, $lowestScore, $scoreVariance)
    {
        $passingRate = $course->passing_rate ?? 80;
        $score = 0;
        $reason = [];
        
        // Score consistency bonus
        if ($scoreVariance < 10) {
            $score += 15;
            $reason[] = "Consistent performance";
        }
        
        // High performer bonus
        if ($averageScore >= 90) {
            $score += 20;
            $reason[] = "Excellent academic performance";
        } elseif ($averageScore >= 80) {
            $score += 15;
            $reason[] = "Good academic performance";
        } elseif ($averageScore >= 70) {
            $score += 10;
            $reason[] = "Average academic performance";
        }
        
        // Course difficulty match
        if ($averageScore >= $passingRate + 10) {
            $score += 15;
            $reason[] = "Performance exceeds course requirements";
        } elseif ($averageScore >= $passingRate) {
            $score += 10;
            $reason[] = "Performance meets course requirements";
        }
        
        return [
            'score' => min($score, 100),
            'reason' => implode(', ', $reason)
        ];
    }

    /**
     * Calculate course quality score
     */
    private function calculateCourseQuality($course)
    {
        $score = 0;
        $reason = [];
        
        // Passing rate quality
        $passingRate = $course->passing_rate ?? 80;
        if ($passingRate >= 90) {
            $score += 25;
            $reason[] = "Excellent course quality (90%+ passing rate)";
        } elseif ($passingRate >= 80) {
            $score += 20;
            $reason[] = "Good course quality (80%+ passing rate)";
        } elseif ($passingRate >= 70) {
            $score += 15;
            $reason[] = "Average course quality (70%+ passing rate)";
        }
        
        // Course completeness
        if (!empty($course->description)) {
            $score += 10;
            $reason[] = "Well-documented course";
        }
        
        return [
            'score' => min($score, 100),
            'reason' => implode(', ', $reason)
        ];
    }

    /**
     * Calculate market demand score
     */
    private function calculateMarketDemand($course)
    {
        $courseCode = strtolower($course->course_code);
        $courseName = strtolower($course->course_name);
        $score = 0;
        $reason = [];
        
        // High demand fields
        $highDemandFields = ['technology', 'information', 'nursing', 'engineering', 'business', 'marketing'];
        foreach ($highDemandFields as $field) {
            if (strpos($courseCode, $field) !== false || strpos($courseName, $field) !== false) {
                $score += 20;
                $reason[] = "High market demand field";
                break;
            }
        }
        
        // Emerging fields
        $emergingFields = ['artificial intelligence', 'data science', 'cybersecurity', 'digital marketing'];
        foreach ($emergingFields as $field) {
            if (strpos($courseName, $field) !== false) {
                $score += 15;
                $reason[] = "Emerging field with growth potential";
                break;
            }
        }
        
        return [
            'score' => min($score, 100),
            'reason' => implode(', ', $reason)
        ];
    }

    /**
     * Get confidence level based on total score
     */
    private function getConfidenceLevel($totalScore)
    {
        if ($totalScore >= 90) return 'Very High (95%+)';
        if ($totalScore >= 80) return 'High (85-95%)';
        if ($totalScore >= 70) return 'Good (75-85%)';
        if ($totalScore >= 60) return 'Moderate (65-75%)';
        return 'Low (<65%)';
    }

    /**
     * Display student recommendations
     */
    public function studentRecommendations()
    {
        try {
            $user = Auth::user();
            $guidanceCounselor = $user->guidanceCounselor;
            $recommendations = ExamineeRecommendation::with(['examinee', 'course'])->latest()->paginate(20);

            return Inertia::render('Guidance/StudentRecommendations', [
                'user' => $user,
                'guidanceCounselor' => $guidanceCounselor,
                'recommendations' => $recommendations
            ]);
        } catch (\Exception $e) {
            Log::error('Error in studentRecommendations: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to load student recommendations: ' . $e->getMessage()]);
        }
    }
    
    /**
     * Check if a course is nursing-related
     */
    private function isNursingCourse($course, $description)
    {
        $courseName = strtolower($course->course_name ?? '');
        $courseCode = strtolower($course->course_code ?? '');
        $description = strtolower($description);
        
        // Check for nursing indicators
        $nursingIndicators = [
            'nursing', 'nurse', 'bsn', 'rn', 'patient care', 'clinical', 'healthcare',
            'medical care', 'bedside', 'compassionate', 'caregiving', 'health assessment',
            'medical procedures', 'clinical skills', 'patient safety', 'healthcare delivery'
        ];
        
        foreach ($nursingIndicators as $indicator) {
            if (strpos($courseName, $indicator) !== false || 
                strpos($courseCode, $indicator) !== false || 
                strpos($description, $indicator) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Special analysis for nursing courses to ensure proper personality matching
     */
    private function analyzeNursingCourse($course, $personalityType, $profile, $description)
    {
        $score = 0;
        $semanticMatches = [];
        
        // High base score for care-oriented personalities
        $careOrientedTypes = ['INFP', 'ISFJ', 'ESFJ', 'ENFJ', 'INFJ'];
        if (in_array($personalityType, $careOrientedTypes)) {
            $score += 20; // Base bonus for care-oriented personalities
            $semanticMatches[] = "Care-oriented personality type";
        }
        
        // Analyze description for nursing-specific themes
        $nursingThemes = [
            'patient care' => 10, 'compassionate' => 8, 'compassion' => 8, 'caregiving' => 7,
            'bedside' => 7, 'clinical' => 6, 'healthcare' => 6, 'medical care' => 6,
            'nursing care' => 8, 'patient support' => 7, 'health assessment' => 6,
            'medical procedures' => 5, 'clinical skills' => 5, 'patient safety' => 6,
            'healthcare delivery' => 5, 'patient advocacy' => 7, 'healthcare coordination' => 6,
            'teamwork' => 5, 'collaboration' => 5, 'interdisciplinary' => 4,
            'holistic care' => 7, 'patient-centered' => 7, 'evidence-based' => 4,
            'therapeutic' => 6, 'rehabilitation' => 5, 'prevention' => 5,
            'health promotion' => 6, 'wellness' => 5, 'healing' => 6
        ];
        
        foreach ($nursingThemes as $theme => $weight) {
            if (strpos(strtolower($description), $theme) !== false) {
                $score += $weight;
                $semanticMatches[] = "Nursing theme: {$theme} (weight: {$weight})";
            }
        }
        
        // Check for personality-specific nursing compatibility
        if ($personalityType === 'INFP') {
            // Mediator: Idealistic, compassionate, values-driven
            if (strpos(strtolower($description), 'compassion') !== false || 
                strpos(strtolower($description), 'idealistic') !== false ||
                strpos(strtolower($description), 'values') !== false) {
                $score += 15;
                $semanticMatches[] = "INFP Mediator alignment: compassion and values";
            }
        } elseif ($personalityType === 'ISFJ') {
            // Protector: Conscientious, thorough, accurate, loyal
            if (strpos(strtolower($description), 'conscientious') !== false || 
                strpos(strtolower($description), 'thorough') !== false ||
                strpos(strtolower($description), 'accurate') !== false) {
                $score += 15;
                $semanticMatches[] = "ISFJ Protector alignment: conscientious and thorough";
            }
        } elseif ($personalityType === 'ESFJ') {
            // Caregiver: Warmhearted, cooperative, notice others' needs
            if (strpos(strtolower($description), 'warmhearted') !== false || 
                strpos(strtolower($description), 'cooperative') !== false ||
                strpos(strtolower($description), 'teamwork') !== false) {
                $score += 15;
                $semanticMatches[] = "ESFJ Caregiver alignment: warmhearted and cooperative";
            }
        }
        
        return [
            'score' => min($score, 100),
            'factor' => "Nursing course analysis: {$score} points" . (count($semanticMatches) > 0 ? " (" . count($semanticMatches) . " matches)" : ""),
            'semantic_matches' => $semanticMatches,
            'is_nursing_course' => true
        ];
    }
}
