# ConduitMsg — Frontend Design System (`DESIGN.md`)

**Versi:** 2.0 (Telegram / Chatgram Web Style + Anti-Slop Compliance)  
**Target:** Web SPA (React 19 + Vite + Tailwind CSS)  
**Referensi Struktural & Gaya:** Chatgram Web App UI Kit (Telegram Desktop/Web Light Mode)  
**Acuan Fungsional:** [PRD ConduitMsg](../knowledge-prd/prd_sistem_pertukaran_pesan_terdistribusi.md) (FR-01 s.d. FR-05)

---

## 1. Arah Desain & Aturan Anti-Slop

Versi 2.0 menggantikan gaya *floating pill* sebelumnya dengan arsitektur **Telegram Web / Chatgram Desktop** yang padat, rata (*flat*), dan berorientasi utilitas pesan, sambil mematuhi aturan `antislop-ui`:

1. **Full-Bleed Master-Detail Shell (Tanpa SaaS Top Navbar):** Layar langsung terbagi menjadi 2 kolom penuh setinggi layar (`100dvh`) yang dipisahkan garis tipis `1px solid var(--color-border)` — bukan topbar dashboard generik.
2. **Hierarki Radius Terukur (Anti Pill-Soup — R-11):** Bentuk lingkaran (`9999px`) **hanya** dipakai untuk avatar pengguna. Input, tombol, baris kontak, bubble chat, dan modal masing-masing memiliki radius fungsional yang berbeda (`6px` / `10px` / `12px` / `14px`).
3. **Elevasi Punya Alasan Tertulis (R-10, R-12, R-13):**
   - **Tanpa glassmorphism (`backdrop-filter: blur`)**, tanpa *radial gradient glow*, dan tanpa *pulsing/glowing status dot*.
   - Header, sidebar, dan composer duduk **flat** di bidang dasar (*ground plane*).
   - Shadow mikro hanya dipakai pada bubble putih di atas kanvas chat `#F1F5F9`, dan shadow penuh hanya dipakai pada `<dialog>` modal yang berada di *top layer*.
4. **Satu Aksen yang Disengaja (R-01, R-29):** Warna biru brand tidak disebar ke seluruh border dan chip, melainkan difokuskan pada **baris kontak aktif**, **aksi utama (Kirim / Submit / Backup)**, dan **focus ring**. Bubble pesan terkirim memakai tint lembut `--color-primary-soft` (`#EBF3FA`) dengan teks gelap `#0F172A` seperti Telegram Light Mode agar mata tidak lelah dan kontras tetap tajam.
5. **Nol Kontrol Mati & Nol Data Palsu (R-17, R-23, R-26, R-38):**
   - Fitur Telegram di luar cakupan PRD (*Folder Tabs, Stories, Voice/Video Call, Attachment Clip, Emoji/Sticker Picker, Online/Last Seen palsu, Read Receipts `✓✓`*) **tidak ditampilkan** agar tidak ada tombol mati.
   - Placeholder form menggunakan instruksi jujur (`username atau email@domain.com`, `Tulis pesan...`), bukan nama orang karangan.

---

## 2. Color Palette & Design Tokens (TIDAK DIUBAH)

Palet warna dipertahankan 100% sama dengan ketetapan sebelumnya (`#3D85C6` beserta pasangan kontras WCAG AA-nya):

