<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuestionBank extends Model
{
    use HasFactory;

    protected $table = 'question_bank';
    protected $primaryKey = 'questionId';
    public $incrementing = true;

    protected $fillable = [
        'question',
        'option1',
        'option2',
        'option3',
        'option4',
        'option5',
        'correct_answer',
        'category',
        'status',
        'image',
        'option1_image',
        'option2_image',
        'option3_image',
        'option4_image',
        'option5_image',
        'direction',
        'question_formatted',
        'option1_formatted',
        'option2_formatted',
        'option3_formatted',
        'option4_formatted',
        'option5_formatted'
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
     * Get the exams that use this question
     */
    public function exams()
    {
        return $this->belongsToMany(Exam::class, 'exam_questions_pivot', 'questionId', 'examId');
    }
} 