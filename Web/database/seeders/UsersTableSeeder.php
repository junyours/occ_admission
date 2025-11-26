<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Examinee;
use App\Models\Evaluator;
use App\Models\GuidanceCounselor;
use Illuminate\Support\Facades\Hash;

class UsersTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create a guidance counselor user
        $guidanceUser = User::create([
            'username' => 'Guidance Counselor',
            'email' => 'guidance@gmail.com',
            'password' => Hash::make('password'),
            'role' => 'guidance',
        ]);

        GuidanceCounselor::create([
            'accountId' => $guidanceUser->id,
            'name' => 'Annabelle T. Verula, LPT, RGC',
            'address' => 'Opol Community College, Guidance Office Ground Floor',
        ]);

        // Create evaluator users for different departments
        $evaluatorUsers = [
            [
                'username' => 'BSIT Evaluator',
                'email' => 'bsit.evaluator@gmail.com',
                'password' => 'password',
                'role' => 'evaluator',
                'evaluator' => [
                    'name' => 'John Doe, MIT',
                    'Department' => 'BSIT',
                ]
            ],
            [
                'username' => 'BSBA Evaluator',
                'email' => 'bsba.evaluator@gmail.com',
                'password' => 'password',
                'role' => 'evaluator',
                'evaluator' => [
                    'name' => 'Jane Smith, MBA',
                    'Department' => 'BSBA',
                ]
            ],
            [
                'username' => 'EDUC Evaluator',
                'email' => 'educ.evaluator@gmail.com',
                'password' => 'password',
                'role' => 'evaluator',
                'evaluator' => [
                    'name' => 'Maria Garcia, MAEd',
                    'Department' => 'EDUC',
                ]
            ],
        ];

        foreach ($evaluatorUsers as $evaluatorData) {
            $user = User::create([
                'username' => $evaluatorData['username'],
                'email' => $evaluatorData['email'],
                'password' => Hash::make($evaluatorData['password']),
                'role' => $evaluatorData['role'],
            ]);

            Evaluator::create([
                'accountId' => $user->id,
                'name' => $evaluatorData['evaluator']['name'],
                'Department' => $evaluatorData['evaluator']['Department'],
            ]);
        }
    }
}
