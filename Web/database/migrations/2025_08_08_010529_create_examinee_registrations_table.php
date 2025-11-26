<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('examinee_registrations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('examinee_id'); // Reference to examinee table
            $table->string('school_year')->nullable(); // Academic year (e.g., "2024-2025")
            $table->enum('semester', ['1st', '2nd', 'Summer'])->nullable(); // Academic semester
            $table->date('registration_date');
            $table->date('assigned_exam_date')->nullable(); // Date assigned for exam
            $table->enum('assigned_session', ['morning', 'afternoon'])->nullable(); // Session assigned for exam
            $table->enum('status', ['registered', 'assigned', 'completed', 'finished', 'cancelled', 'archived'])->default('registered');
            $table->timestamps();

            $table->foreign('examinee_id')->references('id')->on('examinee')->onDelete('cascade')->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examinee_registrations');
    }
};
