# RumahKita.id

Platform pengelolaan kontrakan satu properti: Next.js + TypeScript, NestJS, Prisma, dan MySQL. UI berbahasa Indonesia dengan Playfair Display, Lato, dan warna utama `#FF9900`.

## Demo lokal pada komputer ini

Kode sumber tetap berada di folder proyek. Karena drive C hampir penuh, dependensi, MySQL portable, serta salinan runtime frontend berada di `D:\RumahKita-runtime`. Tidak ada Windows service yang dipasang.

```powershell
.\scripts\start-local.ps1
```

- Aplikasi: <http://127.0.0.1:3000>
- Dokumentasi API Swagger: <http://127.0.0.1:4000/api/docs>
- Health check: <http://127.0.0.1:4000/api/v1/health>
- MySQL portable: `127.0.0.1:3308`; database demo `rumahkita`, database tes terpisah `rumahkita_test`.
- Log server: `.runtime/api-out.log`, `.runtime/api-error.log`, `.runtime/web-out.log`, dan `.runtime/web-error.log`.

Starter menggunakan hasil build produksi jika sudah tersedia. Untuk pengembangan, hentikan proses frontend milik proyek terlebih dahulu lalu jalankan `.\scripts\start-local.ps1 -Development`; mode ini menyinkronkan `apps/web` ke runtime D secara otomatis. Backend perlu dibangun ulang dan proses API di-restart setelah perubahan backend. Jangan menjalankan `npm install` pada junction `node_modules` komputer ini: jalankan di workspace runtime D setelah menyinkronkan manifest; salin kembali lockfile ke proyek. Untuk komputer baru dengan ruang cukup, gunakan instalasi standar di bawah.

### Akun demo

| Peran | Email | Password awal |
| --- | --- | --- |
| Pengelola | `pengelola@rumahkita.local` | `ChangeThisDemoPassword123!` |
| Penyewa aktif | `penyewa@rumahkita.local` | `ChangeThisDemoPassword123!` |

Password mengikuti `SEED_PASSWORD` saat seed pertama. Seed tidak mengganti password atau data yang sudah ada. Akun penyewa aktif sudah memiliki kontrak; untuk mencoba pengajuan baru, daftar akun baru dari halaman Masuk. Semua rekening, penyewa, bukti, dan pembayaran demo bersifat fiktif. Jangan mentransfer dana nyata.

## Instalasi standar

Prasyarat: Node.js 22+, npm, Docker Compose (atau MySQL 8.4 yang sudah berjalan).

```sh
npm ci
cp .env.example .env
docker compose up -d mysql
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
# Terminal kedua
npm run dev:web
```

Pada PowerShell, gunakan `Copy-Item .env.example .env`. Sesuaikan `DATABASE_URL`, `SEED_PASSWORD`, dan `SEED_DEMO=true`. Seed membuat 20 unit dengan campuran status, 12 penyewa aktif, pengelola, kontrak, pembayaran, pengumuman, dan laporan maintenance. Batas 20 unit hanya ada pada seed, bukan aturan backend.

`npm run build` membangun backend dan frontend; gunakan `npm run start -w @rumahkita/api` dan `npm run start -w @rumahkita/web` untuk menjalankan hasil build. Build frontend pada komputer ini dilakukan di workspace runtime D karena Next.js/webpack tidak menangani lintas drive dengan baik.

## Alur yang tersedia

1. Pengunjung melihat, mencari, dan memfilter unit; tombol Ajukan Sewa mempertahankan unit pilihan setelah login/daftar.
2. Penyewa mengajukan tanggal masuk, jumlah penghuni, pekerjaan, dan catatan. Pengajuan tidak menahan unit.
3. Pengelola menyetujui sewa, durasi bulan penuh, deposit, dan jatuh tempo. Transaksi serializable mencegah dua persetujuan untuk unit yang sama.
4. Pengelola mengunggah PDF. Penyewa mengunduh, menandatangani di luar aplikasi, dan mengunggah salinannya. Pengelola memverifikasi dan sistem menerbitkan sewa awal serta deposit.
5. Penyewa mengunggah bukti pembayaran. Pengelola menerima/menolak; bukti yang ditolak dapat dikirim ulang. Tombol simulasi berhasil/gagal hanya berfungsi ketika `DEMO_MODE=true`.
6. Setelah pembayaran awal dan inspeksi lengkap, pengelola mengonfirmasi move-in. Tagihan sewa bulanan diproses saat dashboard/halaman tagihan dibuka atau melalui tombol pengelola, sehingga tidak bergantung pada scheduler selalu hidup.
7. Pengelola mencatat meter listrik/air bulanan; meter awal harus cocok dengan catatan sebelumnya. Tarif disalin ke catatan historis. Penyewa dapat membuat maintenance dengan foto dan komentar; pengelola mengubah status. Pengumuman dapat ditujukan ke semua penghuni atau unit tertentu.
8. Inspeksi keluar mencatat meter akhir dan kondisi rumah. Move-out menerbitkan utilitas akhir/kerusakan dan menerapkan deposit terhadap tunggakan. Kekurangan tetap menjadi tagihan. Sisa deposit dicatat sebagai pengembalian tertunda sampai pengelola merekam referensi pengembalian.
9. Unit masuk maintenance setelah move-out dan baru tersedia kembali setelah dinyatakan siap. Laporan memisahkan penerimaan sewa/utilitas, saldo deposit, tunggakan, dan transaksi simulasi; tersedia ekspor CSV.

