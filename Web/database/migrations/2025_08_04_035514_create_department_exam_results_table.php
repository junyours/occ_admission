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
        Schema::create('department_exam_results', function (Blueprint $table) {
            $table->id();

            // Identifies which examinee took this exam
            $table->unsignedBigInteger('examinee_id');

            // Identifies which department exam was taken
            $table->unsignedBigInteger('department_exam_id');

            // Aggregated data from the exam
            $table->unsignedInteger('total_items');      // Total number of questions in the exam
            $table->unsignedInteger('correct_answers');    // Total correct answers
            $table->unsignedInteger('wrong_answers');      // Total wrong answers (or you can calculate this: total_items - correct_answers)
            $table->float('score_percentage');             // Percentage score, e.g., 85.5
            $table->string('remarks');                       // e.g., "Pass" or "Fail"

            // Foreign key constraints
            $table->foreign('examinee_id')->references('id')->on('examinee')->onDelete('cascade');
            $table->foreign('department_exam_id')->references('id')->on('department_exams')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('department_exam_results');
    }
};
