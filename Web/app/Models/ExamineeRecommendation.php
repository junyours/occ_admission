<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExamineeRecommendation extends Model
{
    use HasFactory;

    protected $table = 'examinee_recommendations';

    protected $fillable = [
        'examinee_id',
        'exam_result_id',
        'personality_result_id',
        'recommended_course_id'
    ];

    public function examinee()
    {
        return $this->belongsTo(Examinee::class, 'examinee_id');
    }

    public function examResult()
    {
        return $this->belongsTo(ExamResult::class, 'exam_result_id', 'resultId');
    }

    public function personalityResult()
    {
        return $this->belongsTo(PersonalityTestResult::class, 'personality_result_id');
    }

    public function recommendedCourse()
    {
        return $this->belongsTo(Course::class, 'recommended_course_id');
    }
}