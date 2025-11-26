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
        Schema::create('personality_test_results', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('examineeId');

            $table->enum('EI', ['E', 'I']); // Extraversion / Introversion
            $table->enum('SN', ['S', 'N']); // Sensing / Intuition
            $table->enum('TF', ['T', 'F']); // Thinking / Feeling
            $table->enum('JP', ['J', 'P']); // Judging / Perceiving
            // Removed 'personality_type' field to fix 3NF violation - can be derived from EI, SN, TF, JP combination
           
            $table->timestamps();

            $table->foreign('examineeId')->references('id')->on('examinee')->onDelete('cascade');
            // Removed foreign key constraint for personality_type since the field was removed
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personality_test_results');
    }
};
