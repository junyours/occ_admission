<?php

namespace App\Http\Controllers\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use App\Models\PasswordReset;
use App\Mail\PasswordResetCode;
use Inertia\Inertia;
use App\Http\Controllers\Controller;

class PasswordResetController extends Controller
{
    /**
     * Show the forgot password form
     */
    public function showForgotPassword()
    {
        return Inertia::render('auth/ForgotPassword');
    }

    /**
     * Send password reset code
     */
    public function sendResetCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $email = $request->email;

        // Check if user exists
        $user = User::where('email', $email)->first();
        if (!$user) {
            return back()->withErrors([
                'email' => 'No account found with this email address.'
            ]);
        }

        // Check rate limiting (max 3 attempts per hour)
        $recentAttempts = PasswordReset::where('email', $email)
            ->where('created_at', '>', now()->subHour())
            ->count();

        if ($recentAttempts >= 3) {
            return back()->withErrors([
                'email' => 'Too many reset attempts. Please wait an hour before trying again.'
            ]);
        }

        try {
            // Create reset token
            $resetToken = PasswordReset::createToken($email);
            
            Log::info('Password reset token created', [
                'email' => $email,
                'token' => $resetToken->token,
                'user_id' => $user->id
            ]);

            // Send email
            Mail::to($email)->send(new PasswordResetCode($resetToken->token, $user->name));
            
            Log::info('Password reset email sent successfully', [
                'email' => $email,
                'token' => $resetToken->token
            ]);

            return back()->with('success', 'A 6-digit reset code has been sent to your email address. The code will expire in 15 minutes.');

        } catch (\Exception $e) {
            Log::error('Password reset failed', [
                'email' => $email,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors([
                'email' => 'Failed to send reset code. Please try again. Error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Show the reset password form
     */
    public function showResetForm(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        return Inertia::render('auth/ResetPassword', [
            'email' => $request->email
        ]);
    }

    /**
     * Verify the reset code
     */
    public function verifyCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6',
        ]);

        $email = $request->email;
        $code = $request->code;

        // Verify the code
        if (!PasswordReset::verifyToken($email, $code)) {
            return back()->withErrors([
                'code' => 'Invalid or expired reset code. Please try again.'
            ]);
        }

        // Mark token as used
        PasswordReset::markAsUsed($email, $code);

        return Inertia::render('auth/ResetPassword', [
            'email' => $email,
            'codeVerified' => true
        ]);
    }

    /**
     * Reset the password
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $email = $request->email;
        $password = $request->password;

        // Find user
        $user = User::where('email', $email)->first();
        if (!$user) {
            return back()->withErrors([
                'email' => 'User not found.'
            ]);
        }

        try {
            // Update password
            $user->update([
                'password' => Hash::make($password)
            ]);

            // Clean up any remaining reset tokens for this email
            PasswordReset::where('email', $email)->delete();

            return redirect()->route('login')->with('success', 'Password has been reset successfully. You can now login with your new password.');

        } catch (\Exception $e) {
            return back()->withErrors([
                'password' => 'Failed to reset password. Please try again.'
            ]);
        }
    }

    /**
     * Clean up expired tokens (can be called via command or cron)
     */
    public function cleanupExpiredTokens()
    {
        $deleted = PasswordReset::cleanupExpiredTokens();
        return response()->json(['message' => "Cleaned up {$deleted} expired tokens"]);
    }
}
