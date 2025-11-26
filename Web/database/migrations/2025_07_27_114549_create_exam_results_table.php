<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('exam_results', function (Blueprint $table) {
            $table->id('resultId');
            $table->unsignedBigInteger('examineeId');
            $table->unsignedBigInteger('examId');
            $table->integer('total_items');
            $table->integer('correct');
            // Removed 'incorrect' and 'percentage' fields to fix 3NF violations - can be calculated from total_items and correct
            // JSON snapshot of per-category scoring for guidance downloads and mobile breakdowns
            // Example: [{"category":"English","correct":6,"total":10}, ...]
            $table->json('category_breakdown')->nullable();
            $table->string('remarks' , 20);
            $table->timestamp('started_at')->nullable(); // When exam started
            $table->timestamp('finished_at')->nullable(); // When exam finished
            $table->integer('time_taken_seconds')->nullable(); // Total time in seconds
            $table->boolean('is_archived')->default(0); // 0 = visible, 1= archived/hidden
            $table->timestamps(); 

            $table->foreign('examineeId')->references('id')->on('examinee')->onDelete('cascade')->onUpdate('cascade');
            $table->foreign('examId')->references('examId')->on('exams')->onDelete('cascade')->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_results');
    }
};
