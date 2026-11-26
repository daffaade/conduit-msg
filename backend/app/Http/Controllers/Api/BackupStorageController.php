<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BackupLog;
use App\Models\User;
use App\Support\CloudTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Throwable;

/**
 * BackupStorageController — PC Backup Storage side (runs on the designated backup PC).
 *
 * Responsible for:
 *  - POST /api/trigger-backup  → Pull data from Cloud DB and write .json file to local disk (FR-05).
 *  - POST /api/restore         → Read latest local .json and restore it back to Cloud DB (FR-06).
 *
 * These endpoints should ONLY be accessible from within the local network / VPN
 * and are protected by X-Backup-Secret header when configured.
 */
class BackupStorageController extends Controller
{
    /**
     * POST /api/trigger-backup
     *
     * Pulls users, messages, and backup_logs from Cloud DB and writes a .json snapshot
     * to the local PC disk. Named using Cloud DB timestamp (FR-04).
     */
    public function triggerBackup(Request $request): JsonResponse
    {
        if ($unauthorized = $this->verifyBackupSecret($request)) {
            return $unauthorized;
        }

        $validated = $request->validate([
            'requested_by' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $requestedBy = $validated['requested_by']
            ?? $request->user('sanctum')?->id
            ?? User::query()->orderBy('id')->value('id');

        $cloudCarbon = CloudTime::carbon();
        $cloudIso    = $cloudCarbon->toIso8601String();
        $backupDir   = $this->resolveBackupDirectory();
        $fileName    = $this->generateFileName($backupDir, $cloudCarbon);
        $filePath    = $backupDir . DIRECTORY_SEPARATOR . $fileName;

        try {
            File::ensureDirectoryExists($backupDir);

            $users      = $this->fetchTable('users');
            $messages   = $this->fetchTable('messages');
            $backupLogs = $this->fetchTable('backup_logs');

            // Write snapshot before recording log to avoid partial state.
            $snapshot = $this->buildSnapshot($fileName, $cloudIso, $requestedBy, $users, $messages, $backupLogs);
            File::put($filePath, json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            $backupLog = null;
            if ($requestedBy !== null) {
                $backupLog  = BackupLog::create([
                    'requested_by' => $requestedBy,
                    'file_name'    => $fileName,
                    'status'       => 'SUCCESS',
                ]);
                $backupLog->refresh();

                // Re-write snapshot so the new log entry is included in the file.
                $backupLogs = $this->fetchTable('backup_logs');
                $snapshot   = $this->buildSnapshot($fileName, $cloudIso, $requestedBy, $users, $messages, $backupLogs);
                File::put($filePath, json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            }

            return response()->json([
                'message'    => 'Backup data dari Cloud Database berhasil disimpan ke penyimpanan lokal PC.',
                'file_name'  => $fileName,
                'file_path'  => $filePath,
                'counts'     => $snapshot['meta']['counts'],
                'backup_log' => $backupLog,
                'cloud_time' => $cloudIso,
            ], 201);
        } catch (Throwable $e) {
            $failedLog = null;
            if ($requestedBy !== null) {
                $failedLog = BackupLog::create([
                    'requested_by' => $requestedBy,
                    'file_name'    => $fileName,
                    'status'       => 'FAILED',
                ]);
                $failedLog->refresh();
            }

            return response()->json([
                'message'    => 'Gagal menyimpan file backup di PC Backup Storage: ' . $e->getMessage(),
                'backup_log' => $failedLog,
                'cloud_time' => CloudTime::now(),
            ], 500);
        }
    }

    /**
     * POST /api/restore
     *
     * Reads the latest (or a specified) .json backup file from local disk and
     * restores users, messages, and backup_logs into Cloud DB (FR-06).
     */
    public function restore(Request $request): JsonResponse
    {
        if ($unauthorized = $this->verifyBackupSecret($request)) {
            return $unauthorized;
        }

        $validated = $request->validate([
            'file_name' => ['nullable', 'string'],
        ]);

        $backupDir = $this->resolveBackupDirectory();

        if (! File::isDirectory($backupDir)) {
            return response()->json([
                'message' => 'Direktori penyimpanan backup lokal belum ditemukan.',
            ], 404);
        }

        $targetFile = $this->resolveTargetFile($backupDir, $validated['file_name'] ?? null);

        if ($targetFile === null) {
            return response()->json([
                'message' => 'Belum ada file backup lokal (.json) yang tersedia untuk dipulihkan.',
            ], 404);
        }

        if (is_string($targetFile) && ! File::exists($targetFile)) {
            return response()->json([
                'message' => "File backup '" . basename($targetFile) . "' tidak ditemukan di PC Backup Storage.",
            ], 404);
        }

        $decoded = json_decode(File::get($targetFile), true);

        if (
            ! is_array($decoded)
            || ! isset($decoded['tables'])
            || ! is_array($decoded['tables']['users'] ?? null)
            || ! is_array($decoded['tables']['messages'] ?? null)
            || ! is_array($decoded['tables']['backup_logs'] ?? null)
        ) {
            return response()->json([
                'message' => 'Format file backup tidak valid atau rusak.',
            ], 422);
        }

        $users      = $decoded['tables']['users'];
        $messages   = $decoded['tables']['messages'];
        $backupLogs = $decoded['tables']['backup_logs'];

        DB::transaction(function () use ($users, $messages, $backupLogs): void {
            // Delete child tables first to respect foreign key constraints.
            DB::table('backup_logs')->delete();
            DB::table('messages')->delete();
            DB::table('users')->delete();

            foreach (array_chunk($users, 500) as $chunk) {
                DB::table('users')->insert($chunk);
            }
            foreach (array_chunk($messages, 500) as $chunk) {
                DB::table('messages')->insert($chunk);
            }
            foreach (array_chunk($backupLogs, 500) as $chunk) {
                DB::table('backup_logs')->insert($chunk);
            }

            // Re-sync PostgreSQL sequences so the next INSERT doesn't collide with restored IDs.
            if (DB::getDriverName() === 'pgsql') {
                foreach (['users', 'messages', 'backup_logs'] as $table) {
                    DB::statement(
                        "SELECT setval(pg_get_serial_sequence('{$table}', 'id'), COALESCE((SELECT MAX(id) FROM {$table}), 1), (SELECT COUNT(*) > 0 FROM {$table}))"
                    );
                }
            }
        });

        return response()->json([
            'message'         => 'Data Cloud Database berhasil dipulihkan dari PC Backup Storage.',
            'restored_from'   => basename($targetFile),
            'file_path'       => $targetFile,
            'restored_counts' => [
                'users'       => count($users),
                'messages'    => count($messages),
                'backup_logs' => count($backupLogs),
            ],
            'cloud_time' => CloudTime::now(),
        ]);
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    private function resolveBackupDirectory(): string
    {
        $configured = trim((string) config('services.backup.storage_path', ''));

        return $configured !== '' ? rtrim($configured, '\\/') : storage_path('app/backups');
    }

    private function generateFileName(string $dir, \Illuminate\Support\Carbon $carbon): string
    {
        $name = 'backup_' . $carbon->format('Ymd_His') . '.json';
        if ($dir !== '' && File::exists($dir . DIRECTORY_SEPARATOR . $name)) {
            $name = 'backup_' . $carbon->format('Ymd_His') . '_' . substr((string) microtime(true), -4) . '.json';
        }

        return $name;
    }

    private function resolveTargetFile(string $backupDir, ?string $fileName): ?string
    {
        if ($fileName !== null && $fileName !== '') {
            return $backupDir . DIRECTORY_SEPARATOR . basename($fileName);
        }

        $files = File::glob($backupDir . DIRECTORY_SEPARATOR . 'backup_*.json') ?: [];
        if ($files === []) {
            return null;
        }

        usort($files, fn (string $a, string $b): int => filemtime($b) <=> filemtime($a) ?: strcmp(basename($b), basename($a)));

        return $files[0];
    }

    private function verifyBackupSecret(Request $request): ?JsonResponse
    {
        $expected = (string) config('services.backup.secret', '');
        if ($expected === '') {
            return null;
        }

        $provided = (string) $request->header('X-Backup-Secret', '');
        if (! hash_equals($expected, $provided)) {
            return response()->json([
                'message' => 'Akses ke layanan Backup Storage ditolak (X-Backup-Secret tidak sesuai).',
            ], 403);
        }

        return null;
    }

    /** @return array<int, array<string, mixed>> */
    private function fetchTable(string $table): array
    {
        return DB::table($table)->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $users
     * @param  array<int, array<string, mixed>>  $messages
     * @param  array<int, array<string, mixed>>  $backupLogs
     * @return array<string, mixed>
     */
    private function buildSnapshot(
        string $fileName,
        string $cloudIso,
        int|string|null $requestedBy,
        array $users,
        array $messages,
        array $backupLogs
    ): array {
        return [
            'meta' => [
                'application'       => 'ConduitMsg',
                'file_name'         => $fileName,
                'backed_up_at_cloud' => $cloudIso,
                'requested_by'      => $requestedBy,
                'counts'            => [
                    'users'       => count($users),
                    'messages'    => count($messages),
                    'backup_logs' => count($backupLogs),
                ],
            ],
            'tables' => [
                'users'       => $users,
                'messages'    => $messages,
                'backup_logs' => $backupLogs,
            ],
        ];
    }
}
