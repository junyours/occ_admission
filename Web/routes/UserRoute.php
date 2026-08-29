<?php

use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::post('/search-user', [UserController::class, 'searchUser'])->name('search-user');
    Route::post('/change-password', [UserController::class, 'changePassword'])->name('change-password');
    Route::get('/users', [UserController::class, 'viewUsers'])->name('users');
});
