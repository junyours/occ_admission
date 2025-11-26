<?php

namespace App\Http\Controllers\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

use App\Models\User;
use App\Models\Examinee;
use App\Models\Evaluator;
use App\Models\GuidanceCounselor;
use App\Models\ExamineeRegistration;
use App\Models\ExamRegistrationSetting;
use App\Models\PreferredCourse;
use App\Mail\RegistrationVerificationCode;
use Inertia\Inertia;
use App\Http\Controllers\Controller;

class AuthController extends Controller
{
    public function showLogin()
    {
        // If user is already logged in, redirect to appropriate dashboard
        if (Auth::check()) {
            return $this->redirectToDashboard(Auth::user());
        }
        
        return Inertia::render('auth/Login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $credentials = $request->only('email', 'password');

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            $user = Auth::user();
            
            // Check user role and redirect accordingly
            switch ($user->role) {
                case 'evaluator':
                    return redirect()->route('evaluator.dashboard');
                case 'guidance':
                    return redirect()->route('guidance.dashboard');
                case 'student':
                    // Students will be redirected to a student dashboard or exam page
                    // For now, redirect to login with a message
                    Auth::logout();
                    return back()->withErrors(['email' => 'Student login is not available on the web. Please use the mobile app.']);
                default:
                    Auth::logout();
                    return back()->withErrors(['email' => 'Invalid user role.']);
            }
        }

        return back()->withErrors([
            'email' => 'The provided credentials do not match our records.',
        ]);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        
        return redirect()->route('login');
    }

    /**
     * Quick authentication status check for AJAX requests
     */
    public function checkAuthStatus(Request $request)
    {
        if ($request->ajax()) {
            if (Auth::check()) {
                $user = Auth::user();
                return response()->json([
                    'authenticated' => true,
                    'role' => $user->role,
                    'redirect_url' => $user->role === 'evaluator' 
                        ? route('evaluator.dashboard') 
                        : route('guidance.dashboard')
                ]);
            } else {
                return response()->json([
                    'authenticated' => false,
                    'redirect_url' => route('login')
                ], 401);
            }
        }
        
        // For non-AJAX requests, redirect based on auth status
        if (Auth::check()) {
            return $this->redirectToDashboard(Auth::user());
        } else {
            return redirect()->route('login');
        }
    }

    // API Methods for Passport
    public function apiLogin(Request $request)
    {
        $request->validate([
            'username' => 'sometimes|required_without:email|string',
            'email' => 'sometimes|required_without:username|email',
            'password' => 'required|string',
        ]);

        $password = (string) $request->input('password');

        // Determine identifier (username or email)
        $identifier = trim((string) ($request->input('username') ?? $request->input('email') ?? ''));
        $credentials = ['password' => $password];

        if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            $credentials['email'] = strtolower($identifier);
        } else {
            // Lookup by username to get email for Auth::attempt
            $user = User::where('username', $identifier)->first();
            if (!$user) {
                return response()->json(['error' => 'Invalid credentials'], 401);
            }
            $credentials['email'] = strtolower($user->email);
        }

        if (Auth::attempt($credentials)) {
            /** @var User $user */
            $user = Auth::user();

            // Only allow students to use API (aligns with mobile-only policy)
            if ($user->role !== 'student') {
                Auth::logout();
                return response()->json(['error' => 'Unauthorized. Only students can access the API.'], 401);
            }

            // Create Passport token
            $token = $user->createToken('Student Token')->accessToken;

            return response()->json([
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
                'examinee' => $user->examinee,
            ]);
        }

