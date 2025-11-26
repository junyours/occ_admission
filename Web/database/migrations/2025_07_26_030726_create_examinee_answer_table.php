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
        Schema::create('examinee_answer', function (Blueprint $table) {
            $table->id(); // Primary Key
            $table->unsignedBigInteger('examineeId'); // FK to students/examinees
            $table->unsignedBigInteger('questionId'); // FK to question_bank
            $table->unsignedBigInteger('examId'); // FK to exams
            $table->string('selected_answer'); // Student's selected answer (A, B, C, D)
            $table->boolean('is_correct')->nullable(); // To mark if answer is right
            $table->integer('time_spent_seconds')->nullable(); // Time spent on this question in seconds
            $table->timestamp('question_start_time')->nullable(); // When examinee started this question
            $table->timestamp('question_end_time')->nullable(); // When examinee submitted this question
            // Removed 'total_question' field to fix 3NF violation - can be calculated from exam_questions_pivot table
        
            $table->timestamps();
        

            $table->foreign('examineeId')->references('id')->on('examinee')->onDelete('cascade');
            $table->foreign('questionId')->references('questionId')->on('question_bank')->onDelete('cascade');
            $table->foreign('examId')->references('examId')->on('exams')->onDelete('cascade');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examinee_answer');
    }
};
