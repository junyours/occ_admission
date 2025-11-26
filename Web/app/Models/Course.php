<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_code',
        'course_name',
        'description',
        'passing_rate'
    ];

    /**
     * Get the recommendation rules for this course
     */
    public function recommendationRules()
    {
        return $this->hasMany(CourseRecommendationRule::class, 'recommended_course_id');
    }

    /**
     * Get the recommendations for this course
     */
    public function recommendations()
    {
        return $this->hasMany(ExamineeRecommendation::class, 'course_id');
    }

    /**
     * Get a description for this course
     */
    public function getDescription()
    {
        return CourseDescription::getDescription($this->course_name);
    }
} 