        return response()->json(['error' => 'Invalid credentials'], 401);
    }

    public function apiLogout(Request $request)
    {
        try {
            $token = $request->user()->token();
            if ($token) {
                $token->revoke();
            }
        } catch (\Throwable $e) {
            // swallow, still return success
        }
        return response()->json(['message' => 'Successfully logged out']);
    }

    public function getStudentProfile(Request $request)
    {
        /** @var User $user */
        $user = $request->user();
        return response()->json([
            'user' => $user,
            'examinee' => $user->examinee,
        ]);
    }

    public function getStudentExams(Request $request)
    {
        return response()->json(['exams' => []]);
    }

    public function getStudentResults(Request $request)
    {
        return response()->json(['results' => []]);
    }

    public function submitExam(Request $request)
    {
        return response()->json(['message' => 'Exam submitted successfully']);
    }

    public function showRegister()
    {
        // If user is already logged in, redirect to appropriate dashboard
        if (Auth::check()) {
            return $this->redirectToDashboard(Auth::user());
        }
        
        $settings = ExamRegistrationSetting::getCurrentSettings();
        
        if (!$settings->registration_open) {
            return Inertia::render('auth/Register', [
                'registrationOpen' => false,
                'registrationMessage' => $settings->registration_message
            ]);
        }

        // Get available exam dates with current capacity
        $availableExamDates = [];
        if ($settings->exam_start_date && $settings->exam_end_date) {
            $examSchedules = \App\Models\ExamSchedule::whereBetween('exam_date', [$settings->exam_start_date, $settings->exam_end_date])
                ->orderBy('exam_date')
                ->orderBy('session')
                ->get()
                ->groupBy('exam_date');

            foreach ($examSchedules as $date => $schedules) {
                $dateInfo = [
                    'date' => $date,
                    'formatted_date' => \Carbon\Carbon::parse($date)->format('F j, Y'),
                    'sessions' => []
                ];

                foreach ($schedules as $schedule) {
                    $dateInfo['sessions'][] = [
                        'session' => $schedule->session,
                        'start_time' => $schedule->start_time,
                        'end_time' => $schedule->end_time,
                        'max_capacity' => $schedule->max_capacity,
                        'current_registrations' => $schedule->current_registrations,
                        'available_slots' => $schedule->max_capacity - $schedule->current_registrations,
                        'status' => $schedule->status,
                        'is_available' => $schedule->status === 'open' && $schedule->current_registrations < $schedule->max_capacity
                    ];
                }

                $availableExamDates[] = $dateInfo;
            }
        }

        return Inertia::render('auth/Register', [
            'registrationOpen' => true,
            'registrationMessage' => $settings->registration_message,
            'availableExamDates' => $availableExamDates
        ]);
    }

    public function register(Request $request)
    {
        // Check if registration is open
        $settings = ExamRegistrationSetting::getCurrentSettings();
        if (!$settings->registration_open) {
            return back()->withErrors(['registration' => 'Registration is currently closed.']);
        }

        $request->validate([
            'lname' => 'required|string|max:255',
            'fname' => 'required|string|max:255',
            'mname' => 'nullable|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'school_name' => 'required|string|max:255',
            'parent_name' => 'required|string|max:255',
            'parent_phone' => 'required|string|max:20',
            'phone' => 'required|string|size:11',
            'address' => 'required|string|max:500',
            'profile' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
        ], [
            'lname.required' => 'Last name is required.',
            'fname.required' => 'First name is required.',
            'email.required' => 'Email address is required.',
            'email.email' => 'Please enter a valid email address.',
            'email.unique' => 'This email address is already registered.',
            'password.required' => 'Password is required.',
            'password.min' => 'Password must be at least 8 characters long.',
            'password.confirmed' => 'Password confirmation does not match.',
            'school_name.required' => 'School name is required.',
            'parent_name.required' => 'Parent/Guardian name is required.',
            'parent_phone.required' => 'Parent/Guardian phone is required.',
            'phone.required' => 'Your phone number is required.',
            'phone.string' => 'Phone number must be a valid string.',
            'phone.size' => 'Phone number must be exactly 11 digits.',
            'address.required' => 'Address is required.',
            'profile.required' => 'Profile picture is required.',
            'profile.image' => 'Profile must be an image file.',
            'profile.mimes' => 'Profile image must be a JPEG, PNG, JPG, or GIF file.',
            'profile.max' => 'Profile image must not exceed 5MB.',
        ]);


        try {
            DB::beginTransaction();

            // Log phone numbers for debugging
            Log::info('[Registration] Phone numbers received:', [
                'phone' => $request->phone,
                'parent_phone' => $request->parent_phone,
                'phone_type' => gettype($request->phone),
                'parent_phone_type' => gettype($request->parent_phone)
            ]);

            // Create user account
            $fullName = $request->fname . ' ' . $request->lname;
            if (!empty($request->mname)) {
                $fullName = $request->fname . ' ' . $request->mname . ' ' . $request->lname;
            }
            
            $user = User::create([
                'username' => $fullName, // Use full name as username
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => 'student',
            ]);

            // Handle profile image upload - store as base64 in database
            $profileData = null;
            if ($request->hasFile('profile')) {
                $file = $request->file('profile');
                $imageData = file_get_contents($file->getPathname());
                $profileData = base64_encode($imageData);
            }

            // Create examinee record
            $examinee = Examinee::create([
                'accountId' => $user->id,
                'lname' => $request->lname,
                'fname' => $request->fname,
                'mname' => $request->mname,
                'phone' => (int) $request->phone, // Convert string to integer for database storage
                'address' => $request->address,
                'school_name' => $request->school_name,
                'parent_name' => $request->parent_name,
                'parent_phone' => (int) $request->parent_phone, // Convert string to integer for database storage
                'Profile' => $profileData,
            ]);

            // Log the created examinee data for debugging
            Log::info('[Registration] Examinee created:', [
                'examinee_id' => $examinee->id,
                'phone_stored' => $examinee->phone,
                'parent_phone_stored' => $examinee->parent_phone,
                'phone_type' => gettype($examinee->phone),
                'parent_phone_type' => gettype($examinee->parent_phone)
            ]);

            // Get current registration settings for academic year and semester
            $settings = ExamRegistrationSetting::getCurrentSettings();
            
            // Create examinee registration record (only exam assignment data)
            $registration = ExamineeRegistration::create([
                'examinee_id' => $examinee->id,
                'school_year' => $settings->academic_year ?? date('Y') . '-' . (date('Y') + 1),
                'semester' => $settings->semester ?? '1st',
                'status' => 'registered',
                'registration_date' => now()->toDateString(),
            ]);

            // Auto-assign examinee to exam date
            $this->autoAssignExamineeToExam($registration);

            DB::commit();

            return redirect()->route('login')->with('success', 'Registration successful! Please login to the mobile app to see your exam schedule.');

        } catch (\Exception $e) {
            DB::rollback();
            
            // Log the error for debugging
            Log::error('Registration failed: ' . $e->getMessage(), [
                'user_email' => $request->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Provide user-friendly error messages
            $errorMessage = 'Registration failed. Please try again.';
            if (str_contains($e->getMessage(), 'Duplicate entry')) {
                $errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
            } elseif (str_contains($e->getMessage(), 'SQLSTATE[HY000]')) {
                $errorMessage = 'Database error occurred. Please try again later.';
            }

            return back()->withErrors(['registration' => $errorMessage]);
        }
    }

    /**
     * Start registration by sending a verification code and caching the payload for up to 1 hour.
     */
    public function startRegistration(Request $request)
    {
        // Check if registration is open
        $settings = ExamRegistrationSetting::getCurrentSettings();
        if (!$settings->registration_open) {
            return back()->withErrors(['registration' => 'Registration is currently closed.']);
        }

        $emailInput = strtolower((string) $request->input('email'));
        $existingUser = $emailInput ? User::where('email', $emailInput)->first() : null;

        if ($existingUser && $existingUser->email_verified_at) {
            return back()->withErrors(['email' => 'This email is already verified. Please login to the mobile app to access your account.']);
        }

        if ($existingUser && !$existingUser->email_verified_at && $existingUser->created_at->lt(now()->subMinutes(20))) {
            try { $existingUser->delete(); } catch (\Exception $e) { Log::warning('Failed to delete expired unverified user', ['email' => $emailInput]); }
            $existingUser = null;
        }

        $validated = $request->validate([
            'lname' => 'required|string|max:255',
            'fname' => 'required|string|max:255',
            'mname' => 'nullable|string|max:255',
            'email' => [
                'required', 'string', 'email', 'max:255',
                $existingUser ? Rule::unique('users', 'email')->ignore($existingUser->id) : Rule::unique('users', 'email')
            ],
            'password' => 'required|string|min:8|confirmed',
            'gender' => 'required|string|in:Male,Female',
            'age' => 'required|integer|min:1|max:120',
            'school_name' => 'required|string|max:255',
            'parent_name' => 'required|string|max:255',
            'parent_phone' => 'required|string|max:20',
            'phone' => 'required|string|size:11',
            'address' => 'required|string|max:500',
            'profile' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
            'selected_exam_date' => 'required|date',
            'selected_exam_session' => 'required|in:morning,afternoon',
            'preferred_course_1' => 'required|string|max:255',
            'preferred_course_2' => 'required|string|max:255',
            'preferred_course_3' => 'required|string|max:255',
        ]);


        $email = strtolower($validated['email']);

        // Handle profile image upload - store as base64 data
        $profileData = null;
        if ($request->hasFile('profile')) {
            $file = $request->file('profile');
            $imageData = file_get_contents($file->getPathname());
            $profileData = base64_encode($imageData);
        }

        // Basic rate limit: max 5 code sends per hour per email
        $rateKey = 'reg:rate:' . sha1($email);
        $sendCount = Cache::get($rateKey, 0);
        if ($sendCount >= 20) {
            return back()->withErrors(['email' => 'Too many verification attempts. Please try again in an hour.']);
        }

        // Generate a 6-digit verification code
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Create full name for username
        $fullName = $validated['fname'] . ' ' . $validated['lname'];
        if (!empty($validated['mname'])) {
            $fullName = $validated['fname'] . ' ' . $validated['mname'] . ' ' . $validated['lname'];
        }

        // Create or update the unverified user record
        if (!$existingUser) {
            try {
                $existingUser = User::create([
                    'username' => $fullName,
                    'email' => $email,
                    'password' => Hash::make($validated['password']),
                    'role' => 'student',
                    'email_verified_at' => null,
                ]);
                
                // Log successful user creation
                Log::info('[Registration] User created successfully', [
                    'user_id' => $existingUser->id,
                    'email' => $email,
                    'timestamp' => now()->toISOString()
                ]);
            } catch (\Exception $e) {
                Log::error('[Registration] Failed creating temp user', [
                    'email' => $email, 
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                return back()->withErrors(['registration' => 'Registration failed. Please try again.']);
            }
        } else {
            try {
                $existingUser->update([
                    'username' => $fullName,
                    'password' => Hash::make($validated['password']),
                ]);
                
                Log::info('[Registration] User updated successfully', [
                    'user_id' => $existingUser->id,
                    'email' => $email,
                    'timestamp' => now()->toISOString()
                ]);
            } catch (\Exception $e) {
                Log::error('[Registration] Failed updating user', [
                    'user_id' => $existingUser->id,
                    'email' => $email,
                    'error' => $e->getMessage()
                ]);
                return back()->withErrors(['registration' => 'Registration update failed. Please try again.']);
            }
        }

        // Cache payload for 20 minutes
        $cacheKey = 'reg:pending:' . sha1($email);
        Cache::put($cacheKey, [
            'lname' => $validated['lname'],
            'fname' => $validated['fname'],
            'mname' => $validated['mname'],
            'gender' => $validated['gender'],
            'age' => (int) $validated['age'],
            'email' => $email,
            'password_hash' => Hash::make($validated['password']),
            'school_name' => $validated['school_name'],
            'parent_name' => $validated['parent_name'],
            'parent_phone' => $validated['parent_phone'],
            'phone' => $validated['phone'],
            'address' => $validated['address'],
            'profile_data' => $profileData,
            'selected_exam_date' => $validated['selected_exam_date'],
            'selected_exam_session' => $validated['selected_exam_session'],
            'preferred_course_1' => trim($validated['preferred_course_1']),
            'preferred_course_2' => trim($validated['preferred_course_2']),
            'preferred_course_3' => trim($validated['preferred_course_3']),
            'code' => $code,
            'created_at' => now()->toIso8601String(),
            'attempts' => 0,
        ], now()->addMinutes(20));

        // Increment rate counter (expire with the 20-minute window)
        Cache::put($rateKey, $sendCount + 1, now()->addMinutes(20));

        Log::info('=== ATTEMPTING TO SEND EMAIL ===', [
            'to' => $email,
            'code' => $code,
            'name' => $fullName,
            'mail_config' => [
                'mailer' => config('mail.default'),
                'host' => config('mail.mailers.smtp.host'),
                'port' => config('mail.mailers.smtp.port'),
                'encryption' => config('mail.mailers.smtp.encryption'),
                'username' => config('mail.mailers.smtp.username'),
                'from' => config('mail.from.address'),
            ]
        ]);

        try {
            Mail::to($email)->send(new RegistrationVerificationCode($code, $fullName));
            Log::info('=== EMAIL SENT SUCCESSFULLY ===', ['to' => $email, 'code' => $code]);
        } catch (\Exception $e) {
            Log::error('Failed to send registration verification email', [
                'email' => $email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'mail_config' => [
                    'mailer' => config('mail.default'),
                    'host' => config('mail.mailers.smtp.host'),
                    'port' => config('mail.mailers.smtp.port'),
                    'encryption' => config('mail.mailers.smtp.encryption'),
                    'from' => config('mail.from.address'),
                ]
            ]);
            // Developer-friendly fallback: allow continuing to verification in non-production
            if (config('app.env') !== 'production') {
                // Expose the code via session for development/testing
                session()->flash('dev_verification_code', $code);
                session()->flash('warning', 'Email failed: ' . $e->getMessage() . '. Use code below:');
                return redirect()->route('register.verify.view', ['email' => $email]);
            }
            return back()->withErrors(['registration' => 'Failed to send verification email. Please try again.']);
        }

        // Redirect to verification page with email prefilled
        return redirect()->route('register.verify.view', ['email' => $email]);
    }
    /**
     * Show email verification page
     */
    public function showVerify(Request $request)
    {
        $email = strtolower((string) $request->query('email'));
        return Inertia::render('auth/Verify', [
            'email' => $email,
        ]);
    }

    /**
     * Resend verification code within the 1-hour window.
     */
    public function resendRegistrationCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $email = strtolower($request->email);
        $user = User::where('email', $email)->first();

        if (!$user) {
            return back()->withErrors(['registration' => 'No pending registration found or it has expired. Please start again.']);
        }

        if ($user->email_verified_at) {
            return back()->withErrors(['email' => 'This email is already verified. Please login to the mobile app.']);
        }

        if ($user->created_at->lt(now()->subMinutes(20))) {
            try { $user->delete(); } catch (\Exception $e) {}
            return back()->withErrors(['registration' => 'Verification expired. Please restart registration.']);
        }

        $cacheKey = 'reg:pending:' . sha1($email);
        $pending = Cache::get($cacheKey);

        // If cache expired but user still exists, regenerate the cache entry
        if (!$pending) {
            // Check if we can regenerate from user data
            if ($user->created_at->gt(now()->subMinutes(20))) {
                // Regenerate cache entry with new code
                $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
                $pending = [
                    'lname' => 'Last Name', // Placeholder - will be updated when user completes registration
                    'fname' => 'First Name', // Placeholder - will be updated when user completes registration
                    'mname' => null,
                    'email' => $email,
                    'password_hash' => $user->password,
                    'school_name' => '',
                    'parent_name' => '',
                    'parent_phone' => '',
                    'address' => '',
                    'profile_data' => null,
                    'code' => $code,
                    'created_at' => $user->created_at->toIso8601String(),
                    'attempts' => 0,
                ];
                Cache::put($cacheKey, $pending, now()->addMinutes(20));
            } else {
                return back()->withErrors(['registration' => 'No pending registration found or it has expired. Please start again.']);
            }
        }

        // Basic rate limit: max 3 code sends per hour per email
        $rateKey = 'reg:rate:' . sha1($email);
        $sendCount = Cache::get($rateKey, 0);
        if ($sendCount >= 3) {
            return back()->withErrors(['email' => 'Too many verification attempts. Please try again in an hour.']);
        }

        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $pending['code'] = $code;
        $pending['attempts'] = 0;
        Cache::put($cacheKey, $pending, now()->addMinutes(20));

        Cache::put($rateKey, $sendCount + 1, now()->addMinutes(20));

        try {
            // Create full name from separate name fields
            $fullName = $pending['fname'] . ' ' . $pending['lname'];
            if (!empty($pending['mname'])) {
                $fullName = $pending['fname'] . ' ' . $pending['mname'] . ' ' . $pending['lname'];
            }
            
            Mail::to($email)->send(new RegistrationVerificationCode($code, $fullName));
        } catch (\Exception $e) {
            Log::error('Failed to resend registration verification email', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);
            if (config('app.env') !== 'production') {
                session()->flash('dev_verification_code', $code);
                session()->flash('warning', 'Email resend failed in dev. Use the shown code to verify.');
                return redirect()->route('register.verify.view', ['email' => $email]);
            }
            return back()->withErrors(['registration' => 'Failed to resend verification email. Please try again.']);
        }

        return back()->with('verification_resent', true);
    }

    /**
     * Verify code and complete registration, creating the user and related records.
     */
    public function verifyAndCompleteRegistration(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6',
        ], [
            'code.size' => 'The verification code must be exactly 6 digits.',
        ]);

        $email = strtolower($request->email);
        $code = $request->code;

        $cacheKey = 'reg:pending:' . sha1($email);
        $pending = Cache::get($cacheKey);

        if (!$pending) {
            return back()->withErrors(['registration' => 'Verification expired or not found. Please start again.']);
        }

        if (!hash_equals($pending['code'], $code)) {
            // Increment attempts and lock after 5
            $pending['attempts'] = ($pending['attempts'] ?? 0) + 1;
            Cache::put($cacheKey, $pending, now()->addHour());

            if ($pending['attempts'] > 5) {
                Cache::forget($cacheKey);
                return back()->withErrors(['registration' => 'Too many invalid attempts. Please start again.']);
            }

            return back()->withErrors(['code' => 'Invalid verification code.']);
        }

        // All good, complete the records
        try {
            DB::beginTransaction();

            // Enhanced logging for verification process
            Log::info('[Registration] Starting verification completion', [
                'email' => $email,
                'code' => $code,
                'timestamp' => now()->toISOString()
            ]);

            // find temp user (already exists from startRegistration)
            $user = User::where('email', $email)->first();
            if (!$user) {
                Log::error('[Registration] User not found during verification', [
                    'email' => $email,
                    'timestamp' => now()->toISOString()
                ]);
                throw new \RuntimeException('Pending user not found.');
            }
            
            // Log pending data validation
            Log::info('[Registration] Pending data validation', [
                'email' => $email,
                'has_profile_data' => !empty($pending['profile_data']),
                'phone' => $pending['phone'] ?? 'not_set',
                'parent_phone' => $pending['parent_phone'] ?? 'not_set',
                'selected_exam_date' => $pending['selected_exam_date'] ?? 'not_set',
                'selected_exam_session' => $pending['selected_exam_session'] ?? 'not_set'
            ]);
            // Create full name for username
            $fullName = $pending['fname'] . ' ' . $pending['lname'];
            if (!empty($pending['mname'])) {
                $fullName = $pending['fname'] . ' ' . $pending['mname'] . ' ' . $pending['lname'];
            }

            $user->update([
                'username' => $fullName,
                'password' => $pending['password_hash'],
                'email_verified_at' => now(),
            ]);

            // Store preferred courses in the preferred_course table (as reference)
            $preferredCourses = [];
            if (!empty($pending['preferred_course_1'])) {
                $courseName = trim($pending['preferred_course_1']);
                PreferredCourse::create(['course_name' => $courseName]);
                $preferredCourses[] = $courseName;
            }
            if (!empty($pending['preferred_course_2'])) {
                $courseName = trim($pending['preferred_course_2']);
                PreferredCourse::create(['course_name' => $courseName]);
                $preferredCourses[] = $courseName;
            }
            if (!empty($pending['preferred_course_3'])) {
                $courseName = trim($pending['preferred_course_3']);
                PreferredCourse::create(['course_name' => $courseName]);
                $preferredCourses[] = $courseName;
            }

            // Create examinee record with enhanced error handling
            try {
                $examinee = Examinee::create([
                    'accountId' => $user->id,
                    'lname' => $pending['lname'],
                    'fname' => $pending['fname'],
                    'mname' => $pending['mname'],
                    'gender' => $pending['gender'],
                    'age' => (int) $pending['age'],
                    'phone' => (int) $pending['phone'], // Convert string to integer for database storage
                    'address' => $pending['address'],
                    'school_name' => $pending['school_name'],
                    'parent_name' => $pending['parent_name'],
                    'parent_phone' => $pending['parent_phone'],
                    'Profile' => $pending['profile_data'],
                ]);
                
                Log::info('[Registration] Examinee created successfully', [
                    'examinee_id' => $examinee->id,
                    'user_id' => $user->id,
                    'email' => $email,
                    'preferred_courses' => $preferredCourses,
                    'timestamp' => now()->toISOString()
                ]);
            } catch (\Exception $e) {
                Log::error('[Registration] Failed to create examinee record', [
                    'user_id' => $user->id,
                    'email' => $email,
                    'error' => $e->getMessage(),
                    'pending_data' => $pending
                ]);
                throw new \RuntimeException('Failed to create examinee profile: ' . $e->getMessage());
            }

            $settings = ExamRegistrationSetting::getCurrentSettings();

            $registration = ExamineeRegistration::create([
                'examinee_id' => $examinee->id,
                'school_year' => $settings->academic_year ?? date('Y') . '-' . (date('Y') + 1),
                'semester' => $settings->semester ?? '1st',
                'status' => 'assigned',
                'registration_date' => now()->toDateString(),
                'assigned_exam_date' => $pending['selected_exam_date'],
                'assigned_session' => $pending['selected_exam_session'],
            ]);

            // Update exam schedule capacity
            $examSchedule = \App\Models\ExamSchedule::where('exam_date', $pending['selected_exam_date'])
                ->where('session', $pending['selected_exam_session'])
                ->first();

            if ($examSchedule) {
                $examSchedule->increment('current_registrations');
                if ($examSchedule->current_registrations >= $examSchedule->max_capacity) {
                    $examSchedule->update(['status' => 'full']);
                }
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Verify/Complete registration failed', [
                'email' => $email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'pending_data' => $pending ?? null,
            ]);
            return back()->withErrors(['registration' => 'Failed to complete registration. Please try again.']);
        }

        // Clean up pending cache
        Cache::forget($cacheKey);

        return redirect()->route('login')->with('success', 'Email verified successfully. Your account has been created. Please login to see your exam schedule.');
    }

    /**
     * Redirect user to appropriate dashboard based on their role
     */
    private function redirectToDashboard($user)
    {
        switch ($user->role) {
            case 'evaluator':
                return redirect()->route('evaluator.dashboard');
            case 'guidance':
                return redirect()->route('guidance.dashboard');
            case 'student':
                // Students should use mobile app, logout and redirect to login with message
                Auth::logout();
                return redirect()->route('login')->with('info', 'Students should use the mobile application.');
            default:
                // Invalid role, logout and redirect
                Auth::logout();
                return redirect()->route('login')->with('error', 'Invalid user role. Please contact administrator.');
        }
    }

    /**
     * Auto-assign examinee to exam date (2 days after registration, skipping weekends)
     */
    private function autoAssignExamineeToExam($registration)
    {
        try {
            $settings = ExamRegistrationSetting::getCurrentSettings();
            
            // If no settings configured, use default values for assignment
            $studentsPerDay = $settings->students_per_day ?? 40;
            
            // Calculate assignment date (2 days after registration, skipping weekends)
            $assignmentDate = \Carbon\Carbon::parse($registration->registration_date)->addDays(2);
            
            // Skip weekends (Saturday = 6, Sunday = 0)
            while ($assignmentDate->dayOfWeek == 0 || $assignmentDate->dayOfWeek == 6) {
                $assignmentDate->addDay();
            }

            // If exam dates are configured, respect them
            if ($settings->exam_start_date && $settings->exam_end_date) {
                $examStartDate = \Carbon\Carbon::parse($settings->exam_start_date);
                $examEndDate = \Carbon\Carbon::parse($settings->exam_end_date);
                
                if ($assignmentDate->lt($examStartDate)) {
                    $assignmentDate = $examStartDate;
                    // Skip weekends for exam start date too
                    while ($assignmentDate->dayOfWeek == 0 || $assignmentDate->dayOfWeek == 6) {
                        $assignmentDate->addDay();
                    }
                } elseif ($assignmentDate->gt($examEndDate)) {
                    return; // No available dates in exam period
                }
            }

            // Iterate forward until an open, not-full session is found (skip weekends)
            $safetyCounter = 0;
            while ($safetyCounter < 370) { // ~1 year safety
                // Respect exam end date if configured
                if ($settings->exam_end_date) {
                    $examEndDate = \Carbon\Carbon::parse($settings->exam_end_date);
                    if ($assignmentDate->gt($examEndDate)) {
                        Log::warning('No available exam dates for registration ID: ' . $registration->id);
                        return;
                    }
                }

                // Skip weekends
                while ($assignmentDate->dayOfWeek == 0 || $assignmentDate->dayOfWeek == 6) {
                    $assignmentDate->addDay();
                }

                $assignmentDateString = $assignmentDate->format('Y-m-d');
                $halfCapacity = intval($studentsPerDay / 2);

                // Try morning session first (first come, first serve)
                $morningSchedule = \App\Models\ExamSchedule::where('exam_date', $assignmentDateString)
                    ->where('session', 'morning')
                    ->first();

                if ($morningSchedule && $morningSchedule->status === 'open' && $morningSchedule->hasAvailableSlots()) {
                    // Assign to morning session
                    $registration->update([
                        'assigned_exam_date' => $morningSchedule->exam_date,
                        'assigned_session' => 'morning',
                        'status' => 'assigned'
                    ]);
                    $morningSchedule->increment('current_registrations');
                    if ($morningSchedule->current_registrations >= $morningSchedule->max_capacity) {
                        $morningSchedule->update(['status' => 'full']);
                    }
                    break;
                }

                // Try afternoon session if morning is full or doesn't exist
                $afternoonSchedule = \App\Models\ExamSchedule::where('exam_date', $assignmentDateString)
                    ->where('session', 'afternoon')
                    ->first();

                if ($afternoonSchedule && $afternoonSchedule->status === 'open' && $afternoonSchedule->hasAvailableSlots()) {
                    // Assign to afternoon session
                    $registration->update([
                        'assigned_exam_date' => $afternoonSchedule->exam_date,
                        'assigned_session' => 'afternoon',
                        'status' => 'assigned'
                    ]);
                    $afternoonSchedule->increment('current_registrations');
                    if ($afternoonSchedule->current_registrations >= $afternoonSchedule->max_capacity) {
                        $afternoonSchedule->update(['status' => 'full']);
                    }
                    break;
                }

                // If no existing schedules or both are full, create new sessions
                if (!$morningSchedule && !$afternoonSchedule) {
                    // Create both morning and afternoon sessions for this day
                    $morningSchedule = \App\Models\ExamSchedule::create([
                        'exam_date' => $assignmentDateString,
                        'session' => 'morning',
                        'start_time' => '08:00:00',
                        'end_time' => '11:00:00',
                        'max_capacity' => $halfCapacity,
                        'current_registrations' => 0,
                        'status' => 'open'
                    ]);

                    \App\Models\ExamSchedule::create([
                        'exam_date' => $assignmentDateString,
                        'session' => 'afternoon',
                        'start_time' => '13:00:00',
                        'end_time' => '16:00:00',
                        'max_capacity' => $halfCapacity,
                        'current_registrations' => 0,
                        'status' => 'open'
                    ]);

                    // Assign to morning session (first come, first serve)
                    $registration->update([
                        'assigned_exam_date' => $morningSchedule->exam_date,
                        'assigned_session' => 'morning',
                        'status' => 'assigned'
                    ]);
                    $morningSchedule->increment('current_registrations');
                    break;
                } elseif (!$morningSchedule) {
                    // Create morning session only
                    $morningSchedule = \App\Models\ExamSchedule::create([
                        'exam_date' => $assignmentDateString,
                        'session' => 'morning',
                        'start_time' => '08:00:00',
                        'end_time' => '11:00:00',
                        'max_capacity' => $halfCapacity,
                        'current_registrations' => 0,
                        'status' => 'open'
                    ]);

                    // Assign to morning session
                    $registration->update([
                        'assigned_exam_date' => $morningSchedule->exam_date,
                        'assigned_session' => 'morning',
                        'status' => 'assigned'
                    ]);
                    $morningSchedule->increment('current_registrations');
                    break;
                } elseif (!$afternoonSchedule) {
                    // Create afternoon session only
                    $afternoonSchedule = \App\Models\ExamSchedule::create([
                        'exam_date' => $assignmentDateString,
                        'session' => 'afternoon',
                        'start_time' => '13:00:00',
                        'end_time' => '16:00:00',
                        'max_capacity' => $halfCapacity,
                        'current_registrations' => 0,
                        'status' => 'open'
                    ]);

                    // Assign to afternoon session
                    $registration->update([
                        'assigned_exam_date' => $afternoonSchedule->exam_date,
                        'assigned_session' => 'afternoon',
                        'status' => 'assigned'
                    ]);
                    $afternoonSchedule->increment('current_registrations');
                    break;
                }

                // Move to next day
                $assignmentDate->addDay();
                $safetyCounter++;
            }
        } catch (\Exception $e) {
            // Log error but don't fail the registration
            Log::error('Auto-assignment failed: ' . $e->getMessage());
        }
    }
} 