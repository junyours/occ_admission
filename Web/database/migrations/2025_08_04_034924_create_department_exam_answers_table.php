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
        Schema::create('department_exam_answers', function (Blueprint $table) {
            $table->id();

            // Who answered
            $table->unsignedBigInteger('examinee_id'); // FK to examinees table

            // Which exam
            $table->unsignedBigInteger('department_exam_id'); // FK to department_exams table

            // Which question
            $table->unsignedBigInteger('question_id'); // FK to department_exam_bank or shared question_bank table

            // Their answer
            $table->string('selected_answer');

            // Timing metrics (for question difficulty analysis)
            $table->integer('time_spent_seconds')->nullable();
            $table->timestamp('question_start_time')->nullable();
            $table->timestamp('question_end_time')->nullable();

            // Timestamps
            $table->timestamps();

            // Helpful indexes for analytics queries
            $table->index('question_id');
            $table->index('department_exam_id');
            $table->index('created_at');
            $table->index('time_spent_seconds');

            // Foreign Key Constraints
            $table->foreign('examinee_id')->references('id')->on('examinee')->onDelete('cascade');
            $table->foreign('department_exam_id')->references('id')->on('department_exams')->onDelete('cascade');
            $table->foreign('question_id')->references('questionId')->on('department_exam_bank')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('department_exam_answers');
    }
};
