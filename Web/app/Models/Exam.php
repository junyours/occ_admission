<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Exam extends Model
{
    use HasFactory;

    protected $primaryKey = 'examId';
    public $incrementing = false;

    protected $fillable = [
        'examId',
        'exam-ref-no',
        'time_limit',
        'status',
        'include_personality_test'
    ];

    protected $casts = [
        'time_limit' => 'integer',
        'include_personality_test' => 'boolean',
    ];

    /**
     * Get the questions for this exam
     */
    public function questions()
    {
        return $this->belongsToMany(QuestionBank::class, 'exam_questions_pivot', 'examId', 'questionId');
    }

    /**
     * Get the personality test questions for this exam
     */
    public function personalityQuestions()
    {
        return $this->belongsToMany(PersonalityTest::class, 'exam_personality_questions_pivot', 'examId', 'personality_question_id');
    }

    /**
     * Get the exam results
     */
    public function results()
    {
        return $this->hasMany(ExamResult::class, 'examId');
    }

    /**
     * Scope for active exams
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for inactive exams
     */
    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }

    /**
     * Get active exams with caching
     */
    public static function getActiveExams()
    {
        return Cache::remember('active_exams', 300, function () {
            return self::active()->with(['questions', 'results'])->get();
        });
    }

    /**
     * Generate a unique exam reference number
     */
    public static function generateExamRefNo()
    {
        do {
            $refNo = 'EXAM-' . strtoupper(substr(md5(uniqid()), 0, 8));
        } while (self::where('exam-ref-no', $refNo)->exists());

        return $refNo;
    }

    /**
     * Clear cache when exam is updated
     */
    protected static function booted()
    {
        static::saved(function ($exam) {
            Cache::forget('active_exams');
        });

        static::deleted(function ($exam) {
            Cache::forget('active_exams');
        });
    }
} 