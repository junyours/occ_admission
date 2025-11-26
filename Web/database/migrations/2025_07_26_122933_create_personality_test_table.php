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
        Schema::create('personality_test', function (Blueprint $table) {
            $table->id();
            $table->text('question'); // The question text
            $table->string('option1')->default('Yes'); // Fixed options
            $table->string('option2')->default('No');
            $table->string('dichotomy'); // E/I, S/N, T/F, J/P
            $table->string('positive_side'); // Side of dichotomy associated with "Yes"
            $table->string('negative_side'); // Side of dichotomy associated with "No"
            $table->string('status')->default(1); // 1: not deleted or show, 0: hidden of "deleted"
            $table->timestamps();
        });
        
        // Create pivot table for exam personality questions
        Schema::create('exam_personality_questions_pivot', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('examId');
            $table->unsignedBigInteger('personality_question_id');
            $table->timestamps();

            $table->foreign('examId')->references('examId')->on('exams')->onDelete('cascade')->onUpdate('cascade');
            $table->foreign('personality_question_id')->references('id')->on('personality_test')->onDelete('cascade')->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_personality_questions_pivot');
        Schema::dropIfExists('personality_test');
    }
};
