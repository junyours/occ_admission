<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PersonalityTest extends Model
{
    use HasFactory;

    protected $table = 'personality_test';

    protected $fillable = [
        'question',
        'option1',
        'option2',
        'dichotomy',
        'positive_side',
        'negative_side',
        'status'
    ];

    /**
     * Scope to get only active questions
     */
    public function scopeActive($query)
    {
        return $query->where('status', 1);
    }

    /**
     * Scope to get only archived questions
     */
    public function scopeArchived($query)
    {
        return $query->where('status', 0);
    }

    /**
     * Get the answers for this question
     */
    public function answers()
    {
        return $this->hasMany(PersonalityTestAnswer::class, 'question_id');
    }

    /**
     * Get the exams that include this personality question
     */
    public function exams()
    {
        return $this->belongsToMany(Exam::class, 'exam_personality_questions_pivot', 'personality_question_id', 'examId');
    }
} 