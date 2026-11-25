# Project Knowledge: Sistem Pertukaran Pesan Terdistribusi (Adaptasi Arsitektur WhatsApp)

## 1. Ringkasan Proyek
* **Mata Kuliah:** Sistem Terdistribusi
* **Konsep:** Sistem pertukaran pesan/data berbasis arsitektur **Client-Server** yang mengadaptasi komponen inti arsitektur WhatsApp, dengan modifikasi penambahan **Backup Storage** pada perangkat PC/Desktop lokal.
* **Tech Stack Utama:** **Laravel** (Backend REST API) + **React** (Frontend SPA) + **Supabase (PostgreSQL Cloud)** + **Desktop Backup Service**.
* **Batas Waktu:** 30 November 2026
* **Metode Pengumpulan:** Presentasi & Demo Langsung (tidak dikumpulkan berupa berkas).

## 2. Arsitektur Sistem
Setiap pengguna menjalankan **Application Server (Laravel)** dan **Client (React)** secara lokal di perangkat masing-masing (melalui Laragon/XAMPP), lalu seluruhnya terhubung ke satu **Cloud Database** yang sama serta dapat memicu **Backup Storage** di PC lokal salah satu anggota melalui protokol **HTTP**.

```text
+-----------------------------------+    +-----------------------------------+
|        Perangkat User 1..N        |    |        Perangkat User 1..N        |
|  [Frontend: React + Vite (SPA)]   |    |  [Frontend: React + Vite (SPA)]   |
|                 | HTTP (Axios)    |    |                 | HTTP (Axios)    |
|  [Backend: Laravel REST API]      |    |  [Backend: Laravel REST API]      |
|     (Laragon / XAMPP Lokal)       |    |     (Laragon / XAMPP Lokal)       |
+-----------------+-----------------+    +-----------------+-----------------+
                  |                                        |
                  +--------------------+-------------------+
                                       | MySQL over TCP/SSL
                                       v
                  +-----------------------------------------+
                  |      CLOUD DATABASE (Server Utama)      |
                  |  - Penyimpanan User, Pesan, & Log       |
                  |  - Acuan Sinkronisasi Waktu Sistem      |
                  +--------------------+--------------------+
                                       |
                                       | Trigger Backup (HTTP POST)
                                       | Tarik Data & Simpan Lokal
                                       v
                  +-----------------------------------------+
                  |   BACKUP STORAGE (PC / Desktop Lokal)   |
                  |  - Service Penerima Backup (HTTP)       |
                  |  - Penyimpanan File .sql / .json Lokal  |
                  |  - Tanpa Google Drive                   |
                  |  - Media Pemulihan (Restore)            |
                  +-----------------------------------------+
```

### Pemetaan Adaptasi Arsitektur WhatsApp
* **Mobile/Web User $\rightarrow$ React SPA:** Antarmuka pengguna di browser untuk login, bertukar pesan, dan memicu backup.
* **Custom Server Cluster / YAWS $\rightarrow$ Laravel Application Server (Lokal):** Menangani *request/response* HTTP, validasi autentikasi, dan kontrol akses privasi di masing-masing perangkat user.
* **MySQL/Postgres/Mnesia $\rightarrow$ Cloud Database (Supabase PostgreSQL):** Satu pusat penyimpanan data bersama dan acuan tunggal waktu sistem.
* **Modifikasi Khusus $\rightarrow$ Backup Storage (Desktop/PC):** Menyimpan salinan data dari Cloud Database ke penyimpanan lokal PC apabila diminta user, dan digunakan untuk pemulihan (*restore*) jika database utama terganggu.

## 3. Tech Stack (Laravel + React)

