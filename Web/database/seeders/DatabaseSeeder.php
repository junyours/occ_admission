<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // Call the seeders
        // $this->call([
        //     UsersTableSeeder::class,
        //     PersonalityTypesSeeder::class,
        //     CourseSeeder::class,
        // ]);

        User::create([
            'username' => 'Admin',
            'email' => 'admission@occ.edu.ph',
            'password' => 'password',
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
    }
}
