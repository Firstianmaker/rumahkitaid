import { test, expect, Page } from '@playwright/test';
const password = process.env.SEED_PASSWORD || 'ChangeThisDemoPassword123!';
const pdf = {
  name: 'kontrak-demo.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF',
  ),
};
async function login(page: Page, email: string) {
  await page.goto('/masuk');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Selamat datang,/ })).toBeVisible();
}
test('Sewa baru: pengajuan, PDF dua pihak, bukti pembayaran, meter, dan deposit', async ({
  page,
  browser,
}, info) => {
  test.skip(
    info.project.name === 'mobile',
    'Siklus transaksi dijalankan sekali; navigasi mobile diuji terpisah.',
  );
  test.setTimeout(240000);
  const name = `Penghuni E2E ${Date.now()}`,
    email = `browser-${Date.now()}@test.local`;
  const adminContext = await browser.newContext({
      baseURL: process.env.E2E_URL || 'http://127.0.0.1:3000',
    }),
    admin = await adminContext.newPage();
  try {
    await page.goto('/unit');
    const card = page.locator('.unit-card').first();
    await expect(card).toBeVisible();
    const unitCode = (await card.locator('.unit-code').innerText()).trim(),
      unitPath = await card.getAttribute('href');
    await card.click();
    await page.getByRole('link', { name: 'Ajukan sewa' }).click();
    await page.getByRole('button', { name: 'Daftar sekarang' }).click();
    await page.getByLabel('Nama lengkap').fill(name);
    await page.getByLabel('Nomor telepon').fill('081234567891');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Buat akun', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ajukan rumah pilihan Anda' })).toBeVisible();
    await page.getByLabel('Pekerjaan / profesi').fill('Pengujian aplikasi');
    await page.getByLabel('Alamat tempat tinggal saat ini').fill('Jalan Pengujian nomor 12');
    await page.getByLabel('Tempat bekerja / nama usaha').fill('Perusahaan Demo');
    await page.getByLabel('Penghasilan bersih per bulan').fill('7500000');
    await page.getByLabel('Sumber dana pembayaran sewa').fill('Gaji bulanan');
    await page.getByLabel('Bukti penghasilan (opsional)').setInputFiles(pdf);
    await page.getByLabel('Rencana tinggal').selectOption('FAMILY');
    await page.getByLabel('Ada anak').check();
    await page.getByLabel('Ada lansia').check();
    await page.getByLabel('Membawa hewan peliharaan').check();
    await page.getByLabel('Jumlah hewan peliharaan').fill('2');
    await page.getByLabel('Kucing', { exact: true }).check();
    await expect(page.locator('output')).toContainText('3 orang');
    await page.screenshot({ path: 'test-results/application-profile-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Kirim pengajuan sewa' }).click();
    await expect(page.locator('.record').filter({ hasText: unitCode })).toContainText('Menunggu');
    await login(admin, 'pengelola@rumahkita.local');
    await admin.goto('/pengelola/pengajuan');
    await admin
      .locator('.record')
      .filter({ hasText: name })
      .getByRole('button', { name: 'Setujui pengajuan' })
      .click();
    await expect(admin.locator('dialog')).toContainText('7.500.000');
    await expect(admin.locator('dialog')).toContainText('2 ekor');
    await expect(
      admin.locator('dialog').getByRole('link', { name: 'Lihat bukti penghasilan' }),
    ).toBeVisible();
    await admin.screenshot({ path: 'test-results/application-review-desktop.png', fullPage: true });
    await admin.getByRole('button', { name: 'Setujui & reservasi unit' }).click();
    await expect(admin.locator('dialog')).toHaveCount(0);
    await admin.goto('/pengelola/penyewa');
    await admin.getByLabel('Cari penyewa').fill(email);
    await admin.getByRole('button', { name: 'Data pribadi' }).click();
    await expect(admin.locator('dialog')).toContainText('7.500.000');
    await expect(admin.locator('dialog')).toContainText('2 ekor');
    await admin.goto('/pengelola/kontrak');
    let record = admin.locator('.record').filter({ hasText: name });
    await record.getByRole('button', { name: 'Unggah kontrak PDF' }).click();
    await admin.getByLabel('Dokumen PDF').setInputFiles(pdf);
    await admin.getByRole('button', { name: 'Unggah kontrak', exact: true }).click();
    await expect(admin.locator('dialog')).toHaveCount(0);
    await page.goto('/penyewa/kontrak');
    await page.getByRole('button', { name: 'Unggah salinan bertanda tangan' }).click();
    await page.getByLabel('Dokumen PDF').setInputFiles(pdf);
    await page.getByRole('button', { name: 'Unggah kontrak', exact: true }).click();
    await expect(page.locator('dialog')).toHaveCount(0);
    await admin.reload();
    record = admin.locator('.record').filter({ hasText: name });
    await record.getByRole('button', { name: 'Verifikasi kontrak' }).click();
    await expect(record).toContainText('Siap move-in');
    await page.goto('/penyewa/tagihan');
    await page
      .locator('tr')
      .filter({ hasText: 'Sewa periode 1' })
      .getByRole('link', { name: 'Detail' })
      .click();
    await page.getByRole('button', { name: 'Unggah bukti pembayaran' }).click();
    await page.getByLabel('Bukti transfer').setInputFiles({ ...pdf, name: 'bukti-demo.pdf' });
    await page.getByRole('button', { name: 'Kirim untuk diverifikasi' }).click();
    await expect(page.getByText('Bukti sedang ditinjau oleh pengelola.')).toBeVisible();
    await admin.goto('/pengelola/pembayaran');
    await admin
      .locator('tr')
      .filter({ hasText: name })
      .getByRole('button', { name: 'Tinjau' })
      .click();
    await admin.getByRole('button', { name: 'Simpan hasil verifikasi' }).click();
    await expect(admin.locator('dialog')).toHaveCount(0);
    await page.goto('/penyewa/tagihan');
    await page
      .locator('tr')
      .filter({ hasText: 'Deposit jaminan' })
      .getByRole('link', { name: 'Detail' })
      .click();
    await page.getByRole('button', { name: 'Simulasi berhasil' }).click();
    await expect(page.getByText('Tagihan ini sudah lunas.')).toBeVisible();
    await admin.goto('/pengelola/inspeksi');
    record = admin.locator('.record').filter({ hasText: name });
    await record.getByRole('button', { name: 'Inspeksi masuk' }).click();
    for (const input of await admin.locator('dialog input[type=checkbox]').all())
      await input.check();
    await admin.getByLabel('Angka meter listrik').fill('100');
    await admin.getByLabel('Angka meter air').fill('10');
    await admin.getByLabel('Catatan kondisi rumah').fill('Kondisi baik, data tes browser.');
    await admin.getByRole('button', { name: 'Simpan checklist inspeksi' }).click();
    await expect(admin.locator('dialog')).toHaveCount(0);
    await record.getByRole('button', { name: 'Konfirmasi move-in' }).click();
    await expect(record.locator('.badge')).toHaveText('Aktif');
    await admin.goto('/pengelola/tagihan');
    await admin.getByRole('button', { name: 'Catat meter' }).click();
    const meter = admin.locator('dialog'),
      leaseId = await meter
        .locator('select option')
        .filter({ hasText: unitCode })
        .getAttribute('value');
    await meter.locator('select').first().selectOption(leaseId!);
    await admin.getByLabel('Meter listrik akhir').fill('120');
    await admin.getByLabel('Meter air akhir').fill('11');
    await admin.getByRole('button', { name: 'Simpan & terbitkan tagihan' }).click();
    await expect(admin.locator('dialog')).toHaveCount(0);
    await admin.goto('/pengelola/inspeksi');
    record = admin.locator('.record').filter({ hasText: name });
    await record.getByRole('button', { name: 'Inspeksi keluar' }).click();
    for (const input of await admin.locator('dialog input[type=checkbox]').all())
      await input.check();
    await admin.getByLabel('Angka meter listrik').fill('125');
    await admin.getByLabel('Angka meter air').fill('12');
    await admin.getByLabel('Catatan kondisi rumah').fill('Kondisi baik setelah keluar.');
    await admin.getByRole('button', { name: 'Simpan checklist inspeksi' }).click();
    await expect(admin.locator('dialog')).toHaveCount(0);
    await record.getByRole('button', { name: 'Selesaikan move-out' }).click();
    await admin
      .getByLabel('Rincian biaya')
      .fill('Tidak ada kerusakan; penyelesaian data demo browser.');
    await admin.getByRole('button', { name: 'Konfirmasi move-out & perhitungan deposit' }).click();
    await expect(admin.locator('dialog')).toHaveCount(0);
    await record.getByRole('button', { name: 'Catat pengembalian deposit' }).click();
    await admin.getByLabel('Referensi transfer').fill('REF-BROWSER-DEMO');
    await admin.getByRole('button', { name: 'Konfirmasi deposit dikembalikan' }).click();
    await expect(record.locator('.badge')).toHaveText('Selesai');
    await admin.goto(`/pengelola${unitPath}`);
    await admin.getByRole('button', { name: 'Nyatakan siap disewakan' }).click();
    await expect(admin.locator('.badge')).toHaveText('Tersedia');
    const rejected = await page.request.post('/api/auth/logout', {
      headers: { Origin: 'https://untrusted.example' },
    });
    expect(rejected.status()).toBe(403);
  } finally {
    await adminContext.close();
  }
});
