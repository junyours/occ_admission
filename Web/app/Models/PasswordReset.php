<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PasswordReset extends Model
{
    protected $table = 'password_reset_tokens';
    
    protected $fillable = [
        'email',
        'token',
        'created_at',
        'expires_at',
        'used'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used' => 'boolean',
    ];

    /**
     * Generate a unique 6-digit reset code
     */
    public static function generateToken(): string
    {
        do {
            $token = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        } while (self::where('token', $token)->where('used', false)->exists());

        return $token;
    }

    /**
     * Create a new password reset token
     */
    public static function createToken(string $email): self
    {
        // Delete any existing unused tokens for this email
        self::where('email', $email)->where('used', false)->delete();

        return self::create([
            'email' => $email,
            'token' => self::generateToken(),
            'created_at' => now(),
            'expires_at' => now()->addMinutes(15), // 15 minutes expiration
            'used' => false
        ]);
    }

    /**
     * Verify a reset token
     */
    public static function verifyToken(string $email, string $token): bool
    {
        $resetToken = self::where('email', $email)
            ->where('token', $token)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->first();

        return $resetToken !== null;
    }

    /**
     * Mark a token as used
     */
    public static function markAsUsed(string $email, string $token): bool
    {
        return self::where('email', $email)
            ->where('token', $token)
            ->update(['used' => true]);
    }

    /**
     * Clean up expired tokens
     */
    public static function cleanupExpiredTokens(): int
    {
        return self::where('expires_at', '<', now())->delete();
    }

    /**
     * Get token details for verification
     */
    public static function getTokenDetails(string $email, string $token): ?self
    {
        return self::where('email', $email)
            ->where('token', $token)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->first();
    }
}
