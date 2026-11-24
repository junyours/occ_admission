<?php

use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\ImpersonationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:admin'])->group(function () {
    Route::get('/manage-password', [UserController::class, 'managePassword'])->name('admin.manage-password');

    // Super admin "sign in as"
    Route::get('/impersonate', [ImpersonationController::class, 'index'])->name('admin.impersonate');
    Route::post('/impersonate', [ImpersonationController::class, 'start'])->name('admin.impersonate.start');
});

// Used while signed in as the other (non-admin) user, so it can't require role:admin.
// The controller checks that the session's original user is an admin.
Route::middleware(['auth'])->group(function () {
    Route::post('/impersonate/stop', [ImpersonationController::class, 'stop'])->name('admin.impersonate.stop');
});
