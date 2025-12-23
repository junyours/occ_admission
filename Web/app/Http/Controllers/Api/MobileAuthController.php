<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use App\Models\Examinee;
use App\Models\ForceLogoutOtp;
use App\Mail\ForceLogoutOtpMail;
use App\Http\Controllers\Controller;

class MobileAuthController extends Controller
{
    /**
     * Mobile app login endpoint
     * Handles email-based authentication for mobile app users
     */
    public function login(Request $request)
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'email' => 'required|email',
                'password' => 'required|string|min:4',
                'device_id' => 'required|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $email = strtolower(trim($request->email));
            $password = $request->password;
            $deviceId = $request->device_id;

            Log::info('[MobileAuth] Login attempt for email: ' . $email);

            // Attempt authentication
            $credentials = [
                'email' => $email,
                'password' => $password
            ];

            if (Auth::attempt($credentials)) {
                /** @var User $user */
                $user = Auth::user();

                Log::info('[MobileAuth] Authentication successful for user: ' . $user->id);

                // Only allow students to use mobile app
                if ($user->role !== 'student') {
                    Auth::logout();
                    Log::warning('[MobileAuth] Access denied - user role: ' . $user->role);
                    return response()->json([
                        'success' => false,
                        'message' => 'Access denied. Only students can use the mobile app.'
                    ], 403);
                }

                // Check if user has examinee profile
                $examinee = Examinee::where('accountId', $user->id)->first();
                if (!$examinee) {
                    Log::warning('[MobileAuth] No examinee profile found for user: ' . $user->id);
                    Auth::logout();
                    return response()->json([
                        'success' => false,
                        'message' => 'Student profile not found. Please contact administrator.'
                    ], 404);
                }

                // Check if examinee has an exam "In Progress" on another device
                $examInProgress = \App\Models\ExamResult::where('examineeId', $examinee->id)
                    ->where('remarks', 'In Progress')
                    ->whereNull('finished_at')
                    ->first();
                
                if ($examInProgress) {
                    Log::warning('[MobileAuth] Login blocked - exam in progress for examinee: ' . $examinee->id . ', examId: ' . $examInProgress->examId);
                    Auth::logout();
                    return response()->json([
                        'success' => false,
                        'message' => 'This account is Currently Taking an Exam on another device, please try again later',
                        'code' => 'EXAM_IN_PROGRESS'
                    ], 409);
                }

                // Device-based authentication: check if user can login from this device
                try {
                    // First, clean up very old tokens (older than 30 days) - these are likely orphaned
                    $veryOldTokens = $user->tokens()
                        ->where('revoked', false)
                        ->where('created_at', '<', now()->subDays(30))
                        ->get();
                    
                    if ($veryOldTokens->count() > 0) {
                        Log::info('[MobileAuth] Cleaning up ' . $veryOldTokens->count() . ' very old token(s) (>30 days) for user: ' . $user->id);
                        foreach ($veryOldTokens as $oldToken) {
                            $oldToken->revoke();
                            Log::info('[MobileAuth] Revoked very old token ID: ' . $oldToken->id . ' (device: ' . ($oldToken->device_id ?? 'none') . ', created: ' . $oldToken->created_at . ')');
                        }
                    }

                    $activeTokens = $user->tokens()
                        ->where('revoked', false)
                        ->where(function ($q) {
                            $q->whereNull('expires_at')
                              ->orWhere('expires_at', '>', now());
                        })
                        ->get();

                    $hasActiveToken = $activeTokens->count() > 0;

                    if ($hasActiveToken) {
                        // PRIMARY CHECK: Compare device_id - if matches, same device, allow login
                        $sameDeviceToken = $activeTokens->where('device_id', $deviceId)->first();
                        
                        if ($sameDeviceToken) {
                            // Device ID matches - same device, allow login and revoke old token, create new one
                            Log::info('[MobileAuth] ✅ Device ID matches! Same device login for user: ' . $user->id . ', device: ' . $deviceId);
                            $sameDeviceToken->revoke();
                            // Allow login to proceed
                        } else {
                            // Device ID doesn't match - check if we should block or allow
                            $differentDeviceTokens = $activeTokens->filter(function ($token) {
                                return !empty($token->device_id); // Has device_id but different
                            });
                            
                            if ($differentDeviceTokens->count() > 0) {
                                // Has active tokens with different device_id - this is likely a different device
                                // With hardware-based device IDs, matching should be immediate
                                // Keep a small grace period (1 hour) for edge cases or migration scenarios
                                $oldDifferentTokens = $differentDeviceTokens->filter(function ($token) {
                                    return $token->created_at && $token->created_at->lt(now()->subHours(1));
                                });
                                
                                if ($oldDifferentTokens->count() > 0) {
                                    // Tokens are older than 1 hour with different device_id - likely orphaned
                                    // Auto-revoke as safety net (handles old format tokens or edge cases)
                                    Log::info('[MobileAuth] ⚠️ Found ' . $oldDifferentTokens->count() . ' old token(s) (>1 hour) with different device_id for user: ' . $user->id . ', auto-revoking');
                                    foreach ($oldDifferentTokens as $oldToken) {
                                        $oldToken->revoke();
                                        Log::info('[MobileAuth] Auto-revoked old token ID: ' . $oldToken->id . ' (stored device: ' . $oldToken->device_id . ', current device: ' . $deviceId . ', created: ' . $oldToken->created_at . ')');
                                    }
                                    // Allow login to proceed
                                } else {
                                    // Recent tokens (within 1 hour) with different device_id - BLOCK for security (different device)
                                    Log::warning('[MobileAuth] ❌ Login BLOCKED: Different device detected! User: ' . $user->id . ', Current device: ' . $deviceId . ', Stored device: ' . $differentDeviceTokens->first()->device_id);
                                    Auth::logout();
                                    return response()->json([
                                        'success' => false,
                                        'message' => "You're already logged in on another device. Please logout there first.",
                                        'code' => 'ALREADY_LOGGED_IN'
                                    ], 409);
                                }
                            } else {
                                // No device_id stored (orphaned tokens without device_id) - revoke them
                                $orphanedTokens = $activeTokens->filter(function ($token) {
                                    return empty($token->device_id);
                                });
                                
                                if ($orphanedTokens->count() > 0) {
                                    Log::info('[MobileAuth] Found ' . $orphanedTokens->count() . ' orphaned token(s) without device_id for user: ' . $user->id . ', revoking them');
                                    foreach ($orphanedTokens as $orphanedToken) {
                                        $orphanedToken->revoke();
                                        Log::info('[MobileAuth] Revoked orphaned token ID: ' . $orphanedToken->id);
                                    }
                                    // Allow login to proceed
                                }
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::error('[MobileAuth] Device validation failed: ' . $e->getMessage());
                    Auth::logout();
                    return response()->json([
                        'success' => false,
                        'message' => 'Authentication system error. Please try again.'
                    ], 500);
                }

                // Create Passport token for mobile API access
                Log::info('[MobileAuth] Creating token for user: ' . $user->id . ', device: ' . $deviceId);
                try {
                    $tokenResult = $user->createToken('Mobile App Token');
                    $token = $tokenResult->accessToken;
                    
                    // Update the token with device_id using the token ID
                    $tokenRecord = $user->tokens()->latest()->first();
                    if ($tokenRecord) {
                        $tokenRecord->update(['device_id' => $deviceId]);
                        Log::info('[MobileAuth] Token created successfully for user: ' . $user->id . ', device: ' . $deviceId . ', Token: ' . substr($token, 0, 20) . '...');
                    } else {
                        Log::warning('[MobileAuth] Token created but could not update device_id');
                    }
                } catch (\Exception $e) {
                    Log::error('[MobileAuth] Token creation failed: ' . $e->getMessage());
                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to create authentication token. Please try again.'
                    ], 500);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Login successful',
                    'access_token' => $token,
                    'token_type' => 'Bearer',
                    'user' => [
                        'id' => $user->id,
                        'email' => $user->email,
                        'role' => $user->role,
                        'created_at' => $user->created_at,
                    ],
                    'examinee' => [
                        'id' => $examinee->id,
                        'name' => $examinee->full_name,
                        'school_name' => $examinee->school_name,
                        'parent_name' => $examinee->parent_name,
                        'parent_phone' => $examinee->parent_phone,
                        'phone' => $examinee->phone,
                        'address' => $examinee->address,
                        'created_at' => $examinee->created_at,
                        'updated_at' => $examinee->updated_at,
                    ]
                ], 200);
            }