```css
:root {
  /* Brand Primary (Tetap — #3D85C6 + varian kontras WCAG AA) */
  --color-primary: #3D85C6;          /* Focus ring, garis aksen aktif, brand accent */
  --color-primary-aa: #2B6AA3;       /* Fill baris kontak aktif, tombol utama & tombol kirim (AA 5.68:1 dgn putih) */
  --color-primary-hover: #235888;    /* Hover tombol utama */
  --color-primary-deep: #1D4B75;     /* Timestamp bubble outgoing, teks link & aksen gelap */
  --color-primary-soft: #EBF3FA;     /* Fill bubble pesan terkirim (outgoing) ala Telegram Light */
  --color-primary-border: #C5DDF2;   /* Border tipis pendukung pada komponen bertema biru */

  /* Canvas & Surfaces */
  --color-bg-canvas: #FFFFFF;        /* Sidebar kiri, top chat bar, composer bar, bubble incoming, modal */
  --color-bg-sidebar: #F8FAFC;       /* Surface sekunder (input di atas putih, latar halaman auth) */
  --color-bg-subtle: #F1F5F9;        /* Kanvas latar ruang pesan (chat stream) & search input */
  --color-border: #E2E8F0;           /* Hairline divider 1px antar panel & bar */

  /* Typography */
  --color-text-primary: #0F172A;     /* Teks pesan utama (incoming & outgoing), judul, username */
  --color-text-secondary: #475569;   /* Label sekunder & tombol ikon netral */
  --color-text-muted: #526071;       /* Timestamp incoming, placeholder, sub-info (AA >= 6:1) */
  --color-text-on-primary: #FFFFFF;  /* Teks & ikon di atas baris kontak aktif / tombol #2B6AA3 */

  /* Semantic Status */
  --color-success: #047857;          /* Status backup SUCCESS & indikator teks Cloud Time tersinkron */
  --color-success-soft: #ECFDF5;
  --color-danger: #B91C1C;           /* Status backup FAILED, aksi kirim ulang (Resend), error validasi */
  --color-danger-soft: #FEF2F2;

  /* Skala Radius Fungsional (Bukan serba pill) */
  --radius-sm: 6px;                  /* Tag status (SUCCESS/FAILED), date chip */
  --radius-md: 10px;                 /* Input, search box, tombol, item kontak aktif, tombol kirim */
  --radius-bubble: 12px;             /* Sudut utama gelembung pesan (sudut ekor: 4px) */
  --radius-lg: 14px;                 /* Native <dialog> modal & panel form auth */
  --radius-full: 9999px;             /* KHUSUS avatar lingkaran */

  /* Elevasi Terbatas (R-12) */
  --shadow-bubble: 0 1px 2px rgba(15, 23, 42, 0.06); /* Memisahkan bubble putih dari kanvas #F1F5F9 */
  --shadow-modal: 0 16px 40px -8px rgba(15, 23, 42, 0.20); /* Khusus top-layer <dialog> */
}
```

---

## 3. Tipografi
- **Font Utama:** `DM Sans`, fallback `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif` (bersih, mudah dipindai untuk daftar pesan padat ala desktop messenger).
- **Angka & Waktu:** `font-variant-numeric: tabular-nums` wajib diterapkan pada **Jam Server Cloud**, timestamp di dalam bubble pesan (`sent_at`), dan waktu log backup (`backed_up_at`).
- **Larangan Tipografi (`antislop-ui` R-06):** Dilarang menggunakan heading monospace atau huruf kapital dengan *letter-spacing* ekstrem (`tracking-widest` berlebihan) sebagai dekorasi.

| Elemen | Ukuran | Weight | Line Height |
| :--- | :--- | :--- | :--- |
| Judul Halaman Auth / Modal | `18px` – `20px` | `600` (SemiBold) | `1.3` |
| Nama Kontak (Top Bar & Sidebar) | `14px` – `15px` | `600` (SemiBold) | `1.25` |
| Isi Pesan Chat (`MessageBubble`) | `14.5px` – `15px` | `400` (Regular) | `1.45` |
| Kontrol Input & Tombol | `14px` | `500` (Medium) | `1.2` |
| Timestamp Inline & Sub-label | `12px` | `400` – `500` | `1.2` |

---

## 4. Arsitektur Layout & Spesifikasi Komponen (Gaya Chatgram / Telegram Web)

```text
+-------------------------------+---------------------------------------------------+
| SIDEBAR KIRI (340px, #FFFFFF) | WORKSPACE CHAT KANAN (flex: 1, 100dvh)            |
|-------------------------------|---------------------------------------------------|
| Akun: [AV] @username  [Logout]| [AV] @kontak_aktif       [Cloud 02:35:11] [Backup]|
| [ Cari kontak... (#F1F5F9)  ] |---------------------------------------------------|
|-------------------------------|                 (Kanvas #F1F5F9)                  |
| > [AV] @andi_pratama  (Aktif  |   [ 26 Nov 2026 ]                                 |
|        fill solid #2B6AA3)    |                                                   |
|   [AV] @citra_dewi            |   +---------------------------------+             |
|   [AV] @dimas_backup          |   | Pesan masuk di bubble putih     |             |
|                               |   |                          02:31  |             |
|                               |   +---------------------------------+             |
|                               |                                                   |
|                               |             +---------------------------------+   |
|                               |             | Pesan keluar (#EBF3FA)          |   |
|                               |             |                          02:32  |   |
|                               |             +---------------------------------+   |
|                               |---------------------------------------------------|
|                               | [ Tulis pesan...                         ] [Send] |
+-------------------------------+---------------------------------------------------+
```

