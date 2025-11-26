<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PersonalityType extends Model
{
    use HasFactory;

    protected $table = 'personality_types';
    protected $primaryKey = 'type';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'type',
        'title',
        'description'
    ];

    /**
     * Get the recommendation rules for this personality type
     */
    public function recommendationRules()
    {
        return $this->hasMany(CourseRecommendationRule::class, 'personality_type', 'type');
    }

    /**
     * Get the personality test results for this type
     */
    public function testResults()
    {
        return $this->hasMany(PersonalityTestResult::class, 'personality_type', 'type');
    }
} 