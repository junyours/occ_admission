<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Examinee extends Model
{
    use HasFactory;

    protected $table = 'examinee';
    protected $fillable = [
        'accountId',
        'lname',
        'fname',
        'mname',
        'gender',
        'age',
        'phone',
        'address',
        'school_name',
        'parent_name',
        'parent_phone',
        'Profile',
        'preferred_course'
    ];

    protected $appends = ['full_name', 'profile_image'];
    protected $hidden = ['Profile'];

    public function user()
    {
        return $this->belongsTo(User::class, 'accountId');
    }

    public function examResults()
    {
        return $this->hasMany(ExamResult::class, 'examineeId');
    }

    public function personalityTestResults()
    {
        return $this->hasMany(PersonalityTestResult::class, 'examineeId');
    }

    public function recommendations()
    {
        return $this->hasMany(ExamineeRecommendation::class, 'examineeId');
    }

    public function registration()
    {
        return $this->hasOne(ExamineeRegistration::class, 'examinee_id');
    }

    public function registrations()
    {
        return $this->hasMany(ExamineeRegistration::class, 'examinee_id');
    }

    /**
     * Get the profile image as a data URL for display
     */
    public function getProfileImageAttribute()
    {
        if (!$this->Profile) {
            return null;
        }
        try {
            $imageData = $this->Profile;
            $decoded = base64_decode($imageData, true);
            if ($decoded === false) {
                return null;
            }
            $imageInfo = @getimagesizefromstring($decoded);
            $mimeType = ($imageInfo && isset($imageInfo['mime'])) ? $imageInfo['mime'] : 'image/jpeg';
            return 'data:' . $mimeType . ';base64,' . $imageData;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Check if the examinee has a profile image
     */
    public function hasProfileImage()
    {
        return !empty($this->Profile);
    }

    /**
     * Get the full name by combining lname, fname, and mname
     */
    public function getFullNameAttribute()
    {
        $name = $this->fname;
        if (!empty($this->mname)) {
            $name .= ' ' . $this->mname;
        }
        $name .= ' ' . $this->lname;
        return $name;
    }

    /**
     * Get the name in "Last Name, First Name Middle Name" format
     */
    public function getFormalNameAttribute()
    {
        $name = $this->lname . ', ' . $this->fname;
        if (!empty($this->mname)) {
            $name .= ' ' . $this->mname;
        }
        return $name;
    }
} 