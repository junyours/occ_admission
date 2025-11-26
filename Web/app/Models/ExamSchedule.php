<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExamSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'exam_date',
        'session',
        'start_time',
        'end_time',
        'max_capacity',
        'current_registrations',
        'status',
        'notes'
    ];

    protected $casts = [
        'exam_date' => 'date',
        'start_time' => 'string',
        'end_time' => 'string',
    ];

    /**
     * Get the registrations for this exam date and session
     */
    public function registrations()
    {
        return $this->hasMany(ExamineeRegistration::class, 'assigned_exam_date', 'exam_date')
                    ->where('assigned_session', $this->session);
    }

    /**
     * Scope to get only open schedules
     */
    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    /**
     * Scope to get only full schedules
     */
    public function scopeFull($query)
    {
        return $query->where('status', 'full');
    }

    /**
     * Check if this schedule has available slots
     */
    public function hasAvailableSlots()
    {
        return $this->current_registrations < $this->max_capacity;
    }

    /**
     * Get available slots count
     */
    public function getAvailableSlots()
    {
        return $this->max_capacity - $this->current_registrations;
    }
}
