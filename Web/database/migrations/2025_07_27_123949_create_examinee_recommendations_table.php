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
        Schema::create('examinee_recommendations', function (Blueprint $table) {
            $table->id();
        
            // Link to the examinee (optional but good to have)
            $table->unsignedBigInteger('examinee_id');
        
            // Link to exam results
            $table->unsignedBigInteger('exam_result_id');
        
            // Link to personality test results
            $table->unsignedBigInteger('personality_result_id');
        
            // Final recommended course
            $table->unsignedBigInteger('recommended_course_id');
        
            $table->timestamps();
        
            // Foreign key constraints
            $table->foreign('examinee_id')
                ->references('id')->on('examinee')
                ->onDelete('cascade');
        
            $table->foreign('exam_result_id')
                ->references('resultId')->on('exam_results')
                ->onDelete('cascade');
        
            $table->foreign('personality_result_id')
                ->references('id')->on('personality_test_results')
                ->onDelete('cascade');
        
            $table->foreign('recommended_course_id')
                ->references('id')->on('courses')
                ->onDelete('cascade');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examinee_recommendations');
    }
};
