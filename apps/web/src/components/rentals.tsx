'use client';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, ArrowUpRight, FileText, CheckCircle2, House, ArrowLeft } from 'lucide-react';
import {
  api,
  upload,
  Unit,
  User,
  Application,
  Lease,
  ApplicationInput,
  ApprovalInput,
  UnitInput,
  date,
  rupiah,
  today,
  labels,
} from '@/lib/api';
import { useUser } from './workspace';
import { useData, State, PageHeading, Panel, Badge, Empty, Form, Modal, Action, Field } from './ui';
import { UnitCard } from './public';
import { ApplicantForm, ApplicationProfile, FacilityChoices } from './application-profile';
export function ApplicationsScreen() {
  const user = useUser(),
    manager = user.role === 'MANAGER';
  const { data, error, reload } = useData<Application[]>('applications');
  const params = useSearchParams(),
    router = useRouter();
  const unitId = params.get('unit');
  const [approve, setApprove] = useState<Application>();
  const [reject, setReject] = useState<Application>();
  const [success, setSuccess] = useState(false);
  return (
    <>
      <PageHeading
        title={manager ? 'Pengajuan sewa' : 'Pengajuan saya'}
        description={
          manager
            ? 'Tinjau calon penghuni dan setujui rumah yang sesuai.'
            : 'Pantau langkah Anda menuju rumah baru.'
        }
        action={
          !manager ? (
            <Link className="button" href="/unit">
              <Plus size={17} />
              Cari hunian
            </Link>
          ) : undefined
        }
      />
      {unitId && !manager && !success && (
        <ApplicationForm
          unitId={unitId}
          done={() => {
            setSuccess(true);
            reload();
            router.replace('/penyewa/pengajuan');
          }}
        />
      )}
      {success && (
        <div className="notice success">
          <CheckCircle2 size={19} />
          Pengajuan terkirim. Pengelola akan meninjau permohonan Anda.
        </div>
      )}
      <State error={error} loading={!data}>
        {data?.length ? (
          <div className="cards-list">
            {data.map((a) => (
              <article className="record" key={a.id}>
                <div className="record-head">
                  <div>
                    <p className="eyebrow">
                      {a.unit.code} · {date(a.createdAt)}
                    </p>
                    <h3>{manager ? a.tenant.name : a.unit.name}</h3>
                  </div>
                  <Badge value={a.status} />
                </div>
                <div className="record-meta">
                  <span>Rencana masuk: {date(a.moveInDate)}</span>
                  <span>{a.occupants} penghuni</span>
                  <span>{a.occupation}</span>
                  {manager && <span>{a.tenant.phone}</span>}
                </div>
                <details className="profile-disclosure">
                  <summary>Data pemohon & penghuni</summary>
                  <ApplicationProfile application={a} />
                </details>
                {a.notes && <p>{a.notes}</p>}
                {a.reason && <p className="danger-note">Catatan pengelola: {a.reason}</p>}
                <div className="record-actions">
                  {manager && a.status === 'PENDING' && (
                    <>
                      <button className="button" onClick={() => setApprove(a)}>
                        Setujui pengajuan
                      </button>
                      <button className="button secondary" onClick={() => setReject(a)}>
                        Tolak
                      </button>
                    </>
                  )}
                  {a.lease && (
                    <Link
                      className="text-link"
                      href={`${manager ? '/pengelola' : '/penyewa'}/kontrak`}
                    >
                      Lihat kontrak <ArrowUpRight size={14} />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty text="Belum ada pengajuan sewa">
            <Link className="text-link" href="/unit">
              Temukan hunian Anda <ArrowUpRight size={15} />
            </Link>
          </Empty>
        )}
      </State>
      {approve && (
        <Modal title={`Setujui ${approve.tenant.name}`} onClose={() => setApprove(undefined)}>
          <ApplicationProfile application={approve} />
          <p className="muted">
            Unit {approve.unit.code} akan direservasi setelah pengajuan disetujui.
          </p>
          <Form
            fields={[
              {
                name: 'startDate',
                label: 'Tanggal mulai',
                type: 'date',
                value: approve.moveInDate.slice(0, 10),
              },
              {
                name: 'months',
                label: 'Durasi (bulan penuh)',
                type: 'number',
                min: 1,
                max: 60,
                value: 12,
              },
              {
                name: 'rent',
                label: 'Sewa per bulan (Rp)',
                type: 'number',
                min: 1,
                value: approve.unit.rent,
              },
              {
                name: 'deposit',
                label: 'Deposit (Rp)',
                type: 'number',
                min: 1,
                value: approve.unit.deposit,
              },
              {
                name: 'dueDay',
                label: 'Tanggal jatuh tempo',
                type: 'number',
                min: 1,
                max: 31,
                value: 5,
              },
            ]}
            submit="Setujui & reservasi unit"
            onSubmit={async (v) => {
              const input: ApprovalInput = {
                startDate: String(v.startDate),
                months: Number(v.months),
                rent: Number(v.rent),
                deposit: Number(v.deposit),
                dueDay: Number(v.dueDay),
              };
              await api(`applications/${approve.id}/approve`, 'POST', input);
              setApprove(undefined);
              reload();
            }}
          />
        </Modal>
      )}
      {reject && (
        <Modal title="Tolak pengajuan" onClose={() => setReject(undefined)}>
          <Form
            fields={[{ name: 'reason', label: 'Alasan penolakan', type: 'textarea' }]}
            submit="Simpan penolakan"
            onSubmit={async (v) => {
              await api(`applications/${reject.id}/reject`, 'POST', v);
              setReject(undefined);
              reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
function ApplicationForm({ unitId, done }: { unitId: string; done: () => void }) {
  const { data: unit, error } = useData<Unit>(`units/${unitId}`);
  return (
    <Panel title="Ajukan rumah pilihan Anda" className="application-panel">
      <State error={error} loading={!unit}>
        {unit && (
          <>
            <div className="rent-summary">
              <strong>{unit.name}</strong> · {rupiah(unit.rent)} / bulan · Deposit{' '}
              {rupiah(unit.deposit)}
            </div>
            <ApplicantForm unitId={unitId} done={done} />
          </>
        )}
      </State>
    </Panel>
  );
}
export function ContractsScreen() {
  const manager = useUser().role === 'MANAGER';
  const { data, error, reload } = useData<Lease[]>('leases');
  const [selected, setSelected] = useState<Lease>();
  const [cancel, setCancel] = useState<Lease>();
  return (
    <>
      <PageHeading
        title="Kontrak sewa"
        description="Dokumen, kesepakatan, dan masa sewa tercatat di sini."
      />
      <State error={error} loading={!data}>
        {data?.length ? (
          <div className="cards-list">
            {data.map((l) => (
              <article className="record" key={l.id}>
                <div className="record-head">
                  <div>
                    <p className="eyebrow">KONTRAK · {l.unit.code}</p>
                    <h3>{l.unit.name}</h3>
                    <span className="muted">{l.tenant.name}</span>
                  </div>
                  <Badge value={l.status} />
                </div>
                <div className="record-meta">
                  <span>
                    {date(l.startDate)} — {date(l.endDate)}
                  </span>
                  <span>{rupiah(l.rent)} / bulan</span>
                  <span>Jatuh tempo tanggal {l.dueDay}</span>
                  <span>Deposit {rupiah(l.deposit)}</span>
                </div>
                <div>
                  {l.contracts.map((c) => (
                    <a key={c.id} className="file-link" href={`/api/documents/${c.documentId}`}>
                      <FileText size={15} />
                      {c.kind === 'ORIGINAL' ? 'Dokumen pengelola' : 'Salinan ditandatangani'} · v
                      {c.version}
                    </a>
                  ))}
                  {!l.contracts.length && <p className="muted">Dokumen kontrak belum diunggah.</p>}
                </div>
                <div className="record-actions">
                  {(manager
                    ? ['DRAFT', 'AWAITING_SIGNATURE', 'SIGNED'].includes(l.status)
                    : l.status === 'AWAITING_SIGNATURE') && (
                    <button className="button" onClick={() => setSelected(l)}>
                      {manager ? 'Unggah kontrak PDF' : 'Unggah salinan bertanda tangan'}
                    </button>
                  )}
                  {manager && l.status === 'SIGNED' && (
                    <Action
                      onClick={async () => {
                        await api(`leases/${l.id}/verify`, 'POST');
                        reload();
                      }}
                    >
                      Verifikasi kontrak
                    </Action>
                  )}
                  {manager &&
                    ['DRAFT', 'AWAITING_SIGNATURE', 'SIGNED', 'VERIFIED'].includes(l.status) && (
                      <button className="button secondary" onClick={() => setCancel(l)}>
                        Batalkan reservasi
                      </button>
                    )}
                  {['VERIFIED', 'ACTIVE'].includes(l.status) && (
                    <Link
                      className="text-link"
                      href={`${manager ? '/pengelola' : '/penyewa'}/tagihan`}
                    >
                      Lihat tagihan <ArrowUpRight size={14} />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty text="Belum ada kontrak">
            <p>Kontrak akan muncul setelah pengajuan disetujui.</p>
          </Empty>
        )}
      </State>
      {selected && (
        <Modal
          title={manager ? 'Unggah kontrak PDF' : 'Unggah kontrak bertanda tangan'}
          onClose={() => setSelected(undefined)}
        >
          <p className="muted">
            {manager
              ? 'Unggah PDF yang akan diunduh dan ditandatangani penyewa.'
              : 'Unduh dokumen pengelola, tanda tangani di luar aplikasi, lalu unggah salinannya.'}{' '}
            Maksimal 5 MB.
          </p>
          <Form
            fields={[
              { name: 'file', label: 'Dokumen PDF', type: 'file', accept: 'application/pdf' },
            ]}
            submit="Unggah kontrak"
            onSubmit={async (v) => {
              const doc = await upload(v.file as File);
              await api(`leases/${selected.id}/contract`, 'POST', { documentId: doc.id });
              setSelected(undefined);
              reload();
            }}
          />
        </Modal>
      )}
      {cancel && (
        <Modal title="Batalkan reservasi" onClose={() => setCancel(undefined)}>
          <p className="muted">
            Unit dilepas dan tagihan awal dibatalkan. Reservasi dengan pembayaran masuk tidak dapat
            dibatalkan.
          </p>
          <Form
            fields={[{ name: 'reason', label: 'Alasan pembatalan', type: 'textarea' }]}
            submit="Batalkan reservasi ini"
            onSubmit={async (v) => {
              await api(`leases/${cancel.id}/cancel`, 'POST', v);
              setCancel(undefined);
              reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
const unitFields = (u?: Unit): Field[] => [
  { name: 'code', label: 'Kode unit', value: u?.code },
  { name: 'name', label: 'Nama unit', value: u?.name },
  { name: 'rent', label: 'Sewa per bulan (Rp)', type: 'number', min: 1, value: u?.rent || 1800000 },
  { name: 'deposit', label: 'Deposit (Rp)', type: 'number', min: 1, value: u?.deposit || 1800000 },
  { name: 'area', label: 'Luas (m²)', type: 'number', min: 1, value: u?.area || 45 },
  { name: 'bedrooms', label: 'Kamar tidur', type: 'number', min: 1, value: u?.bedrooms || 2 },
  { name: 'bathrooms', label: 'Kamar mandi', type: 'number', min: 1, value: u?.bathrooms || 1 },
  {
    name: 'description',
    label: 'Deskripsi',
    type: 'textarea',
    value: u?.description,
  },
];
export function UnitsScreen({ id }: { id?: string }) {
  const { data, error, reload } = useData<{ items: Unit[]; total: number }>('units?limit=100');
  const [edit, setEdit] = useState<Unit | null>();
  const [filter, setFilter] = useState('');
  const unit = data?.items.find((u) => u.id === id);
  return (
    <>
      <PageHeading
        title={id ? unit?.name || 'Detail unit' : 'Unit properti'}
        description={
          id
            ? 'Kelola informasi dan kesiapan hunian.'
            : `${data?.total ?? 20} rumah, satu lingkungan yang terjaga.`
        }
        action={
          <button className="button" disabled={!!id && !unit} onClick={() => setEdit(id ? unit : null)}>
            <Plus size={16} />
            {id ? 'Edit unit' : 'Tambah unit'}
          </button>
        }
      />
      <State error={error} loading={!data}>
        {id ? (
          unit ? (
            <div className="two-columns">
              <Panel>
                <img
                  className="admin-unit-image"
                  src={unit.image || '/images/residence.jpg'}
                  alt={`Ilustrasi ${unit.code}`}
                />
                <div className="record-head">
                  <h2>{unit.name}</h2>
                  <Badge value={unit.status} />
                </div>
                <p className="muted">{unit.description}</p>
                <div className="record-meta">
                  <span>{unit.area} m²</span>
                  <span>{unit.bedrooms} kamar tidur</span>
                  <span>{unit.bathrooms} kamar mandi</span>
                </div>
                <div className="summary-row">
                  <span>Sewa / bulan</span>
                  <strong>{rupiah(unit.rent)}</strong>
                </div>
                <div className="summary-row">
                  <span>Deposit</span>
                  <strong>{rupiah(unit.deposit)}</strong>
                </div>
              </Panel>
              <Panel title="Kesiapan unit">
                <p className="muted">
                  Unit yang selesai move-out harus diperiksa sebelum tersedia kembali.
                </p>
                {['AVAILABLE', 'MAINTENANCE'].includes(unit.status) ? (
                  <Action
                    onClick={async () => {
                      await api(`units/${unit.id}/status`, 'PATCH', {
                        status: unit.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE',
                      });
                      reload();
                    }}
                  >
                    {unit.status === 'AVAILABLE'
                      ? 'Tandai sedang perawatan'
                      : 'Nyatakan siap disewakan'}
                  </Action>
                ) : (
                  <div className="notice">Status mengikuti reservasi dan masa tinggal penyewa.</div>
                )}
                <div className="record-actions">
                  <Link className="text-link" href="/pengelola/unit">
                    <ArrowLeft size={14} />
                    Semua unit
                  </Link>
                </div>
              </Panel>
            </div>
          ) : (
            <Empty text="Unit tidak ditemukan" />
          )
        ) : (
          <>
            <div className="inline-filter">
              <select
                aria-label="Filter status unit"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">Semua status</option>
                {['AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE'].map((s) => (
                  <option key={s} value={s}>
                    {labels[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="unit-grid">
              {data?.items
                .filter((u) => !filter || u.status === filter)
                .map((u) => (
                  <Link className="unit-card" href={`/pengelola/unit/${u.id}`} key={u.id}>
                    <div className="unit-photo">
                      <img src={u.image || '/images/residence.jpg'} alt={`Ilustrasi ${u.code}`} />
                      <Badge value={u.status} />
                      <span className="unit-code">{u.code}</span>
                    </div>
                    <div className="unit-content">
                      <h3>{u.name}</h3>
                      <div className="unit-spec">
                        <span>{u.area} m²</span>
                        <span>{u.bedrooms} kamar tidur</span>
                      </div>
                      <div className="unit-bottom">
                        <strong>{rupiah(u.rent)}</strong>
                        <ArrowUpRight size={18} />
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </>
        )}
      </State>
      {edit !== undefined && (
        <Modal title={edit ? 'Edit unit' : 'Tambah unit'} onClose={() => setEdit(undefined)}>
          <Form
            fields={unitFields(edit || undefined)}
            submit="Simpan unit"
            onSubmit={async (v, data) => {
              const input: UnitInput = {
                code: String(v.code),
                name: String(v.name),
                description: String(v.description),
                rent: Number(v.rent),
                deposit: Number(v.deposit),
                area: Number(v.area),
                bedrooms: Number(v.bedrooms),
                bathrooms: Number(v.bathrooms),
                amenities: data.getAll('amenities').map(String),
              };
              await api(edit ? `units/${edit.id}` : 'units', edit ? 'PUT' : 'POST', input);
              setEdit(undefined);
              reload();
            }}
          >
            <FacilityChoices
              selected={edit?.amenities ?? ['Dapur', 'Teras pribadi', 'Area parkir']}
            />
          </Form>
        </Modal>
      )}
    </>
  );
}
export function TenantsScreen() {
  type Tenant = User & { leases: Lease[]; applications: Application[]; createdAt: string };
  const { data, error } = useData<Tenant[]>('tenants');
  const [selected, setSelected] = useState<Tenant>();
  const [query, setQuery] = useState('');
  return (
    <>
      <PageHeading
        title="Data penyewa"
        description="Kenali penghuni dan temukan informasi masa sewanya."
      />
      <div className="inline-filter">
        <input
          aria-label="Cari penyewa"
          placeholder="Cari nama atau email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <State error={error} loading={!data}>
        <Panel className="table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Penyewa</th>
                  <th>Telepon</th>
                  <th>Unit</th>
                  <th>Status kontrak</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data
                  ?.filter((u) =>
                    (u.name + ' ' + u.email).toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                        <small>{u.email}</small>
                      </td>
                      <td>{u.phone}</td>
                      <td>{u.leases.map((l) => l.unit.code).join(', ') || '—'}</td>
                      <td>
                        {u.leases[0] ? (
                          <Badge value={u.leases[0].status} />
                        ) : (
                          <span className="muted">Belum menyewa</span>
                        )}
                      </td>
                      <td>
                        <button className="button secondary" onClick={() => setSelected(u)}>
                          Data pribadi
                        </button>
                        <Link className="detail-link" href="/pengelola/kontrak">
                          Kontrak <ArrowUpRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {data?.length === 0 && <Empty text="Belum ada penyewa" />}
        </Panel>
      </State>
      {selected && (
        <Modal title={`Data ${selected.name}`} onClose={() => setSelected(undefined)}>
          {selected.applications[0] ? (
            <ApplicationProfile application={{ ...selected.applications[0], tenant: selected }} />
          ) : (
            <p>Data penghasilan dan penghuni belum dilengkapi melalui pengajuan sewa.</p>
          )}
        </Modal>
      )}
    </>
  );
}
