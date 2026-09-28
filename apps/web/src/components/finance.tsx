'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Download,
  FileText,
  Plus,
  Receipt,
  ShieldCheck,
  FlaskConical,
  CheckCircle2,
} from 'lucide-react';
import {
  api,
  upload,
  Invoice,
  Payment,
  Lease,
  Settings,
  Report,
  MeterInput,
  Dashboard,
  date,
  rupiah,
  today,
  labels,
} from '@/lib/api';
import { useUser, InvoiceTable } from './workspace';
import {
  useData,
  State,
  PageHeading,
  Panel,
  Badge,
  Empty,
  Form,
  Modal,
  Action,
  Stat,
  Field,
} from './ui';
export function InvoicesScreen({ id }: { id?: string }) {
  const manager = useUser().role === 'MANAGER',
    base = manager ? '/pengelola' : '/penyewa';
  const { data, error, reload } = useData<Invoice[]>('invoices');
  const settings = useData<Settings>('settings');
  const leases = useData<Lease[]>('leases');
  const health = useData<{ demo: boolean }>('health');
  const [meter, setMeter] = useState(false);
  const [filter, setFilter] = useState('');
  const [proof, setProof] = useState(false);
  const [selectedLease, setSelectedLease] = useState('');
  useEffect(() => {
    api('invoices/generate', 'POST')
      .then(reload)
      .catch(() => {});
  }, []);
  const invoice = data?.find((i) => i.id === id);
  const active = leases.data?.filter((l) => l.status === 'ACTIVE') || [];
  const selected = active.find((l) => l.id === selectedLease) || active[0];
  const last = selected?.meters.at(-1),
    initial = selected?.inspections.find((i) => i.kind === 'IN');
  return (
    <>
      <PageHeading
        title={
          id ? invoice?.label || 'Detail tagihan' : manager ? 'Tagihan & meter' : 'Tagihan saya'
        }
        description={
          id
            ? 'Rincian pembayaran dan status verifikasi.'
            : 'Catatan sewa, listrik, dan air yang mudah ditelusuri.'
        }
        action={
          manager && !id ? (
            <div className="record-actions">
              <Action
                className="button secondary"
                onClick={async () => {
                  await api('invoices/generate', 'POST');
                  reload();
                }}
              >
                Proses sewa bulanan
              </Action>
              <button className="button" disabled={!active.length} onClick={() => setMeter(true)}>
                <Plus size={17} />
                Catat meter
              </button>
            </div>
          ) : undefined
        }
      />
      <State error={error} loading={!data}>
        {id ? (
          invoice ? (
            <>
              <Link className="text-link" href={`${base}/tagihan`}>
                <ArrowLeft size={14} />
                Semua tagihan
              </Link>
              <div className="two-columns invoice-detail">
                <Panel title="Rincian tagihan" action={<Badge value={invoice.status} />}>
                  <p className="eyebrow">
                    {invoice.lease.unit.code} · {invoice.lease.tenant.name}
                  </p>
                  <div className="summary-row">
                    <span>Jenis</span>
                    <strong>{labels[invoice.kind]}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Jatuh tempo</span>
                    <strong>{date(invoice.dueDate)}</strong>
                  </div>
                  {invoice.items
                    .filter((i) => i.label)
                    .map((i, index) => (
                      <div className="summary-row" key={index}>
                        <span>{i.label}</span>
                        <strong>{rupiah(i.amount)}</strong>
                      </div>
                    ))}
                  {Number(invoice.depositApplied) > 0 && (
                    <div className="summary-row">
                      <span>Dibayar dari deposit</span>
                      <strong>− {rupiah(invoice.depositApplied)}</strong>
                    </div>
                  )}
                  <div className="summary-row total-row">
                    <span>
                      {invoice.status === 'PAID' ? 'Jumlah tercatat' : 'Jumlah yang dibayar'}
                    </span>
                    <strong>
                      {rupiah(Number(invoice.amount) - Number(invoice.depositApplied))}
                    </strong>
                  </div>
                  <h3 className="spaced-title">Riwayat verifikasi</h3>
                  {invoice.payments.length ? (
                    invoice.payments.map((p) => (
                      <div className="payment-item" key={p.id}>
                        <div className="summary-row">
                          <span>
                            {date(p.createdAt)} {p.simulated && <small>· Simulasi</small>}
                          </span>
                          <Badge value={p.status} />
                        </div>
                        {p.reason && <p className="muted">{p.reason}</p>}
                        {p.documentId && (
                          <a href={`/api/documents/${p.documentId}`} className="file-link">
                            <FileText size={14} />
                            Lihat bukti pembayaran
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="muted">Belum ada pembayaran untuk tagihan ini.</p>
                  )}
                </Panel>
                <Panel title={manager ? 'Informasi pembayaran' : 'Bayar tagihan'}>
                  <p className="muted">
                    Transfer sesuai nominal tagihan ke rekening berikut, lalu unggah bukti untuk
                    diperiksa pengelola.
                  </p>
                  <div className="bank-box">
                    <span>{settings.data?.bankName}</span>
                    <strong>{settings.data?.bankAccount}</strong>
                    <small>a.n. {settings.data?.bankOwner}</small>
                  </div>
                  {health.data?.demo && (
                    <div className="notice">
                      <FlaskConical size={18} />
                      Ini demo. Jangan melakukan transfer uang nyata.
                    </div>
                  )}
                  {!manager &&
                    invoice.status === 'UNPAID' &&
                    !invoice.payments.some((p) => p.status === 'PENDING') && (
                      <>
                        <button className="button wide" onClick={() => setProof(true)}>
                          Unggah bukti pembayaran
                        </button>
                        {health.data?.demo && (
                          <div className="simulation-box">
                            <strong>Simulasi pembayaran</strong>
                            <p className="muted">Uji status pembayaran tanpa transfer.</p>
                            <div className="record-actions">
                              <Action
                                onClick={async () => {
                                  await api(`invoices/${invoice.id}/simulate`, 'POST', {
                                    outcome: 'success',
                                  });
                                  reload();
                                }}
                              >
                                Simulasi berhasil
                              </Action>
                              <Action
                                className="button secondary"
                                onClick={async () => {
                                  await api(`invoices/${invoice.id}/simulate`, 'POST', {
                                    outcome: 'failed',
                                  });
                                  reload();
                                }}
                              >
                                Simulasi gagal
                              </Action>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  {invoice.payments.some((p) => p.status === 'PENDING') && (
                    <div className="notice">Bukti sedang ditinjau oleh pengelola.</div>
                  )}
                  {invoice.status === 'PAID' && (
                    <div className="notice success">
                      <CheckCircle2 size={19} />
                      Tagihan ini sudah lunas.
                    </div>
                  )}
                  {manager && (
                    <Link className="text-link" href="/pengelola/pembayaran">
                      Buka verifikasi pembayaran <ArrowUpRight size={14} />
                    </Link>
                  )}
                </Panel>
              </div>
            </>
          ) : (
            <Empty text="Tagihan tidak ditemukan" />
          )
        ) : (
          <>
            <div className="inline-filter">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter tagihan"
              >
                <option value="">Semua status</option>
                <option value="UNPAID">Belum dibayar</option>
                <option value="PAID">Lunas</option>
                <option value="VOID">Dibatalkan</option>
              </select>
            </div>
            <Panel className="table-panel">
              <InvoiceTable
                items={data?.filter((i) => !filter || i.status === filter) || []}
                base={base}
              />
            </Panel>
          </>
        )}
      </State>
      {proof && invoice && (
        <Modal title="Unggah bukti pembayaran" onClose={() => setProof(false)}>
          <p className="muted">
            Nominal: {rupiah(Number(invoice.amount) - Number(invoice.depositApplied))}. PDF, JPG,
            atau PNG maksimal 5 MB.
          </p>
          <Form
            fields={[
              {
                name: 'file',
                label: 'Bukti transfer',
                type: 'file',
                accept: 'application/pdf,image/jpeg,image/png',
              },
            ]}
            submit="Kirim untuk diverifikasi"
            onSubmit={async (v) => {
              const doc = await upload(v.file as File);
              await api(`invoices/${invoice.id}/pay`, 'POST', { documentId: doc.id });
              setProof(false);
              reload();
            }}
          />
        </Modal>
      )}
      {meter && (
        <Modal title="Catat meter listrik & air" onClose={() => setMeter(false)}>
          <label className="standalone-label">
            Unit
            <select value={selected?.id || ''} onChange={(e) => setSelectedLease(e.target.value)}>
              {active.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.unit.code} — {l.tenant.name}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <Form
              key={selected.id}
              fields={[
                {
                  name: 'period',
                  label: 'Periode tagihan',
                  type: 'month',
                  value: today().slice(0, 7),
                },
                {
                  name: 'electricityStart',
                  label: 'Meter listrik awal (kWh)',
                  type: 'number',
                  step: '0.001',
                  min: 0,
                  value: last?.electricityEnd || initial?.electricity || 0,
                },
                {
                  name: 'electricityEnd',
                  label: 'Meter listrik akhir (kWh)',
                  type: 'number',
                  step: '0.001',
                  min: 0,
                },
                {
                  name: 'waterStart',
                  label: 'Meter air awal (m³)',
                  type: 'number',
                  step: '0.001',
                  min: 0,
                  value: last?.waterEnd || initial?.water || 0,
                },
                {
                  name: 'waterEnd',
                  label: 'Meter air akhir (m³)',
                  type: 'number',
                  step: '0.001',
                  min: 0,
                },
              ]}
              submit="Simpan & terbitkan tagihan"
              onSubmit={async (v) => {
                const input: MeterInput = {
                  period: String(v.period),
                  electricityStart: Number(v.electricityStart),
                  electricityEnd: Number(v.electricityEnd),
                  waterStart: Number(v.waterStart),
                  waterEnd: Number(v.waterEnd),
                };
                await api(`leases/${selected.id}/meters`, 'POST', input);
                setMeter(false);
                reload();
                leases.reload();
              }}
            />
          )}
          <p className="muted">
            Tarif saat ini: listrik {rupiah(settings.data?.electricityRate)}/kWh · air{' '}
            {rupiah(settings.data?.waterRate)}/m³.
          </p>
        </Modal>
      )}
    </>
  );
}
export function PaymentsScreen() {
  const manager = useUser().role === 'MANAGER';
  const { data, error, reload } = useData<Payment[]>('payments');
  const [filter, setFilter] = useState(manager ? 'PENDING' : '');
  const [review, setReview] = useState<Payment>();
  return (
    <>
      <PageHeading
        title={manager ? 'Verifikasi pembayaran' : 'Riwayat pembayaran'}
        description={
          manager
            ? 'Periksa bukti transfer sebelum menandai tagihan lunas.'
            : 'Setiap pembayaran dan hasil verifikasinya tersimpan di sini.'
        }
      />
      <div className="inline-filter">
        <select
          aria-label="Filter pembayaran"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Semua pembayaran</option>
          {['PENDING', 'APPROVED', 'REJECTED', 'FAILED'].map((s) => (
            <option key={s} value={s}>
              {labels[s]}
            </option>
          ))}
        </select>
      </div>
      <State error={error} loading={!data}>
        <Panel className="table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pembayaran</th>
                  <th>Penyewa / unit</th>
                  <th>Nominal</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data
                  ?.filter((p) => !filter || p.status === filter)
                  .map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.invoice.label}</strong>
                        <small>
                          {date(p.createdAt)}
                          {p.simulated ? ' · Simulasi' : ''}
                        </small>
                      </td>
                      <td>
                        {p.invoice.lease.tenant.name}
                        <small>{p.invoice.lease.unit.code}</small>
                      </td>
                      <td>{rupiah(p.amount)}</td>
                      <td>
                        <Badge value={p.status} />
                        {p.reason && <small>{p.reason}</small>}
                      </td>
                      <td>
                        {p.documentId && (
                          <a className="file-link" href={`/api/documents/${p.documentId}`}>
                            Bukti
                          </a>
                        )}
                        {manager && p.status === 'PENDING' ? (
                          <button className="button small" onClick={() => setReview(p)}>
                            Tinjau
                          </button>
                        ) : (
                          <Link
                            className="detail-link"
                            href={`${manager ? '/pengelola' : '/penyewa'}/tagihan/${p.invoiceId}`}
                          >
                            Detail
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!data?.filter((p) => !filter || p.status === filter).length && (
            <Empty text="Tidak ada pembayaran pada status ini" />
          )}
        </Panel>
      </State>
      {review && (
        <Modal title="Tinjau bukti pembayaran" onClose={() => setReview(undefined)}>
          <p>
            {review.invoice.lease.tenant.name} · {rupiah(review.amount)}
          </p>
          {review.documentId && (
            <a
              className="file-link"
              href={`/api/documents/${review.documentId}`}
              target="_blank"
              rel="noreferrer"
            >
              <FileText size={15} />
              Buka bukti pembayaran
            </a>
          )}
          <Form
            fields={[
              {
                name: 'decision',
                label: 'Keputusan',
                options: [
                  { value: 'approve', label: 'Terima pembayaran' },
                  { value: 'reject', label: 'Tolak bukti pembayaran' },
                ],
              },
              {
                name: 'reason',
                label: 'Catatan (wajib jika ditolak)',
                type: 'textarea',
                required: false,
              },
            ]}
            submit="Simpan hasil verifikasi"
            onSubmit={async (v) => {
              await api(`payments/${review.id}/review`, 'POST', {
                approve: v.decision === 'approve',
                reason: String(v.reason),
              });
              setReview(undefined);
              reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
const checks = [
  ['keys', 'Kunci dan akses sudah diperiksa'],
  ['walls', 'Dinding dan lantai sudah diperiksa'],
  ['plumbing', 'Air dan saluran sudah diperiksa'],
  ['electricity', 'Listrik sudah diperiksa'],
  ['cleanliness', 'Kebersihan sudah diperiksa'],
];
export function StayScreen() {
  const manager = useUser().role === 'MANAGER';
  const { data, error, reload } = useData<Lease[]>('leases');
  const [inspect, setInspect] = useState<{ lease: Lease; kind: 'IN' | 'OUT' }>();
  const [settle, setSettle] = useState<Lease>();
  const [refund, setRefund] = useState<Lease>();
  return (
    <>
      <PageHeading
        title={manager ? 'Inspeksi & deposit' : 'Masa tinggal & deposit'}
        description="Serah terima yang jelas, dari hari pertama hingga akhir masa sewa."
      />
      <State error={error} loading={!data}>
        {data?.length ? (
          <div className="cards-list">
            {data
              .filter((l) => l.status !== 'CANCELLED')
              .map((l) => {
                const balance = l.depositEntries.reduce((s, e) => s + Number(e.amount), 0);
                return (
                  <article className="record" key={l.id}>
                    <div className="record-head">
                      <div>
                        <p className="eyebrow">
                          {l.unit.code} · {l.tenant.name}
                        </p>
                        <h3>{l.unit.name}</h3>
                      </div>
                      <Badge value={l.status} />
                    </div>
                    <div className="summary-grid">
                      <div className="summary-row">
                        <span className="muted">Masa sewa</span>
                        <strong>
                          {date(l.startDate)} — {date(l.endDate)}
                        </strong>
                      </div>
                      <div className="summary-row">
                        <span className="muted">Saldo deposit</span>
                        <strong>{rupiah(balance)}</strong>
                      </div>
                    </div>
                    <div className="record-meta">
                      {l.inspections.map((i) => (
                        <span key={i.id}>
                          Inspeksi {i.kind === 'IN' ? 'masuk' : 'keluar'}: {date(i.completedAt)}
                        </span>
                      ))}
                    </div>
                    {l.inspections.map((i) => (
                      <div key={i.id} className="inspection-note">
                        <strong>Inspeksi {i.kind === 'IN' ? 'masuk' : 'keluar'}</strong>
                        <p>{i.notes || 'Checklist selesai.'}</p>
                        <small>
                          Meter listrik {i.electricity} kWh · Air {i.water} m³
                        </small>
                        <div>
                          {i.documentIds.map((d, j) => (
                            <a key={d} className="file-link" href={`/api/documents/${d}`}>
                              Foto {j + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                    {l.depositEntries.length > 0 && (
                      <details>
                        <summary>Riwayat deposit</summary>
                        {l.depositEntries.map((e) => (
                          <div className="summary-row" key={e.id}>
                            <div>
                              {labels[e.kind]}
                              <small className="muted"> · {e.reason}</small>
                            </div>
                            <strong>{rupiah(e.amount)}</strong>
                          </div>
                        ))}
                      </details>
                    )}
                    <div className="record-actions">
                      {manager && l.status === 'VERIFIED' && (
                        <>
                          <button
                            className="button secondary"
                            onClick={() => setInspect({ lease: l, kind: 'IN' })}
                          >
                            Inspeksi masuk
                          </button>
                          <Action
                            onClick={async () => {
                              await api(`leases/${l.id}/move-in`, 'POST');
                              reload();
                            }}
                          >
                            Konfirmasi move-in
                          </Action>
                        </>
                      )}
                      {manager && l.status === 'ACTIVE' && (
                        <>
                          <button
                            className="button secondary"
                            onClick={() => setInspect({ lease: l, kind: 'OUT' })}
                          >
                            Inspeksi keluar
                          </button>
                          <button className="button" onClick={() => setSettle(l)}>
                            Selesaikan move-out
                          </button>
                        </>
                      )}
                      {manager && l.status === 'MOVED_OUT' && balance > 0 && (
                        <button className="button" onClick={() => setRefund(l)}>
                          Catat pengembalian deposit
                        </button>
                      )}
                    </div>
                    {l.status === 'MOVED_OUT' && (
                      <p className="danger-note">
                        Selesaikan saldo tagihan atau pencatatan pengembalian deposit untuk menutup
                        kontrak.
                      </p>
                    )}
                  </article>
                );
              })}
          </div>
        ) : (
          <Empty text="Belum ada masa tinggal" />
        )}
      </State>
      {inspect && (
        <Modal
          title={`Inspeksi ${inspect.kind === 'IN' ? 'masuk' : 'keluar'} · ${inspect.lease.unit.code}`}
          onClose={() => setInspect(undefined)}
        >
          <Form
            fields={[
              ...checks.map(([name, label]) => ({ name, label, type: 'checkbox' })),
              {
                name: 'electricity',
                label: 'Angka meter listrik (kWh)',
                type: 'number',
                min: 0,
                step: '0.001',
              },
              {
                name: 'water',
                label: 'Angka meter air (m³)',
                type: 'number',
                min: 0,
                step: '0.001',
              },
              { name: 'notes', label: 'Catatan kondisi rumah', type: 'textarea' },
              {
                name: 'file',
                label: 'Foto inspeksi (opsional)',
                type: 'file',
                accept: 'image/jpeg,image/png',
                required: false,
              },
            ]}
            submit="Simpan checklist inspeksi"
            onSubmit={async (v) => {
              const file = v.file as File,
                docs = file?.size ? [(await upload(file)).id] : [];
              await api(`leases/${inspect.lease.id}/inspections`, 'POST', {
                kind: inspect.kind,
                checklist: checks.map((c) => c[0]),
                electricity: Number(v.electricity),
                water: Number(v.water),
                notes: String(v.notes),
                documentIds: docs,
              });
              setInspect(undefined);
              reload();
            }}
          />
        </Modal>
      )}
      {settle && (
        <Modal
          title={`Penyelesaian move-out · ${settle.unit.code}`}
          onClose={() => setSettle(undefined)}
        >
          <p className="muted">
            Tagihan utilitas akhir akan dihitung dari inspeksi keluar. Deposit dipakai menutup
            tunggakan dan biaya kerusakan. Sisa pengembalian dicatat setelah dana benar-benar
            dikembalikan.
          </p>
          <Form
            fields={[
              { name: 'damages', label: 'Biaya kerusakan (Rp)', type: 'number', min: 0, value: 0 },
              { name: 'reason', label: 'Rincian biaya / catatan penyelesaian', type: 'textarea' },
            ]}
            submit="Konfirmasi move-out & perhitungan deposit"
            onSubmit={async (v) => {
              await api(`leases/${settle.id}/move-out`, 'POST', {
                damages: Number(v.damages),
                reason: String(v.reason),
              });
              setSettle(undefined);
              reload();
            }}
          />
        </Modal>
      )}
      {refund && (
        <Modal title="Catat pengembalian deposit" onClose={() => setRefund(undefined)}>
          <p>
            Jumlah:{' '}
            <strong>
              {rupiah(refund.depositEntries.reduce((s, e) => s + Number(e.amount), 0))}
            </strong>
          </p>
          <p className="muted">
            Konfirmasi hanya setelah pengembalian diselesaikan di luar aplikasi. Untuk demo, gunakan
            referensi fiktif.
          </p>
          <Form
            fields={[
              {
                name: 'reason',
                label: 'Referensi transfer / catatan pengembalian',
                type: 'textarea',
              },
            ]}
            submit="Konfirmasi deposit dikembalikan"
            onSubmit={async (v) => {
              await api(`leases/${refund.id}/refund`, 'POST', v);
              setRefund(undefined);
              reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
export function ReportsScreen() {
  const [from, setFrom] = useState(today().slice(0, 7) + '-01'),
    [to, setTo] = useState(today());
  const { data, error } = useData<Report>(`reports?from=${from}&to=${to}`);
  return (
    <>
      <PageHeading
        title="Laporan properti"
        description="Lihat penerimaan, tunggakan, dan dana deposit secara terpisah."
        action={
          <a className="button secondary" href={`/api/reports/export?from=${from}&to=${to}`}>
            <Download size={16} />
            Ekspor CSV
          </a>
        }
      />
      <div className="inline-filter">
        <label>
          Dari{' '}
          <input
            type="date"
            aria-label="Tanggal mulai laporan"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Sampai{' '}
          <input
            type="date"
            aria-label="Tanggal akhir laporan"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <State error={error} loading={!data}>
        {data && (
          <>
            <div className="stats">
              <Stat
                label="Penerimaan sewa"
                value={rupiah(data.rent)}
                detail="Dalam periode pilihan"
              />
              <Stat
                label="Penerimaan utilitas"
                value={rupiah(data.utilities)}
                detail="Dalam periode pilihan"
              />
              <Stat
                label="Saldo deposit"
                value={rupiah(data.depositBalance)}
                detail="Saldo saat ini · bukan pendapatan"
              />
              <Stat
                label="Tunggakan"
                value={rupiah(data.arrears)}
                detail="Belum dibayar dan lewat jatuh tempo"
              />
            </div>
            <div className="two-columns">
              <Panel title="Kondisi properti saat ini">
                <div className="summary-row">
                  <span>Tingkat hunian</span>
                  <strong>{data.occupancy}%</strong>
                </div>
                {data.maintenance.map((m) => (
                  <div className="summary-row" key={m.status}>
                    <span>Maintenance {labels[m.status].toLowerCase()}</span>
                    <strong>{m._count}</strong>
                  </div>
                ))}
              </Panel>
              <Panel title="Ringkasan periode">
                <p className="muted">
                  {date(from)} — {date(to)}
                </p>
                <h2>{rupiah(data.rent + data.utilities)}</h2>
                <p className="muted">
                  Penerimaan sewa dan utilitas, tidak termasuk deposit. Transaksi simulasi diberi
                  tanda pada tabel dan ekspor.
                </p>
              </Panel>
            </div>
            <Panel title="Pembayaran disetujui" className="spaced-panel">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Unit</th>
                      <th>Penyewa</th>
                      <th>Jenis</th>
                      <th>Nominal</th>
                      <th>Sumber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p) => (
                      <tr key={p.id}>
                        <td>{date(p.createdAt)}</td>
                        <td>{p.invoice.lease.unit.code}</td>
                        <td>{p.invoice.lease.tenant.name}</td>
                        <td>{labels[p.invoice.kind]}</td>
                        <td>{rupiah(p.amount)}</td>
                        <td>{p.simulated ? 'Simulasi' : 'Bukti manual'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.payments.length && <Empty text="Tidak ada pembayaran dalam periode ini" />}
            </Panel>
          </>
        )}
      </State>
    </>
  );
}
export function SettingsScreen() {
  const { data, error, reload } = useData<Settings>('settings');
  return (
    <>
      <PageHeading
        title="Pengaturan properti"
        description="Informasi hunian, rekening pembayaran, dan tarif utilitas."
      />
      <State error={error} loading={!data}>
        {data && (
          <Panel title="RumahKita Residence">
            <Form
              fields={[
                { name: 'name', label: 'Nama properti', value: data.name },
                { name: 'address', label: 'Alamat', value: data.address },
                { name: 'bankName', label: 'Nama bank', value: data.bankName },
                { name: 'bankAccount', label: 'Nomor rekening', value: data.bankAccount },
                { name: 'bankOwner', label: 'Nama pemilik rekening', value: data.bankOwner },
                {
                  name: 'electricityRate',
                  label: 'Tarif listrik per kWh (Rp)',
                  type: 'number',
                  min: 0,
                  value: data.electricityRate,
                },
                {
                  name: 'waterRate',
                  label: 'Tarif air per m³ (Rp)',
                  type: 'number',
                  min: 0,
                  value: data.waterRate,
                },
              ]}
              submit="Simpan pengaturan"
              onSubmit={async (v) => {
                await api('settings', 'PUT', {
                  ...v,
                  electricityRate: Number(v.electricityRate),
                  waterRate: Number(v.waterRate),
                });
                reload();
              }}
            />
            <p className="muted spaced-title">
              Perubahan tarif hanya berlaku untuk tagihan baru. Tagihan yang sudah terbit tidak
              berubah.
            </p>
          </Panel>
        )}
      </State>
    </>
  );
}
