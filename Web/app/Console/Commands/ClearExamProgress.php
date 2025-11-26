<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClearExamProgress extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'exam:clear-progress {--older-than= : Delete only records older than N seconds (optional)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear temporary exam progress storage (exam_progress table).';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $olderThan = $this->option('older-than');

        try {
            $this->info('[ClearExamProgress] Starting cleanup...');

            $deleted = 0;

            if ($olderThan !== null && is_numeric($olderThan) && (int)$olderThan > 0) {
                // Delete only rows older than N seconds
                $seconds = (int) $olderThan;
                $this->info("Deleting exam_progress rows older than {$seconds} seconds...");

                $deleted = DB::table('exam_progress')
                    ->where('updated_at', '<', now()->subSeconds($seconds))
                    ->delete();
            } else {
                // Full table clear - safer than TRUNCATE for FK constraints
                $this->info('Deleting all rows from exam_progress...');
                $deleted = DB::table('exam_progress')->delete();
            }

            Log::info('[ClearExamProgress] Cleanup completed', [
                'deleted_count' => $deleted,
                'older_than_seconds' => $olderThan,
                'timestamp' => now()->toDateTimeString(),
            ]);

            $this->info("✅ Cleared {$deleted} exam_progress rows.");
            return Command::SUCCESS;
        } catch (\Throwable $e) {
            Log::error('[ClearExamProgress] Cleanup failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            $this->error('❌ Failed to clear exam_progress: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}

