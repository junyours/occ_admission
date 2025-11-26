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
        Schema::create('exam_schedules', function (Blueprint $table) {
            $table->id();
            $table->date('exam_date');
            $table->enum('session', ['morning', 'afternoon'])->default('morning'); // Session type
            $table->time('start_time')->default('08:00:00');
            $table->time('end_time')->default('11:00:00');
            $table->integer('max_capacity')->default(50); // Half capacity per session
            $table->integer('current_registrations')->default(0);
            $table->enum('status', ['open', 'full', 'closed'])->default('open');
            // Unique exam access code assigned per date (shared across sessions)
            $table->string('exam_code')->nullable();
            $table->timestamps();
            
            // Ensure unique combination of date and session
            $table->unique(['exam_date', 'session']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_schedules');
    }
};
