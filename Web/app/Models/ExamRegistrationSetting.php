<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExamRegistrationSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'registration_open',
        'academic_year',
        'semester',
        'exam_start_date',
        'exam_end_date',
        'students_per_day',
        'registration_message'
    ];

    protected $casts = [
        'registration_open' => 'boolean',
        'exam_start_date' => 'date',
        'exam_end_date' => 'date',
    ];

    /**
     * Get the current registration settings (singleton pattern)
     */
    public static function getCurrentSettings()
    {
        $settings = static::first();
        
        if (!$settings) {
            // Return a new instance with default values
            $settings = new static();
            $settings->registration_open = false; // Closed by default
            $settings->students_per_day = null;
            $settings->exam_start_date = null;
            $settings->exam_end_date = null;
            $settings->registration_message = null;
        }
        
        return $settings;
    }
}
