import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Prisma, Invoice, Lease } from '@prisma/client';
import { Database } from './prisma';
import { Actor, manager, own, tenant } from './auth';
import {
  demand,
  dateOnly,
  addMonths,
  dueDate,
  money,
  utility,
  settlement,
  jakartaToday,
  pageArgs,
  validateHousehold,
} from './domain';
import * as D from './dto';
type Tx = Prisma.TransactionClient;
const userSelect = { id: true, name: true, email: true, phone: true } as const;
const leaseInclude = {
  unit: true,
  tenant: { select: userSelect },
  contracts: { orderBy: { version: 'asc' as const } },
  invoices: { include: { payments: true } },
  inspections: true,
  depositEntries: true,
  meters: { orderBy: { period: 'asc' as const } },
};
@Injectable()
export class RentalService {
  constructor(@Inject(Database) readonly db: Database) {}
  audit(tx: Tx, actor: Actor, action: string, entityId: string, detail: object = {}) {
    return tx.audit.create({
      data: { actorId: actor.id, action, entityId, detail: detail as Prisma.InputJsonValue },
    });
  }
  async lease(actor: Actor, id: string, tx: Tx = this.db) {
    const lease = await tx.lease.findUnique({ where: { id }, include: leaseInclude });
    if (!lease) throw new NotFoundException('Kontrak tidak ditemukan');
    own(actor, lease.tenantId);
    return lease;
  }
  async document(actor: Actor, id: string, tx: Tx = this.db, mime?: string) {
    const doc = await tx.document.findUnique({ where: { id } });
    demand(doc && doc.ownerId === actor.id, 'Dokumen harus milik pengguna yang mengunggah');
    if (mime) demand(doc.mime === mime, 'Dokumen kontrak harus PDF');
    return doc;
  }
  async units(query: Record<string, string>) {
    const where: Prisma.UnitWhereInput = {};
    if (query.status && ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE'].includes(query.status))
      where.status = query.status as any;
    if (query.search)
      where.OR = [{ name: { contains: query.search } }, { code: { contains: query.search } }];
    if (query.bedrooms) where.bedrooms = Number(query.bedrooms) || undefined;
    return {
      items: await this.db.unit.findMany({
        where,
        ...pageArgs(query.page, query.limit),
        orderBy: { code: 'asc' },
      }),
      total: await this.db.unit.count({ where }),
    };
  }
  async unit(id: string) {
    const row = await this.db.unit.findUnique({ where: { id }, include: { property: true } });
    if (!row) throw new NotFoundException();
    return row;
  }
  async saveUnit(actor: Actor, input: D.UnitDto, id?: string) {
    manager(actor);
    return this.db.atomic(async (tx) => {
      const row = id
        ? await tx.unit.update({ where: { id }, data: input })
        : await tx.unit.create({ data: input });
      await this.audit(tx, actor, 'UNIT_SAVED', row.id);
      return row;
    });
  }
  async availability(actor: Actor, id: string, status: 'AVAILABLE' | 'MAINTENANCE') {
    manager(actor);
    return this.db.atomic(async (tx) => {
      const unit = await tx.unit.findUniqueOrThrow({ where: { id } });
      demand(
        ['AVAILABLE', 'MAINTENANCE'].includes(unit.status),
        'Unit masih memiliki reservasi atau penghuni',
      );
      const row = await tx.unit.update({ where: { id }, data: { status } });
      await this.audit(tx, actor, 'UNIT_STATUS', id, { status });
      return row;
    });
  }
  async applications(actor: Actor) {
    return this.db.application.findMany({
      where: actor.role === 'TENANT' ? { tenantId: actor.id } : {},
      include: {
        unit: true,
        tenant: { select: userSelect },
        lease: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async apply(actor: Actor, input: D.ApplicationDto) {
    tenant(actor);
    validateHousehold(input);
    if (['EMPLOYEE', 'SELF_EMPLOYED', 'FREELANCE'].includes(input.employmentType))
      demand(input.employerName?.trim(), 'Nama tempat bekerja atau usaha wajib diisi');
    const start = dateOnly(input.moveInDate);
    demand(start >= jakartaToday(), 'Tanggal masuk tidak boleh lampau');
    return this.db.atomic(async (tx) => {
      if (input.incomeDocumentId) await this.document(actor, input.incomeDocumentId, tx);
      const unit = await tx.unit.findUniqueOrThrow({ where: { id: input.unitId } });
      demand(unit.status === 'AVAILABLE', 'Unit tidak tersedia');
      demand(
        !(await tx.application.findFirst({
          where: { tenantId: actor.id, status: { in: ['PENDING', 'APPROVED'] } },
        })),
        'Anda masih memiliki pengajuan aktif',
      );
      demand(
        !(await tx.lease.findFirst({
          where: { tenantId: actor.id, status: { notIn: ['CLOSED', 'CANCELLED'] } },
        })),
        'Selesaikan masa sewa sebelumnya terlebih dahulu',
      );
      const app = await tx.application.create({
        data: { ...input, moveInDate: start, tenantId: actor.id },
      });
      await this.audit(tx, actor, 'APPLICATION_CREATED', app.id);
      return app;
    });
  }
  async approve(actor: Actor, id: string, input: D.ApprovalDto) {
    manager(actor);
    const start = dateOnly(input.startDate);
    demand(start >= jakartaToday(), 'Tanggal mulai tidak boleh lampau');
    return this.db.atomic(async (tx) => {
      const app = await tx.application.findUniqueOrThrow({ where: { id } });
      demand(app.status === 'PENDING', 'Pengajuan sudah diproses');
      const held = await tx.unit.updateMany({
        where: { id: app.unitId, status: 'AVAILABLE' },
        data: { status: 'RESERVED' },
      });
      demand(held.count === 1, 'Unit sudah direservasi');
      const end = addMonths(start, input.months);
      end.setUTCDate(end.getUTCDate() - 1);
      const lease = await tx.lease.create({
        data: {
          applicationId: id,
          unitId: app.unitId,
          tenantId: app.tenantId,
          startDate: start,
          endDate: end,
          months: input.months,
          dueDay: input.dueDay,
          rent: input.rent,
          deposit: input.deposit,
        },
      });
      await tx.application.update({ where: { id }, data: { status: 'APPROVED' } });
      await this.audit(tx, actor, 'APPLICATION_APPROVED', id, { leaseId: lease.id });
      return lease;
    });
  }
  async rejectApplication(actor: Actor, id: string, reason: string) {
    manager(actor);
    return this.db.atomic(async (tx) => {
      const app = await tx.application.findUniqueOrThrow({ where: { id } });
      demand(app.status === 'PENDING', 'Pengajuan sudah diproses');
      const row = await tx.application.update({
        where: { id },
        data: { status: 'REJECTED', reason },
      });
      await this.audit(tx, actor, 'APPLICATION_REJECTED', id, { reason });
      return row;
    });
  }
  async cancelLease(actor: Actor, id: string, reason: string) {
    manager(actor);
    return this.db.atomic(async (tx) => {
      const lease = await this.lease(actor, id, tx);
      demand(
        ['DRAFT', 'AWAITING_SIGNATURE', 'SIGNED', 'VERIFIED'].includes(lease.status),
        'Kontrak tidak dapat dibatalkan',
      );
      demand(
        !lease.invoices.some(
          (i) => i.status === 'PAID' || i.payments.some((p) => p.status === 'PENDING'),
        ),
        'Selesaikan pembayaran yang sudah masuk sebelum pembatalan',
      );
      await tx.invoice.updateMany({ where: { leaseId: id }, data: { status: 'VOID' } });
      await tx.unit.update({ where: { id: lease.unitId }, data: { status: 'AVAILABLE' } });
      await tx.application.update({
        where: { id: lease.applicationId },
        data: { status: 'CANCELLED', reason },
      });
      const row = await tx.lease.update({ where: { id }, data: { status: 'CANCELLED' } });
      await this.audit(tx, actor, 'LEASE_CANCELLED', id, { reason });
      return row;
    });
  }
  async leases(actor: Actor) {
    return this.db.lease.findMany({
      where: actor.role === 'TENANT' ? { tenantId: actor.id } : {},
      include: leaseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }
  async contract(actor: Actor, id: string, documentId: string) {
    return this.db.atomic(async (tx) => {
      const lease = await this.lease(actor, id, tx);
      await this.document(actor, documentId, tx, 'application/pdf');
      const kind = actor.role === 'MANAGER' ? 'ORIGINAL' : 'SIGNED';
      demand(
        actor.role === 'MANAGER'
          ? ['DRAFT', 'AWAITING_SIGNATURE', 'SIGNED'].includes(lease.status)
          : lease.status === 'AWAITING_SIGNATURE',
        'Dokumen tidak dapat ditambahkan pada status ini',
      );
      const version = await tx.contractVersion.create({
        data: { leaseId: id, documentId, kind, version: lease.contracts.length + 1 },
      });
      await tx.lease.update({
        where: { id },
        data: { status: kind === 'ORIGINAL' ? 'AWAITING_SIGNATURE' : 'SIGNED' },
      });
      await this.audit(tx, actor, 'CONTRACT_UPLOADED', id, { version: version.version, kind });
      return version;
    });
  }
  async verifyContract(actor: Actor, id: string) {
    manager(actor);
    return this.db.atomic(async (tx) => {
      const lease = await this.lease(actor, id, tx);
      demand(lease.status === 'SIGNED', 'Salinan bertanda tangan belum tersedia');
      await tx.lease.update({ where: { id }, data: { status: 'VERIFIED' } });
      await this.rentInvoice(tx, lease, 0);
      await tx.invoice.create({
        data: {
          leaseId: id,
          kind: 'DEPOSIT',
          period: 'initial',
          label: 'Deposit jaminan',
          amount: lease.deposit,
          dueDate: lease.startDate,
          items: [{ label: 'Deposit jaminan', amount: Number(lease.deposit) }],
        },
      });
      await this.audit(tx, actor, 'CONTRACT_VERIFIED', id);
      return this.lease(actor, id, tx);
    });
  }
  private async rentInvoice(tx: Tx, lease: Lease, index: number) {
    const start = addMonths(lease.startDate, index),
      period = start.toISOString().slice(0, 10);
    return tx.invoice.upsert({
      where: { leaseId_kind_period: { leaseId: lease.id, kind: 'RENT', period } },
      update: {},
      create: {
        leaseId: lease.id,
        kind: 'RENT',
        period,
        label: `Sewa periode ${index + 1}`,
        amount: lease.rent,
        dueDate: index === 0 ? lease.startDate : dueDate(start, lease.dueDay),
        items: [{ label: 'Sewa bulanan', amount: Number(lease.rent) }],
      },
    });
  }
  async generate(actor: Actor) {
    return this.db.atomic(async (tx) => {
      const leases = await tx.lease.findMany({
        where: { status: 'ACTIVE', ...(actor.role === 'TENANT' ? { tenantId: actor.id } : {}) },
      });
      let count = 0;
      for (const lease of leases)
        for (let i = 1; i < lease.months; i++)
          if (addMonths(lease.startDate, i) <= jakartaToday()) {
            await this.rentInvoice(tx, lease, i);
            count++;
          }
      return { processed: count };
    });
  }
  async invoices(actor: Actor) {
    return this.db.invoice.findMany({
      where: { lease: actor.role === 'TENANT' ? { tenantId: actor.id } : {} },
      include: {
        lease: { include: { unit: true, tenant: { select: userSelect } } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { dueDate: 'desc' },
    });
  }
  async payment(
    actor: Actor,
    invoiceId: string,
    documentId?: string,
    simulated = false,
    outcome = 'success',
  ) {
    if (simulated && process.env.DEMO_MODE !== 'true') throw new NotFoundException();
    tenant(actor);
    return this.db.atomic(async (tx) => {
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
        include: { lease: true },
      });
      own(actor, invoice.lease.tenantId);
      demand(invoice.status === 'UNPAID', 'Tagihan sudah lunas atau dibatalkan');
      demand(
        !(await tx.payment.findFirst({ where: { invoiceId, status: 'PENDING' } })),
        'Bukti sebelumnya masih menunggu verifikasi',
      );
      if (!simulated) {
        demand(documentId, 'Bukti pembayaran wajib diunggah');
        await this.document(actor, documentId, tx);
      }
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          documentId,
          amount: money(Number(invoice.amount) - Number(invoice.depositApplied)),
          simulated,
          status: simulated ? (outcome === 'success' ? 'APPROVED' : 'FAILED') : 'PENDING',
          reviewedAt: simulated ? new Date() : undefined,
        },
      });
      if (payment.status === 'APPROVED') await this.markPaid(tx, invoice, payment.id);
      await this.audit(
        tx,
        actor,
        simulated ? 'PAYMENT_SIMULATED' : 'PAYMENT_SUBMITTED',
        payment.id,
      );
      return payment;
    });
  }
  private async markPaid(tx: Tx, invoice: Invoice, reference: string) {
    await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'PAID' } });
    if (invoice.kind === 'DEPOSIT')
      await tx.depositEntry.create({
        data: {
          leaseId: invoice.leaseId,
          kind: 'RECEIVED',
          amount: invoice.amount,
          reference,
          reason: 'Deposit diterima',
        },
      });
    const lease = await tx.lease.findUniqueOrThrow({ where: { id: invoice.leaseId } });
    if (
      lease.status === 'MOVED_OUT' &&
      !(await tx.invoice.count({ where: { leaseId: lease.id, status: 'UNPAID' } }))
    )
      await tx.lease.update({ where: { id: lease.id }, data: { status: 'CLOSED' } });
  }
  async payments(actor: Actor) {
    return this.db.payment.findMany({
      where: { invoice: { lease: actor.role === 'TENANT' ? { tenantId: actor.id } : {} } },
      include: {
        invoice: {
          include: { lease: { include: { unit: true, tenant: { select: userSelect } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async reviewPayment(actor: Actor, id: string, input: D.ReviewDto) {
    manager(actor);
    if (!input.approve)
      demand(input.reason && input.reason.length >= 3, 'Alasan penolakan wajib diisi');
    return this.db.atomic(async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id },
        include: { invoice: true },
      });
      demand(payment.status === 'PENDING', 'Pembayaran sudah diproses');
      demand(payment.invoice.status === 'UNPAID', 'Tagihan sudah diproses');
      const row = await tx.payment.update({
        where: { id },
        data: {
          status: input.approve ? 'APPROVED' : 'REJECTED',
          reason: input.reason,
          reviewedBy: actor.id,
          reviewedAt: new Date(),
        },
      });
      if (input.approve) await this.markPaid(tx, payment.invoice, id);
      await this.audit(tx, actor, 'PAYMENT_REVIEWED', id, {
        approve: input.approve,
        reason: input.reason ?? '',
      });
      return row;
    });
  }
  async meter(actor: Actor, id: string, input: D.MeterDto) {
    manager(actor);
    return this.db.atomic(async (tx) => {
      const lease = await this.lease(actor, id, tx);
      demand(lease.status === 'ACTIVE', 'Meter hanya dapat dicatat untuk kontrak aktif');
      demand(
        input.period >= lease.startDate.toISOString().slice(0, 7) &&
          input.period <= jakartaToday().toISOString().slice(0, 7),
        'Periode meter di luar masa tinggal',
      );
      const last = lease.meters.at(-1),
        initial = lease.inspections.find((i) => i.kind === 'IN');
      demand(initial, 'Inspeksi masuk belum tersedia');
      demand(
        !last || input.period > last.period,
        'Meter harus dicatat berurutan dan satu kali per bulan',
      );
      demand(
        input.electricityStart === Number(last?.electricityEnd ?? initial.electricity) &&
          input.waterStart === Number(last?.waterEnd ?? initial.water),
        'Meter awal harus sama dengan catatan terakhir',
      );
      const settings = await tx.property.findUniqueOrThrow({ where: { id: 'rumahkita' } });
      const electricity = utility(
          input.electricityStart,
          input.electricityEnd,
          Number(settings.electricityRate),
        ),
        water = utility(input.waterStart, input.waterEnd, Number(settings.waterRate));
      const row = await tx.meterReading.create({
        data: {
          ...input,
          leaseId: id,
          electricityRate: settings.electricityRate,
          waterRate: settings.waterRate,
        },
      });
      await this.utilityInvoice(tx, lease, input.period, electricity, water, input, {
        electricity: Number(settings.electricityRate),
        water: Number(settings.waterRate),
      });
      await this.audit(tx, actor, 'METER_RECORDED', id, { period: input.period });
      return row;
    });
  }
  private utilityInvoice(
    tx: Tx,
    lease: Lease,
    period: string,
    electricity: number,
    water: number,
    readings: object,
    rates: object,
  ) {
    const amount = money(electricity + water);
    return tx.invoice.create({
      data: {
        leaseId: lease.id,
        kind: 'UTILITY',
        period,
        label: period === 'final' ? 'Utilitas akhir' : `Listrik & air ${period}`,
        amount,
        status: amount === 0 ? 'PAID' : 'UNPAID',
        dueDate: dueDate(jakartaToday(), lease.dueDay),
        items: [
          { label: 'Listrik', amount: electricity },
          { label: 'Air', amount: water },
          { readings, rates },
        ] as Prisma.InputJsonValue,
      },
    });
  }
  async inspect(actor: Actor, id: string, input: D.InspectionDto) {
    manager(actor);
    demand(new Set(input.checklist).size === 5, 'Lengkapi kelima item inspeksi');
    return this.db.atomic(async (tx) => {
      const lease = await this.lease(actor, id, tx);
      demand(
        input.kind === 'IN' ? lease.status === 'VERIFIED' : lease.status === 'ACTIVE',
        'Status kontrak tidak sesuai inspeksi',
      );
      for (const doc of input.documentIds) await this.document(actor, doc, tx);
      if (input.kind === 'OUT') {
        const initial = lease.inspections.find((i) => i.kind === 'IN')!;
        const last = lease.meters.at(-1);
        utility(Number(last?.electricityEnd ?? initial.electricity), input.electricity, 0);
        utility(Number(last?.waterEnd ?? initial.water), input.water, 0);
      }
      const row = await tx.inspection.upsert({
        where: { leaseId_kind: { leaseId: id, kind: input.kind } },
        create: { ...input, leaseId: id },
        update: input,
      });
      await this.audit(tx, actor, 'INSPECTION_RECORDED', id, { kind: input.kind });
      return row;
    });
  }
  async moveIn(actor: Actor, id: string) {
    manager(actor);
    return this.db.atomic(async (tx) => {
      const lease = await this.lease(actor, id, tx);
      demand(lease.status === 'VERIFIED', 'Kontrak belum diverifikasi');
      demand(
        lease.inspections.some((i) => i.kind === 'IN'),
        'Inspeksi masuk belum selesai',
      );
      const initial = lease.invoices.filter((i) => i.kind === 'DEPOSIT' || i.kind === 'RENT');
      demand(
        initial.length >= 2 && initial.every((i) => i.status === 'PAID'),
        'Sewa awal dan deposit harus lunas',
      );
      demand(jakartaToday() >= lease.startDate, 'Tanggal masuk belum tiba');
      demand(jakartaToday() <= lease.endDate, 'Masa kontrak sudah berakhir');
      await tx.unit.update({ where: { id: lease.unitId }, data: { status: 'OCCUPIED' } });
      const row = await tx.lease.update({ where: { id }, data: { status: 'ACTIVE' } });
      await this.audit(tx, actor, 'MOVE_IN', id);
      return row;
    });
  }
  async moveOut(actor: Actor, id: string, input: D.SettlementDto) {
    manager(actor);
    await this.generate(actor);
    return this.db.atomic(async (tx) => {
      const lease = await this.lease(actor, id, tx);
      demand(lease.status === 'ACTIVE', 'Penyewa tidak sedang menghuni unit');
      const inspection = lease.inspections.find((i) => i.kind === 'OUT');
      demand(inspection, 'Inspeksi keluar belum selesai');
      demand(
        !lease.invoices.some((i) => i.payments.some((p) => p.status === 'PENDING')),
        'Verifikasi semua pembayaran sebelum penyelesaian',
      );
      const initial = lease.inspections.find((i) => i.kind === 'IN')!,
        last = lease.meters.at(-1),
        settings = await tx.property.findUniqueOrThrow({ where: { id: 'rumahkita' } });
      const readings = {
        electricityStart: Number(last?.electricityEnd ?? initial.electricity),
        electricityEnd: Number(inspection.electricity),
        waterStart: Number(last?.waterEnd ?? initial.water),
        waterEnd: Number(inspection.water),
      };
      await this.utilityInvoice(
        tx,
        lease,
        'final',
        utility(
          readings.electricityStart,
          readings.electricityEnd,
          Number(settings.electricityRate),
        ),
        utility(readings.waterStart, readings.waterEnd, Number(settings.waterRate)),
        readings,
        { electricity: Number(settings.electricityRate), water: Number(settings.waterRate) },
      );
      if (input.damages > 0)
        await tx.invoice.create({
          data: {
            leaseId: id,
            kind: 'FINAL',
            period: 'damages',
            label: 'Biaya kerusakan',
            amount: input.damages,
            dueDate: jakartaToday(),
            items: [{ label: input.reason, amount: input.damages }],
          },
        });
      const unpaid = await tx.invoice.findMany({
        where: { leaseId: id, status: 'UNPAID' },
        orderBy: { dueDate: 'asc' },
      });
      const deposit = lease.depositEntries.reduce((s, e) => s + Number(e.amount), 0),
        total = unpaid.reduce((s, i) => s + Number(i.amount) - Number(i.depositApplied), 0),
        summary = settlement(deposit, total, 0);
      let balance = deposit;
      for (const invoice of unpaid) {
        const applied = Math.min(balance, Number(invoice.amount) - Number(invoice.depositApplied));
        if (applied > 0) {
          balance = money(balance - applied);
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              depositApplied: { increment: applied },
              status:
                applied + Number(invoice.depositApplied) === Number(invoice.amount)
                  ? 'PAID'
                  : 'UNPAID',
            },
          });
          await tx.depositEntry.create({
            data: {
              leaseId: id,
              kind: 'APPLIED',
              amount: -applied,
              reason: `Pelunasan ${invoice.label}: ${input.reason}`,
              reference: `settle:${invoice.id}`,
            },
          });
        }
      }
      if (balance > 0)
        await tx.depositEntry.create({
          data: {
            leaseId: id,
            kind: 'REFUND_DUE',
            amount: 0,
            reason: `Pengembalian menunggu pencatatan: ${balance}`,
            reference: `refund-due:${id}`,
          },
        });
      await tx.unit.update({ where: { id: lease.unitId }, data: { status: 'MAINTENANCE' } });
      await tx.lease.update({
        where: { id },
        data: {
          status: summary.outstanding === 0 && balance === 0 ? 'CLOSED' : 'MOVED_OUT',
          movedOutAt: new Date(),
        },
      });
      await this.audit(tx, actor, 'MOVE_OUT', id, { ...summary, reason: input.reason });
      return summary;
    });
  }
  async refund(actor: Actor, id: string, reason: string) {
    manager(actor);
    return this.db.atomic(async (tx) => {
      const lease = await this.lease(actor, id, tx);
      demand(lease.status === 'MOVED_OUT', 'Kontrak belum selesai inspeksi keluar');
      const balance = money(lease.depositEntries.reduce((s, e) => s + Number(e.amount), 0));
      demand(balance > 0, 'Tidak ada deposit yang perlu dikembalikan');
      const row = await tx.depositEntry.create({
        data: {
          leaseId: id,
          kind: 'REFUNDED',
          amount: -balance,
          reason,
          reference: `refund:${id}`,
        },
      });
      if (!lease.invoices.some((i) => i.status === 'UNPAID'))
        await tx.lease.update({ where: { id }, data: { status: 'CLOSED' } });
      await this.audit(tx, actor, 'DEPOSIT_REFUNDED', id, { amount: balance, reason });
      return row;
    });
  }
  async tickets(actor: Actor) {
    return this.db.ticket.findMany({
      where: actor.role === 'TENANT' ? { tenantId: actor.id } : {},
      include: {
        tenant: { select: userSelect },
        lease: { include: { unit: true } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async ticket(actor: Actor, input: D.TicketDto) {
    tenant(actor);
    const lease = await this.lease(actor, input.leaseId);
    demand(lease.status === 'ACTIVE', 'Laporan membutuhkan kontrak aktif');
    for (const doc of input.documentIds) await this.document(actor, doc);
    return this.db.ticket.create({ data: { ...input, tenantId: actor.id } });
  }
  async comment(actor: Actor, id: string, text: string) {
    const ticket = await this.db.ticket.findUniqueOrThrow({ where: { id } });
    own(actor, ticket.tenantId);
    return this.db.comment.create({
      data: { ticketId: id, authorId: actor.id, authorName: actor.name, text },
    });
  }
  async ticketStatus(actor: Actor, id: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') {
    manager(actor);
    return this.db.atomic(async (tx) => {
      const row = await tx.ticket.update({ where: { id }, data: { status } });
      await this.audit(tx, actor, 'TICKET_STATUS', id, { status });
      return row;
    });
  }
  async announcements(actor: Actor) {
    const leases =
      actor.role === 'TENANT'
        ? await this.db.lease.findMany({
            where: { tenantId: actor.id, status: { in: ['VERIFIED', 'ACTIVE'] } },
            select: { unitId: true },
          })
        : [];
    return this.db.announcement.findMany({
      where:
        actor.role === 'TENANT'
          ? { OR: [{ unitId: null }, { unitId: { in: leases.map((l) => l.unitId) } }] }
          : {},
      orderBy: { createdAt: 'desc' },
    });
  }
  async announce(actor: Actor, input: D.AnnouncementDto) {
    manager(actor);
    if (input.unitId) await this.db.unit.findUniqueOrThrow({ where: { id: input.unitId } });
    return this.db.announcement.create({ data: { ...input, unitId: input.unitId || null } });
  }
  async settings(actor: Actor, input?: D.SettingsDto) {
    if (input) {
      manager(actor);
      return this.db.atomic(async (tx) => {
        const row = await tx.property.update({ where: { id: 'rumahkita' }, data: input });
        await this.audit(tx, actor, 'SETTINGS_UPDATED', 'rumahkita');
        return row;
      });
    }
    return this.db.property.findUniqueOrThrow({ where: { id: 'rumahkita' } });
  }
  async tenants(actor: Actor) {
    manager(actor);
    return this.db.user.findMany({
      where: { role: 'TENANT' },
      select: {
        ...userSelect,
        leases: { include: { unit: true } },
        createdAt: true,
        applications: { take: 1, orderBy: { createdAt: 'desc' }, include: { unit: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
  async dashboard(actor: Actor) {
    const invoices = await this.invoices(actor),
      payments = await this.payments(actor),
      tickets = await this.tickets(actor),
      leases = await this.leases(actor);
    const units = actor.role === 'MANAGER' ? await this.db.unit.findMany() : [];
    return {
      demo: process.env.DEMO_MODE === 'true',
      units: units.length,
      available: units.filter((u) => u.status === 'AVAILABLE').length,
      occupied: units.filter((u) => u.status === 'OCCUPIED').length,
      pendingPayments: payments.filter((p) => p.status === 'PENDING').length,
      received: payments
        .filter((p) => p.status === 'APPROVED' && p.invoice.kind !== 'DEPOSIT')
        .reduce((s, p) => s + Number(p.amount), 0),
      outstanding: invoices
        .filter((i) => i.status === 'UNPAID')
        .reduce((s, i) => s + Number(i.amount) - Number(i.depositApplied), 0),
      openTickets: tickets.filter((t) => t.status !== 'RESOLVED').length,
      invoices: invoices.slice(0, 6),
      leases: leases.slice(0, 4),
      payments: payments.slice(0, 5),
      announcements: (await this.announcements(actor)).slice(0, 3),
    };
  }
  async reports(actor: Actor, from?: string, to?: string) {
    manager(actor);
    const start = from ? dateOnly(from) : new Date('2000-01-01'),
      end = to ? dateOnly(to) : jakartaToday();
    demand(end >= start, 'Rentang tanggal tidak valid');
    end.setUTCDate(end.getUTCDate() + 1);
    const payments = await this.db.payment.findMany({
      where: { status: 'APPROVED', reviewedAt: { gte: start, lt: end } },
      include: {
        invoice: {
          include: { lease: { include: { unit: true, tenant: { select: userSelect } } } },
        },
      },
      orderBy: { reviewedAt: 'desc' },
    });
    const units = await this.db.unit.findMany(),
      deposits = await this.db.depositEntry.aggregate({ _sum: { amount: true } }),
      overdue = await this.db.invoice.findMany({
        where: { status: 'UNPAID', dueDate: { lt: jakartaToday() } },
      });
    return {
      payments,
      occupancy: units.length
        ? Math.round((units.filter((u) => u.status === 'OCCUPIED').length / units.length) * 100)
        : 0,
      depositBalance: Number(deposits._sum.amount ?? 0),
      arrears: overdue.reduce((s, i) => s + Number(i.amount) - Number(i.depositApplied), 0),
      rent: payments
        .filter((p) => p.invoice.kind === 'RENT')
        .reduce((s, p) => s + Number(p.amount), 0),
      utilities: payments
        .filter((p) => p.invoice.kind === 'UTILITY')
        .reduce((s, p) => s + Number(p.amount), 0),
      maintenance: await this.db.ticket.groupBy({ by: ['status'], _count: true }),
    };
  }
}
