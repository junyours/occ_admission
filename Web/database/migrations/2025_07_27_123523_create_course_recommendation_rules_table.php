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
        Schema::create('course_recommendation_rules', function (Blueprint $table) {
            $table->id();
            $table->string('personality_type', 4); // FK to personality_types.type
            $table->unsignedInteger('min_score');  // Inclusive minimum score
            $table->unsignedInteger('max_score');  // Inclusive maximum score
            $table->unsignedBigInteger('recommended_course_id'); // FK to courses.id
            $table->string('academic_year' , 20 )->nullable();
            $table->timestamps();
        
            $table->foreign('personality_type')->references('type')->on('personality_types')->onDelete('cascade');
            $table->foreign('recommended_course_id')->references('id')->on('courses')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('course_recommendation_rules');
    }
};
