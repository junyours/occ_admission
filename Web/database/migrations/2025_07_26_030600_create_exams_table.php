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
        Schema::create('exams', function (Blueprint $table) {
            $table->unsignedBigInteger('examId')->primary();
            $table->string('exam-ref-no');
            // Removed 'questions' field to fix 1NF violation - questions linked via exam_questions_pivot junction table
            $table->string('time_limit');
            $table->enum('status', ['active', 'inactive', 'completed'])->default('active');
            $table->boolean('include_personality_test')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exams');
    }
};
