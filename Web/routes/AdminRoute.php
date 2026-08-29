<?php

use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('/manage-password', [UserController::class, 'managePassword'])->name('admin.manage-password');
});
