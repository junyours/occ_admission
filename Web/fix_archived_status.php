<?php

// Quick script to fix archived status
// Run this from the Web directory: php fix_archived_status.php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Fixing archived status for exam results...\n";

try {
    // Update all exam results to non-archived
    $updated = DB::table('exam_results')
        ->where('is_archived', 1)
        ->update(['is_archived' => 0]);
    
    echo "Updated {$updated} records to non-archived status.\n";
    
    // Show some sample data
    $results = DB::table('exam_results')
        ->select('resultId', 'examineeId', 'finished_at', 'is_archived', 'remarks')
        ->whereNotNull('finished_at')
        ->orderBy('finished_at', 'desc')
        ->limit(5)
        ->get();
    
    echo "\nSample data after update:\n";
    foreach ($results as $result) {
        echo "ID: {$result->resultId}, Examinee: {$result->examineeId}, Finished: {$result->finished_at}, Archived: {$result->is_archived}, Remarks: {$result->remarks}\n";
    }
    
    echo "\nDone! Now refresh your Exam Results page.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
