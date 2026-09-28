import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, dateOnly, dueDate, utility, settlement, money } from '../src/domain';
test('Tanggal 31 dipertahankan berdasarkan tanggal awal dan dibatasi akhir bulan', () => {
  const start = dateOnly('2024-01-31');
  assert.equal(addMonths(start, 1).toISOString().slice(0, 10), '2024-02-29');
  assert.equal(addMonths(start, 2).toISOString().slice(0, 10), '2024-03-31');
  assert.equal(dueDate(dateOnly('2025-02-01'), 31).toISOString().slice(0, 10), '2025-02-28');
});
test('Jatuh tempo tidak mendahului awal periode', () =>
  assert.equal(dueDate(dateOnly('2025-09-20'), 5).toISOString().slice(0, 10), '2025-10-05'));
test('Tanggal kalender yang tidak valid ditolak', () =>
  assert.throws(() => dateOnly('2025-02-31')));
test('Utilitas menghitung meter dan menolak meter mundur', () => {
  assert.equal(utility(100, 125, 1500), 37500);
  assert.equal(utility(1.1, 1.2, 5000), 500);
  assert.throws(() => utility(125, 100, 1500));
  assert.throws(() => money(-1));
});
test('Deposit menutup tunggakan dan mengembalikan sisa', () =>
  assert.deepEqual(settlement(1800000, 300000, 100000), {
    applied: 400000,
    refund: 1400000,
    outstanding: 0,
  }));
test('Kekurangan deposit tetap terutang', () =>
  assert.deepEqual(settlement(1000000, 1200000, 100000), {
    applied: 1000000,
    refund: 0,
    outstanding: 300000,
  }));
