<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'email_verified_at',
        'fingerprint_data',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'fingerprint_data', // Hide fingerprint data from serialization for security
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the examinee profile for this user.
     */
    public function examinee()
    {
        return $this->hasOne(Examinee::class, 'accountId');
    }

    /**
     * Get the evaluator profile for this user.
     */
    public function evaluator()
    {
        return $this->hasOne(Evaluator::class, 'accountId');
    }

    /**
     * Get the guidance counselor profile for this user.
     */
    public function guidanceCounselor()
    {
        return $this->hasOne(GuidanceCounselor::class, 'accountId');
    }
}
