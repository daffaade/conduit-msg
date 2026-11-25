<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\BackupStorageController;
use App\Http\Controllers\Api\MessageController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Endpoints (Autentikasi & Sinkronisasi Waktu)
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/server-time', [AuthController::class, 'serverTime']);

/*
|--------------------------------------------------------------------------
| PC Backup Storage Endpoints (Dijalankan di PC Pengelola Backup Storage)
|--------------------------------------------------------------------------
*/
Route::post('/trigger-backup', [BackupStorageController::class, 'triggerBackup']);
Route::post('/restore', [BackupStorageController::class, 'restore']);

/*
|--------------------------------------------------------------------------
| Protected Application Server Endpoints (Wajib Bearer Token Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function (): void {
    // Autentikasi & Profil Pribadi
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::get('/users/{userId}', [AuthController::class, 'showProfile'])->whereNumber('userId');

    // Pertukaran Pesan & Kontak (Anti-IDOR)
    Route::get('/contacts', [MessageController::class, 'contacts']);
    Route::get('/messages/{userId}', [MessageController::class, 'index'])->whereNumber('userId');
    Route::post('/messages', [MessageController::class, 'store']);

    // Backup & Riwayat Backup User
    Route::post('/backup/request', [BackupController::class, 'requestBackup']);
    Route::get('/backup/logs', [BackupController::class, 'logs']);
});
