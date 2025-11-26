<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule the auto-mark no-shows command to run daily at 6:00 AM
Schedule::command('examinees:auto-mark-no-shows')
    ->dailyAt('06:00')
    ->name('auto-mark-no-shows')
    ->description('Automatically mark examinees as no-show if they have passed their exam date')
    ->withoutOverlapping()
    ->runInBackground();

// Schedule: clear exam progress daily (full clear every 24 hours)
Schedule::command('exam:clear-progress')
    ->dailyAt('06:00')
    ->name('clear-exam-progress-daily')
    ->description('Clear all exam progress data every 24 hours at 6:00 AM')
    ->withoutOverlapping()
    ->runInBackground();

// Schedule: clear exam progress table daily at 6:00 AM
Schedule::command('exam-progress:clear-daily')
    ->dailyAt('06:00')
    ->name('clear-exam-progress-table')
    ->description('Clear exam_progress table daily at 6:00 AM')
    ->withoutOverlapping()
    ->runInBackground();
