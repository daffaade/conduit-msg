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
use Illuminate\Support\Facades\Http;
use Throwable;

class BackupController extends Controller
{
    /**
     * POST /api/backup/request — Laravel lokal meneruskan request HTTP ke PC Backup Storage.
     */
    public function requestBackup(Request $request): JsonResponse
    {
        $user = $request->user();
        $backupServerUrl = rtrim((string) config('services.backup.server_url'), '/');

        if ($backupServerUrl === '') {
            $failedLog = BackupLog::create([
                'requested_by' => $user->id,
                'file_name' => 'CONFIG_MISSING',
                'status' => 'FAILED',
            ]);
            $failedLog->refresh();

            return response()->json([
                'message' => 'BACKUP_SERVER_URL belum dikonfigurasi pada file .env Application Server.',
                'backup_log' => $failedLog,
                'cloud_time' => CloudTime::now(),
            ], 503);
        }

        $targetEndpoint = str_ends_with($backupServerUrl, '/api/trigger-backup')
            ? $backupServerUrl
            : $backupServerUrl.'/api/trigger-backup';

        $headers = [];
        $sharedSecret = (string) config('services.backup.secret', '');
        if ($sharedSecret !== '') {
            $headers['X-Backup-Secret'] = $sharedSecret;
        }

        try {
            $response = Http::timeout((int) config('services.backup.timeout', 30))
                ->acceptJson()
                ->withHeaders($headers)
                ->post($targetEndpoint, [
                    'requested_by' => $user->id,
                    'requested_by_username' => $user->username,
                ]);

            $payload = $response->json() ?? [];

            if ($response->successful()) {
                return response()->json([
                    'message' => $payload['message'] ?? 'Backup berhasil disimpan di PC Backup Storage.',
                    'file_name' => $payload['file_name'] ?? null,
                    'backup_log' => $payload['backup_log'] ?? null,
                    'counts' => $payload['counts'] ?? null,
                    'cloud_time' => $payload['cloud_time'] ?? CloudTime::now(),
                ]);
            }

            // Jika server backup belum sempat mencatat log kegagalan, catat dari sisi App Server.
            $backupLog = $payload['backup_log'] ?? null;
            if (! $backupLog) {
                $logged = BackupLog::create([
                    'requested_by' => $user->id,
                    'file_name' => 'BACKUP_FAILED',
                    'status' => 'FAILED',
                ]);
                $logged->refresh();
                $backupLog = $logged;
            }

            return response()->json([
                'message' => $payload['message'] ?? 'PC Backup Storage gagal memproses permintaan backup.',
                'backup_log' => $backupLog,
                'cloud_time' => CloudTime::now(),
            ], 502);
        } catch (Throwable $e) {
            $failedLog = BackupLog::create([
                'requested_by' => $user->id,
                'file_name' => 'UNREACHABLE',
                'status' => 'FAILED',
            ]);
            $failedLog->refresh();

            return response()->json([
                'message' => 'Gagal menghubungi PC Backup Storage melalui HTTP: '.$e->getMessage(),
                'backup_log' => $failedLog,
                'cloud_time' => CloudTime::now(),
            ], 502);
        }
    }

