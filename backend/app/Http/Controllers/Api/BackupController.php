<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BackupLog;
use App\Support\CloudTime;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;
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
        $endpoint = $this->backupServerEndpoint('trigger-backup');

        if ($endpoint === null) {
            $log = $this->createLog($user->id, 'CONFIG_MISSING', 'FAILED');

            return response()->json([
                'message'    => 'BACKUP_SERVER_URL belum dikonfigurasi di .env Application Server.',
                'backup_log' => $log,
                'cloud_time' => CloudTime::now(),
            ], 503);
        }

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
     * GET /api/backup/download — Download the requesting user's data from a backup as XLSX.
     */
    public function download(Request $request): JsonResponse|StreamedResponse
    {
        $validated = $request->validate([
            'file_name' => ['required', 'string', 'max:100', 'regex:/^backup_[A-Za-z0-9_-]+\.json$/'],
        ]);
        $user = $request->user();
        $fileName = $validated['file_name'];

        $ownsBackup = BackupLog::query()
            ->where('requested_by', $user->id)
            ->where('file_name', $fileName)
            ->where('status', 'SUCCESS')
            ->exists();

        if (! $ownsBackup) {
            return response()->json([
                'message' => 'File backup tidak ditemukan untuk akun ini.',
            ], 404);
        }

        $endpoint = $this->backupServerEndpoint('backup-file');
        if ($endpoint === null || (string) config('services.backup.secret', '') === '') {
            return response()->json([
                'message' => 'Layanan unduh backup belum dikonfigurasi dengan URL dan shared secret.',
            ], 503);
        }

        try {
            $response = Http::timeout((int) config('services.backup.timeout', 30))
                ->acceptJson()
                ->withHeaders(['X-Backup-Secret' => (string) config('services.backup.secret')])
                ->get($endpoint, ['file_name' => $fileName]);
        } catch (ConnectionException $e) {
            report($e);

            return response()->json([
                'message' => 'Tidak dapat menghubungi PC Backup Storage untuk mengambil file.',
            ], 502);
        }

        if (! $response->successful()) {
            return response()->json([
                'message' => $response->status() === 404
                    ? 'File backup tidak ditemukan di PC Backup Storage.'
                    : 'PC Backup Storage gagal mengirim file backup.',
            ], $response->status() === 404 ? 404 : 502);
        }

        $snapshot = $response->json();
        if (
            ! is_array($snapshot)
            || ! is_array($snapshot['meta'] ?? null)
            || (int) ($snapshot['meta']['requested_by'] ?? 0) !== (int) $user->id
            || ! is_array($snapshot['tables'] ?? null)
            || ! is_array($snapshot['tables']['users'] ?? null)
            || ! is_array($snapshot['tables']['messages'] ?? null)
            || ! is_array($snapshot['tables']['backup_logs'] ?? null)
        ) {
            return response()->json([
                'message' => 'Format file backup tidak valid atau bukan milik akun ini.',
            ], 422);
        }

        $userId = (int) $user->id;
        $profileRows = array_values(array_filter(
            $snapshot['tables']['users'],
            static fn ($row): bool => is_array($row) && (int) ($row['id'] ?? 0) === $userId,
        ));

        if ($profileRows === []) {
            return response()->json([
                'message' => 'Profil akun tidak ditemukan di dalam file backup.',
            ], 422);
        }

        $messageRows = array_values(array_filter(
            $snapshot['tables']['messages'],
            static fn ($row): bool => is_array($row)
                && ((int) ($row['sender_id'] ?? 0) === $userId
                    || (int) ($row['receiver_id'] ?? 0) === $userId),
        ));
        $logRows = array_values(array_filter(
            $snapshot['tables']['backup_logs'],
            static fn ($row): bool => is_array($row) && (int) ($row['requested_by'] ?? 0) === $userId,
        ));

        $sheets = [
            'Akun' => [
                ['id', 'username', 'name', 'email', 'created_at'],
                $this->selectColumns($profileRows, ['id', 'username', 'name', 'email', 'created_at']),
            ],
            'Pesan' => [
                ['id', 'sender_id', 'receiver_id', 'message_text', 'sent_at'],
                $this->selectColumns($messageRows, ['id', 'sender_id', 'receiver_id', 'message_text', 'sent_at']),
            ],
            'Riwayat Backup' => [
                ['id', 'file_name', 'status', 'backed_up_at'],
                $this->selectColumns($logRows, ['id', 'file_name', 'status', 'backed_up_at']),
            ],
        ];

        $spreadsheet = new Spreadsheet();
        foreach ($sheets as $index => [$headers, $rows]) {
            $sheet = $index === array_key_first($sheets)
                ? $spreadsheet->getActiveSheet()
                : $spreadsheet->createSheet();
            $sheet->setTitle($index);
            $this->writeSheet($sheet, $headers, $rows);
        }

        $downloadName = pathinfo($fileName, PATHINFO_FILENAME) . '_personal.xlsx';

        return response()->streamDownload(
            static fn () => (new Xlsx($spreadsheet))->save('php://output'),
            $downloadName,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Cache-Control' => 'private, no-store',
            ],
        );
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

    private function backupServerEndpoint(string $path): ?string
    {
        $serverUrl = rtrim((string) config('services.backup.server_url'), '/');
        if ($serverUrl === '') {
            return null;
        }

        $baseUrl = preg_replace('#/api/trigger-backup$#', '', $serverUrl) ?? $serverUrl;

        return $baseUrl . '/api/' . ltrim($path, '/');
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, string>  $columns
     * @return array<int, array<int, mixed>>
     */
    private function selectColumns(array $rows, array $columns): array
    {
        return array_map(
            static fn (array $row): array => array_map(
                static fn (string $column) => $row[$column] ?? null,
                $columns,
            ),
            $rows,
        );
    }

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, array<int, mixed>>  $rows
     */
    private function writeSheet(Worksheet $sheet, array $headers, array $rows): void
    {
        foreach ($headers as $columnIndex => $header) {
            $cell = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($columnIndex + 1) . '1';
            $sheet->setCellValueExplicit($cell, $header, DataType::TYPE_STRING);
        }

        foreach ($rows as $rowIndex => $row) {
            foreach ($row as $columnIndex => $value) {
                $cell = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($columnIndex + 1) . ($rowIndex + 2);
                $sheet->setCellValueExplicit($cell, (string) ($value ?? ''), DataType::TYPE_STRING);
            }
        }
    }
}
