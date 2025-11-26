<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DepartmentExam extends Model
{
    use HasFactory;

    protected $fillable = [
        'evaluator_id',
        'exam_ref_no',
        'exam_title',
        'time_limit',
        'status',
        'passing_score'
    ];

    /**
     * Get the evaluator who created this exam
     */
    public function evaluator()
    {
        return $this->belongsTo(Evaluator::class, 'evaluator_id');
    }

    /**
     * Get the department through evaluator relationship
     */
    public function getDepartmentAttribute()
    {
        return $this->evaluator->Department ?? null;
    }

    /**
     * Get the questions for this department exam
     */
    public function questions()
    {
        return $this->belongsToMany(DepartmentExamBank::class, 'department_exam_questions_pivot', 'department_exam_id', 'question_id');
    }

    /**
     * Get the exam results for this department exam
     */
    public function results()
    {
        return $this->hasMany(DepartmentExamResult::class, 'department_exam_id');
    }

    /**
     * Scope for active department exams
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for inactive department exams
     */
    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }

    /**
     * Scope to filter by department through evaluator
     */
    public function scopeByDepartment($query, $department)
    {
        return $query->whereHas('evaluator', function ($q) use ($department) {
            $q->where('Department', $department);
        });
    }
}
