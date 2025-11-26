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
        Schema::create('department_exam_bank', function (Blueprint $table) {
            $table->id('questionId');
            $table->text('question');
            $table->text('question_formatted')->nullable();
            $table->string('option1');
            $table->text('option1_formatted')->nullable();
            $table->longText('option1_image')->nullable();
            $table->string('option2')->nullable();
            $table->text('option2_formatted')->nullable(); 
            $table->longText('option2_image')->nullable();
            $table->string('option3')->nullable();
            $table->text('option3_formatted')->nullable(); 
            $table->longText('option3_image')->nullable();
            $table->string('option4')->nullable();
            $table->text('option4_formatted')->nullable(); 
            $table->longText('option4_image')->nullable();
            $table->string('option5')->nullable();
            $table->text('option5_formatted')->nullable(); 
            $table->longText('option5_image')->nullable();
            $table->string('correct_answer' , 1);   
            $table->string('category');
            $table->string('department'); // BSIT, BSBA, EDUC
            $table->string('status')->default(1); // 1: not deleted or show, 0: hidden of "deleted"
            $table->longText('image')->nullable(); // Store image data as base64 or binary
            $table->longText('direction')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('department_exam_bank');
    }
};
