<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class ExamResult extends Model
{
    use HasFactory;

    protected $primaryKey = 'resultId';
    public $incrementing = true;

    protected $fillable = [
        'resultId',
        'examineeId',
        'examId',
        'total_items',
        'correct',
        'remarks',
        'started_at',
        'finished_at',
        'time_taken_seconds',
        'category_breakdown'
    ];

    protected $appends = [
        'score',
        'correct_answers', 
        'total_questions',
        'status',
        'percentage',
        'incorrect',
        'time_taken',
        'semester',
        'school_year'
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
        'is_archived' => 'boolean',
        'category_breakdown' => 'array', // Auto decode/encode JSON
    ];

    /**
     * Get the examinee for this result
     */
    public function examinee()
    {
        return $this->belongsTo(Examinee::class, 'examineeId');
    }

    /**
     * Get the exam for this result
     */
    public function exam()
    {
        return $this->belongsTo(Exam::class, 'examId');
    }

    /**
     * Get the answers for this exam result
     */
    public function answers()
    {
        return $this->hasMany(ExamineeAnswer::class, 'examId', 'examId')
            ->where('examineeId', $this->examineeId);
    }

    /**
     * Get the incorrect answers count (derived from total_items and correct)
     */
    public function getIncorrectAttribute()
    {
        return $this->total_items - $this->correct;
    }

    /**
     * Get the percentage score (derived from total_items and correct)
     */
    public function getPercentageAttribute()
    {
        if ($this->total_items > 0) {
            return round(($this->correct / $this->total_items) * 100, 2);
        }
        return 0;
    }

    /**
     * Check if the examinee passed the exam
     */
    public function isPassed()
    {
        $passingScore = 10; // 10% passing score (open admission)
        return ($this->percentage >= $passingScore);
    }

    /**
     * Get the score attribute (alias for percentage)
     */
    public function getScoreAttribute()
    {
        return $this->percentage;
    }

    /**
     * Get the correct_answers attribute (alias for correct)
     */
    public function getCorrectAnswersAttribute()
    {
        return $this->correct;
    }

    /**
     * Get the total_questions attribute (alias for total_items)
     */
    public function getTotalQuestionsAttribute()
    {
        return $this->total_items;
    }

    /**
     * Get the status attribute (computed based on completion)
     */
    public function getStatusAttribute()
    {
        // For now, assume all results in the table are completed
        // You can modify this logic based on your actual status tracking
        return 'completed';
    }

    /**
     * Get the time_taken attribute (formatted from time_taken_seconds)
     */
    public function getTimeTakenAttribute()
    {
        if (!$this->time_taken_seconds) {
            return null;
        }
        
        return $this->time_taken_seconds;
    }

    /**
     * Get semester from examinee_registrations associated to this result
     */
    public function getSemesterAttribute()
    {
        try {
            $resultDate = $this->created_at ? $this->created_at->toDateString() : null;
            $query = DB::table('examinee_registrations')
                ->where('examinee_id', $this->examineeId)
                ->orderBy('registration_date', 'desc');

            if ($resultDate) {
                $match = DB::table('examinee_registrations')
                    ->where('examinee_id', $this->examineeId)
                    ->whereDate('assigned_exam_date', $resultDate)
                    ->orderBy('registration_date', 'desc')
                    ->first();
                if ($match) {
                    return $match->semester;
                }
            }

            $latest = $query->first();
            return $latest->semester ?? null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Get school_year from examinee_registrations associated to this result
     */
    public function getSchoolYearAttribute()
    {
        try {
            $resultDate = $this->created_at ? $this->created_at->toDateString() : null;
            $query = DB::table('examinee_registrations')
                ->where('examinee_id', $this->examineeId)
                ->orderBy('registration_date', 'desc');

            if ($resultDate) {
                $match = DB::table('examinee_registrations')
                    ->where('examinee_id', $this->examineeId)
                    ->whereDate('assigned_exam_date', $resultDate)
                    ->orderBy('registration_date', 'desc')
                    ->first();
                if ($match) {
                    return $match->school_year;
                }
            }

            $latest = $query->first();
            return $latest->school_year ?? null;
        } catch (\Throwable $e) {
            return null;
        }
    }
} 