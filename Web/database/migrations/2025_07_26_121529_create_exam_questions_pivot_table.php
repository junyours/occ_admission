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
        Schema::create('exam_questions_pivot', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('examId');
            $table->unsignedBigInteger('questionId');
            $table->timestamps();

            $table->foreign('examId')->references('examId')->on('exams')->onDelete('cascade')->onUpdate('cascade');
            $table->foreign('questionId')->references('questionId')->on('question_bank')->onDelete('cascade')->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_questions_pivot');
    }
};
