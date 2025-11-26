<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExamProgress extends Model
{
    use HasFactory;

    protected $table = 'exam_progress';

    protected $fillable = [
        'examinee_id',
        'exam_ref_no',
        'question_id',
        'selected_answer',
        'remaining_seconds',
    ];
}


