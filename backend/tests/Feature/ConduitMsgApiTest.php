<?php

namespace Tests\Feature;

use App\Models\BackupLog;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
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

        $token = $loginByEmail->json('token');

        // 3. GET /api/me mengembalikan profil pribadi & waktu server cloud
        $me = $this->withToken($token)->getJson('/api/me');
        $me->assertOk()
            ->assertJsonPath('user.username', 'alice')
            ->assertJsonPath('user.email', 'alice@example.com')
            ->assertJsonStructure(['user', 'cloud_time', 'server_time']);

        // 4. Logout mencabut token aktif
        $this->withToken($token)->postJson('/api/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 2); // dari register & loginByUsername, token loginByEmail sudah terhapus
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
        $bobRead = $this->withToken($bobToken)->getJson("/api/messages/{$alice->id}");
        $bobRead->assertOk()->assertJsonCount(1, 'messages');

        // Charlie (User C) TIDAK BISA melihat chat antara Alice & Bob
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
        $this->withToken($aliceToken)->getJson('/api/backup/logs')
            ->assertOk()
            ->assertJsonCount(1, 'logs');

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
}