| Layer | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Environment Lokal** | **Laragon** (disarankan) atau **XAMPP** | Menyediakan PHP 8.2+, Composer, Apache/Nginx, dan Node.js di laptop tiap anggota. |
| **Backend (App Server)** | **Laravel 11 / 12** + **Laravel Sanctum** | Menyediakan REST API berbasis HTTP, autentikasi token (*Bearer Token*), Eloquent ORM, dan middleware otorisasi privasi. |
| **Frontend (Client)** | **React (Vite)** + **Tailwind CSS** + **Axios** | SPA ringan yang berkomunikasi dengan Laravel lokal via HTTP. Menggunakan *HTTP Polling* (setiap 2–3 detik) untuk memuat pesan baru agar murni memakai protokol HTTP. |
| **Cloud Database** | **Supabase** (PostgreSQL Cloud) | Satu instance database terpusat yang dikonfigurasi pada file `.env` di seluruh Laravel anggota (`pgsql`). |
| **Backup Storage Service** | **PC/Desktop Lokal** (Laravel / PHP / Node.js ringan) | Menjalankan HTTP listener lokal untuk melakukan *export* data dari Cloud DB ke file `.json`/`.sql` di harddisk PC (dilarang menggunakan Google Drive). |
| **Jaringan Demo Backup** | **Wi-Fi/Hotspot Bersama (LAN)** atau **Tailscale / Ngrok** | Menghubungkan Laravel di laptop user dengan PC Pengelola Backup Storage saat presentasi. |

## 4. Ketentuan Fungsional & Keamanan Wajib
1. **Autentikasi (Laravel Sanctum):**
   * Login menggunakan `username` atau `email` beserta `password`.
   * Password otomatis di-hash dengan `Hash::make()` (Bcrypt/Argon2) bawaan Laravel.
2. **Privasi & Kontrol Akses (Anti-IDOR):**
   * Setiap *endpoint* pesan wajib dilindungi middleware `auth:sanctum`.
   * Query pesan wajib memfilter `(sender_id = auth()->id() AND receiver_id = $otherId) OR (sender_id = $otherId AND receiver_id = auth()->id())`.
   * User tidak boleh bisa mengakses profil sensitif maupun isi percakapan milik user lain meskipun mencoba menembak API secara langsung.
3. **Sinkronisasi Waktu (Cloud Time Sync):**
   * Penulisan `sent_at` pesan dan `backed_up_at` log backup **wajib menggunakan waktu dari Cloud Database** (`DB::raw('CURRENT_TIMESTAMP')` atau *default* `CURRENT_TIMESTAMP` di level PostgreSQL/Supabase, **bukan** `now()` PHP yang mengikuti jam laptop lokal).
   * Sediakan endpoint yang mengembalikan `SELECT NOW() as server_time` agar jam server cloud dapat ditampilkan di UI React.
4. **Mekanisme Backup & Restore (Tanpa Google Drive):**
   * User menekan tombol **"Backup Sekarang"** di UI React $\rightarrow$ Laravel lokal mengirim `POST` HTTP ke PC Backup Storage $\rightarrow$ PC Backup Storage menarik data dari Cloud DB dan menyimpannya ke folder lokal (misal: `D:\backup_storage\backup_YYYYMMDD_HHMMSS.json`).
   * Menyediakan fitur/skrip **Restore** di PC Backup Storage untuk mengembalikan data dari file lokal ke Cloud Database saat simulasi gangguan.

## 5. Rancangan Skema Database (Laravel Migrations - Supabase PostgreSQL)

1. **`users`** (bawaan Laravel, disesuaikan):
   * `id` (BigInt, PK)
   * `username` (String, Unique)
   * `email` (String, Unique)
   * `password` (String, Hashed)
   * `created_at`, `updated_at` (Timestamp, default `CURRENT_TIMESTAMP` Cloud DB)
2. **`personal_access_tokens`** (bawaan Laravel Sanctum untuk token login).
3. **`messages`**:
   * `id` (BigInt, PK)
   * `sender_id` (FK $\rightarrow$ `users.id`)
   * `receiver_id` (FK $\rightarrow$ `users.id`)
   * `message_text` (Text)
   * `sent_at` (Timestamp, default `CURRENT_TIMESTAMP` dari Cloud DB)
