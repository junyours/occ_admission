<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Evaluator extends Model
{
    use HasFactory;

    protected $table = 'evaluator';
    protected $fillable = [
        'accountId',
        'name',
        'Department'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'accountId');
    }
} 