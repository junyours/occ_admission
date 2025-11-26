<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ExamineeRegistration;
use Illuminate\Support\Facades\Log;

class FixRegistrationStatuses extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'registrations:fix-statuses {--dry-run : Show what would be updated without making changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix registration statuses - update status to "assigned" for registrations that have schedules but status is "registered"';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $isDryRun = $this->option('dry-run');
        
        // Find registrations that have assigned_exam_date and assigned_session but status is 'registered'
        $inconsistentRegistrations = ExamineeRegistration::where('status', 'registered')
            ->whereNotNull('assigned_exam_date')
            ->whereNotNull('assigned_session')
            ->with('examinee.user')
            ->get();

        if ($inconsistentRegistrations->isEmpty()) {
            $this->info('✅ No inconsistent registration statuses found. All registrations with assigned schedules have correct status.');
            return 0;
        }

        $this->info("Found {$inconsistentRegistrations->count()} registrations with inconsistent statuses:");
        $this->newLine();

        // Display the registrations that will be updated
        $headers = ['ID', 'Examinee', 'School', 'Assigned Date', 'Session', 'Current Status'];
        $rows = [];

        foreach ($inconsistentRegistrations as $registration) {
            $rows[] = [
                $registration->id,
                $registration->examinee?->user?->username ?? 'N/A',
                $registration->examinee?->school_name ?? 'N/A',
                $registration->assigned_exam_date,
                $registration->assigned_session,
                $registration->status
            ];
        }

        $this->table($headers, $rows);

        if ($isDryRun) {
            $this->warn('🔍 DRY RUN: No changes were made. Use without --dry-run to apply changes.');
            return 0;
        }

        // Confirm before proceeding
        if (!$this->confirm('Do you want to update these registrations to "assigned" status?')) {
            $this->info('Operation cancelled.');
            return 0;
        }

        $updatedCount = 0;
        $this->info('Updating registration statuses...');
        $progressBar = $this->output->createProgressBar($inconsistentRegistrations->count());

        foreach ($inconsistentRegistrations as $registration) {
            $registration->update(['status' => 'assigned']);
            $updatedCount++;
            
            Log::info('[FixRegistrationStatuses Command] Updated registration', [
                'registration_id' => $registration->id,
                'examinee_id' => $registration->examinee_id,
                'assigned_date' => $registration->assigned_exam_date,
                'assigned_session' => $registration->assigned_session,
                'old_status' => 'registered',
                'new_status' => 'assigned'
            ]);
            
            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);
        
        $this->info("✅ Successfully updated {$updatedCount} registration statuses.");
        $this->info('All registrations with assigned schedules now have "assigned" status.');

        return 0;
    }
}