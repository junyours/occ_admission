<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Evaluator;
use Illuminate\Support\Facades\Hash;

class EvaluatorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
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
            // Check if user already exists
            $existingUser = User::where('email', $evaluatorData['email'])->first();
            
            if (!$existingUser) {
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

                echo "Created evaluator: {$evaluatorData['username']}\n";
            } else {
                echo "Evaluator already exists: {$evaluatorData['username']}\n";
            }
        }
    }
}
