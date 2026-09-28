import { test, expect } from '@playwright/test';
const password = process.env.SEED_PASSWORD || 'ChangeThisDemoPassword123!';
test('Katalog, detail, login dan navigasi dashboard lokal', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ruang nyaman. Cerita baru.' })).toBeVisible();
  await expect(page.locator('.unit-card')).toHaveCount(3);
  await page.screenshot({ path: `test-results/home-${info.project.name}.png`, fullPage: true });
  await page.getByRole('link', { name: 'Temukan rumah Anda' }).click();
  await expect(page.locator('.unit-card').first()).toBeVisible();
  await page.locator('.unit-card').first().click();
  await expect(page.getByRole('link', { name: 'Ajukan sewa' })).toBeVisible();
  await page.getByRole('link', { name: 'Ajukan sewa' }).click();
  await expect(page.getByRole('heading', { name: 'Senang Anda kembali.' })).toBeVisible();
  await page.getByLabel('Email', { exact: false }).fill('pengelola@rumahkita.local');
  await page.getByLabel('Password', { exact: false }).fill(password);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Selamat datang, Faiz.' })).toBeVisible();
  await expect(page.locator('.unit-tile')).toHaveCount(20);
  await page.screenshot({
    path: `test-results/dashboard-${info.project.name}.png`,
    fullPage: true,
  });
  for (const [path, title] of [
    ['unit', 'Unit properti'],
    ['pengajuan', 'Pengajuan sewa'],
    ['penyewa', 'Data penyewa'],
    ['kontrak', 'Kontrak sewa'],
    ['tagihan', 'Tagihan & meter'],
    ['pembayaran', 'Verifikasi pembayaran'],
    ['maintenance', 'Maintenance'],
    ['pengumuman', 'Pengumuman'],
    ['inspeksi', 'Inspeksi & deposit'],
    ['laporan', 'Laporan properti'],
    ['pengaturan', 'Pengaturan properti'],
  ]) {
    await page.goto(`/pengelola/${path}`);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.locator('.loading')).toHaveCount(0);
    await expect(page.locator('.notice.error')).toHaveCount(0);
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
test('Penyewa melihat data pribadi dan membuat laporan maintenance', async ({ page }, info) => {
  const title = 'Pemeriksaan lampu ' + info.project.name + ' ' + Date.now();
  await page.goto('/masuk');
  await page.getByLabel('Email').fill('penyewa@rumahkita.local');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Selamat datang, Nadia.' })).toBeVisible();
  await page.goto('/penyewa/maintenance');
  await page.getByRole('button', { name: 'Buat laporan' }).click();
  await page.getByLabel('Judul laporan').fill(title);
  await page
    .getByLabel('Ceritakan masalahnya')
    .fill('Lampu teras berkedip, mohon diperiksa. Data pengujian browser.');
  await page.getByRole('button', { name: 'Kirim laporan' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  for (const [path, title] of [
    ['pengajuan', 'Pengajuan saya'],
    ['kontrak', 'Kontrak sewa'],
    ['tagihan', 'Tagihan saya'],
    ['pembayaran', 'Riwayat pembayaran'],
    ['pengumuman', 'Pengumuman'],
    ['masa-tinggal', 'Masa tinggal & deposit'],
  ]) {
    await page.goto(`/penyewa/${path}`);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.locator('.loading')).toHaveCount(0);
    await expect(page.locator('.notice.error')).toHaveCount(0);
  }
});

test('Fasilitas unit dipilih dengan centang dan tersimpan', async ({ page }, info) => {
  await page.goto('/masuk');
  await page.getByLabel('Email').fill('pengelola@rumahkita.local');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Selamat datang, Faiz.' })).toBeVisible();
  const list = await (await page.request.get('/api/units?limit=100')).json();
  const original = list.items[0];
  try {
    await page.goto(`/pengelola/unit/${original.id}`);
    await page.getByRole('button', { name: 'Edit unit' }).click();
    const dialog = page.locator('dialog');
    await expect(dialog.getByLabel('Fasilitas (pisahkan dengan koma)')).toHaveCount(0);
    for (const box of await dialog.locator('input[name=amenities]').all()) await box.uncheck();
    await dialog.getByLabel('Wi-Fi', { exact: true }).check();
    await dialog.getByLabel('Dapur', { exact: true }).check();
    await page.screenshot({
      path: `test-results/facilities-${info.project.name}.png`,
      fullPage: true,
    });
    await dialog.getByRole('button', { name: 'Simpan unit' }).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await page.getByRole('button', { name: 'Edit unit' }).click();
    await expect(page.getByLabel('Wi-Fi', { exact: true })).toBeChecked();
    await expect(page.getByLabel('Dapur', { exact: true })).toBeChecked();
    await expect(page.getByLabel('AC', { exact: true })).not.toBeChecked();
  } finally {
    const { code, name, description, rent, deposit, area, bedrooms, bathrooms, amenities } =
      original;
    const restored = await page.request.put(`/api/units/${original.id}`, {
      data: {
        code,
        name,
        description,
        rent: Number(rent),
        deposit: Number(deposit),
        area,
        bedrooms,
        bathrooms,
        amenities,
      },
    });
    expect(restored.ok()).toBeTruthy();
  }
});
