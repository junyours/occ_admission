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
        Schema::create('course_descriptions', function (Blueprint $table) {
            $table->id();
            $table->string('course_name'); // The course name pattern
            $table->text('description'); // The description for this course
            $table->boolean('is_manual')->default(false); // Whether this was manually entered
            $table->timestamps();
            
            // Index for better performance
            $table->index('course_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('course_descriptions');
    }
};
