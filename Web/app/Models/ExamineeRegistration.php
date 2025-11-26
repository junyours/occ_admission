<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExamineeRegistration extends Model
{
    use HasFactory;

    protected $table = 'examinee_registrations';

    protected $fillable = [
        'examinee_id',
        'school_year',
        'semester',
        'assigned_exam_date',
        'assigned_session',
        'registration_date',
        'status'
    ];

    protected $casts = [
        'assigned_exam_date' => 'date',
        'registration_date' => 'date',
    ];

    /**
     * Get the examinee associated with this registration
     */
    public function examinee()
    {
        return $this->belongsTo(Examinee::class);
    }

    /**
     * Get the user through examinee
     */
    public function user()
    {
        return $this->examinee->user();
    }

    /**
     * Scope to get only registered students
     */
    public function scopeRegistered($query)
    {
        return $query->where('status', 'registered');
    }

    /**
     * Scope to get only assigned students
     */
    public function scopeAssigned($query)
    {
        return $query->where('status', 'assigned');
    }

    /**
     * Scope to get only completed students
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }
}
