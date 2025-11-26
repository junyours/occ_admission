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
        Schema::create('personality_types', function (Blueprint $table) {
            $table->string('type', 4)->primary(); // INFP, ESTJ, etc.
            $table->string('title'); // Optional: e.g., "The Mediator", "The Commander"
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personality_types');
    }
};
