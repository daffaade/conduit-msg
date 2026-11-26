<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $demoUsers = [
            ['username' => 'alice', 'name' => 'Alice (User A)', 'email' => 'alice@example.com'],
            ['username' => 'bob', 'name' => 'Bob (User B)', 'email' => 'bob@example.com'],
            ['username' => 'charlie', 'name' => 'Charlie (User C)', 'email' => 'charlie@example.com'],
        ];

        foreach ($demoUsers as $data) {
            User::firstOrCreate(
                ['username' => $data['username']],
                [
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => 'password123',
                ]
            );
        }
    }
}
