import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '../../.env' });
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL wajib menunjuk database terisolasi berakhiran _test');
process.env.DATABASE_URL = testUrl;
process.env.DEMO_MODE = 'true';
process.env.UPLOAD_DIR = '../../.runtime/test-uploads';
const { createApp } = require('../dist/app');
const db = new PrismaClient({ datasourceUrl: testUrl });
const password = 'IntegrationPass123!';
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
test('Siklus API lengkap dengan MySQL nyata, isolasi akses, dan konkurensi', async (t) => {
  const { app } = await createApp(false);
  await app.listen(0, '127.0.0.1');
  const server = app.getHttpServer();
  try {
    // Only the explicitly named test database is cleared, never the demo database.
    for (const model of [
      'comment',
      'ticket',
      'audit',
      'announcement',
      'depositEntry',
      'inspection',
      'meterReading',
      'payment',
      'invoice',
      'contractVersion',
      'lease',
      'application',
      'document',
      'session',
      'unit',
      'user',
      'property',
    ])
      await (db as any)[model].deleteMany();
    await db.property.create({ data: { id: 'rumahkita' } });
    const passwordHash = await hash(password, 4);
    await db.user.create({
      data: {
        id: 'm',
        email: 'manager@test.local',
        name: 'Manager',
        phone: '08123456789',
        passwordHash,
        role: 'MANAGER',
      },
    });
    for (const id of ['t1', 't2'])
      await db.user.create({
        data: { id, email: `${id}@test.local`, name: id, phone: '08123456789', passwordHash },
      });
    await db.unit.create({
      data: {
        id: 'u',
        code: 'T-01',
        name: 'Test home',
        description: 'Test',
        rent: 1800000,
        deposit: 1800000,
        area: 45,
        bedrooms: 2,
        amenities: [],
      },
    });
    const m = request.agent(server),
      a = request.agent(server),
      b = request.agent(server);
    for (const [agent, email] of [
      [m, 'manager@test.local'],
      [a, 't1@test.local'],
      [b, 't2@test.local'],
    ] as const)
      await agent.post('/api/v1/auth/login').send({ email, password }).expect(201);
    await t.test('Autentikasi, DTO, dan hak akses', async () => {
      await request(server).get('/api/v1/leases').expect(401);
      await a.get('/api/v1/reports').expect(403);
      await a
        .post('/api/v1/applications')
        .send({
          unitId: 'u',
          moveInDate: today,
          occupants: 0,
          occupation: 'Developer',
          admin: true,
        })
        .expect(400);
    });
    const profile = {
      currentAddress: 'Jalan Contoh Nomor 12',
      employmentType: 'EMPLOYEE',
      employerName: 'Perusahaan Demo',
      monthlyIncome: 6000000,
      incomeSource: 'Gaji bulanan',
      householdType: 'FAMILY',
      adultCount: 1,
      childCount: 0,
      elderlyCount: 1,
      petCount: 2,
      petTypes: ['Kucing'],
    };
    await t.test('Validasi penghasilan, komposisi penghuni, dan peliharaan', async () => {
      for (const invalid of [
        { monthlyIncome: -1 },
        { monthlyIncome: undefined },
        { adultCount: 2 },
        { petTypes: [] },
        { householdType: 'ALONE' },
        { employerName: '' },
      ])
        await a
          .post('/api/v1/applications')
          .send({
            ...profile,
            unitId: 'u',
            moveInDate: today,
            occupants: 2,
            occupation: 'Developer',
            ...invalid,
          })
          .expect(400);
    });
    const applications = [];
    const incomeProof = (
      await a
        .post('/api/v1/documents')
        .attach('file', Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF'), {
          filename: 'income.pdf',
          contentType: 'application/pdf',
        })
        .expect(201)
    ).body.id;
    await t.test('Bukti penghasilan hanya dapat dipakai pemilik dan dibaca pengelola', async () => {
      await b
        .post('/api/v1/applications')
        .send({
          ...profile,
          unitId: 'u',
          moveInDate: today,
          occupants: 2,
          occupation: 'Developer',
          incomeDocumentId: incomeProof,
        })
        .expect(400);
      await b.get(`/api/v1/documents/${incomeProof}`).expect(404);
      await a.get(`/api/v1/documents/${incomeProof}`).expect(200);
      await m.get(`/api/v1/documents/${incomeProof}`).expect(200);
    });
    for (const agent of [a, b])
      applications.push(
        (
          await agent
            .post('/api/v1/applications')
            .send({
              ...profile,
              ...(agent === a ? { incomeDocumentId: incomeProof } : {}),
              unitId: 'u',
              moveInDate: today,
              occupants: 2,
              occupation: 'Developer',
            })
            .expect(201)
        ).body,
      );
    await t.test('Profil privat tersedia bagi pemohon dan pengelola', async () => {
      const own = (await a.get('/api/v1/applications').expect(200)).body;
      assert.equal(own.length, 1);
      assert.equal(own[0].tenantId, 't1');
      assert.equal(Number(own[0].monthlyIncome), 6000000);
      assert.equal(own[0].elderlyCount, 1);
      assert.deepEqual(own[0].petTypes, ['Kucing']);
      const tenants = (await m.get('/api/v1/tenants').expect(200)).body;
      assert.equal(tenants.find((u: any) => u.id === 't1').applications[0].petCount, 2);
      await b.get('/api/v1/tenants').expect(403);
    });
    let leaseId = '';
    let winner = a,
      loser = b;
    await t.test('Dua persetujuan serentak hanya mengunci satu unit', async () => {
      const results = await Promise.all(
        applications.map((x) =>
          m
            .post(`/api/v1/applications/${x.id}/approve`)
            .send({ startDate: today, months: 12, dueDay: 31, rent: 1800000, deposit: 1800000 }),
        ),
      );
      assert.equal(results.filter((r) => r.status === 201).length, 1);
      const index = results.findIndex((r) => r.status === 201);
      leaseId = results[index].body.id;
      winner = index === 0 ? a : b;
      loser = index === 0 ? b : a;
      assert.equal(await db.lease.count(), 1);
      await loser.get(`/api/v1/leases/${leaseId}`).expect(403);
    });
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
    const upload = async (agent: any) =>
      (
        await agent
          .post('/api/v1/documents')
          .attach('file', pdf, { filename: 'contract.pdf', contentType: 'application/pdf' })
          .expect(201)
      ).body.id;
    let original = '';
    await t.test('Dokumen privat, validasi file, dan kontrak dua pihak', async () => {
      await winner
        .post('/api/v1/documents')
        .attach('file', Buffer.from('not a pdf'), {
          filename: 'fake.pdf',
          contentType: 'application/pdf',
        })
        .expect(400);
      original = await upload(m);
      await m.post(`/api/v1/leases/${leaseId}/contract`).send({ documentId: original }).expect(201);
      await winner.get(`/api/v1/documents/${original}`).expect(200);
      await loser.get(`/api/v1/documents/${original}`).expect(404);
      await m.post(`/api/v1/leases/${leaseId}/verify`).expect(400);
      const signed = await upload(winner);
      await winner
        .post(`/api/v1/leases/${leaseId}/contract`)
        .send({ documentId: signed })
        .expect(201);
      await m.post(`/api/v1/leases/${leaseId}/verify`).expect(201);
      await m.post(`/api/v1/leases/${leaseId}/verify`).expect(400);
    });
    const invoices = (await winner.get('/api/v1/invoices').expect(200)).body;
    await t.test('Pembayaran ditolak, unggah ulang, dan verifikasi ganda', async () => {
      const proof = await upload(winner),
        invoice = invoices.find((x: any) => x.kind === 'RENT');
      const payment = (
        await winner
          .post(`/api/v1/invoices/${invoice.id}/pay`)
          .send({ documentId: proof })
          .expect(201)
      ).body;
      await winner
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .send({ documentId: proof })
        .expect(400);
      await m
        .post(`/api/v1/payments/${payment.id}/review`)
        .send({ approve: false, reason: 'Bukti belum jelas' })
        .expect(201);
      const retry = (
        await winner
          .post(`/api/v1/invoices/${invoice.id}/pay`)
          .send({ documentId: proof })
          .expect(201)
      ).body;
      const results = await Promise.all(
        [1, 2].map(() => m.post(`/api/v1/payments/${retry.id}/review`).send({ approve: true })),
      );
      assert.equal(results.filter((r) => r.status === 201).length, 1);
      assert.equal(
        await db.payment.count({ where: { invoiceId: invoice.id, status: 'APPROVED' } }),
        1,
      );
    });
    await t.test('Simulasi hanya aktif dalam mode demo', async () => {
      const deposit = invoices.find((x: any) => x.kind === 'DEPOSIT');
      process.env.DEMO_MODE = 'false';
      await winner
        .post(`/api/v1/invoices/${deposit.id}/simulate`)
        .send({ outcome: 'success' })
        .expect(404);
      process.env.DEMO_MODE = 'true';
      await winner
        .post(`/api/v1/invoices/${deposit.id}/simulate`)
        .send({ outcome: 'failed' })
        .expect(201);
      assert.equal(
        (await db.invoice.findUniqueOrThrow({ where: { id: deposit.id } })).status,
        'UNPAID',
      );
      await winner
        .post(`/api/v1/invoices/${deposit.id}/simulate`)
        .send({ outcome: 'success' })
        .expect(201);
      assert.equal(await db.depositEntry.count(), 1);
    });
    const checklist = ['keys', 'walls', 'plumbing', 'electricity', 'cleanliness'];
    await t.test('Move-in hanya setelah pembayaran dan inspeksi', async () => {
      await m.post(`/api/v1/leases/${leaseId}/move-in`).expect(400);
      await m
        .post(`/api/v1/leases/${leaseId}/inspections`)
        .send({
          kind: 'IN',
          checklist,
          notes: 'Baik',
          documentIds: [],
          electricity: 100,
          water: 10,
        })
        .expect(201);
      await m.post(`/api/v1/leases/${leaseId}/move-in`).expect(201);
      assert.equal((await db.unit.findUniqueOrThrow({ where: { id: 'u' } })).status, 'OCCUPIED');
    });
    await t.test('Tagihan berulang idempoten dan meter tidak menurun', async () => {
      await Promise.all([1, 2].map(() => m.post('/api/v1/invoices/generate').expect(201)));
      assert.equal(await db.invoice.count({ where: { kind: 'RENT' } }), 1);
      const meter = {
        period: today.slice(0, 7),
        electricityStart: 100,
        electricityEnd: 150,
        waterStart: 10,
        waterEnd: 15,
      };
      await m
        .post(`/api/v1/leases/${leaseId}/meters`)
        .send({ ...meter, electricityEnd: 99 })
        .expect(400);
      await m.post(`/api/v1/leases/${leaseId}/meters`).send(meter).expect(201);
      await m.post(`/api/v1/leases/${leaseId}/meters`).send(meter).expect(400);
      const utility = await db.invoice.findFirstOrThrow({ where: { kind: 'UTILITY' } });
      assert.equal(Number(utility.amount), 100000);
    });
    await t.test('Maintenance dan komentar memiliki isolasi akses', async () => {
      const ticket = (
        await winner
          .post('/api/v1/tickets')
          .send({
            leaseId,
            title: 'Keran bocor',
            description: 'Air terus menetes',
            priority: 'NORMAL',
            documentIds: [],
          })
          .expect(201)
      ).body;
      await loser
        .post(`/api/v1/tickets/${ticket.id}/comments`)
        .send({ text: 'Tidak berhak' })
        .expect(403);
      await m
        .post(`/api/v1/tickets/${ticket.id}/comments`)
        .send({ text: 'Teknisi datang besok' })
        .expect(201);
      await m.patch(`/api/v1/tickets/${ticket.id}/status`).send({ status: 'RESOLVED' }).expect(200);
    });
    await t.test('Move-out memotong deposit, mencatat refund, dan melepas unit', async () => {
      await m
        .post(`/api/v1/leases/${leaseId}/inspections`)
        .send({
          kind: 'OUT',
          checklist,
          notes: 'Perlu cat',
          documentIds: [],
          electricity: 160,
          water: 16,
        })
        .expect(201);
      const result = (
        await m
          .post(`/api/v1/leases/${leaseId}/move-out`)
          .send({ damages: 200000, reason: 'Perbaikan cat dinding' })
          .expect(201)
      ).body;
      assert.equal(result.applied, 320000);
      assert.equal(result.refund, 1480000);
      await m
        .post(`/api/v1/leases/${leaseId}/move-out`)
        .send({ damages: 0, reason: 'Ulang' })
        .expect(400);
      await m
        .post(`/api/v1/leases/${leaseId}/refund`)
        .send({ reason: 'Transfer pengembalian REF-TEST' })
        .expect(201);
      await m.post(`/api/v1/leases/${leaseId}/refund`).send({ reason: 'Ulang' }).expect(400);
      assert.equal((await db.lease.findUniqueOrThrow({ where: { id: leaseId } })).status, 'CLOSED');
      await m.patch('/api/v1/units/u/status').send({ status: 'AVAILABLE' }).expect(200);
    });
    await t.test('Laporan CSV dan audit tersedia untuk pengelola', async () => {
      await m
        .get('/api/v1/reports/export')
        .expect(200)
        .expect('Content-Type', /text\/csv/);
      const audit = await m.get(`/api/v1/audit/${leaseId}`).expect(200);
      assert.ok(audit.body.length >= 5);
      await winner.get(`/api/v1/audit/${leaseId}`).expect(403);
    });
    await t.test(
      'Catch-up bulanan bersamaan dan kekurangan deposit tetap bisa dilunasi',
      async () => {
        const { addMonths, dateOnly } = require('../dist/domain');
        const start = addMonths(dateOnly(today), -2);
        await db.unit.create({
          data: {
            id: 'u2',
            code: 'T-02',
            name: 'Test catch-up',
            description: 'Test',
            rent: 900000,
            deposit: 100000,
            area: 45,
            bedrooms: 2,
            amenities: [],
            status: 'OCCUPIED',
          },
        });
        await db.application.create({
          data: {
            id: 'catchup-app',
            unitId: 'u2',
            tenantId: 't1',
            moveInDate: start,
            occupants: 1,
            occupation: 'Tester',
            status: 'APPROVED',
          },
        });
        const lease = await db.lease.create({
          data: {
            id: 'catchup-lease',
            applicationId: 'catchup-app',
            unitId: 'u2',
            tenantId: 't1',
            startDate: start,
            endDate: addMonths(start, 12),
            months: 12,
            dueDay: 31,
            rent: 900000,
            deposit: 100000,
            status: 'ACTIVE',
          },
        });
        await db.invoice.create({
          data: {
            leaseId: lease.id,
            kind: 'RENT',
            period: start.toISOString().slice(0, 10),
            label: 'Sewa awal',
            amount: 900000,
            status: 'PAID',
            dueDate: start,
            items: [],
          },
        });
        await db.depositEntry.create({
          data: {
            leaseId: lease.id,
            kind: 'RECEIVED',
            amount: 100000,
            reference: 'catchup-deposit',
            reason: 'Test fixture',
          },
        });
        await db.inspection.create({
          data: {
            leaseId: lease.id,
            kind: 'IN',
            checklist,
            notes: 'Baik',
            documentIds: [],
            electricity: 0,
            water: 0,
          },
        });
        const results = await Promise.all([1, 2].map(() => m.post('/api/v1/invoices/generate')));
        assert.ok(results.every((r) => r.status === 201));
        assert.equal(await db.invoice.count({ where: { leaseId: lease.id, kind: 'RENT' } }), 3);
        await m
          .post(`/api/v1/leases/${lease.id}/inspections`)
          .send({
            kind: 'OUT',
            checklist,
            notes: 'Baik',
            documentIds: [],
            electricity: 0,
            water: 0,
          })
          .expect(201);
        const result = (
          await m
            .post(`/api/v1/leases/${lease.id}/move-out`)
            .send({ damages: 0, reason: 'Pengujian kekurangan deposit' })
            .expect(201)
        ).body;
        assert.equal(result.outstanding, 1700000);
        assert.equal(result.refund, 0);
        assert.equal(
          (await db.lease.findUniqueOrThrow({ where: { id: lease.id } })).status,
          'MOVED_OUT',
        );
        for (const i of await db.invoice.findMany({
          where: { leaseId: lease.id, status: 'UNPAID' },
        }))
          await a
            .post(`/api/v1/invoices/${i.id}/simulate`)
            .send({ outcome: 'success' })
            .expect(201);
        const paid = await db.payment.aggregate({
          where: { invoice: { leaseId: lease.id }, status: 'APPROVED' },
          _sum: { amount: true },
        });
        assert.equal(Number(paid._sum.amount), 1700000);
        assert.equal(
          (await db.lease.findUniqueOrThrow({ where: { id: lease.id } })).status,
          'CLOSED',
        );
      },
    );
  } finally {
    await app.close();
    await db.$disconnect();
  }
});
