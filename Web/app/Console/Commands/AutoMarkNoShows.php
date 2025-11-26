<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ExamineeRegistration;
use Illuminate\Support\Facades\Log;

class AutoMarkNoShows extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'examinees:auto-mark-no-shows';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically mark examinees as no-show if they have passed their assigned exam date';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            $today = now()->toDateString();
            
            // Find examinees who have passed their assigned exam date and are still assigned/registered
            $expiredRegistrations = ExamineeRegistration::where('assigned_exam_date', '<', $today)
                ->whereIn('status', ['assigned', 'registered'])
                ->with(['examinee.user'])
                ->get();
            
            $markedCount = 0;
            $markedExaminees = [];
            
            foreach ($expiredRegistrations as $registration) {
                $registration->update(['status' => 'cancelled']);
                $markedCount++;
                $markedExaminees[] = [
                    'id' => $registration->id,
                    'examinee_name' => $registration->examinee->user->username ?? 'Unknown',
                    'assigned_date' => $registration->assigned_exam_date,
                    'assigned_session' => $registration->assigned_session
                ];
            }
            
            if ($markedCount > 0) {
                $this->info("Successfully marked {$markedCount} examinees as no-show");
                $this->table(
                    ['ID', 'Name', 'Assigned Date', 'Session'],
                    array_map(function($examinee) {
                        return [
                            $examinee['id'],
                            $examinee['examinee_name'],
                            $examinee['assigned_date'],
                            $examinee['assigned_session']
                        ];
                    }, $markedExaminees)
                );
            } else {
                $this->info('No examinees found that need to be marked as no-show');
            }
            
            Log::info('[AutoMarkNoShows Command] Auto-marked expired examinees as no-show', [
                'marked_count' => $markedCount,
                'today' => $today,
                'marked_examinees' => $markedExaminees
            ]);
            
            return Command::SUCCESS;
            
        } catch (\Exception $e) {
            $this->error('Error during auto-marking: ' . $e->getMessage());
            
            Log::error('[AutoMarkNoShows Command] Error during auto-marking expired examinees', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return Command::FAILURE;
        }
    }
}
