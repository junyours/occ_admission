<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PersonalityTestAnswer extends Model
{
    use HasFactory;

    protected $table = 'personality_test_answers';

    protected $fillable = [
        'examineeId',
        'questionId',
        'selected_answer',
        'chosen_side'
    ];

    /**
     * Get the examinee for this answer
     */
    public function examinee()
    {
        return $this->belongsTo(Examinee::class, 'examineeId');
    }

    /**
     * Get the question for this answer
     */
    public function question()
    {
        return $this->belongsTo(PersonalityTest::class, 'questionId');
    }
} 