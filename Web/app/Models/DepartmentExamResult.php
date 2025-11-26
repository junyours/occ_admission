<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DepartmentExamResult extends Model
{
    use HasFactory;

    protected $table = 'department_exam_results';

    protected $fillable = [
        'department_exam_id',
        'examinee_id',
        'total_items',
        'correct_answers',
        'wrong_answers',
        'score_percentage',
        'remarks'
    ];

    /**
     * Get the department exam for this result
     */
    public function departmentExam()
    {
        return $this->belongsTo(DepartmentExam::class, 'department_exam_id');
    }

    /**
     * Get the examinee for this result
     */
    public function examinee()
    {
        return $this->belongsTo(Examinee::class, 'examinee_id');
    }

    /**
     * Get the answers for this result
     */
    public function answers()
    {
        return $this->hasMany(DepartmentExamAnswer::class, 'department_exam_id', 'department_exam_id')
            ->where('examinee_id', $this->examinee_id);
    }
}
