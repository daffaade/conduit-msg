<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BackupLog;
use App\Support\CloudTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * BackupController — Application Server side (runs on each user's laptop).
 *
 * Responsible for:
 *  - POST /api/backup/request  → Forward backup request to the PC Backup Storage via HTTP (FR-05).
 *  - GET  /api/backup/logs     → Return this user's own backup history (FR-02).
 *
 * The actual backup file writing and restore logic lives in BackupStorageController,
 * which runs on the designated PC Backup Storage machine.
 */
class BackupController extends Controller
{
    /**
     * POST /api/backup/request
     *
     * Forwards an HTTP POST to the PC Backup Storage service.
     * Records a FAILED log locally if the PC is unreachable.
     */
    public function requestBackup(Request $request): JsonResponse
    {
        $user            = $request->user();
        $backupServerUrl = rtrim((string) config('services.backup.server_url'), '/');

        if ($backupServerUrl === '') {
            $log = $this->createLog($user->id, 'CONFIG_MISSING', 'FAILED');

            return response()->json([
                'message'    => 'BACKUP_SERVER_URL belum dikonfigurasi di .env Application Server.',
                'backup_log' => $log,
                'cloud_time' => CloudTime::now(),
            ], 503);
        }

        $endpoint = str_ends_with($backupServerUrl, '/api/trigger-backup')
            ? $backupServerUrl
            : $backupServerUrl . '/api/trigger-backup';

        $headers = [];
        $secret  = (string) config('services.backup.secret', '');
        if ($secret !== '') {
            $headers['X-Backup-Secret'] = $secret;
        }

        try {
            $response = Http::timeout((int) config('services.backup.timeout', 30))
                ->acceptJson()
                ->withHeaders($headers)
                ->post($endpoint, [
                    'requested_by'          => $user->id,
                    'requested_by_username' => $user->username,
                ]);

            $payload = $response->json() ?? [];

            if ($response->successful()) {
                return response()->json([
                    'message'    => $payload['message'] ?? 'Backup berhasil disimpan di PC Backup Storage.',
                    'file_name'  => $payload['file_name'] ?? null,
                    'backup_log' => $payload['backup_log'] ?? null,
                    'counts'     => $payload['counts'] ?? null,
                    'cloud_time' => $payload['cloud_time'] ?? CloudTime::now(),
                ]);
            }

            $log = $payload['backup_log'] ?? $this->createLog($user->id, 'BACKUP_FAILED', 'FAILED');

            return response()->json([
                'message'    => $payload['message'] ?? 'PC Backup Storage gagal memproses permintaan backup.',
                'backup_log' => $log,
                'cloud_time' => CloudTime::now(),
            ], 502);
        } catch (Throwable $e) {
            $log = $this->createLog($user->id, 'UNREACHABLE', 'FAILED');

            return response()->json([
                'message'    => 'Gagal menghubungi PC Backup Storage: ' . $e->getMessage(),
                'backup_log' => $log,
                'cloud_time' => CloudTime::now(),
            ], 502);
        }
    }

    /**
     * GET /api/backup/logs
     *
     * Returns the authenticated user's own backup history only (FR-02 privacy isolation).
     */
    public function logs(Request $request): JsonResponse
    {
        $logs = BackupLog::query()
            ->where('requested_by', $request->user()->id)
            ->orderBy('backed_up_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'logs'       => $logs,
            'cloud_time' => CloudTime::now(),
        ]);
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    private function createLog(int $userId, string $fileName, string $status): BackupLog
    {
        $log = BackupLog::create([
            'requested_by' => $userId,
            'file_name'    => $fileName,
            'status'       => $status,
        ]);
        $log->refresh();

        return $log;
    }
}
