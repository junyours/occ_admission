<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class Testing extends Controller
{
    public function insert(Request $request)
    {
        DB::table('test')->insert([
            'TESTING' => 'Connected',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Data inserted successfully!'], 200);
    }
}