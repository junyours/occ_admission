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
        Schema::create('evaluator', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('accountId');
            $table->string('name');
            $table->string('Department'); // BSIT, BSBA, EDUC
            $table->timestamps();

            $table->foreign('accountId')->references('id')->on('users')->onDelete('cascade')->onUpdate('cascade');  
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluator');
    }
};
