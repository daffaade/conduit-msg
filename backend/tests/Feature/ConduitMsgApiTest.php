<?php

namespace Tests\Feature;

use App\Models\BackupLog;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class ConduitMsgApiTest extends TestCase
{
    use RefreshDatabase;

    private string $tempBackupDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tempBackupDir = storage_path('framework/testing/backups_'.uniqid());
        config([
            'services.backup.storage_path' => $this->tempBackupDir,
            'services.backup.secret' => '',
        ]);
    }

    protected function tearDown(): void
    {
        if (File::isDirectory($this->tempBackupDir)) {
            File::deleteDirectory($this->tempBackupDir);
        }

        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_register_login_me_and_logout_flow(): void
    {
        // 1. Register user baru
        $register = $this->postJson('/api/register', [
            'username' => 'alice',
            'email' => 'alice@example.com',
            'password' => 'secret123',
        ]);

        $register->assertCreated()
            ->assertJsonStructure([
                'message',
                'token',
                'token_type',
                'user' => ['id', 'username', 'email', 'created_at'],
                'cloud_time',
            ]);

        $this->assertDatabaseHas('users', [
            'username' => 'alice',
            'email' => 'alice@example.com',
        ]);

        // 2. Login menggunakan username dan email pada field "login"
        $loginByUsername = $this->postJson('/api/login', [
            'login' => 'alice',
            'password' => 'secret123',
        ]);
        $loginByUsername->assertOk()->assertJsonPath('user.username', 'alice');

        $loginByEmail = $this->postJson('/api/login', [
            'login' => 'alice@example.com',
            'password' => 'secret123',
        ]);
        $loginByEmail->assertOk();

        // 2b. Login juga mendukung field terpisah: email, username, atau keduanya sekaligus
        $this->postJson('/api/login', [
            'email' => 'alice@example.com',
            'password' => 'secret123',
        ])->assertOk()->assertJsonPath('user.username', 'alice');

        $this->postJson('/api/login', [
            'username' => 'alice',
            'password' => 'secret123',
        ])->assertOk()->assertJsonPath('user.email', 'alice@example.com');

        $this->postJson('/api/login', [
            'username' => 'alice',
            'email' => 'alice@example.com',
            'password' => 'secret123',
        ])->assertOk();

        // Password wajib diisi dan kombinasi username + email yang tidak cocok ditolak
        $this->postJson('/api/login', [
            'email' => 'alice@example.com',
        ])->assertUnprocessable();

        $this->postJson('/api/login', [
            'username' => 'otheruser',
            'email' => 'alice@example.com',
            'password' => 'secret123',
        ])->assertUnauthorized();

        $token = $loginByEmail->json('token');

        // 3. GET /api/me mengembalikan profil pribadi & waktu server cloud
        $me = $this->withToken($token)->getJson('/api/me');
        $me->assertOk()
            ->assertJsonPath('user.username', 'alice')
            ->assertJsonPath('user.email', 'alice@example.com')
            ->assertJsonStructure(['user', 'cloud_time', 'server_time']);

        // 4. Logout mencabut token aktif
        $this->withToken($token)->postJson('/api/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 5); // 5 login/register sebelumnya, token loginByEmail sudah terhapus
    }

    public function test_contacts_and_anti_idor_privacy_isolation(): void
    {
        $alice = User::factory()->create(['username' => 'alice', 'email' => 'alice@mail.com']);
        $bob = User::factory()->create(['username' => 'bob', 'email' => 'bob@mail.com']);
        $charlie = User::factory()->create(['username' => 'charlie', 'email' => 'charlie@mail.com']);

        $aliceToken = $alice->createToken('test')->plainTextToken;
        $bobToken = $bob->createToken('test')->plainTextToken;
        $charlieToken = $charlie->createToken('test')->plainTextToken;

        // Daftar kontak hanya menampilkan id & username tanpa membocorkan email user lain
        $contacts = $this->withToken($aliceToken)->getJson('/api/contacts');
        $contacts->assertOk();
        $firstContact = $contacts->json('contacts.0');
        $this->assertArrayHasKey('id', $firstContact);
        $this->assertArrayHasKey('username', $firstContact);
        $this->assertArrayNotHasKey('email', $firstContact);

        // Alice mengirim pesan ke Bob
        $send = $this->withToken($aliceToken)->postJson('/api/messages', [
            'receiver_id' => $bob->id,
            'message_text' => 'Halo Bob, ini pesan rahasia!',
        ]);
        $send->assertCreated()
            ->assertJsonPath('data.sender_id', $alice->id)
            ->assertJsonPath('data.receiver_id', $bob->id)
            ->assertJsonPath('data.message_text', 'Halo Bob, ini pesan rahasia!');
        $this->assertNotNull($send->json('data.sent_at'));

        // Bob dapat membaca pesan dari Alice
        Auth::forgetGuards();
        $bobRead = $this->withToken($bobToken)->getJson("/api/messages/{$alice->id}");
        $bobRead->assertOk()->assertJsonCount(1, 'messages');

        // Charlie (User C) TIDAK BISA melihat chat antara Alice & Bob
        Auth::forgetGuards();
        $charlieReadAlice = $this->withToken($charlieToken)->getJson("/api/messages/{$alice->id}");
        $charlieReadAlice->assertOk()->assertJsonCount(0, 'messages');

        // Charlie mencoba memanipulasi query sender_id milik Alice -> ditolak 403 Forbidden
        $this->withToken($charlieToken)
            ->getJson("/api/messages/{$bob->id}?sender_id={$alice->id}")
            ->assertForbidden();

        // Charlie mencoba mengakses profil pribadi Alice -> ditolak 403 Forbidden
        $this->withToken($charlieToken)
            ->getJson("/api/users/{$alice->id}")
            ->assertForbidden();
    }

    public function test_message_timestamp_ignores_manipulated_local_php_clock(): void
    {
        $alice = User::factory()->create(['username' => 'alice']);
        $bob = User::factory()->create(['username' => 'bob']);
        $token = $alice->createToken('test')->plainTextToken;

        // Simulasikan jam laptop lokal PHP dimajukan ke tahun 2099
        Carbon::setTestNow(Carbon::create(2099, 1, 1, 12, 0, 0, 'UTC'));

        $res = $this->withToken($token)->postJson('/api/messages', [
            'receiver_id' => $bob->id,
            'message_text' => 'Tes sinkronisasi waktu Cloud DB',
        ]);

        $res->assertCreated();
        $sentAtYear = (int) substr((string) $res->json('data.sent_at'), 0, 4);

        // Tahun sent_at harus mengikuti jam database (bukan tahun 2099 dari jam PHP lokal)
        $this->assertNotEquals(2099, $sentAtYear);
    }

    public function test_backup_trigger_logs_and_disaster_recovery_restore(): void
    {
        $alice = User::factory()->create(['username' => 'alice']);
        $bob = User::factory()->create(['username' => 'bob']);
        $aliceToken = $alice->createToken('test')->plainTextToken;
        $bobToken = $bob->createToken('test')->plainTextToken;

        Message::create([
            'sender_id' => $alice->id,
            'receiver_id' => $bob->id,
            'message_text' => 'Pesan penting sebelum bencana DB',
        ]);

        // 1. Trigger backup di PC Backup Storage menulis file .json ke disk lokal
        $trigger = $this->postJson('/api/trigger-backup', [
            'requested_by' => $alice->id,
        ]);

        $trigger->assertCreated()
            ->assertJsonPath('backup_log.status', 'SUCCESS');

        $fileName = $trigger->json('file_name');
        $this->assertFileExists($this->tempBackupDir.DIRECTORY_SEPARATOR.$fileName);

        // 2. Endpoint /api/backup/logs hanya menampilkan riwayat milik user yang memintanya
        Auth::forgetGuards();
        $this->withToken($aliceToken)->getJson('/api/backup/logs')
            ->assertOk()
            ->assertJsonCount(1, 'logs');

        Auth::forgetGuards();
        $this->withToken($bobToken)->getJson('/api/backup/logs')
            ->assertOk()
            ->assertJsonCount(0, 'logs');

        // 3. Endpoint /api/backup/request meneruskan HTTP POST ke BACKUP_SERVER_URL
        config(['services.backup.server_url' => 'http://192.168.1.50:8001']);
        Http::fake([
            'http://192.168.1.50:8001/api/trigger-backup' => Http::response([
                'message' => 'Backup berhasil.',
                'file_name' => $fileName,
                'backup_log' => ['id' => 1, 'file_name' => $fileName, 'status' => 'SUCCESS'],
            ], 201),
        ]);

        Auth::forgetGuards();
        $this->withToken($aliceToken)->postJson('/api/backup/request')
            ->assertOk()
            ->assertJsonPath('file_name', $fileName);

        // 4. Simulasi kehilangan seluruh pesan di Cloud DB lalu pulihkan via POST /api/restore
        Message::query()->delete();
        $this->assertDatabaseCount('messages', 0);

        $restore = $this->postJson('/api/restore');
        $restore->assertOk()
            ->assertJsonPath('restored_from', $fileName)
            ->assertJsonPath('restored_counts.messages', 1);

        $this->assertDatabaseHas('messages', [
            'message_text' => 'Pesan penting sebelum bencana DB',
        ]);
    }

    public function test_backup_download_is_personal_and_returns_xlsx(): void
    {
        $alice = User::factory()->create(['username' => 'alice']);
        $bob = User::factory()->create(['username' => 'bob']);
        $charlie = User::factory()->create(['username' => 'charlie']);
        $token = $alice->createToken('test')->plainTextToken;
        $fileName = 'backup_test.json';

        BackupLog::create([
            'requested_by' => $alice->id,
            'file_name' => $fileName,
            'status' => 'SUCCESS',
        ]);

        config([
            'services.backup.server_url' => 'http://192.168.1.50:8001',
            'services.backup.secret' => 'test-secret',
        ]);

        Http::fake([
            'http://192.168.1.50:8001/api/backup-file*' => Http::response([
                'meta' => ['requested_by' => $alice->id],
                'tables' => [
                    'users' => [
                        [
                            'id' => $alice->id,
                            'username' => 'alice',
                            'name' => 'Alice',
                            'email' => 'alice@example.com',
                            'created_at' => '2026-01-01 00:00:00',
                            'password' => 'must-not-be-exported',
                        ],
                        [
                            'id' => $bob->id,
                            'username' => 'bob',
                            'name' => 'Bob',
                            'email' => 'bob@example.com',
                            'password' => 'private-bob-hash',
                        ],
                    ],
                    'messages' => [
                        [
                            'id' => 1,
                            'sender_id' => $alice->id,
                            'receiver_id' => $bob->id,
                            'message_text' => '=HYPERLINK("https://example.com")',
                            'sent_at' => '2026-01-01 00:00:00',
                        ],
                        [
                            'id' => 2,
                            'sender_id' => $bob->id,
                            'receiver_id' => $charlie->id,
                            'message_text' => 'private message between other users',
                            'sent_at' => '2026-01-01 00:01:00',
                        ],
                    ],
                    'backup_logs' => [
                        [
                            'id' => 1,
                            'requested_by' => $alice->id,
                            'file_name' => $fileName,
                            'status' => 'SUCCESS',
                            'backed_up_at' => '2026-01-01 00:00:00',
                        ],
                        [
                            'id' => 2,
                            'requested_by' => $bob->id,
                            'file_name' => 'bob_backup.json',
                            'status' => 'SUCCESS',
                            'backed_up_at' => '2026-01-01 00:00:00',
                        ],
                    ],
                ],
            ]),
        ]);

        $response = $this->withToken($token)->get('/api/backup/download?file_name='.$fileName);

        $response->assertOk();
        $this->assertStringContainsString(
            'backup_test_personal.xlsx',
            (string) $response->headers->get('content-disposition'),
        );
        $xlsxContent = $response->streamedContent();
        $this->assertStringStartsWith('PK', $xlsxContent);

        $tempFile = tempnam(sys_get_temp_dir(), 'conduit-xlsx-');
        try {
            file_put_contents($tempFile, $xlsxContent);
            $workbook = IOFactory::load($tempFile);

            $accountSheet = $workbook->getSheetByName('Akun');
            $messageSheet = $workbook->getSheetByName('Pesan');
            $logsSheet = $workbook->getSheetByName('Riwayat Backup');

            $this->assertNotNull($accountSheet);
            $this->assertSame('alice', $accountSheet->getCell('B2')->getValue());
            $this->assertSame(2, $accountSheet->getHighestDataRow());

            $this->assertNotNull($messageSheet);
            $this->assertSame(2, $messageSheet->getHighestDataRow());
            $this->assertSame(
                '=HYPERLINK("https://example.com")',
                $messageSheet->getCell('D2')->getValue(),
            );
            $this->assertSame(DataType::TYPE_STRING, $messageSheet->getCell('D2')->getDataType());
            $this->assertNotNull($logsSheet);
            $this->assertSame($fileName, $logsSheet->getCell('B2')->getValue());
        } finally {
            if (is_file($tempFile)) {
                unlink($tempFile);
            }
        }
    }

    public function test_user_cannot_download_another_users_backup(): void
    {
        $alice = User::factory()->create(['username' => 'alice']);
        $bob = User::factory()->create(['username' => 'bob']);
        BackupLog::create([
            'requested_by' => $alice->id,
            'file_name' => 'backup_alice.json',
            'status' => 'SUCCESS',
        ]);
        Http::fake();

        $this->withToken($bob->createToken('test')->plainTextToken)
            ->getJson('/api/backup/download?file_name=backup_alice.json')
            ->assertNotFound();

        Http::assertNothingSent();
    }

    public function test_backup_file_endpoint_requires_secret_and_valid_file_name(): void
    {
        $fileName = 'backup_test.json';
        File::ensureDirectoryExists($this->tempBackupDir);
        File::put($this->tempBackupDir.DIRECTORY_SEPARATOR.$fileName, '{"tables":[]}');

        $this->getJson('/api/backup-file?file_name='.$fileName)
            ->assertServiceUnavailable();

        config(['services.backup.secret' => 'test-secret']);

        $this->withHeader('X-Backup-Secret', 'wrong-secret')
            ->getJson('/api/backup-file?file_name='.$fileName)
            ->assertForbidden();

        $this->withHeader('X-Backup-Secret', 'test-secret')
            ->get('/api/backup-file?file_name='.$fileName)
            ->assertOk()
            ->assertHeader('content-type', 'application/json');

        $this->withHeader('X-Backup-Secret', 'test-secret')
            ->getJson('/api/backup-file?file_name=..%2Fsecrets.json')
            ->assertUnprocessable();
    }
}
