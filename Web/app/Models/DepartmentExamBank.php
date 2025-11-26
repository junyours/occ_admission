<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DepartmentExamBank extends Model
{
    use HasFactory;

    protected $table = 'department_exam_bank';
    protected $primaryKey = 'questionId';
    public $incrementing = true;

    protected $fillable = [
        'questionId',
        'question',
        'question_formatted',
        'option1',
        'option1_formatted',
        'option1_image',
        'option2',
        'option2_formatted',
        'option2_image',
        'option3',
        'option3_formatted',
        'option3_image',
        'option4',
        'option4_formatted',
        'option4_image',
        'option5',
        'option5_formatted',
        'option5_image',
        'correct_answer',
        'category',
        'department',
        'status',
        'image',
        'direction'
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
     * Get the department exams that use this question
     */
    public function departmentExams()
    {
        return $this->belongsToMany(DepartmentExam::class, 'department_exam_questions_pivot', 'question_id', 'department_exam_id');
    }
}
