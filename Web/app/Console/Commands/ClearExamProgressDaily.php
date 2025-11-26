<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClearExamProgressDaily extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'exam-progress:clear-daily';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear exam progress table daily at 6:00 AM';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            $this->info('🧹 Clearing exam progress table...');
            
            $deletedCount = DB::table('exam_progress')->delete();
            
            Log::info('[Scheduled] Cleared exam_progress table', [
                'deleted_count' => $deletedCount,
                'cleared_at' => now(),
                'scheduled' => true
            ]);
            
            $this->info("✅ Successfully cleared {$deletedCount} exam progress record(s)");
            
            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Failed to clear exam progress: ' . $e->getMessage());
            
            Log::error('[Scheduled] Failed to clear exam_progress table', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return 1;
        }
    }
}
