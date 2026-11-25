<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\MessageController;
use Illuminate\Support\Facades\Route;

// Public Auth Endpoints
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Desktop Backup Storage Service Endpoints (HTTP)
Route::post('/trigger-backup', [BackupController::class, 'triggerBackup']);
Route::post('/restore', [BackupController::class, 'restore']);

// Protected Endpoints (Laravel Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/contacts', [ContactController::class, 'index']);
    Route::get('/messages/{userId}', [MessageController::class, 'index']);
    Route::post('/messages', [MessageController::class, 'store']);

    Route::post('/backup/request', [BackupController::class, 'requestBackup']);
    Route::get('/backup/logs', [BackupController::class, 'logs']);
});
