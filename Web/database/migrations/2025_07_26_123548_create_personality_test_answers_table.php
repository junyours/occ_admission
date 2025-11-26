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
        Schema::create('personality_test_answers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('examineeId');
            $table->unsignedBigInteger('questionId');
            $table->string('selected_answer');
            $table->string('chosen_side');
            $table->timestamps();

            $table->foreign('examineeId')->references('id')->on('examinee')->onDelete('cascade');
            $table->foreign('questionId')->references('id')->on('personality_test')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personality_test_answers');
    }
};