### A. Panel Kiri — Sidebar & Daftar Kontak (`ContactSidebar.jsx`)
- **Lebar:** `340px` tetap di desktop (`md:w-[340px]`), `100%` di layar mobile saat belum ada kontak yang dibuka; dipisahkan `border-right: 1px solid #E2E8F0` di atas permukaan `#FFFFFF`.
- **Sidebar Header (Pengganti Global Navbar):**
  - Baris utilitas akun aktif: Avatar lingkaran inisial (`36px`, `#2B6AA3`) + `@username` (`14px SemiBold`) di sisi kiri, tombol ikon/teks ringkas **Logout** di sisi kanan (dengan accessible label jelas).
  - Baris pencarian di bawahnya: input `height: 38px`, `background: #F1F5F9`, `border-radius: 10px`, border transparan yang berubah menjadi `1px solid #3D85C6` + background `#FFFFFF` saat fokus (persis perilaku search bar Telegram Web).
  - Di layar mobile (saat panel kanan tersembunyi), bar utilitas sidebar juga menampilkan jam `Cloud Time` & tombol `Backup` agar tetap mudah dijangkau.
- **Baris Kontak (`Chatgram Item`):**
  - Hanya menampilkan data sesuai **FR-02 PRD**: Avatar inisial (`42px`), `@username`, dan keterangan singkat `User #<id>` (tanpa email).
  - Padding list `8px`, tiap item memiliki `border-radius: 10px`, `padding: 10px 12px`, tinggi minimum `56px` (memenuhi target sentuh ≥ 44px).
  - **State Default / Hover:** Background transparan di atas `#FFFFFF`, hover `#F1F5F9`.
  - **State Aktif (Khas Telegram Desktop/Chatgram):** Seluruh baris memakai background solid `--color-primary-aa` (`#2B6AA3`), teks `@username` & sub-label berubah menjadi putih (`#FFFFFF`), dan avatar memakai kontras putih/transparan halus agar langsung terlihat tegas tanpa bergantung pada garis tepi tipis.

### B. Panel Kanan — Top Chat Bar (`ChatHeader` / `Header.jsx` terintegrasi)
- **Bentuk:** Bar rata (*docked flat bar*) setinggi `56px` di bagian atas panel kanan (`background: #FFFFFF`, `border-bottom: 1px solid #E2E8F0`, padding horizontal `16px`). **Bukan** pill melayang.
- **Sisi Kiri:**
  - Tombol kembali `<` (`md:hidden`) untuk layar kecil.
  - Jika kontak dipilih: Avatar inisial (`36px`) + `@username` (`15px SemiBold`) + subteks faktual `Percakapan 1-on-1` (tanpa status *online/typing* palsu).
  - Jika belum ada kontak dipilih: label ringkas `ConduitMsg`.
- **Sisi Kanan (Utilitas Sistem Wajib PRD):**
  - **CloudClockBadge (`CloudClockBadge.jsx`):** Tampilan waktu server cloud datar & presisi (`Cloud · 02:35:11`, `tabular-nums`, klik untuk sinkron ulang `GET /api/me`). Tanpa glow dan tanpa animasi kedip/pulse.
  - **Tombol Backup Data:** Tombol `border-radius: 10px` (`padding: 8px 12px`, solid `#2B6AA3`, hover `#235888`, teks putih `Backup Data` + ikon relevan) yang membuka `BackupModal`.

### C. Ruang Pesan & Gelembung Chat (`ChatWindow.jsx` & `MessageBubble.jsx`)
- **Kanvas Pesan:** Background `--color-bg-subtle` (`#F1F5F9`), tanpa grid/pola dekoratif AI. Kolom pesan di tengah memiliki `max-width: 760px` agar ukuran baris teks tetap nyaman dibaca di monitor lebar.
- **Date Divider (Berdasarkan data asli):** Pemisah tanggal sederhana (`12px`, `#475569`, background `#FFFFFF`, `border: 1px solid #E2E8F0`, `border-radius: 6px`) yang muncul otomatis setiap kali tanggal `sent_at` berganti.
- **Gelembung Pesan Khas Telegram (`MessageBubble.jsx`):**
  - **Incoming (Kiri):** Background `#FFFFFF`, teks `#0F172A`, `border-radius: 12px 12px 12px 4px`, `box-shadow: var(--shadow-bubble)`. Timestamp (`HH:MM:SS`, `12px tabular-nums`, `#526071`) ditempatkan **inline di pojok kanan-bawah di dalam bubble** (gaya asli Telegram).
  - **Outgoing (Kanan):** Background `--color-primary-soft` (`#EBF3FA`), border tipis `1px solid var(--color-primary-border)` (`#C5DDF2`), teks `#0F172A` (kontras tinggi > 13:1), `border-radius: 12px 12px 4px 12px`, `box-shadow: var(--shadow-bubble)`. Timestamp inline di pojok kanan-bawah dalam bubble berwarna `--color-primary-deep` (`#1D4B75`).
  - **Status Gagal Kirim:** Jika request HTTP gagal, tampilkan baris aksi fungsional di bawah bubble berwarna `#B91C1C` (`Gagal terkirim · Kirim ulang`).
