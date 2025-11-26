<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DepartmentExamAnswer extends Model
{
    use HasFactory;

    protected $table = 'department_exam_answers';

    protected $fillable = [
        'examinee_id',
        'department_exam_id',
        'question_id',
        'selected_answer',
        'time_spent_seconds',
        'question_start_time',
        'question_end_time'
    ];

    /**
     * Get the examinee who answered
     */
    public function examinee()
    {
        return $this->belongsTo(Examinee::class, 'examinee_id');
    }

    /**
     * Get the department exam
     */
    public function departmentExam()
    {
        return $this->belongsTo(DepartmentExam::class, 'department_exam_id');
    }

    /**
     * Get the question that was answered
     */
    public function question()
    {
        return $this->belongsTo(DepartmentExamBank::class, 'question_id', 'questionId');
    }
}
