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
        Schema::create('exam_registration_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('registration_open')->default(false);
            $table->string('academic_year')->nullable(); // e.g., "2025-2026"
            $table->enum('semester', ['1st', '2nd', 'Summer'])->nullable(); // Current semester
            $table->date('exam_start_date')->nullable();
            $table->date('exam_end_date')->nullable();
            $table->integer('students_per_day')->default(40);
            $table->text('registration_message')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_registration_settings');
    }
};
