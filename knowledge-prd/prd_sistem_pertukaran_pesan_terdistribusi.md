# Product Requirements Document (PRD)

**Nama Produk:** ConduitMsg — Sistem Pertukaran Pesan Terdistribusi (Adaptasi Arsitektur WhatsApp)  
**Versi:** 1.0  
**Tanggal:** 25 November 2026  
**Target Selesai / Presentasi:** 30 November 2026  
**Tech Stack:** Laravel (REST API) + React (Vite SPA) + Supabase (PostgreSQL Cloud) + Desktop Backup Storage

---

## 1. Latar Belakang & Tujuan

Sebagai implementasi tugas mata kuliah **Sistem Terdistribusi**, proyek ini bertujuan merancang dan membangun sistem komunikasi berbasis arsitektur **Client-Server** yang mengadaptasi konsep dasar WhatsApp.

Berbeda dengan aplikasi web konvensional yang hanya memiliki satu server aplikasi terpusat, sistem ini mewajibkan setiap pengguna menjalankan _Application Server_ masing-masing secara lokal, terhubung melalui protokol **HTTP** ke satu **Cloud Database** bersama sebagai pusat data dan acuan waktu, serta dilengkapi komponen modifikasi berupa **Backup Storage** pada perangkat desktop/PC lokal untuk menjamin ketersediaan dan pemulihan data (_disaster recovery_).

---

## 2. Pengguna & Peran Sistem

1. **Client / End-User (sekaligus Operator App Server Lokal):**
   - Menjalankan instance Laravel + React di perangkat masing-masing.
   - Melakukan registrasi, login, mengirim/menerima pesan pribadi, melihat informasi akun sendiri, dan meminta backup data.
2. **Pengelola Cloud Database:**
   - Mengelola infrastruktur database Supabase (PostgreSQL) di cloud, memantau koneksi dari seluruh _application server_ anggota, serta memastikan konsistensi waktu server.
3. **Pengelola Backup Storage:**
   - Mengoperasikan perangkat desktop/PC khusus sebagai penyimpan cadangan lokal (tanpa Google Drive), memantau file backup yang masuk, dan mengeksekusi proses _restore_ apabila database utama mengalami gangguan.

---

## 3. Ruang Lingkup Produk (Scope)

### Dalam Cakupan (In-Scope — MVP Wajib Presentasi)

- Registrasi dan Login berbasis `username`/`email` dan `password` dengan isolasi sesi.
- Pertukaran pesan teks 1-on-1 antar pengguna menggunakan protokol **HTTP** (REST API + HTTP Polling).
- Penegakan privasi data ketat (user hanya dapat mengakses data pribadi dan riwayat percakapannya sendiri).
- Sinkronisasi _timestamp_ seluruh transaksi (pesan & log backup) mengikuti waktu **Cloud Database**.
- Permintaan backup data (_on-demand backup_) dari aplikasi ke **PC Backup Storage** lokal.
- Mekanisme pemulihan data (_restore_) dari PC Backup Storage kembali ke Cloud Database.

### Di Luar Cakupan (Out-of-Scope)

- Pengiriman file multimedia besar (gambar, video, audio, dokumen).
- Fitur _Group Chat_, _Video/Voice Call_, dan _End-to-End Encryption_ (E2EE) tingkat perangkat.
- Komunikasi _real-time_ berbasis WebSocket/XMPP (protokol dibatasi menggunakan **HTTP** sesuai spesifikasi tugas).
- Penyimpanan backup menggunakan layanan pihak ketiga seperti Google Drive, Dropbox, atau OneDrive.

---

## 4. Persyaratan Fungsional (Functional Requirements)

### FR-01: Autentikasi & Manajemen Akun