            Log::warning('[MobileAuth] Authentication failed for email: ' . $email);
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password'
            ], 401);

        } catch (\Exception $e) {
            Log::error('[MobileAuth] Login error: ' . $e->getMessage(), [
                'email' => $request->email ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred during login. Please try again.'
            ], 500);
        }
    }

    /**
     * Get authenticated user profile
     */
    public function profile(Request $request)
    {
        try {
            /** @var User $user */
            $user = $request->user();
            $examinee = Examinee::where('accountId', $user->id)->first();

            if (!$examinee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student profile not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'role' => $user->role,
                    'created_at' => $user->created_at,
                ],
                'examinee' => [
                    'id' => $examinee->id,
                    'name' => $examinee->full_name, // Use the accessor for backward compatibility
                    'lname' => $examinee->lname,
                    'fname' => $examinee->fname,
                    'mname' => $examinee->mname,
                    'school_name' => $examinee->school_name,
                    'parent_name' => $examinee->parent_name,
                    'parent_phone' => $examinee->parent_phone,
                    'phone' => $examinee->phone,
                    'address' => $examinee->address,
                    'created_at' => $examinee->created_at,
                    'updated_at' => $examinee->updated_at,
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('[MobileAuth] Profile error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve profile'
            ], 500);
        }
    }

    /**
     * Mobile app logout endpoint
     */
    public function logout(Request $request)
    {
        try {
            /** @var User $user */
            $user = $request->user();
            
            Log::info('[MobileAuth] Logout for user: ' . $user->id);

            // Revoke current token
            $request->user()->token()->revoke();

            return response()->json([
                'success' => true,
                'message' => 'Successfully logged out'
            ], 200);

        } catch (\Exception $e) {
            Log::error('[MobileAuth] Logout error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Logout failed'
            ], 500);
        }
    }

    /**
     * Force logout from other devices
     * Allows user to log out from other devices by verifying password
     */
    public function forceLogoutOtherDevices(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required|string',
            ]);

            $email = $request->email;
            $password = $request->password;

            Log::info('[MobileAuth] Force logout request for email: ' . $email);

            // Verify credentials
            $credentials = [
                'email' => $email,
                'password' => $password
            ];

            if (!Auth::attempt($credentials)) {
                Log::warning('[MobileAuth] Force logout failed - invalid credentials for email: ' . $email);
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid email or password'
                ], 401);
            }

            /** @var User $user */
            $user = Auth::user();

            // Get device ID from request (if provided)
            $currentDeviceId = $request->device_id;

            $revokedCount = $this->revokeTokensForOtherDevices($user, $currentDeviceId);

            Auth::logout(); // Logout after revoking tokens

            Log::info('[MobileAuth] Force logout completed for user: ' . $user->id . ', revoked ' . $revokedCount . ' token(s)');

            return response()->json([
                'success' => true,
                'message' => 'Successfully logged out from other devices',
                'revoked_tokens' => $revokedCount
            ], 200);

        } catch (\Exception $e) {
            Log::error('[MobileAuth] Force logout error: ' . $e->getMessage());
            
            if (Auth::check()) {
                Auth::logout();
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to logout from other devices'
            ], 500);
        }
    }

    /**
     * Request OTP for force logout when already logged in on another device
     */
    public function requestForceLogoutOtp(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'device_id' => 'required|string|max:255',
            ]);

            $email = strtolower(trim($request->email));
            $deviceId = $request->device_id;

            $user = User::where('email', $email)->first();
            if (!$user) {
                Log::warning('[MobileAuth] OTP request failed - user not found for email: ' . $email);
                return response()->json([
                    'success' => false,
                    'message' => 'Account not found for the provided email.'
                ], 404);
            }

            if ($user->role !== 'student') {
                Log::warning('[MobileAuth] OTP request denied - user role mismatch: ' . $user->role);
                return response()->json([
                    'success' => false,
                    'message' => 'Only student accounts can request this verification.'
                ], 403);
            }

            $otpCode = (string) random_int(100000, 999999);

            ForceLogoutOtp::updateOrCreate(
                ['email' => $email, 'device_id' => $deviceId],
                [
                    'user_id' => $user->id,
                    'code' => Hash::make($otpCode),
                    'expires_at' => now()->addMinutes(10),
                    'attempts' => 0,
                ]
            );

            $recipientName = $user->name ?? optional($user->examinee)->full_name ?? $user->email;

            Mail::to($user->email)->send(new ForceLogoutOtpMail($otpCode, $recipientName));

            Log::info('[MobileAuth] Force logout OTP sent to user: ' . $user->id . ' for device: ' . $deviceId);

            return response()->json([
                'success' => true,
                'message' => 'A verification code has been sent to your email.',
            ], 200);
        } catch (\Exception $e) {
            Log::error('[MobileAuth] OTP request error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send verification code. Please try again.',
            ], 500);
        }
    }

    /**
     * Verify OTP and revoke other device sessions
     */
    public function verifyForceLogoutOtp(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
                'device_id' => 'required|string|max:255',
                'otp' => 'required|string|min:4|max:6',
            ]);

            $email = strtolower(trim($request->email));
            $deviceId = $request->device_id;
            $otpInput = $request->otp;

            $otpRecord = ForceLogoutOtp::where('email', $email)
                ->where('device_id', $deviceId)
                ->latest()
                ->first();

            if (!$otpRecord) {
                return response()->json([
                    'success' => false,
                    'message' => 'Verification code not found. Please request a new code.',
                ], 404);
            }

            if ($otpRecord->expires_at->isPast()) {
                $otpRecord->delete();
                return response()->json([
                    'success' => false,
                    'message' => 'Verification code has expired. Please request a new code.',
                ], 410);
            }

            if (!Hash::check($otpInput, $otpRecord->code)) {
                $otpRecord->increment('attempts');

                if ($otpRecord->attempts >= 5) {
                    $otpRecord->delete();
                    return response()->json([
                        'success' => false,
                        'message' => 'Too many invalid attempts. Please request a new code.',
                    ], 429);
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Invalid verification code. Please try again.',
                ], 422);
            }

            $user = User::find($otpRecord->user_id);
            if (!$user) {
                $otpRecord->delete();
                return response()->json([
                    'success' => false,
                    'message' => 'Account not found. Please contact support.',
                ], 404);
            }

            $revokedCount = $this->revokeTokensForOtherDevices($user, $deviceId);

            $otpRecord->delete();

            Log::info('[MobileAuth] Force logout OTP verified for user: ' . $user->id . ', revoked tokens: ' . $revokedCount);

            return response()->json([
                'success' => true,
                'message' => 'Other sessions have been signed out. Please try logging in again.',
                'revoked_tokens' => $revokedCount,
            ], 200);
        } catch (\Exception $e) {
            Log::error('[MobileAuth] OTP verification error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify the code. Please try again.',
            ], 500);
        }
    }

    /**
     * Register fingerprint/biometric data for mobile app
     * Stores the biometric template/token in the users table
     */
    public function registerFingerprint(Request $request)
    {
        try {
            /** @var User $user */
            $user = $request->user();
            
            Log::info('[MobileAuth] Registering fingerprint for user: ' . $user->id);

            $validator = Validator::make($request->all(), [
                'fingerprint_data' => 'required|string|max:10000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $fingerprintData = $request->fingerprint_data;

            $user->update([
                'fingerprint_data' => $fingerprintData,
            ]);

            Log::info('[MobileAuth] Fingerprint registered successfully for user: ' . $user->id);

            return response()->json([
                'success' => true,
                'message' => 'Fingerprint registered successfully!'
            ], 200);

        } catch (\Exception $e) {
            Log::error('[MobileAuth] Fingerprint registration error: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to register fingerprint. Please try again.'
            ], 500);
        }
    }

    /**
     * Get fingerprint registration status for mobile app
     * Returns whether the user has registered their fingerprint
     */
    public function getFingerprintStatus(Request $request)
    {
        try {
            /** @var User $user */
            $user = $request->user();
            
            Log::info('[MobileAuth] Getting fingerprint status for user: ' . $user->id);

            $hasFingerprint = !empty($user->fingerprint_data);

            return response()->json([
                'success' => true,
                'has_fingerprint' => $hasFingerprint,
                'message' => $hasFingerprint ? 'Fingerprint is registered' : 'Fingerprint not registered'
            ], 200);

        } catch (\Exception $e) {
            Log::error('[MobileAuth] Get fingerprint status error: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get fingerprint status. Please try again.'
            ], 500);
        }
    }

    /**
     * Fingerprint login endpoint
     * Authenticates user using fingerprint biometric data
     */
    public function fingerprintLogin(Request $request)
    {
        try {
            Log::info('[MobileAuth] Fingerprint login attempt');

            $validator = Validator::make($request->all(), [
                'public_key' => 'required|string|max:5000',
                'signature' => 'required|string|max:5000',
                'device_id' => 'required|string|max:255',
            ]);     

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $publicKey = $request->public_key;
            $signature = $request->signature;
            $deviceId = $request->device_id;

            Log::info('[MobileAuth] Searching for user with public key: ' . substr($publicKey, 0, 50) . '...');

            $users = User::whereNotNull('fingerprint_data')->get();
            
            $matchedUser = null;
            foreach ($users as $user) {
                if (!empty($user->fingerprint_data)) {
                    try {
                        $fingerprintData = json_decode($user->fingerprint_data, true);
                        if (isset($fingerprintData['publicKey']) && $fingerprintData['publicKey'] === $publicKey) {
                            $matchedUser = $user;
                            Log::info('[MobileAuth] Found matching user: ' . $user->id . ' for public key');
                            break;
                        }
                    } catch (\Exception $e) {
                        Log::warning('[MobileAuth] Error parsing fingerprint_data for user ' . $user->id . ': ' . $e->getMessage());
                        continue;
                    }
                }
            }

            if (!$matchedUser) {
                Log::warning('[MobileAuth] No user found with matching public key');
                return response()->json([
                    'success' => false,
                    'message' => 'Fingerprint not registered. Please register your fingerprint first or use email/password login.'
                ], 404);
            }

            Log::info('[MobileAuth] Fingerprint matched for user: ' . $matchedUser->id);

            // Check if user has examinee profile
            $examinee = Examinee::where('accountId', $matchedUser->id)->first();
            if ($examinee) {
                // Check if examinee has an exam "In Progress" on another device
                $examInProgress = \App\Models\ExamResult::where('examineeId', $examinee->id)
                    ->where('remarks', 'In Progress')
                    ->whereNull('finished_at')
                    ->first();
                
                if ($examInProgress) {
                    Log::warning('[MobileAuth] Fingerprint login blocked - exam in progress for examinee: ' . $examinee->id . ', examId: ' . $examInProgress->examId);
                    return response()->json([
                        'success' => false,
                        'message' => 'This account is Currently Taking an Exam on another device, please try again later',
                        'code' => 'EXAM_IN_PROGRESS'
                    ], 409);
                }
            }

            $activeTokens = \Laravel\Passport\Token::where('user_id', $matchedUser->id)
                ->where('revoked', false)
                ->where('expires_at', '>', now())
                ->get();

            if ($activeTokens->count() > 0) {
                $sameDeviceToken = $activeTokens->where('device_id', $deviceId)->first();
                
                if ($sameDeviceToken) {
                    Log::info('[MobileAuth] Same device fingerprint login - revoking old token');
                    $sameDeviceToken->revoke();
                } else {
                    $differentDeviceTokens = $activeTokens->filter(function ($token) {
                        return !empty($token->device_id);
                    });
                    
                    if ($differentDeviceTokens->count() > 0) {
                        Log::warning('[MobileAuth] Fingerprint login attempt from different device for user: ' . $matchedUser->id);
                        return response()->json([
                            'success' => false,
                            'message' => 'You are already logged in on another device. Please logout there first or use email/password login.',
                            'code' => 'ALREADY_LOGGED_IN'
                        ], 409);
                    }
                }
            }

            try {
                $tokenResult = $matchedUser->createToken('Mobile App Token');
                $token = $tokenResult->accessToken;
                
                $tokenRecord = $matchedUser->tokens()->latest()->first();
                if ($tokenRecord) {
                    $tokenRecord->update(['device_id' => $deviceId]);
                    Log::info('[MobileAuth] Token created for fingerprint login - user: ' . $matchedUser->id);
                }
            } catch (\Exception $e) {
                Log::error('[MobileAuth] Token creation failed for fingerprint login: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create authentication token. Please try again.'
                ], 500);
            }

            // Get examinee if not already fetched (should have been fetched above, but keep for safety)
            if (!isset($examinee)) {
                $examinee = Examinee::where('accountId', $matchedUser->id)->first();
            }

            Log::info('[MobileAuth] Fingerprint login successful for user: ' . $matchedUser->id);

            return response()->json([
                'success' => true,
                'message' => 'Fingerprint login successful!',
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => [
                    'id' => $matchedUser->id,
                    'email' => $matchedUser->email,
                    'role' => $matchedUser->role,
                ],
                'examinee' => $examinee ? [
                    'id' => $examinee->id,
                    'name' => $examinee->full_name,
                    'lname' => $examinee->lname,
                    'fname' => $examinee->fname,
                    'mname' => $examinee->mname,
                ] : null,
            ], 200);

        } catch (\Exception $e) {
            Log::error('[MobileAuth] Fingerprint login error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Fingerprint login failed. Please try again or use email/password login.'
            ], 500);
        }
    }

    /**
     * Delete/Remove fingerprint registration for mobile app
     * Removes the biometric data from the users table
     */
    public function deleteFingerprint(Request $request)
    {
        try {
            /** @var User $user */
            $user = $request->user();
            
            Log::info('[MobileAuth] Deleting fingerprint for user: ' . $user->id);

            $user->update([
                'fingerprint_data' => null,
            ]);

            Log::info('[MobileAuth] Fingerprint deleted successfully for user: ' . $user->id);

            return response()->json([
                'success' => true,
                'message' => 'Fingerprint removed successfully!'
            ], 200);

        } catch (\Exception $e) {
            Log::error('[MobileAuth] Fingerprint deletion error: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to remove fingerprint. Please try again.'
            ], 500);
        }
    }

    /**
     * Get examinee profile for mobile app
     * Returns data in the format expected by the mobile app
     */
    public function examineeProfile(Request $request)
    {
        try {
            /** @var User $user */
            $user = $request->user();
            
            Log::info('[MobileAuth] Fetching examinee profile for user: ' . $user->id);
            Log::info('[MobileAuth] User details - ID: ' . $user->id . ', Email: ' . $user->email . ', Role: ' . $user->role);

            // Get examinee data from the examinee table
            $examinee = Examinee::where('accountId', $user->id)->first();

            if (!$examinee) {
                Log::warning('[MobileAuth] No examinee profile found for user: ' . $user->id);
                
                // Log all examinees for debugging
                $allExaminees = Examinee::all();
                Log::info('[MobileAuth] All examinees in database: ' . $allExaminees->count());
                foreach ($allExaminees as $exam) {
                    Log::info('[MobileAuth] Examinee - ID: ' . $exam->id . ', AccountID: ' . $exam->accountId . ', Name: ' . $exam->full_name);
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'Student profile not found. Please contact administrator.'
                ], 404);
            }

            Log::info('[MobileAuth] Examinee profile found for user: ' . $user->id);
            Log::info('[MobileAuth] Examinee details - ID: ' . $examinee->id . ', Name: ' . $examinee->full_name . ', School: ' . $examinee->school_name);

            // Return data in the format expected by the mobile app
            return response()->json([
                'id' => $examinee->id,
                'name' => $examinee->full_name, // Use the accessor for backward compatibility
                'lname' => $examinee->lname,
                'fname' => $examinee->fname,
                'mname' => $examinee->mname,
                'school_name' => $examinee->school_name,
                'parent_name' => $examinee->parent_name,
                'parent_phone' => $examinee->parent_phone,
                'phone' => $examinee->phone,
                'address' => $examinee->address,
                'created_at' => $examinee->created_at,
                'updated_at' => $examinee->updated_at,
            ], 200);

        } catch (\Exception $e) {
            Log::error('[MobileAuth] Examinee profile error: ' . $e->getMessage(), [
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
     * Get exam schedule details for mobile app
     */
    public function getExamSchedule(Request $request)
    {
        try {
            /** @var User $user */
            $user = $request->user();
            $examinee = Examinee::where('accountId', $user->id)->first();

            if (!$examinee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student profile not found'
                ], 404);
            }

            // Get the examinee's registration
            $registration = \App\Models\ExamineeRegistration::where('examinee_id', $examinee->id)
                ->where('status', 'assigned')
                ->first();

            if (!$registration || !$registration->assigned_exam_date) {
                return response()->json([
                    'success' => true,
                    'has_schedule' => false,
                    'message' => 'No exam schedule assigned yet'
                ], 200);
            }

            // Get the exam schedule details
            $schedule = \App\Models\ExamSchedule::where('exam_date', $registration->assigned_exam_date)
                ->where('session', $registration->assigned_session)
                ->first();

            if (!$schedule) {
                return response()->json([
                    'success' => true,
                    'has_schedule' => false,
                    'message' => 'Exam schedule details not found'
                ], 200);
            }

            return response()->json([
                'success' => true,
                'has_schedule' => true,
                'schedule' => [
                    'exam_date' => $schedule->exam_date->format('Y-m-d'),
                    'exam_date_formatted' => $schedule->exam_date->format('l, F j, Y'),
                    'session' => $schedule->session,
                    'session_display' => ucfirst($schedule->session),
                    'start_time' => $schedule->start_time,
                    'end_time' => $schedule->end_time,
                    'start_time_formatted' => \Carbon\Carbon::createFromFormat('H:i:s', $schedule->start_time)->format('g:i A'),
                    'end_time_formatted' => \Carbon\Carbon::createFromFormat('H:i:s', $schedule->end_time)->format('g:i A'),
                    'status' => $schedule->status,
                    'max_capacity' => $schedule->max_capacity,
                    'current_registrations' => $schedule->current_registrations,
                    'available_slots' => $schedule->getAvailableSlots()
                ],
                'registration' => [
                    'status' => $registration->status,
                    'school_year' => $registration->school_year,
                    'semester' => $registration->semester
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('[MobileAuth] Exam schedule error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve exam schedule'
            ], 500);
        }
    }

    /**
     * Check if the authenticated examinee has force-allow enabled for today
     * This allows guidance to override session time restrictions
     */
    public function checkForceAllow(Request $request)
    {
        try {
            /** @var User $user */
            $user = $request->user();
            $examinee = Examinee::where('accountId', $user->id)->first();

            if (!$examinee) {
                return response()->json([
                    'success' => false,
                    'force_allow' => false,
                    'message' => 'Examinee profile not found'
                ], 404);
            }

            $today = \Carbon\Carbon::today()->toDateString();
            $cacheKey = sprintf('exam_force_allow:%s:%s', $examinee->id, $today);
            $isForceAllowed = \Illuminate\Support\Facades\Cache::get($cacheKey, false);

            Log::info('[MobileAuth] Force allow check for examinee: ' . $examinee->id . ' - Result: ' . ($isForceAllowed ? 'YES' : 'NO'));

            return response()->json([
                'success' => true,
                'force_allow' => (bool) $isForceAllowed,
                'examinee_id' => $examinee->id,
                'today' => $today
            ], 200);

        } catch (\Exception $e) {
            Log::error('[MobileAuth] Force allow check error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'force_allow' => false,
                'message' => 'Failed to check force allow status'
            ], 500);
        }
    }

    /**
     * Validate token - uses Passport middleware for authentication
     * This endpoint is protected by auth:api middleware, so if we reach here, the token is valid
     */
    public function validateToken(Request $request)
    {
        try {
            // The auth:api middleware already validated the token
            // If we reach here, the token is valid and we have an authenticated user
            $user = $request->user();
            
            if (!$user) {
                // This shouldn't happen if middleware is working, but handle it just in case
                Log::warning('[MobileAuth] Token validation: No authenticated user found');
                return response()->json([
                    'success' => false,
                    'valid' => false,
                    'message' => 'No authenticated user'
                ], 401);
            }

            // Verify user is a student
            if ($user->role !== 'student') {
                Log::warning('[MobileAuth] Token validation failed: user is not a student (role: ' . $user->role . ')');
                return response()->json([
                    'success' => false,
                    'valid' => false,
                    'message' => 'Access denied - not a student account'
                ], 403);
            }

            Log::info('[MobileAuth] Token validation successful for user: ' . $user->id . ' (email: ' . $user->email . ')');
            
            return response()->json([
                'success' => true,
                'valid' => true,
                'message' => 'Token is valid',
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'role' => $user->role
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('[MobileAuth] Token validation error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return response()->json([
                'success' => false,
                'valid' => false,
                'message' => 'Token validation failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Health check endpoint for mobile app
     */
    public function health()
    {
        return response()->json([
            'success' => true,
            'message' => 'Mobile API is healthy',
            'timestamp' => now()->toISOString(),
            'version' => '1.0.0'
        ], 200);
    }

    /**
     * Revoke tokens issued to other devices for a user
     */
    protected function revokeTokensForOtherDevices(User $user, ?string $currentDeviceId = null): int
    {
        $activeTokens = $user->tokens()
            ->where('revoked', false)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->get();

        $revokedCount = 0;

        foreach ($activeTokens as $token) {
            if ($currentDeviceId && $token->device_id === $currentDeviceId) {
                continue;
            }

            $token->revoke();
            $revokedCount++;

            Log::info('[MobileAuth] Force revoked token ID: ' . $token->id . ' (device: ' . ($token->device_id ?? 'none') . ')');
        }

        return $revokedCount;
    }
}