    /**
     * GET /api/backup/logs — Mengambil riwayat backup yang pernah diminta oleh user yang sedang login.
     */
    public function logs(Request $request): JsonResponse
    {
        $logs = BackupLog::query()
            ->where('requested_by', $request->user()->id)
            ->orderBy('backed_up_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'logs' => $logs,
            'data' => $logs,
            'cloud_time' => CloudTime::now(),
        ]);
    }

    /**
     * POST /api/trigger-backup — (Di PC Backup Storage) Menarik data Cloud DB dan menulis file .json ke disk lokal PC.
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
        $cloudIso = $cloudCarbon->toIso8601String();
        $backupDir = $this->resolveBackupDirectory();

        $fileName = 'backup_'.$cloudCarbon->format('Ymd_His').'.json';
        if (File::exists($backupDir.DIRECTORY_SEPARATOR.$fileName)) {
            $fileName = 'backup_'.$cloudCarbon->format('Ymd_His').'_'.substr((string) microtime(true), -4).'.json';
        }
        $filePath = $backupDir.DIRECTORY_SEPARATOR.$fileName;

        try {
            File::ensureDirectoryExists($backupDir);

            $users = DB::table('users')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
            $messages = DB::table('messages')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
            $backupLogs = DB::table('backup_logs')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();

            // Uji penulisan ke disk lokal PC terlebih dahulu sebelum mencatat status SUCCESS.
            $snapshot = $this->buildBackupSnapshot($fileName, $cloudIso, $requestedBy, $users, $messages, $backupLogs);
            File::put($filePath, json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            $backupLog = null;
            if ($requestedBy !== null) {
                $backupLog = BackupLog::create([
                    'requested_by' => $requestedBy,
                    'file_name' => $fileName,
                    'status' => 'SUCCESS',
                ]);
                $backupLog->refresh();

                // Perbarui snapshot agar log backup terbaru juga ikut tersimpan di dalam file cadangan.
                $backupLogs = DB::table('backup_logs')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
                $snapshot = $this->buildBackupSnapshot($fileName, $cloudIso, $requestedBy, $users, $messages, $backupLogs);
                File::put($filePath, json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            }

            return response()->json([
                'message' => 'Backup data dari Cloud Database berhasil disimpan ke penyimpanan lokal PC.',
                'file_name' => $fileName,
                'file_path' => $filePath,
                'counts' => $snapshot['meta']['counts'],
                'backup_log' => $backupLog,
                'cloud_time' => $cloudIso,
            ], 201);
        } catch (Throwable $e) {
            $failedLog = null;
            if ($requestedBy !== null) {
                $failedLog = BackupLog::create([
                    'requested_by' => $requestedBy,
                    'file_name' => $fileName,
                    'status' => 'FAILED',
                ]);
                $failedLog->refresh();
            }

            return response()->json([
                'message' => 'Gagal menyimpan file backup di PC Backup Storage: '.$e->getMessage(),
                'backup_log' => $failedLog,
                'cloud_time' => CloudTime::now(),
            ], 500);
        }
    }

    /**
     * POST /api/restore — (Di PC Backup Storage) Membaca file backup terbaru dari disk lokal dan memulihkannya ke Cloud DB.
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

        if (! empty($validated['file_name'])) {
            $safeName = basename($validated['file_name']);
            $targetFile = $backupDir.DIRECTORY_SEPARATOR.$safeName;

            if (! File::exists($targetFile)) {
                return response()->json([
                    'message' => "File backup '{$safeName}' tidak ditemukan di PC Backup Storage.",
                ], 404);
            }
        } else {
            $files = File::glob($backupDir.DIRECTORY_SEPARATOR.'backup_*.json') ?: [];

            if ($files === []) {
                return response()->json([
                    'message' => 'Belum ada file backup lokal (.json) yang tersedia untuk dipulihkan.',
                ], 404);
            }

            usort($files, function (string $a, string $b): int {
                $mtimeComparison = filemtime($b) <=> filemtime($a);

                return $mtimeComparison !== 0 ? $mtimeComparison : strcmp(basename($b), basename($a));
            });

            $targetFile = $files[0];
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

        $users = $decoded['tables']['users'];
        $messages = $decoded['tables']['messages'];
        $backupLogs = $decoded['tables']['backup_logs'];

        DB::transaction(function () use ($users, $messages, $backupLogs): void {
            // Hapus dari tabel anak ke tabel induk agar aman terhadap foreign key constraint.
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

            // Sinkronkan ulang sequence PostgreSQL (Supabase) agar insert berikutnya tidak bentrok ID.
            if (DB::getDriverName() === 'pgsql') {
                foreach (['users', 'messages', 'backup_logs'] as $table) {
                    DB::statement(
                        "SELECT setval(pg_get_serial_sequence('{$table}', 'id'), COALESCE((SELECT MAX(id) FROM {$table}), 1), (SELECT COUNT(*) > 0 FROM {$table}))"
                    );
                }
            }
        });

        return response()->json([
            'message' => 'Data Cloud Database berhasil dipulihkan dari PC Backup Storage.',
            'restored_from' => basename($targetFile),
            'file_path' => $targetFile,
            'restored_counts' => [
                'users' => count($users),
                'messages' => count($messages),
                'backup_logs' => count($backupLogs),
            ],
            'cloud_time' => CloudTime::now(),
        ]);
    }

    private function resolveBackupDirectory(): string
    {
        $configured = trim((string) config('services.backup.storage_path', ''));

        return $configured !== '' ? rtrim($configured, "\\/") : storage_path('app/backups');
    }

    private function verifyBackupSecret(Request $request): ?JsonResponse
    {
        $expectedSecret = (string) config('services.backup.secret', '');
        if ($expectedSecret === '') {
            return null;
        }

        $providedSecret = (string) $request->header('X-Backup-Secret', '');
        if (! hash_equals($expectedSecret, $providedSecret)) {
            return response()->json([
                'message' => 'Akses ke layanan Backup Storage ditolak (X-Backup-Secret tidak sesuai).',
            ], 403);
        }

        return null;
    }

    /**
     * @param  array<int, array<string, mixed>>  $users
     * @param  array<int, array<string, mixed>>  $messages
     * @param  array<int, array<string, mixed>>  $backupLogs
     * @return array<string, mixed>
     */
    private function buildBackupSnapshot(
        string $fileName,
        string $cloudIso,
        int|string|null $requestedBy,
        array $users,
        array $messages,
        array $backupLogs
    ): array {
        return [
            'meta' => [
                'application' => 'ConduitMsg',
                'file_name' => $fileName,
                'backed_up_at_cloud' => $cloudIso,
                'requested_by' => $requestedBy,
                'counts' => [
                    'users' => count($users),
                    'messages' => count($messages),
                    'backup_logs' => count($backupLogs),
                ],
            ],
            'tables' => [
                'users' => $users,
                'messages' => $messages,
                'backup_logs' => $backupLogs,
            ],
        ];
    }
}
