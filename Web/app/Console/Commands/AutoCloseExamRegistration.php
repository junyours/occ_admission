<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ExamRegistrationSetting;
use App\Models\ExamSchedule;
use Illuminate\Support\Facades\Log;

class AutoCloseExamRegistration extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'exam:auto-close-registration';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically close exam registration when exam period has ended';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for expired exam registrations...');

        try {
            $settings = ExamRegistrationSetting::getCurrentSettings();
            
            // Check if there's an end date set
            if (!$settings->exam_end_date) {
                $this->info('No exam end date set. Skipping...');
                return 0;
            }

            $today = now()->startOfDay();
            $endDate = \Carbon\Carbon::parse($settings->exam_end_date)->endOfDay();

            $this->info("Exam end date: {$settings->exam_end_date}");
            $this->info("Today: {$today->format('Y-m-d')}");

            // If today is after the exam end date, close registration and schedules
            if ($today->gt($endDate)) {
                $this->warn('Exam period has ended. Closing registration and schedules...');
                
                Log::info('Auto-closing exam registration and schedules via command - exam period ended', [
                    'exam_end_date' => $settings->exam_end_date,
                    'today' => $today->format('Y-m-d'),
                    'settings_id' => $settings->id
                ]);

                // Close the registration settings if it was open
                $registrationClosed = false;
                if ($settings->registration_open) {
                    $settings->update([
                        'registration_open' => false,
                        'registration_message' => 'REGISTRATION CLOSED - Exam period has ended'
                    ]);
                    $registrationClosed = true;
                } else {
                    // Even if registration was already closed, update the message
                    $settings->update([
                        'registration_message' => 'REGISTRATION CLOSED - Exam period has ended'
                    ]);
                }

                // Close all exam schedules that are in the past or on the end date
                $closedSchedules = ExamSchedule::where('exam_date', '<=', $settings->exam_end_date)
                    ->where('status', '!=', 'closed')
                    ->update(['status' => 'closed']);

                Log::info('Exam registration auto-closed and schedules closed successfully via command', [
                    'settings_id' => $settings->id,
                    'closed_at' => now(),
                    'schedules_closed' => $closedSchedules,
                    'registration_closed' => $registrationClosed
                ]);

                $statusMessage = [];
                if ($registrationClosed) $statusMessage[] = 'Registration closed';
                if ($closedSchedules > 0) $statusMessage[] = "{$closedSchedules} schedules closed";
                
                if (empty($statusMessage)) {
                    $this->info("✅ Exam period has ended. Registration was already closed and schedules were already closed.");
                } else {
                    $this->info("✅ " . implode(', ', $statusMessage) . " successfully!");
                }
                return 0;
            } else {
                $this->info('✅ Exam period is still active. No action needed.');
                return 0;
            }

        } catch (\Exception $e) {
            $this->error('❌ Error occurred: ' . $e->getMessage());
            
            Log::error('Failed to auto-close exam registration via command', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return 1;
        }
    }
}
