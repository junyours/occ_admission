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
        Schema::create('examinee', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('accountId');
            $table->string('lname'); // Last Name
            $table->string('fname'); // First Name
            $table->string('mname')->nullable(); // Middle Name (can be null)
            $table->string('gender' , 20);
            $table->integer('age');
            $table->string('school_name');
            $table->string('parent_name');
            $table->bigInteger('parent_phone');
            $table->bigInteger('phone');
            $table->string('address');
            $table->longText('Profile')->nullable();
            $table->string('preferred_course')->nullable();
            $table->timestamps();

            $table->foreign('accountId')->references('id')->on('users')->onDelete('cascade')->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examinee');
    }
};
