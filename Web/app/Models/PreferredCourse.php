<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PreferredCourse extends Model
{
    use HasFactory;

    protected $table = 'preferred_course';
    
    protected $fillable = [
        'course_name',
    ];

}