- **Empty State Jujur (`antislop-ui` R-27):**
  - Belum pilih kontak: teks ringkas di tengah kanvas `#F1F5F9` — *"Pilih kontak di panel kiri untuk membuka percakapan."*
  - Percakapan masih kosong: *"Belum ada pesan dengan @username. Tulis pesan di bawah untuk memulai."*

### D. Composer Bar Bawah (`MessageInput.jsx`)
- **Bentuk:** Docked bar rata di bagian bawah panel kanan (`background: #FFFFFF`, `border-top: 1px solid #E2E8F0`, `padding: 10px 16px`), tanpa bayangan melayang dan tanpa gradient penutup.
- **Isi:**
  - `<form>` sejajar kolom pesan (`max-width: 760px`): satu `<input>` bersih (`height: 40px`, `border-radius: 10px`, `background: #F8FAFC`, `border: 1px solid #E2E8F0`, fokus `border-color: #3D85C6` + `background: #FFFFFF`, placeholder `"Tulis pesan..."`).
  - Satu tombol submit **Kirim** (`40px × 40px`, `border-radius: 10px`, solid `#2B6AA3`, hover `#235888`, ikon pesawat kertas `Send`). Tidak ada ikon klip/mikrofon/emoji yang tidak berfungsi.

### E. Halaman Login & Register (`AuthPage.jsx`, `LoginForm.jsx`, `RegisterForm.jsx`)
- **Gaya Telegram Web Sign-In:** Latar polos bersih `--color-bg-sidebar` (`#F8FAFC`) **tanpa radial gradient**.
- Kontainer kartu sederhana (`max-width: 380px`, `background: #FFFFFF`, `border: 1px solid #E2E8F0`, `border-radius: 14px`, `padding: 28px`, tanpa shadow besar).
- Identitas di bagian atas: kotak logo rata (`44px × 44px`, `border-radius: 10px`, `#2B6AA3`), judul `Masuk ke ConduitMsg` / `Daftar Akun ConduitMsg`, tanpa eyebrow badge di atas judul.
- Semua `<input>` dan `<button type="submit">` memakai `border-radius: 10px` (`height: 44px`).
- Placeholder jujur: `username atau email@domain.com`, `username_anda`, `nama@domain.com`, `Password`.
- Tetap mempertahankan standar `modern-web-guidance`: `autocomplete="username"`, `autocomplete="current-password"` / `"new-password"`, tombol Show/Hide Password, hint di atas input, dan validasi `:user-invalid`.

### F. Modal Desktop Backup Storage (`BackupModal.jsx`)
- Native `<dialog>` dibuka dengan `showModal()`, `closedby="any"` (+ fallback klik luar), `border-radius: 14px`, `border: 1px solid #E2E8F0`, `box-shadow: var(--shadow-modal)`.
- `dialog::backdrop` menggunakan warna gelap datar `rgba(15, 23, 42, 0.40)` **tanpa `backdrop-filter: blur`**.
- Bagian atas berisi aksi langsung: penjelasan 1 kalimat + tombol `Backup Sekarang` (`border-radius: 10px`, `#2B6AA3`).
- Daftar riwayat `backup_logs` menggunakan baris tabel/list rapat dengan kolom yang memang dibutuhkan user: `file_name` (monospace), timestamp Cloud DB (`tabular-nums`), dan tag status `SUCCESS` / `FAILED` (`border-radius: 6px`).

---

## 5. Checklist Kepatuhan Sebelum Rilis (`antislop-ui` + PRD)
- [ ] Palet warna 100% menggunakan token `#3D85C6` / `#2B6AA3` dkk. tanpa perubahan warna dan tanpa gradien dekoratif.
- [ ] Lingkaran penuh (`rounded-full`) hanya ada pada elemen Avatar.
- [ ] Tidak ada tombol/ikon mati (tanpa tombol call, attachment, folder tab, atau stiker).
- [ ] Tidak ada status dot berkedip/glow, eyebrow pill di atas judul, maupun nama placeholder palsu.
- [ ] Semua fitur wajib PRD tetap utuh: Login/Register, Isolasi Kontak (`id` + `username`), Chat HTTP Polling, Jam & Timestamp Cloud DB, serta Trigger & Log Backup Lokal.