- **Deskripsi:** Pengguna harus dapat membuat akun baru dan masuk ke sistem sebelum mengakses fitur chat.
- **Detail:**
  - Form Register menerima `username` (unik), `email` (unik), dan `password` (minimal 6 karakter).
  - Form Login menerima `username` atau `email` beserta `password`.
  - Backend Laravel memvalidasi kredensial dan menerbitkan _Bearer Token_ (Laravel Sanctum).
  - Pengguna dapat melakukan _Logout_ yang langsung menghapus token di server dan _localStorage_ browser.

### FR-02: Privasi & Isolasi Data Pengguna

- **Deskripsi:** Data pribadi dan pesan setiap pengguna tidak boleh bocor atau diakses oleh pengguna lain tanpa izin.
- **Detail:**
  - Endpoint daftar kontak hanya mengekspos `id` dan `username` (tidak menampilkan `email` atau `password`).
  - Endpoint pengambilan pesan wajib memverifikasi identitas pengguna dari token Sanctum, bukan dari parameter yang bisa dimanipulasi di URL/body.
  - Percobaan akses pesan atau profil milik user lain harus mengembalikan status HTTP `403 Forbidden` atau data kosong.

### FR-03: Pertukaran Pesan Berbasis HTTP

- **Deskripsi:** Pengguna dapat bertukar pesan teks dengan pengguna lain yang terdaftar.
- **Detail:**
  - Pengguna memilih kontak dari sidebar untuk membuka ruang percakapan.
  - Mengirim pesan memicu `POST /api/messages` ke Laravel lokal yang meneruskannya ke Cloud Database.
  - Frontend React melakukan _HTTP Polling_ (`GET /api/messages/{userId}`) setiap 2–3 detik untuk menampilkan pesan terbaru tanpa _refresh_ halaman.

### FR-04: Sinkronisasi Waktu Server Cloud

- **Deskripsi:** Seluruh pencatatan waktu dalam sistem wajib mengacu pada waktu Cloud Database agar seragam meskipun jam lokal perangkat user berbeda.
- **Detail:**
  - Kolom `sent_at` pada pesan dan `backed_up_at` pada log backup diisi otomatis oleh `CURRENT_TIMESTAMP` di MySQL Cloud (bukan jam PHP lokal atau jam browser).
  - UI React menampilkan indikator **Waktu Server Cloud** di bagian header yang diambil dari `SELECT NOW()`.

### FR-05: Backup Data ke Desktop Lokal (Modifikasi Arsitektur)

- **Deskripsi:** Pengguna dapat meminta pencadangan data dari Cloud Database ke perangkat desktop/PC Pengelola Backup Storage.
- **Detail:**
  - Tersedia tombol **"Backup Data"** di antarmuka React.
  - Saat diklik, Laravel lokal mengirim permintaan `POST` HTTP ke layanan di PC Backup Storage.
  - PC Backup Storage menarik salinan data dari Cloud Database dan menyimpannya ke direktori lokal (format `.sql` atau `.json`) dengan penamaan berbasis waktu server cloud.
  - Status keberhasilan/kegagalan backup dicatat di tabel `backup_logs` dan ditampilkan kembali ke pengguna yang meminta.

### FR-06: Pemulihan Data (Disaster Recovery / Restore)

- **Deskripsi:** Pengelola Backup Storage dapat memulihkan data apabila Cloud Database mengalami gangguan atau kehilangan data.
- **Detail:**
  - Tersedia endpoint/skrip `restore` di PC Backup Storage yang membaca file cadangan lokal terbaru.
  - Proses _restore_ mengembalikan data tabel `users`, `messages`, dan `backup_logs` ke Cloud Database secara utuh.

---

## 5. Persyaratan Non-Fungsional (Non-Functional Requirements)

