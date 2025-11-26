<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Examinee;
use Illuminate\Support\Facades\Log;

class CleanupIncompleteRegistrations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'registration:cleanup {--hours=24 : Hours to wait before cleanup} {--dry-run : Show what would be cleaned up without actually doing it}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up incomplete registrations older than specified hours';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $hours = $this->option('hours');
        $dryRun = $this->option('dry-run');
        
        $this->info("🔧 Cleaning up incomplete registrations older than {$hours} hours...");
        
        if ($dryRun) {
            $this->warn("🔍 DRY RUN MODE - No changes will be made");
        }
        
        // Find users with no examinee records older than specified hours
        $incompleteUsers = User::where('role', 'student')
            ->where('email_verified_at', null)
            ->where('created_at', '<', now()->subHours($hours))
            ->whereDoesntHave('examinee')
            ->get();
            
        $this->info("Found {$incompleteUsers->count()} incomplete registrations to clean up:");
        
        if ($incompleteUsers->count() === 0) {
            $this->info("✅ No incomplete registrations found.");
            return 0;
        }
        
        // Display users that will be cleaned up
        $this->table(
            ['ID', 'Email', 'Name', 'Created At'],
            $incompleteUsers->map(function ($user) {
                return [
                    $user->id,
                    $user->email,
                    $user->username,
                    $user->created_at->format('Y-m-d H:i:s')
                ];
            })
        );
        
        if ($dryRun) {
            $this->info("🔍 DRY RUN: Would delete {$incompleteUsers->count()} incomplete registrations");
            return 0;
        }
        
        // Confirm deletion
        if (!$this->confirm("Are you sure you want to delete these {$incompleteUsers->count()} incomplete registrations?")) {
            $this->info("❌ Cleanup cancelled.");
            return 0;
        }
        
        $deletedCount = 0;
        
        foreach ($incompleteUsers as $user) {
            try {
                Log::info('[Cleanup] Removing incomplete registration', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'created_at' => $user->created_at,
                    'hours_old' => $user->created_at->diffInHours(now())
                ]);
                
                $user->delete();
                $deletedCount++;
                
                $this->line("✅ Deleted user: {$user->email}");
                
            } catch (\Exception $e) {
                $this->error("❌ Failed to delete user {$user->email}: {$e->getMessage()}");
                Log::error('[Cleanup] Failed to delete user', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        $this->info("🎉 Cleanup completed! Deleted {$deletedCount} incomplete registrations.");
        
        return 0;
    }
}
