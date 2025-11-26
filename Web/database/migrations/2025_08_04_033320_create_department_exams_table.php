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
        Schema::create('department_exams', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('evaluator_id'); // FK to evaluators/users
            $table->string('exam_ref_no')->unique();
            $table->string('exam_title');
            $table->unsignedInteger('time_limit')->default(60);
            $table->integer('passing_score')->default(0);
            $table->timestamps();
            $table->string('status')->default(1);
            
            $table->foreign('evaluator_id')->references('id')->on('evaluator')->onDelete('cascade')->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('department_exams');
    }
};
