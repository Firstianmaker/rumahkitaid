import { BadRequestException } from '@nestjs/common';
export function demand(condition: unknown, message: string): asserts condition {
  if (!condition) throw new BadRequestException(message);
}
export function validateHousehold(input: {
  occupants: number;
  adultCount: number;
  childCount: number;
  elderlyCount: number;
  householdType: string;
  petCount: number;
  petTypes: string[];
  petNotes?: string;
}) {
  demand(
    input.adultCount + input.elderlyCount >= 1,
    'Minimal satu penghuni dewasa atau lansia, termasuk pemohon',
  );
  demand(
    input.occupants === input.adultCount + input.childCount + input.elderlyCount,
    'Jumlah penghuni harus sesuai rincian dewasa, anak, dan lansia',
  );
  demand(
    input.householdType !== 'ALONE' || input.occupants === 1,
    'Tinggal sendiri harus berjumlah satu penghuni',
  );
  demand(
    input.petCount === 0
      ? input.petTypes.length === 0
      : input.petTypes.length > 0 && input.petTypes.length <= input.petCount,
    'Jumlah dan jenis hewan peliharaan tidak sesuai',
  );
  demand(
    !input.petTypes.includes('Lainnya') || !!input.petNotes?.trim(),
    'Jelaskan jenis peliharaan lainnya',
  );
}
export function dateOnly(value: string | Date): Date {
  const text = typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  demand(/^\d{4}-\d{2}-\d{2}$/.test(text), 'Tanggal tidak valid');
  const date = new Date(`${text}T00:00:00.000Z`);
  demand(!isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text, 'Tanggal tidak valid');
  return date;
}
export function jakartaToday(): Date {
  return dateOnly(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
}
export function addMonths(date: Date, count: number): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
  result.setUTCDate(
    Math.min(
      date.getUTCDate(),
      new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate(),
    ),
  );
  return result;
}
export function dueDate(periodStart: Date, day: number): Date {
  demand(Number.isInteger(day) && day >= 1 && day <= 31, 'Jatuh tempo harus 1–31');
  let date = new Date(
    Date.UTC(
      periodStart.getUTCFullYear(),
      periodStart.getUTCMonth(),
      Math.min(
        day,
        new Date(
          Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 0),
        ).getUTCDate(),
      ),
    ),
  );
  if (date < periodStart) {
    const next = addMonths(
      new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 1)),
      1,
    );
    date = dueDate(next, day);
  }
  return date;
}
export function money(value: unknown): number {
  const number = Number(value);
  demand(Number.isFinite(number) && number >= 0 && number <= 999999999999, 'Nominal tidak valid');
  return Math.round((number + Number.EPSILON) * 100) / 100;
}
export function utility(start: number, end: number, rate: number): number {
  demand(
    Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start,
    'Meter akhir tidak boleh lebih kecil dari meter awal',
  );
  return money((end - start) * money(rate));
}
export function settlement(deposit: number, arrears: number, damages: number) {
  const charges = money(arrears + damages);
  return {
    applied: Math.min(deposit, charges),
    refund: money(Math.max(0, deposit - charges)),
    outstanding: money(Math.max(0, charges - deposit)),
  };
}
export function pageArgs(page = '1', limit = '20') {
  const take = Math.min(100, Math.max(1, Number(limit) || 20));
  return { skip: (Math.max(1, Number(page) || 1) - 1) * take, take };
}
