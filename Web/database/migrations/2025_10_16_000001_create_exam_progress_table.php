<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_progress', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('examinee_id');
            $table->string('exam_ref_no', 64);
            $table->unsignedBigInteger('question_id');
            $table->string('selected_answer', 255)->nullable();
            $table->unsignedInteger('remaining_seconds')->default(0);
            $table->timestamps();

            $table->unique(['examinee_id', 'exam_ref_no', 'question_id'], 'uq_examinee_exam_question');
            $table->index(['examinee_id', 'exam_ref_no'], 'idx_examinee_exam');
            $table->index('exam_ref_no', 'idx_exam_ref');
            $table->index('examinee_id', 'idx_examinee');

            // Uncomment if you want FK now; otherwise keep it simple to avoid migration issues
            $table->foreign('examinee_id')->references('id')->on('examinee')->onDelete('cascade')->onUpdate('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_progress');
    }
};


