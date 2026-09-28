import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { addMonths, jakartaToday } from '../apps/api/src/domain';
const db = new PrismaClient();
async function main() {
  if (process.env.SEED_DEMO !== 'true')
    throw new Error('Set SEED_DEMO=true hanya untuk database demo');
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 10) throw new Error('SEED_PASSWORD minimal 10 karakter');
  const passwordHash = await hash(password, 12);
  await db.property.upsert({ where: { id: 'rumahkita' }, update: {}, create: { id: 'rumahkita' } });
  await db.user.upsert({
    where: { email: 'pengelola@rumahkita.local' },
    update: {},
    create: {
      id: 'manager-demo',
      name: 'Faiz Nugroho',
      email: 'pengelola@rumahkita.local',
      phone: '081234567890',
      passwordHash,
      role: 'MANAGER',
    },
  });
  const names = [
    'Nadia Putri',
    'Rizky Pratama',
    'Dewi Lestari',
    'Andi Saputra',
    'Sinta Ayu',
    'Bima Mahendra',
    'Rani Permata',
    'Dimas Wijaya',
    'Alya Rahma',
    'Fajar Santoso',
    'Intan Sari',
    'Yoga Prasetyo',
  ];
  for (let i = 1; i <= 20; i++) {
    const code = `${i <= 10 ? 'A' : 'B'}-${String(i <= 10 ? i : i - 10).padStart(2, '0')}`;
    await db.unit.upsert({
      where: { id: `unit-${i}` },
      update: {},
      create: {
        id: `unit-${i}`,
        code,
        name: `Rumah ${i % 3 === 0 ? 'Keluarga' : 'Taman'} ${code}`,
        description:
          'Rumah nyaman dengan cahaya alami, teras pribadi, dan lingkungan yang tenang. Dekat dengan kebutuhan sehari-hari, cocok untuk memulai cerita baru.',
        rent: i % 3 === 0 ? 2500000 : 1800000,
        deposit: i % 3 === 0 ? 2500000 : 1800000,
        area: i % 3 === 0 ? 60 : 45,
        bedrooms: i % 3 === 0 ? 3 : 2,
        bathrooms: 1,
        amenities: ['Teras pribadi', 'Area parkir', 'Dapur', 'Keamanan 24 jam'],
        status: i <= 12 ? 'OCCUPIED' : i === 20 ? 'MAINTENANCE' : 'AVAILABLE',
        image: '/images/residence.jpg',
      },
    });
    if (i <= 12) {
      const tenant = await db.user.upsert({
        where: { id: `tenant-${i}` },
        update: {},
        create: {
          id: `tenant-${i}`,
          name: names[i - 1],
          email: i === 1 ? 'penyewa@rumahkita.local' : `penyewa${i}@rumahkita.local`,
          phone: `0812000000${String(i).padStart(2, '0')}`,
          passwordHash,
        },
      });
      const unit = await db.unit.findUniqueOrThrow({ where: { id: `unit-${i}` } }),
        start = addMonths(jakartaToday(), -2),
        end = addMonths(start, 12);
      end.setUTCDate(end.getUTCDate() - 1);
      await db.application.upsert({
        where: { id: `application-${i}` },
        update: {},
        create: {
          id: `application-${i}`,
          unitId: unit.id,
          tenantId: tenant.id,
          moveInDate: start,
          occupants: 2,
          occupation: 'Karyawan swasta',
          status: 'APPROVED',
        },
      });
      await db.lease.upsert({
        where: { id: `lease-${i}` },
        update: {},
        create: {
          id: `lease-${i}`,
          applicationId: `application-${i}`,
          unitId: unit.id,
          tenantId: tenant.id,
          startDate: start,
          endDate: end,
          months: 12,
          dueDay: start.getUTCDate(),
          rent: unit.rent,
          deposit: unit.deposit,
          status: 'ACTIVE',
        },
      });
      await db.inspection.upsert({
        where: { leaseId_kind: { leaseId: `lease-${i}`, kind: 'IN' } },
        update: {},
        create: {
          leaseId: `lease-${i}`,
          kind: 'IN',
          checklist: ['keys', 'walls', 'plumbing', 'electricity', 'cleanliness'],
          notes: 'Kondisi baik saat serah terima (data demo).',
          documentIds: [],
          electricity: 1000,
          water: 100,
        },
      });
      await db.depositEntry.upsert({
        where: { reference: `seed-deposit-${i}` },
        update: {},
        create: {
          leaseId: `lease-${i}`,
          kind: 'RECEIVED',
          amount: unit.deposit,
          reason: 'Deposit awal (data demo)',
          reference: `seed-deposit-${i}`,
        },
      });
      await db.invoice.upsert({
        where: { id: `deposit-invoice-${i}` },
        update: {},
        create: {
          id: `deposit-invoice-${i}`,
          leaseId: `lease-${i}`,
          kind: 'DEPOSIT',
          period: 'initial',
          label: 'Deposit jaminan',
          amount: unit.deposit,
          dueDate: start,
          status: 'PAID',
          items: [{ label: 'Deposit', amount: Number(unit.deposit) }],
        },
      });
      await db.payment.upsert({
        where: { id: `deposit-payment-${i}` },
        update: {},
        create: {
          id: `deposit-payment-${i}`,
          invoiceId: `deposit-invoice-${i}`,
          amount: unit.deposit,
          status: 'APPROVED',
          simulated: true,
          reviewedAt: start,
        },
      });
      for (let m = 0; m < 3; m++) {
        const period = addMonths(start, m);
        const invoice = await db.invoice.upsert({
          where: {
            leaseId_kind_period: {
              leaseId: `lease-${i}`,
              kind: 'RENT',
              period: period.toISOString().slice(0, 10),
            },
          },
          update: {},
          create: {
            leaseId: `lease-${i}`,
            kind: 'RENT',
            period: period.toISOString().slice(0, 10),
            label: `Sewa periode ${m + 1}`,
            amount: unit.rent,
            dueDate: period,
            status: m < 2 || i < 5 ? 'PAID' : 'UNPAID',
            items: [{ label: 'Sewa bulanan', amount: Number(unit.rent) }],
          },
        });
        if (invoice.status === 'PAID')
          await db.payment.upsert({
            where: { id: `payment-${i}-${m}` },
            update: {},
            create: {
              id: `payment-${i}-${m}`,
              invoiceId: invoice.id,
              amount: unit.rent,
              status: 'APPROVED',
              simulated: true,
              reviewedAt: period,
              createdAt: period,
            },
          });
      }
    }
  }
  await db.ticket.upsert({
    where: { id: 'ticket-demo' },
    update: {},
    create: {
      id: 'ticket-demo',
      tenantId: 'tenant-1',
      leaseId: 'lease-1',
      title: 'Keran dapur menetes',
      description:
        'Keran dapur masih menetes meskipun sudah ditutup rapat. Mohon bantuan pengecekan.',
      priority: 'NORMAL',
      status: 'IN_PROGRESS',
      documentIds: [],
    },
  });
  await db.announcement.upsert({
    where: { id: 'announcement-demo' },
    update: {},
    create: {
      id: 'announcement-demo',
      title: 'Jadwal perawatan taman',
      body: 'Perawatan taman dan area bersama berlangsung Sabtu pukul 08.00–11.00. Mohon area parkir tetap mudah diakses. Terima kasih atas kerja samanya.',
    },
  });
  console.log(
    'Seed selesai: 20 unit, 12 penyewa, pengelola, kontrak, tagihan, dan contoh maintenance.',
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
