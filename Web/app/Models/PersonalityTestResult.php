<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PersonalityTestResult extends Model
{
    use HasFactory;

    protected $table = 'personality_test_results';

    protected $fillable = [
        'examineeId',
        'EI',
        'SN',
        'TF',
        'JP'
    ];

    /**
     * Get the examinee for this result
     */
    public function examinee()
    {
        return $this->belongsTo(Examinee::class, 'examineeId');
    }

    /**
     * Get the personality type (derived from EI, SN, TF, JP combination)
     */
    public function getPersonalityTypeAttribute()
    {
        return $this->EI . $this->SN . $this->TF . $this->JP;
    }

    /**
     * Get the personality type details from the personality_types table
     */
    public function personalityType()
    {
        return $this->belongsTo(PersonalityType::class, 'type', 'type')
            ->where('type', $this->personality_type);
    }

    /**
     * Get the answers for this personality test result
     */
    public function answers()
    {
        return $this->hasMany(PersonalityTestAnswer::class, 'examineeId', 'examineeId');
    }
} 