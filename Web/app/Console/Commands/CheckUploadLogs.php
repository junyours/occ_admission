<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class CheckUploadLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'check:upload-logs {--lines=50 : Number of lines to show}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check recent upload logs for debugging';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $logFile = storage_path('logs/laravel.log');
        $lines = $this->option('lines');

        if (!File::exists($logFile)) {
            $this->error('Log file not found: ' . $logFile);
            return 1;
        }

        $this->info('Recent upload logs (last ' . $lines . ' lines):');
        $this->line('');

        // Get the last N lines of the log file
        $logContent = File::get($logFile);
        $logLines = explode("\n", $logContent);
        $recentLines = array_slice($logLines, -$lines);

        foreach ($recentLines as $line) {
            if (strpos($line, 'Upload') !== false || 
                strpos($line, 'CSV') !== false || 
                strpos($line, 'Excel') !== false ||
                strpos($line, 'Question') !== false ||
                strpos($line, 'Error') !== false ||
                strpos($line, 'Warning') !== false) {
                $this->line($line);
            }
        }

        return 0;
    }
}
