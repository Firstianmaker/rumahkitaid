# Hasil verifikasi lokal

Tanggal: 28 September 2026. Backend menggunakan MySQL 8.4 portable; pengujian browser menggunakan hasil build produksi Next.js melalui Microsoft Edge.

| Pemeriksaan | Hasil |
| --- | --- |
| Validasi skema dan migrasi Prisma | Lulus, database demo dan tes terpisah |
| Build TypeScript backend | Lulus |
| Unit test backend | 6 lulus |
| Skenario integrasi MySQL | 14 lulus (15 entri termasuk suite induk pada output Node) |
| Build produksi frontend | Lulus |
| Browser desktop/mobile | 7 lulus; 1 duplikasi lifecycle pada mobile sengaja dilewati |
| npm audit | 0 advisori terdeteksi setelah override deepmerge-ts 8 |
| Persistensi dokumen | Hash isi dokumen identik sebelum dan setelah API restart |
| Health check setelah restart | `status: ok`, `demo: true` |

Tes browser menguji katalog, detail unit, login, seluruh menu per peran, pembuatan maintenance, dan satu siklus lengkap: registrasi penyewa → pengajuan → persetujuan pengelola → unggah PDF dua pihak → verifikasi kontrak → bukti pembayaran manual → verifikasi pembayaran → simulasi deposit → inspeksi masuk → move-in → meter bulanan → inspeksi keluar → penerapan deposit → pengembalian deposit → unit tersedia kembali. Origin lintas situs juga ditolak.

Tes integrasi mencakup konflik reservasi, akses dokumen pengguna lain, validasi signature berkas, penolakan dan unggah ulang bukti, verifikasi pembayaran ganda, simulasi yang dinonaktifkan, meter menurun, catch-up tagihan bulanan bersamaan, serta kekurangan deposit yang tetap dapat dilunasi setelah move-out.

Screenshot desktop/mobile dan trace kegagalan terakhir disimpan lokal di `apps/web/test-results` dan tidak masuk Git. Pemeriksaan visual memastikan katalog dan dashboard responsif; tabel lebar menggunakan scroll horizontal di dalam panel pada layar kecil.

Tidak ada deployment online atau transaksi dana nyata. Supabase Storage adalah adapter opsional dan belum diuji terhadap akun online; demo memakai storage lokal yang telah diuji persistensinya.

Revisi profil dan fasilitas (28 September 2026): migrasi aditif berhasil pada database demo dan tes. Tes memeriksa penghasilan wajib/nonnegatif, konsistensi jumlah penghuni dan peliharaan, kepemilikan bukti penghasilan, serta akses profil pengelola. Tes browser memverifikasi penyimpanan centang fasilitas pada desktop/mobile, pengajuan dengan anak/lansia/peliharaan dan bukti penghasilan, serta detail profil di modal persetujuan dan Data penyewa. Build produksi berhasil. Screenshot form dan tinjauan pengajuan diperiksa secara visual.