Sewa tidak memiliki prorata, cicilan, atau denda otomatis. Tanggal jatuh tempo dibatasi hari terakhir bulan; jika tanggal itu mendahului awal periode sewa, jatuh tempo memakai bulan berikutnya. Sewa awal jatuh tempo saat mulai kontrak. Tidak ada gateway, integrasi bank, email/WhatsApp, tanda tangan elektronik tersertifikasi, atau layanan multi-properti.

## Struktur dan kontrak API

- `apps/api`: controller, DTO tervalidasi, autentikasi, aturan sewa, penyimpanan, serta tes backend.
- `apps/web`: rute publik dan ruang kerja per peran; API proxy same-origin menggunakan cookie HttpOnly.
- `prisma`: skema, migrasi MySQL, dan seed idempoten.
- `packages/api-client`: OpenAPI dan tipe request yang dihasilkan.
- `scripts`: starter lokal opsional dan runtime mirror untuk keterbatasan drive komputer ini.

Perbarui kontrak API setelah perubahan DTO/controller:

```sh
npm run openapi -w @rumahkita/api
npm run api:types
```

API menggunakan `/api/v1`. Grup resource: `auth`, `units`, `applications`, `leases`, `invoices`, `payments`, `documents`, `tickets`, `announcements`, `settings`, `tenants`, `reports`, dan `audit`. Tindakan persetujuan, verifikasi, move-in, move-out, serta refund adalah endpoint POST eksplisit. Akses data dan lampiran diperiksa di backend, bukan hanya disembunyikan pada antarmuka.

## Pengujian

```sh
npm test
docker compose --profile test up -d mysql-test
# Migrate database yang ditentukan TEST_DATABASE_URL terlebih dahulu:
# PowerShell: $env:DATABASE_URL = 'mysql://rumahkita:rumahkita_local@127.0.0.1:3307/rumahkita_test'
npm run db:migrate
# PowerShell: Remove-Item Env:DATABASE_URL
npm run test:integration
npm run test:e2e
```

Tes integrasi **menghapus isi database pengujian** dan menolak URL yang tidak berakhiran `_test`. Jangan menunjuk database demo/operasional. Tes browser membutuhkan demo lokal yang berjalan dan Microsoft Edge; kredensial dapat disesuaikan lewat `SEED_PASSWORD`. Tes browser menambahkan data dummy maintenance dan perjalanan sewa pada database demo. Screenshot dan trace tersimpan di `apps/web/test-results` (diabaikan Git).

Unit test memeriksa kalender, pemakaian meter, dan deposit. Tes API menguji siklus sewa serta konkurensi, isolasi dokumen, validasi file, penolakan bukti, verifikasi ganda, penagihan, maintenance, refund, dan laporan. CI menjalankan unit/integration test pada MySQL terisolasi serta build kedua aplikasi.

## Penyimpanan dan konfigurasi

Default `STORAGE_DRIVER=local`: dokumen berada di `UPLOAD_DIR` dan tidak diekspos sebagai direktori statis. Akses download memerlukan sesi. Berkas dibatasi 5 MB dan signature PDF/JPEG/PNG diperiksa. Untuk Supabase opsional, gunakan bucket privat dan isi `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, serta `SUPABASE_STORAGE_BUCKET`; service key hanya untuk backend dan download menggunakan URL 60 detik setelah otorisasi.

Cookie sesi berlaku tujuh hari, token disimpan sebagai hash, password di-hash bcrypt, autentikasi dibatasi per IP, dan proxy menolak origin berbeda pada mutation. Data uang menggunakan kolom MySQL DECIMAL; proses reservasi dan pencatatan uang menggunakan transaksi. Jangan memasukkan `.env`, data MySQL, atau berkas upload ke Git.

Deployment online tidak dilakukan, sesuai permintaan terbaru untuk demo lokal saja. Konfigurasi online perlu menyesuaikan host bind API, cookie HTTPS, secret, database TLS, dan storage persisten.

## Aset

Foto ilustrasi: [Facade of a House — Christopher Moon / Pexels](https://www.pexels.com/photo/facade-of-a-house-12558933/), digunakan sesuai [lisensi Pexels](https://www.pexels.com/license/). Foto bukan dokumentasi unit aktual. Font Playfair Display dan Lato dibundel lokal melalui Fontsource, sehingga browser tidak perlu menghubungi Google Fonts.

## Revisi profil penyewa dan fasilitas

Tambah/edit unit memakai kotak centang fasilitas. Nilai fasilitas lama tetap ditampilkan saat mengedit.

Pengajuan baru memuat alamat, status pekerjaan, profesi, tempat bekerja/usaha, penghasilan bersih bulanan, sumber pembayaran sewa, dan bukti penghasilan opsional. Komposisi penghuni memisahkan dewasa (18–59 tahun), anak (di bawah 18), serta lansia (60 tahun ke atas); jumlah total dihitung dari rincian. Peliharaan dicatat berdasarkan jenis, jumlah, dan keterangan. Pengelola dapat memeriksa profil melalui Pengajuan sewa, modal persetujuan, dan Data penyewa → Data pribadi.

Migrasi penambahan kolom mempertahankan data lama sebagai belum dilengkapi; nilai gaji atau komposisi penghuni tidak ditebak. Penghasilan merupakan laporan pemohon, bukan verifikasi otomatis kemampuan membayar. Bukti hanya dapat diunggah/ditautkan pemilik dan dibaca oleh pemilik atau pengelola.
