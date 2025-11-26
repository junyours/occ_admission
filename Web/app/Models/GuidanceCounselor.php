<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GuidanceCounselor extends Model
{
    use HasFactory;

    protected $table = 'guidance_counselor';
    protected $fillable = [
        'accountId',
        'name',
        'address'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'accountId');
    }
} 