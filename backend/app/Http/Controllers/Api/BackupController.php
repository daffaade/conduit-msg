<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BackupLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Throwable;

class BackupController extends Controller
{
    /**
     * FR-05: Return backup logs requested by the authenticated user only.
     */
    public function logs(Request $request): JsonResponse
    {
        $logs = BackupLog::query()
            ->where('requested_by', $request->user()->id)
            ->orderByDesc('backed_up_at')
            ->orderByDesc('id')
            ->get(['id', 'requested_by', 'file_name', 'status', 'backed_up_at']);

        return response()->json([
            'logs' => $logs,
        ]);
    }

    /**
     * FR-05: Forward HTTP POST request to the Desktop Backup Storage PC and record log.
     */
    public function requestBackup(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $backupServerUrl = rtrim((string) env('BACKUP_SERVER_URL', 'http://127.0.0.1:8001'), '/');
        $timeout = (int) env('BACKUP_HTTP_TIMEOUT', 30);
        $secret = (string) env('BACKUP_SHARED_SECRET', '');

        try {
            $http = Http::timeout($timeout)->acceptJson();
            if ($secret !== '') {
                $http = $http->withHeaders(['X-Backup-Secret' => $secret]);
            }

            $response = $http->post("{$backupServerUrl}/api/trigger-backup", [
                'requested_by' => $userId,
            ]);

            if (! $response->successful()) {
                throw new \RuntimeException($response->json('message') ?? 'Backup service returned error.');
            }

            $fileName = (string) ($response->json('file_name') ?? 'backup_unknown.json');

            $logId = DB::table('backup_logs')->insertGetId([
                'requested_by' => $userId,
                'file_name' => $fileName,
                'status' => 'SUCCESS',
                'backed_up_at' => DB::raw('CURRENT_TIMESTAMP'),
            ]);

            $log = BackupLog::find($logId);

            return response()->json([
                'message' => 'Backup berhasil disimpan ke Desktop Backup Storage.',
                'file_name' => $fileName,
                'log' => $log,
            ], 201);
        } catch (Throwable $e) {
            $logId = DB::table('backup_logs')->insertGetId([
                'requested_by' => $userId,
                'file_name' => 'failed_backup.json',
                'status' => 'FAILED',
                'backed_up_at' => DB::raw('CURRENT_TIMESTAMP'),
            ]);

            return response()->json([
                'message' => 'Gagal menghubungi PC Backup Storage: '.$e->getMessage(),
                'log' => BackupLog::find($logId),
            ], 502);
        }
    }

    /**
     * PC Backup Storage endpoint: pull snapshot from Cloud DB and save locally (non-Google Drive).
     */
    public function triggerBackup(Request $request): JsonResponse
    {
        $secret = (string) env('BACKUP_SHARED_SECRET', '');
        if ($secret !== '' && $request->header('X-Backup-Secret') !== $secret) {
            return response()->json(['message' => 'Unauthorized backup trigger.'], 403);
        }

        $storagePath = trim((string) env('BACKUP_STORAGE_PATH', ''));
        if ($storagePath === '') {
            $storagePath = storage_path('app/backup_storage');
        }

        File::ensureDirectoryExists($storagePath);

        $row = DB::selectOne('SELECT NOW() AS server_time');
        $serverTime = (string) ($row->server_time ?? now()->toIso8601String());
        $stamp = date('Ymd_His', strtotime($serverTime) ?: time());
        $fileName = "backup_{$stamp}.json";
        $fullPath = rtrim($storagePath, '/\\').DIRECTORY_SEPARATOR.$fileName;

        $snapshot = [
            'cloud_time' => $serverTime,
            'users' => DB::table('users')->orderBy('id')->get()->all(),
            'messages' => DB::table('messages')->orderBy('id')->get()->all(),
            'backup_logs' => DB::table('backup_logs')->orderBy('id')->get()->all(),
        ];

        File::put($fullPath, json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return response()->json([
            'message' => 'Snapshot Cloud DB berhasil disimpan secara lokal.',
            'file_name' => $fileName,
            'saved_path' => $fullPath,
            'cloud_time' => $serverTime,
        ], 201);
    }

    /**
     * FR-06: Restore latest local backup file from Desktop Backup Storage back to Cloud DB.
     */
    public function restore(Request $request): JsonResponse
    {
        $secret = (string) env('BACKUP_SHARED_SECRET', '');
        if ($secret !== '' && $request->header('X-Backup-Secret') !== $secret) {
            return response()->json(['message' => 'Unauthorized restore request.'], 403);
        }

        $storagePath = trim((string) env('BACKUP_STORAGE_PATH', ''));
        if ($storagePath === '') {
            $storagePath = storage_path('app/backup_storage');
        }

        if (! File::isDirectory($storagePath)) {
            return response()->json(['message' => 'Direktori backup lokal tidak ditemukan.'], 404);
        }

        $files = collect(File::files($storagePath))
            ->filter(fn ($f) => strtolower($f->getExtension()) === 'json')
            ->sortByDesc(fn ($f) => $f->getFilename())
            ->values();

        if ($files->isEmpty()) {
            return response()->json(['message' => 'Tidak ada file backup (.json) yang tersedia.'], 404);
        }

        $latestFile = $files->first();
        $payload = json_decode(File::get($latestFile->getPathname()), true);

        if (! is_array($payload) || ! isset($payload['users'], $payload['messages'])) {
            return response()->json(['message' => 'Format file backup tidak valid.'], 422);
        }

        DB::transaction(function () use ($payload) {
            foreach ($payload['users'] as $user) {
                DB::table('users')->updateOrInsert(['id' => $user['id']], $user);
            }
            foreach ($payload['messages'] as $msg) {
                DB::table('messages')->updateOrInsert(['id' => $msg['id']], $msg);
            }
            if (isset($payload['backup_logs']) && is_array($payload['backup_logs'])) {
                foreach ($payload['backup_logs'] as $log) {
                    DB::table('backup_logs')->updateOrInsert(['id' => $log['id']], $log);
                }
            }
        });

        return response()->json([
            'message' => 'Restore data ke Cloud Database berhasil.',
            'restored_file' => $latestFile->getFilename(),
            'counts' => [
                'users' => count($payload['users']),
                'messages' => count($payload['messages']),
                'backup_logs' => count($payload['backup_logs'] ?? []),
            ],
        ]);
    }
}