| Kategori                | Persyaratan                                                                                                                                                           |
| :---------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Arsitektur**          | Setiap anggota (peran Client + App Server) wajib menjalankan server Laravel & frontend React secara mandiri di laptop masing-masing (Laragon/XAMPP).                  |
| **Protokol Komunikasi** | Seluruh pertukaran data antara Client, Application Server, dan Backup Storage wajib menggunakan protokol **HTTP**.                                                    |
| **Keamanan**            | Password wajib di-hash (Bcrypt/Argon2); seluruh query database wajib terlindungi dari SQL Injection (Eloquent/Query Builder); proteksi CORS dikonfigurasi di Laravel. |
| **Kemandirian Backup**  | Backup Storage wajib menggunakan penyimpanan fisik lokal di PC/Desktop anggota dan **dilarang** menggunakan Google Drive.                                             |
| **Usabilitas**          | Antarmuka React bersih, responsif, dan mudah dipahami saat didemokan di depan dosen/penguji.                                                                          |

---

## 6. Alur Pengguna & Daftar Halaman (UI React)

1. **Halaman Login & Register (`/login`, `/register`)**
   - Input Username/Email & Password, pesan error validasi yang jelas, dan tautan pindah antar halaman.
2. **Halaman Utama Chat (`/`)**
   - **Header:** Nama user yang sedang login, badge **Jam Server Cloud**, tombol **"Backup Data"**, dan tombol **Logout**.
   - **Sidebar Kiri:** Daftar kontak pengguna lain yang terdaftar.
   - **Area Utama (Kanan):** Gelembung chat (kanan untuk pesan terkirim, kiri untuk pesan diterima) lengkap dengan _timestamp_ dari Cloud DB, serta kolom input & tombol kirim pesan.
   - **Modal/Panel Riwayat Backup:** Menampilkan daftar log backup yang pernah diminta oleh user tersebut (nama file, waktu cloud, status).

---

## 7. Rencana Pengerjaan (Sprint 5 Hari: 25 – 30 Nov 2026)

| Tanggal       | Fokus Pekerjaan                                                                                                                                                   | Penanggung Jawab                              |
| :------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- |
| **25–26 Nov** | Setup Cloud MySQL & migrasi tabel; inisialisasi repo Laravel + Sanctum dan React (Vite + Tailwind); fitur Register & Login.                                       | Pengelola Cloud DB + Tim App Server           |
| **27 Nov**    | Implementasi REST API & UI Chat 1-on-1 (HTTP Polling), aturan privasi/anti-IDOR, dan sinkronisasi waktu Cloud DB.                                                 | Tim App Server (Laravel & React)              |
| **28 Nov**    | Pembuatan service Backup Storage di PC Desktop (endpoint trigger backup ke file lokal + skrip restore) & integrasi tombol Backup di React.                        | Pengelola Backup Storage + 1 orang App Server |
| **29 Nov**    | Instalasi repo di seluruh laptop anggota (3–4 perangkat), uji coba koneksi lintas laptop ke Cloud DB & PC Backup, simulasi _crash & restore_, serta gladi bersih. | Seluruh Anggota Kelompok                      |
| **30 Nov**    | **Presentasi & Demo Langsung Sistem.**                                                                                                                            | Seluruh Anggota Kelompok                      |

---

## 8. Kriteria Penerimaan (Acceptance Criteria)

Proyek dinyatakan siap dipresentasikan apabila seluruh poin berikut lulus pengujian:

- [ ] Minimal 3 perangkat anggota menjalankan Laravel + React secara lokal dan terhubung ke 1 Cloud Database yang sama.
- [ ] User berhasil mendaftar, login, dan logout dengan password terenkripsi di database.
- [ ] Pesan terkirim dari Laptop A muncul di Laptop B melalui protokol HTTP.
- [ ] User C terbukti tidak dapat melihat pesan antara User A dan User B.
- [ ] Perubahan jam sistem di salah satu laptop tidak memengaruhi _timestamp_ pesan (tetap mengikuti waktu Cloud DB).
- [ ] Menekan tombol Backup menghasilkan file cadangan baru di harddisk lokal PC Backup Storage (bukan Google Drive).
- [ ] Simulasi penghapusan data di Cloud DB berhasil dipulihkan kembali menggunakan file dari PC Backup Storage.