4. **`backup_logs`**:
   * `id` (BigInt, PK)
   * `requested_by` (FK $\rightarrow$ `users.id`)
   * `file_name` (String)
   * `status` (Enum: `SUCCESS`, `FAILED`)
   * `backed_up_at` (Timestamp, default `CURRENT_TIMESTAMP` dari Cloud DB)

## 6. Rancangan Endpoint REST API (Laravel)

### Autentikasi & Sinkronisasi Waktu
* `POST /api/register` — Registrasi akun user baru.
* `POST /api/login` — Login dengan `login` (username/email) + `password`, mengembalikan Sanctum token.
* `POST /api/logout` — Revoke token aktif (`auth:sanctum`).
* `GET /api/me` — Mengembalikan data pribadi user yang sedang login + `cloud_time` dari `SELECT NOW()`.

### Pertukaran Pesan (Semua Wajib `auth:sanctum`)
* `GET /api/contacts` — Mengambil daftar user lain (hanya `id` dan `username`, tanpa email/data pribadi).
* `GET /api/messages/{userId}` — Mengambil riwayat chat **hanya** antara user yang login dan `{userId}`.
* `POST /api/messages` — Mengirim pesan baru (`receiver_id`, `message_text`), waktu diisi oleh `CURRENT_TIMESTAMP` Cloud DB.

### Backup & Pemulihan
* `POST /api/backup/request` — Laravel lokal meneruskan request HTTP ke PC Backup Storage (`BACKUP_SERVER_URL/api/trigger-backup`).
* `GET /api/backup/logs` — Mengambil riwayat backup yang pernah diminta oleh user yang sedang login.
* *(Di PC Backup Storage)* `POST /api/trigger-backup` — Menarik data Cloud DB dan menulis file `.sql`/`.json` ke disk lokal PC.
* *(Di PC Backup Storage)* `POST /api/restore` — Membaca file backup terbaru dari disk lokal dan memulihkannya ke Cloud DB.

## 7. Pembagian Peran Anggota Kelompok

| Peran | Kel. 5 Orang | Kel. 6 Orang | Tanggung Jawab Utama |
| :--- | :---: | :---: | :--- |
| **Client/User + Application Server** | 3 orang | 4 orang | Menyiapkan Laragon/XAMPP + Laravel + React di laptop masing-masing, membangun UI React & API Laravel, menguji login, chat, dan privasi. |
| **Pengelola Cloud Database** | 1 orang | 1 orang | Setup project Supabase (PostgreSQL), menjalankan migrasi tabel, membagikan kredensial `.env` ke tim, serta memastikan *timezone* server cloud konsisten. |
| **Pengelola Backup Storage** | 1 orang | 1 orang | Menyediakan PC/Desktop lokal, membuat service HTTP penerima backup & penyimpanan lokal (non-Google Drive), serta menyiapkan mekanisme *restore*. |

## 8. Checklist Skenario Demo Presentasi (30 Nov 2026)
1. **Bukti Arsitektur Lokal:** Tunjukkan Laragon/XAMPP + server Laravel & React aktif secara terpisah di tiap laptop anggota (`localhost`).
2. **Demo Autentikasi & Privasi:** Login dengan akun berbeda di tiap laptop; buktikan User C tidak bisa membaca chat User A & User B (baik di UI React maupun via uji *request* HTTP/Postman).
3. **Demo Pertukaran Pesan & Cloud Time Sync:** Ubah jam sistem Windows/Mac di salah satu laptop (misal dimajukan 3 jam), kirim pesan, dan buktikan *timestamp* di UI tetap sinkron mengikuti jam Cloud Database.
4. **Demo Backup Lokal:** Klik tombol **Backup Data** di UI React, lalu tunjukkan file hasil backup langsung muncul di folder lokal PC Pengelola Backup Storage.
5. **Demo Pemulihan (Recovery):** Simulasikan penghapusan/gangguan data pesan di Cloud Database, lalu jalankan **Restore** dari PC Backup Storage hingga seluruh pesan kembali muncul di aplikasi user.