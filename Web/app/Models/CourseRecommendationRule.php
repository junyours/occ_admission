<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseRecommendationRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'personality_type',
        'min_score',
        'max_score',
        'recommended_course_id',
        'academic_year'
    ];

    /**
     * Get the personality type for this rule
     */
    public function personalityType()
    {
        return $this->belongsTo(PersonalityType::class, 'personality_type', 'type');
    }

    /**
     * Get the recommended course for this rule
     */
    public function recommendedCourse()
    {
        return $this->belongsTo(Course::class, 'recommended_course_id');
    }
} 