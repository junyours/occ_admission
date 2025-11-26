<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Models\Examinee;
use App\Models\ExamSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use App\Models\ExamineeRegistration;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use App\Models\ExamRegistrationSetting;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;

class MobileRegistrationController extends Controller
{
    /**
     * Mobile app registration endpoint
     * Handles complete registration in one step for mobile app
     */
    public function register(Request $request)
    {
        try {
            // First, check email status for smart validation
            $email = strtolower($request->input('email'));
            
            if ($email) {
                $existingUser = User::where('email', $email)->first();
                
                if ($existingUser) {
                    // Email exists - check verification status
                    if ($existingUser->email_verified_at) {
                        // Email is verified - show "Already Verified" error
                        Log::info('[MobileRegistration] Email already verified', [
                            'email' => $email,
                            'verified_at' => $existingUser->email_verified_at
                        ]);
                        
                        return response()->json([
                            'success' => false,
                            'message' => 'Already Verified',
                            'errors' => [
                                'email' => ['This email address is already verified and registered.']
                            ],
                            'email_status' => 'verified'
                        ], 422);
                    } else {
                        // Email exists but not verified - proceed to verification
                        Log::info('[MobileRegistration] Email exists but not verified', [
                            'email' => $email,
                            'verified_at' => $existingUser->email_verified_at
                        ]);
                        
                        return response()->json([
                            'success' => false,
                            'message' => 'Email not verified',
                            'errors' => [
                                'email' => ['This email address is registered but not verified. Please check your email for verification code.']
                            ],
                            'email_status' => 'unverified',
                            'redirect_to_verification' => true
                        ], 422);
                    }
                }
            }

            // Log incoming request data (before validation)
            Log::info('[MobileRegistration] Incoming registration request', [
                'email' => $request->input('email', 'NOT_SET'),
                'has_gender' => $request->has('gender'),
                'has_age' => $request->has('age'),
                'gender' => $request->input('gender', 'NOT_SET'),
                'age' => $request->input('age', 'NOT_SET'),
                'all_request_keys' => array_keys($request->all()),
                'timestamp' => now()->toISOString()
            ]);

            // Validate request (excluding unique email check since we handle it above)
            $validator = Validator::make($request->all(), [
                'lname' => 'required|string|max:255',
                'fname' => 'required|string|max:255',
                'mname' => 'nullable|string|max:255',
                'email' => 'required|string|email|max:255',
                'password' => 'required|string|min:8|confirmed',
                'gender' => 'required|string|in:Male,Female',
                'age' => 'required|numeric|min:1|max:120',
                'school_name' => 'required|string|max:255',
                'parent_name' => 'required|string|max:255',
                'parent_phone' => 'required|string|size:11',
                'phone' => 'required|string|size:11',
                'address' => 'required|string|max:500',
                'profile' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120',
                'selected_exam_date' => 'required|date',
                'selected_exam_session' => 'required|in:morning,afternoon',
            ], [
                'lname.required' => 'Last name is required.',
                'fname.required' => 'First name is required.',
                'email.required' => 'Email address is required.',
                'email.email' => 'Please enter a valid email address.',
                'password.required' => 'Password is required.',
                'password.min' => 'Password must be at least 8 characters long.',
                'password.confirmed' => 'Password confirmation does not match.',
                'gender.required' => 'Gender is required.',
                'gender.in' => 'Gender must be either Male or Female.',
                'age.required' => 'Age is required.',
                'age.numeric' => 'Age must be a valid number.',
                'age.min' => 'Age must be at least 1.',
                'age.max' => 'Age must not exceed 120.',
                'school_name.required' => 'School name is required.',
                'parent_name.required' => 'Parent/Guardian name is required.',
                'parent_phone.required' => 'Parent/Guardian phone is required.',
                'phone.required' => 'Your phone number is required.',
                'phone.size' => 'Phone number must be exactly 11 digits.',
                'address.required' => 'Address is required.',
                'profile.required' => 'Profile picture is required.',
                'profile.image' => 'Profile must be an image file.',
                'profile.mimes' => 'Profile image must be a JPEG, PNG, JPG, or GIF file.',
                'profile.max' => 'Profile image must not exceed 5MB.',
                'selected_exam_date.required' => 'Exam date is required.',
                'selected_exam_session.required' => 'Exam session is required.',
            ]);

            if ($validator->fails()) {
                Log::error('[MobileRegistration] Validation failed', [
                    'email' => $request->input('email', 'unknown'),
                    'errors' => $validator->errors()->toArray(),
                    'request_data' => $request->except(['profile']) // Exclude file data from log
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $validated = $validator->validated();
            $email = strtolower($validated['email']);

            // Enhanced logging
            Log::info('[MobileRegistration] Starting registration', [
                'email' => $email,
                'has_profile' => $request->hasFile('profile'),
                'profile_size' => $request->hasFile('profile') ? $request->file('profile')->getSize() : 0,
                'phone_length' => strlen($validated['phone']),
                'parent_phone_length' => strlen($validated['parent_phone']),
                'has_gender' => isset($validated['gender']),
                'has_age' => isset($validated['age']),
                'gender' => $validated['gender'] ?? 'NOT_SET',
                'age' => $validated['age'] ?? 'NOT_SET',
                'all_validated_keys' => array_keys($validated),
                'timestamp' => now()->toISOString()
            ]);

            // Validate phone numbers
            if (!preg_match('/^09\d{9}$/', $validated['phone'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Phone number must be 11 digits starting with 09.',
                    'errors' => ['phone' => ['Phone number must be 11 digits starting with 09.']]
                ], 422);
            }

            if (!preg_match('/^09\d{9}$/', $validated['parent_phone'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Parent phone number must be 11 digits starting with 09.',
                    'errors' => ['parent_phone' => ['Parent phone number must be 11 digits starting with 09.']]
                ], 422);
            }

            // Handle profile image upload
            $profileData = null;
            if ($request->hasFile('profile')) {
                $file = $request->file('profile');
                $imageData = file_get_contents($file->getPathname());
                $profileData = base64_encode($imageData);
            }

            // Create full name for username
            $fullName = $validated['fname'] . ' ' . $validated['lname'];
            if (!empty($validated['mname'])) {
                $fullName = $validated['fname'] . ' ' . $validated['mname'] . ' ' . $validated['lname'];
            }

            // Start database transaction
            DB::beginTransaction();

            try {
                // Create user account (NOT verified yet)
                $user = User::create([
                    'username' => $fullName,
                    'email' => $email,
                    'password' => Hash::make($validated['password']),
                    'role' => 'student',
                    'email_verified_at' => null, // NOT verified until email verification
                ]);

                Log::info('[MobileRegistration] User created successfully', [
                    'user_id' => $user->id,
                    'email' => $email,
                    'timestamp' => now()->toISOString()
                ]);

                // Store registration data in cache for verification step
                $registrationData = [
                    'user_id' => $user->id,
                    'lname' => $validated['lname'],
                    'fname' => $validated['fname'],
                    'mname' => $validated['mname'] ?? null,
                    'gender' => $validated['gender'],
                    'age' => (int) $validated['age'],
                    'phone' => (int) $validated['phone'],
                    'address' => $validated['address'],
                    'school_name' => $validated['school_name'],
                    'parent_name' => $validated['parent_name'],
                    'parent_phone' => (int) $validated['parent_phone'],
                    'profile_data' => $profileData,
                    'selected_exam_date' => $validated['selected_exam_date'],
                    'selected_exam_session' => $validated['selected_exam_session'],
                ];
                
                // Store in cache for 1 hour (verification timeout)
                Cache::put("pending_registration_{$email}", $registrationData, 3600);
                
                Log::info('[MobileRegistration] Registration data stored in cache', [
                    'user_id' => $user->id,
                    'email' => $email,
                    'cache_key' => "pending_registration_{$email}",
                    'has_gender' => isset($registrationData['gender']),
                    'has_age' => isset($registrationData['age']),
                    'gender' => $registrationData['gender'] ?? 'missing',
                    'age' => $registrationData['age'] ?? 'missing',
                    'cached_keys' => array_keys($registrationData),
                    'timestamp' => now()->toISOString()
                ]);

                DB::commit();

                // Send verification email
                $verificationCode = rand(100000, 999999);
                Cache::put("verification_code_{$email}", $verificationCode, 600); // 10 minutes
                
                // TODO: Send actual email with verification code
                // For now, we'll log it for testing
                Log::info('[MobileRegistration] Verification code generated', [
                    'email' => $email,
                    'verification_code' => $verificationCode,
                    'timestamp' => now()->toISOString()
                ]);

                Log::info('[MobileRegistration] Registration step 1 completed - verification required', [
                    'user_id' => $user->id,
                    'email' => $email,
                    'email_verified' => 'no',
                    'next_step' => 'email_verification',
                    'timestamp' => now()->toISOString()
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Registration started! Please check your email for verification code.',
                    'data' => [
                        'user_id' => $user->id,
                        'email' => $email,
                        'email_verified' => false,
                        'next_step' => 'verification',
                        'verification_code' => $verificationCode // Remove this in production!
                    ]
                ], 201);

            } catch (\Exception $e) {
                DB::rollback();
                
                Log::error('[MobileRegistration] Registration failed', [
                    'email' => $email,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'timestamp' => now()->toISOString()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Registration failed. Please try again.',
                    'error' => $e->getMessage()
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('[MobileRegistration] Unexpected error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'email' => $request->input('email', 'unknown'),
                'timestamp' => now()->toISOString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred. Please try again.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify email and complete registration
     */
    public function verifyEmail(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
                'verification_code' => 'required|string|size:6',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $email = strtolower($request->input('email'));
            $code = $request->input('verification_code');

            // Check verification code
            $storedCode = Cache::get("verification_code_{$email}");
            if (!$storedCode || $storedCode != $code) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid verification code. Please try again.',
                ], 400);
            }

            // Get pending registration data
            $registrationData = Cache::get("pending_registration_{$email}");
            if (!$registrationData) {
                Log::error('[MobileRegistration] Registration data not found in cache', [
                    'email' => $email,
                    'cache_key' => "pending_registration_{$email}"
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Registration data not found. Please register again.',
                ], 400);
            }

            // Log retrieved cache data for debugging
            Log::info('[MobileRegistration] Retrieved cached registration data', [
                'email' => $email,
                'has_gender' => isset($registrationData['gender']),
                'has_age' => isset($registrationData['age']),
                'gender' => $registrationData['gender'] ?? 'NOT_SET',
                'age' => $registrationData['age'] ?? 'NOT_SET',
                'cached_keys' => array_keys($registrationData)
            ]);

            // Validate required fields exist in cached data
            if (!isset($registrationData['gender']) || !isset($registrationData['age'])) {
                Log::error('[MobileRegistration] Missing gender/age in cached data - clearing old cache', [
                    'email' => $email,
                    'has_gender' => isset($registrationData['gender']),
                    'has_age' => isset($registrationData['age']),
                    'cached_keys' => array_keys($registrationData),
                    'full_cached_data' => $registrationData
                ]);
                
                // Clear the old cache entry so user can register again
                Cache::forget("pending_registration_{$email}");
                
                // Also delete the user if it exists (since registration is incomplete)
                if (isset($registrationData['user_id'])) {
                    try {
                        $user = User::find($registrationData['user_id']);
                        if ($user && !$user->email_verified_at) {
                            $user->delete();
                            Log::info('[MobileRegistration] Deleted incomplete user', ['user_id' => $registrationData['user_id']]);
                        }
                    } catch (\Exception $e) {
                        Log::error('[MobileRegistration] Error deleting incomplete user', ['error' => $e->getMessage()]);
                    }
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'Your previous registration data is incomplete. Please register again with all required fields (including gender and age).',
                ], 400);
            }

            // Start transaction
            DB::beginTransaction();

            try {
                // Update user as verified
                $user = User::find($registrationData['user_id']);
                if (!$user) {
                    throw new \RuntimeException('User not found');
                }

                $user->update(['email_verified_at' => now()]);

                // Create examinee record
                $examinee = Examinee::create([
                    'accountId' => $user->id,
                    'lname' => $registrationData['lname'],
                    'fname' => $registrationData['fname'],
                    'mname' => $registrationData['mname'] ?? null,
                    'gender' => $registrationData['gender'],
                    'age' => (int) $registrationData['age'],
                    'phone' => $registrationData['phone'],
                    'address' => $registrationData['address'],
                    'school_name' => $registrationData['school_name'],
                    'parent_name' => $registrationData['parent_name'],
                    'parent_phone' => $registrationData['parent_phone'],
                    'Profile' => $registrationData['profile_data'] ?? null,
                ]);

                // Get current registration settings
                $settings = ExamRegistrationSetting::getCurrentSettings();

                // Create examinee registration record
                $registration = ExamineeRegistration::create([
                    'examinee_id' => $examinee->id,
                    'school_year' => $settings->academic_year ?? date('Y') . '-' . (date('Y') + 1),
                    'semester' => $settings->semester ?? '1st',
                    'status' => 'assigned',
                    'registration_date' => now()->toDateString(),
                    'assigned_exam_date' => $registrationData['selected_exam_date'],
                    'assigned_session' => $registrationData['selected_exam_session'],
                ]);

                // Update exam schedule capacity
                $examSchedule = ExamSchedule::where('exam_date', $registrationData['selected_exam_date'])
                    ->where('session', $registrationData['selected_exam_session'])
                    ->first();

                if ($examSchedule) {
                    $examSchedule->increment('current_registrations');
                    if ($examSchedule->current_registrations >= $examSchedule->max_capacity) {
                        $examSchedule->update(['status' => 'full']);
                    }
                }

                // Clean up cache
                Cache::forget("verification_code_{$email}");
                Cache::forget("pending_registration_{$email}");

                DB::commit();

                Log::info('[MobileRegistration] Email verification completed successfully', [
                    'user_id' => $user->id,
                    'examinee_id' => $examinee->id,
                    'registration_id' => $registration->id,
                    'email' => $email,
                    'timestamp' => now()->toISOString()
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Registration completed successfully! You can now log in.',
                    'data' => [
                        'user_id' => $user->id,
                        'examinee_id' => $examinee->id,
                        'email' => $email,
                        'email_verified' => true,
                        'exam_date' => $registrationData['selected_exam_date'],
                        'exam_session' => $registrationData['selected_exam_session']
                    ]
                ], 200);

            } catch (\Exception $e) {
                DB::rollback();
                
                Log::error('[MobileRegistration] Email verification failed', [
                    'email' => $email,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Verification failed. Please try again.',
                    'error' => $e->getMessage()
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('[MobileRegistration] Verification unexpected error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred. Please try again.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resend verification code for unverified email
     */
    public function resendVerificationCode(Request $request)
    {
        try {
            $email = strtolower($request->input('email'));
            
            if (!$email) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email address is required.'
                ], 400);
            }

            // Check if user exists
            $user = User::where('email', $email)->first();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email address not found. Please register first.'
                ], 404);
            }

            // Check if already verified
            if ($user->email_verified_at) {
                return response()->json([
                    'success' => false,
                    'message' => 'Email address is already verified.'
                ], 400);
            }

            // Generate new verification code
            $verificationCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            
            // Store verification code in cache (5 minutes)
            Cache::put("verification_code_{$email}", $verificationCode, 300);
            
            // Send verification email
            try {
                Mail::to($email)->send(new \App\Mail\RegistrationVerificationCode($verificationCode, $email));
                
                Log::info('[MobileRegistration] Verification code resent', [
                    'email' => $email,
                    'timestamp' => now()->toISOString()
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Verification code has been resent to your email address.'
                ]);
                
            } catch (\Exception $mailError) {
                Log::error('[MobileRegistration] Failed to send verification email', [
                    'email' => $email,
                    'error' => $mailError->getMessage()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to send verification email. Please try again later.'
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('[MobileRegistration] Error resending verification code', [
                'email' => $request->input('email'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An unexpected error occurred. Please try again.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
