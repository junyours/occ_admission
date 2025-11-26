<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\Examinee;
use App\Models\Course;
use App\Models\ExamSchedule;
use App\Models\ExamineeRegistration;
use App\Http\Controllers\Controller;

class MobileExamineeController extends Controller
{
    /**
     * Get examinee profile for mobile app
     * Returns data in the format expected by the mobile app
     */
    public function getProfile(Request $request)
    {
        try {
            /** @var User $user */
            $user = $request->user();
            
            Log::info('[MobileExaminee] Fetching examinee profile for user: ' . $user->id);
            Log::info('[MobileExaminee] User details - ID: ' . $user->id . ', Email: ' . $user->email . ', Role: ' . $user->role);

            // Check if user has student role
            if ($user->role !== 'student') {
                Log::warning('[MobileExaminee] Access denied - user role: ' . $user->role);
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only students can access this endpoint.'
                ], 403);
            }

            // Get examinee data from the examinee table with registration info
            $examinee = Examinee::with('registration')->where('accountId', $user->id)->first();

            if (!$examinee) {
                Log::warning('[MobileExaminee] No examinee profile found for user: ' . $user->id);
                
                // Log all examinees for debugging
                $allExaminees = Examinee::all();
                Log::info('[MobileExaminee] All examinees in database: ' . $allExaminees->count());
                foreach ($allExaminees as $exam) {
                    Log::info('[MobileExaminee] Examinee - ID: ' . $exam->id . ', AccountID: ' . $exam->accountId . ', Name: ' . $exam->full_name);
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'Student profile not found. Please contact administrator.'
                ], 404);
            }

            Log::info('[MobileExaminee] Examinee profile found for user: ' . $user->id);
            Log::info('[MobileExaminee] Examinee details - ID: ' . $examinee->id . ', Name: ' . $examinee->full_name . ', School: ' . $examinee->school_name);
            
            // Debug registration data
            Log::info('[MobileExaminee] Registration data: ' . json_encode($examinee->registration));
            if ($examinee->registration) {
                Log::info('[MobileExaminee] Registration status: ' . $examinee->registration->status);
                Log::info('[MobileExaminee] Registration assigned_exam_date: ' . $examinee->registration->assigned_exam_date);
            } else {
                Log::info('[MobileExaminee] No registration found for examinee ID: ' . $examinee->id);
            }

            // Return data in the format expected by the mobile app
            return response()->json([
                'id' => $examinee->id,
                'name' => $examinee->full_name, // Use the accessor for backward compatibility
                'lname' => $examinee->lname,
                'fname' => $examinee->fname,
                'mname' => $examinee->mname,
                'gender' => $examinee->gender,
                'age' => $examinee->age,
                'school_name' => $examinee->school_name,
                'parent_name' => $examinee->parent_name,
                'parent_phone' => $examinee->parent_phone,
                'phone' => $examinee->phone,
                'address' => $examinee->address,
                'Profile' => $examinee->Profile,
                'preferred_course' => $examinee->preferred_course,
                'exam_schedule' => $examinee->registration ? [
                    'assigned_exam_date' => $examinee->registration->assigned_exam_date,
                    'registration_date' => $examinee->registration->registration_date,
                    'status' => $examinee->registration->status,
                    'school_year' => $examinee->registration->school_year,
                    'semester' => $examinee->registration->semester,
                ] : null,
                'created_at' => $examinee->created_at,
                'updated_at' => $examinee->updated_at,
            ], 200);

        } catch (\Exception $e) {
            Log::error('[MobileExaminee] Profile error: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve examinee profile. Please try again.'
            ], 500);
        }
    }

    /**
     * Update examinee profile for mobile app
     * Updates data in the database and returns updated examinee data
     */
    public function updateProfile(Request $request)
    {
        try {
            /** @var User $user */
            $user = $request->user();
            
            Log::info('[MobileExaminee] Updating examinee profile for user: ' . $user->id);
            Log::info('[MobileExaminee] Update request data:', $request->all());

            // Check if user has student role
            if ($user->role !== 'student') {
                Log::warning('[MobileExaminee] Update access denied - user role: ' . $user->role);
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only students can update their profile.'
                ], 403);
            }

            // Validate required fields
            $request->validate([
                'lname' => 'required|string|max:255',
                'fname' => 'required|string|max:255',
                'mname' => 'nullable|string|max:255',
                'gender' => 'required|string|in:Male,Female',
                'age' => 'required|numeric|min:1|max:120',
                'school_name' => 'required|string|max:255',
                'parent_name' => 'required|string|max:255',
                'parent_phone' => 'required|string|max:20',
                'phone' => 'required|numeric|min:1000000000|max:999999999999999',
                'address' => 'required|string|max:500',
                'Profile' => 'nullable|string', // Profile picture as base64 string
            ], [
                'lname.required' => 'Last name is required.',
                'fname.required' => 'First name is required.',
                'gender.required' => 'Gender is required.',
                'gender.in' => 'Gender must be either Male or Female.',
                'age.required' => 'Age is required.',
                'age.numeric' => 'Age must be a valid number.',
                'age.min' => 'Age must be at least 1.',
                'age.max' => 'Age must not exceed 120.',
                'school_name.required' => 'School name is required.',
                'parent_name.required' => 'Parent name is required.',
                'parent_phone.required' => 'Parent phone number is required.',
                'phone.required' => 'Phone number is required.',
                'phone.numeric' => 'Phone number must be a valid number.',
                'phone.min' => 'Phone number must be at least 10 digits.',
                'phone.max' => 'Phone number must not exceed 15 digits.',
                'address.required' => 'Address is required.',
            ]);

            // Get examinee data from the examinee table with registration info
            $examinee = Examinee::with('registration')->where('accountId', $user->id)->first();

            if (!$examinee) {
                Log::warning('[MobileExaminee] No examinee profile found for update - user: ' . $user->id);
                return response()->json([
                    'success' => false,
                    'message' => 'Student profile not found. Please contact administrator.'
                ], 404);
            }

            // Prepare update data
            $updateData = [
                'lname' => $request->lname,
                'fname' => $request->fname,
                'mname' => $request->mname,
                'gender' => $request->gender,
                'age' => (int) $request->age,
                'school_name' => $request->school_name,
                'parent_name' => $request->parent_name,
                'parent_phone' => $request->parent_phone,
                'phone' => $request->phone,
                'address' => $request->address,
            ];

            // Add profile picture if provided
            if ($request->has('Profile') && $request->Profile) {
                $updateData['Profile'] = $request->Profile;
                Log::info('[MobileExaminee] Profile picture updated for user: ' . $user->id);
            }

            // Update examinee data
            $examinee->update($updateData);

            Log::info('[MobileExaminee] Profile updated successfully for user: ' . $user->id);
            Log::info('[MobileExaminee] Updated examinee details - ID: ' . $examinee->id . ', Name: ' . $examinee->full_name);

            // Return updated data in the format expected by the mobile app
            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully!',
                'examinee' => [
                    'id' => $examinee->id,
                    'name' => $examinee->full_name, // Use the accessor for backward compatibility
                    'lname' => $examinee->lname,
                    'fname' => $examinee->fname,
                    'mname' => $examinee->mname,
                    'gender' => $examinee->gender,
                    'age' => $examinee->age,
                    'school_name' => $examinee->school_name,
                    'parent_name' => $examinee->parent_name,
                    'parent_phone' => $examinee->parent_phone,
                    'phone' => $examinee->phone,
                    'address' => $examinee->address,
                    'Profile' => $examinee->Profile,
                    'preferred_course' => $examinee->preferred_course,
                    'exam_schedule' => $examinee->registration ? [
                        'assigned_exam_date' => $examinee->registration->assigned_exam_date,
                        'registration_date' => $examinee->registration->registration_date,
                        'status' => $examinee->registration->status,
                        'school_year' => $examinee->registration->school_year,
                        'semester' => $examinee->registration->semester,
                    ] : null,
                    'created_at' => $examinee->created_at,
                    'updated_at' => $examinee->updated_at,
                ]
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('[MobileExaminee] Validation failed for user: ' . $user->id, [
                'errors' => $e->errors()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed. Please check your input.',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            Log::error('[MobileExaminee] Profile update error: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile. Please try again.'
            ], 500);
        }
    }

    /**
     * Get available courses for mobile app
     * Returns courses with their passing score requirements
     */
    public function getCourses(Request $request)
    {
        try {
            /** @var User $user */
            $user = $request->user();
            
            Log::info('[MobileExaminee] Fetching courses for user: ' . $user->id);

            // Check if user has student role
            if ($user->role !== 'student') {
                Log::warning('[MobileExaminee] Courses access denied - user role: ' . $user->role);
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only students can access this endpoint.'
                ], 403);
            }

            // Get all courses with their details
            $courses = Course::orderBy('course_name', 'asc')->get()->map(function($course) {
                return [
                    'id' => $course->id,
                    'course_code' => $course->course_code,
                    'course_name' => $course->course_name,
                    'description' => $course->description,
                    'passing_rate' => $course->passing_rate,
                    'passing_rate_display' => $course->passing_rate . '%',
                ];
            });

            Log::info('[MobileExaminee] Retrieved ' . $courses->count() . ' courses for user: ' . $user->id);

            return response()->json([
                'success' => true,
                'message' => 'Courses retrieved successfully',
                'courses' => $courses
            ], 200);

        } catch (\Exception $e) {
            Log::error('[MobileExaminee] Courses error: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve courses. Please try again.'
            ], 500);
        }
    }

    /**
     * Update examinee preferred course for mobile app
     * Updates the preferred_course field in the examinee table
     */
    public function updatePreferredCourse(Request $request)
    {
        try {
            /** @var User $user */
            $user = $request->user();
            
            Log::info('[MobileExaminee] Updating preferred course for user: ' . $user->id);
            Log::info('[MobileExaminee] Preferred course data:', $request->all());

            // Check if user has student role
            if ($user->role !== 'student') {
                Log::warning('[MobileExaminee] Preferred course update access denied - user role: ' . $user->role);
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Only students can update their preferred course.'
                ], 403);
            }

            // Validate required field
            $request->validate([
                'preferred_course' => 'required|string|max:50',
            ], [
                'preferred_course.required' => 'Preferred course is required.',
                'preferred_course.string' => 'Preferred course must be a valid string.',
                'preferred_course.max' => 'Preferred course must not exceed 50 characters.',
            ]);

            // Get examinee data from the examinee table
            $examinee = Examinee::where('accountId', $user->id)->first();

            if (!$examinee) {
                Log::warning('[MobileExaminee] No examinee profile found for preferred course update - user: ' . $user->id);
                return response()->json([
                    'success' => false,
                    'message' => 'Student profile not found. Please contact administrator.'
                ], 404);
            }

            // Verify that the course code exists in the courses table (optional validation)
            $courseExists = Course::where('course_code', $request->preferred_course)->exists();
            if (!$courseExists) {
                Log::warning('[MobileExaminee] Invalid course code provided: ' . $request->preferred_course);
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid course code. Please select a valid course.'
                ], 422);
            }

            // Update preferred course
            $examinee->update([
                'preferred_course' => $request->preferred_course,
            ]);

            Log::info('[MobileExaminee] Preferred course updated successfully for user: ' . $user->id . ' to: ' . $request->preferred_course);

            // Return success response
            return response()->json([
                'success' => true,
                'message' => 'Preferred course updated successfully!',
                'preferred_course' => $examinee->preferred_course,
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('[MobileExaminee] Preferred course validation failed for user: ' . $user->id, [
                'errors' => $e->errors()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed. Please check your input.',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            Log::error('[MobileExaminee] Preferred course update error: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update preferred course. Please try again.'
            ], 500);
        }
    }

    /**
     * Test endpoint to check examinee data without authentication
     */
    public function testExamineeData()
    {
        try {
            $examinee = Examinee::find(10);
            $user = $examinee ? User::find($examinee->accountId) : null;
            
            return response()->json([
                'examinee' => $examinee,
                'user' => $user,
                'all_examinees' => Examinee::all()->map(function($e) {
                    return [
                        'id' => $e->id,
                        'accountId' => $e->accountId,
                        'name' => $e->full_name
                    ];
                })
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available exam dates (distinct dates from exam_schedules)
     */
    public function getExamDates(Request $request)
    {
        try {
            // Get distinct exam dates with open status
            $dates = ExamSchedule::where('status', 'open')
                ->where('exam_date', '>=', now()->toDateString())
                ->select('exam_date')
                ->selectRaw('COUNT(*) as slots_count')
                ->groupBy('exam_date')
                ->orderBy('exam_date')
                ->get();

            Log::info('[MobileExaminee] Found ' . $dates->count() . ' available exam dates');

            return response()->json([
                'success' => true,
                'data' => $dates
            ]);

        } catch (\Exception $e) {
            Log::error('[MobileExaminee] Error fetching exam dates: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch exam dates'
            ], 500);
        }
    }

    /**
     * Get available exam schedules for rescheduling
     */
    public function getExamSchedules(Request $request)
    {
        try {
            $date = $request->query('date');
            
            if (!$date) {
                return response()->json([
                    'success' => false,
                    'message' => 'Date parameter is required'
                ], 400);
            }

            // Validate date format
            $parsedDate = \DateTime::createFromFormat('Y-m-d', $date);
            if (!$parsedDate || $parsedDate->format('Y-m-d') !== $date) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid date format. Use YYYY-MM-DD'
                ], 400);
            }

            // Get exam schedules for the specified date
            $schedules = ExamSchedule::where('exam_date', $date)
                ->where('status', 'open')
                ->orderBy('start_time')
                ->get();

            Log::info('[MobileExaminee] Found ' . $schedules->count() . ' exam schedules for date: ' . $date);

            return response()->json([
                'success' => true,
                'data' => $schedules->map(function ($schedule) {
                    return [
                        'id' => $schedule->id,
                        'exam_date' => $schedule->exam_date,
                        'session' => $schedule->session,
                        'start_time' => $schedule->start_time,
                        'end_time' => $schedule->end_time,
                        'max_capacity' => $schedule->max_capacity,
                        'current_registrations' => $schedule->current_registrations,
                        'status' => $schedule->status,
                        'available_spots' => $schedule->max_capacity - $schedule->current_registrations
                    ];
                })
            ]);

        } catch (\Exception $e) {
            Log::error('[MobileExaminee] Error fetching exam schedules: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch exam schedules'
            ], 500);
        }
    }

    /**
     * Reschedule exam for an examinee
     */
    public function rescheduleExam(Request $request)
    {
        try {
            /** @var User $user */
            $user = $request->user();
            
            Log::info('[MobileExaminee] Reschedule request received', [
                'user_id' => $user->id,
                'schedule_id' => $request->schedule_id
            ]);
            
            // Validate request
            $request->validate([
                'schedule_id' => 'required|integer|exists:exam_schedules,id'
            ]);

            // Get examinee
            $examinee = Examinee::where('accountId', $user->id)->first();
            
            Log::info('[MobileExaminee] Examinee found', [
                'examinee_id' => $examinee ? $examinee->id : 'null'
            ]);
            
            if (!$examinee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Examinee profile not found'
                ], 404);
            }

            // Get the selected schedule
            $schedule = ExamSchedule::find($request->schedule_id);
            
            if (!$schedule) {
                return response()->json([
                    'success' => false,
                    'message' => 'Exam schedule not found'
                ], 404);
            }

            // Check if schedule is still available
            if ($schedule->current_registrations >= $schedule->max_capacity) {
                return response()->json([
                    'success' => false,
                    'message' => 'This exam slot is now full'
                ], 400);
            }

            // Get or create examinee registration
            $registration = ExamineeRegistration::where('examinee_id', $examinee->id)->first();
            
            if (!$registration) {
                // Create new registration
                $registration = ExamineeRegistration::create([
                    'examinee_id' => $examinee->id,
                    'school_year' => now()->year . '-' . (now()->year + 1),
                    'semester' => '1st',
                    'registration_date' => now(),
                    'assigned_exam_date' => $schedule->exam_date,
                    'assigned_session' => $schedule->session,
                    'status' => 'assigned'
                ]);
                
                Log::info('[MobileExaminee] New registration created', [
                    'registration_id' => $registration->id
                ]);
            } else {
                // Update existing registration
                $oldSchedule = null;
                if ($registration->assigned_exam_date && $registration->assigned_session) {
                    $oldSchedule = ExamSchedule::where('exam_date', $registration->assigned_exam_date)
                        ->where('session', $registration->assigned_session)
                        ->first();
                    
                    // Decrement old schedule's current_registrations
                    if ($oldSchedule) {
                        $oldSchedule->decrement('current_registrations');
                        Log::info('[MobileExaminee] Decremented old schedule', [
                            'old_schedule_id' => $oldSchedule->id,
                            'new_count' => $oldSchedule->current_registrations
                        ]);
                    }
                }
                
                $registration->update([
                    'assigned_exam_date' => $schedule->exam_date,
                    'assigned_session' => $schedule->session,
                    'status' => 'assigned'
                ]);
                
                Log::info('[MobileExaminee] Registration updated', [
                    'registration_id' => $registration->id
                ]);
            }

            // Increment new schedule's current_registrations
            $schedule->increment('current_registrations');

            Log::info('[MobileExaminee] Exam rescheduled for examinee: ' . $examinee->id . ' to schedule: ' . $schedule->id);

            return response()->json([
                'success' => true,
                'message' => 'Exam rescheduled successfully',
                'data' => [
                    'exam_date' => $schedule->exam_date,
                    'session' => $schedule->session,
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('[MobileExaminee] Error rescheduling exam: ' . $e->getMessage());
            Log::error('[MobileExaminee] Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to reschedule exam: ' . $e->getMessage()
            ], 500);
        }
    }
}
