'use client';
import Link from 'next/link';
import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  House,
  ClipboardList,
  Users,
  FileText,
  Wallet,
  Receipt,
  Wrench,
  Megaphone,
  KeyRound,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  ArrowUpRight,
  Bell,
  FlaskConical,
  CalendarDays,
} from 'lucide-react';
import {
  api,
  User,
  Dashboard as DashboardData,
  Unit,
  Invoice,
  rupiah,
  date,
  Payment,
} from '@/lib/api';
import { Brand } from './public';
import { useData, State, PageHeading, Panel, Stat, Badge, Empty, Action } from './ui';
import { ApplicationsScreen, ContractsScreen, UnitsScreen, TenantsScreen } from './rentals';
import {
  InvoicesScreen,
  PaymentsScreen,
  StayScreen,
  ReportsScreen,
  SettingsScreen,
} from './finance';
import { TicketsScreen, AnnouncementsScreen } from './operations';
const UserContext = createContext<User | null>(null);
export const useUser = () => useContext(UserContext)!;
const managerNav = [
  ['', 'Ringkasan', LayoutDashboard],
  ['unit', 'Unit properti', House],
  ['pengajuan', 'Pengajuan sewa', ClipboardList],
  ['penyewa', 'Data penyewa', Users],
  ['kontrak', 'Kontrak sewa', FileText],
  ['tagihan', 'Tagihan & meter', Receipt],
  ['pembayaran', 'Pembayaran', Wallet],
  ['maintenance', 'Maintenance', Wrench],
  ['pengumuman', 'Pengumuman', Megaphone],
  ['inspeksi', 'Inspeksi & deposit', KeyRound],
  ['laporan', 'Laporan', BarChart3],
] as const;
const tenantNav = [
  ['', 'Ringkasan', LayoutDashboard],
  ['pengajuan', 'Pengajuan saya', ClipboardList],
  ['kontrak', 'Kontrak sewa', FileText],
  ['tagihan', 'Tagihan saya', Receipt],
  ['pembayaran', 'Riwayat pembayaran', Wallet],
  ['maintenance', 'Laporan kerusakan', Wrench],
  ['pengumuman', 'Pengumuman', Megaphone],
  ['masa-tinggal', 'Masa tinggal & deposit', KeyRound],
] as const;
export function Workspace({
  role,
  segments = [],
}: {
  role: 'MANAGER' | 'TENANT';
  segments?: string[];
}) {
  const [user, setUser] = useState<User>();
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const base = role === 'MANAGER' ? '/pengelola' : '/penyewa';
  const nav = role === 'MANAGER' ? managerNav : tenantNav;
  const section = segments[0] || '';
  useEffect(() => {
    api<User>('auth/me')
      .then((u) => {
        if (u.role !== role) router.replace(u.role === 'MANAGER' ? '/pengelola' : '/penyewa');
        else setUser(u);
      })
      .catch(() =>
        router.replace(`/masuk?next=${encodeURIComponent(location.pathname + location.search)}`),
      );
  }, [role, router]);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  if (!user)
    return (
      <State loading error={error}>
        <></>
      </State>
    );
  const title = nav.find((n) => n[0] === section)?.[1] || 'Pengaturan';
  return (
    <UserContext.Provider value={user}>
      <div className="workspace">
        {open && <div className="mobile-overlay" onClick={() => setOpen(false)} />}
        <aside className={`sidebar ${open ? 'open' : ''}`}>
          <Brand />
          <p className="sidebar-subtitle">
            {role === 'MANAGER' ? 'KELOLA PROPERTI' : 'RUANG PENYEWA'}
          </p>
          <nav>
            {nav.map(([url, label, Icon]) => (
              <Link
                key={url}
                className={`nav-link ${section === url ? 'active' : ''}`}
                href={`${base}${url ? '/' + url : ''}`}
              >
                <Icon />
                {label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-tip">
              <strong>RumahKita Residence</strong>Satu tempat untuk semua
              <br />
              urusan hunian Anda.
            </div>
            {role === 'MANAGER' && (
              <Link
                className={`nav-link ${section === 'pengaturan' ? 'active' : ''}`}
                href={`${base}/pengaturan`}
              >
                <Settings />
                Pengaturan
              </Link>
            )}
            <Action
              className="nav-link"
              onClick={async () => {
                await api('auth/logout', 'POST');
                router.push('/masuk');
              }}
            >
              <LogOut />
              Keluar
            </Action>
          </div>
        </aside>
        <div className="workspace-main">
          <header className="topbar">
            <button
              className="icon-button mobile-menu"
              aria-label="Buka menu"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <div className="breadcrumb">
              RumahKita Residence <ChevronRight size={13} />
              <strong>{title}</strong>
            </div>
            <div className="topbar-right">
              <span className="demo-banner">
                <FlaskConical size={13} />
                LINGKUNGAN DEMO
              </span>
              <Link href={`${base}/pengumuman`} aria-label="Pengumuman" className="icon-button">
                <Bell size={19} />
              </Link>
              <div className="profile">
                <div className="avatar">
                  {user.name
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <strong>{user.name.split(' ').slice(0, 2).join(' ')}</strong>
                  <small>{role === 'MANAGER' ? 'Pengelola properti' : 'Penyewa'}</small>
                </div>
              </div>
            </div>
          </header>
          <main className="workspace-content" key={pathname}>
            {section === '' ? (
              <Dashboard />
            ) : section === 'unit' ? (
              <UnitsScreen id={segments[1]} />
            ) : section === 'pengajuan' ? (
              <ApplicationsScreen />
            ) : section === 'kontrak' ? (
              <ContractsScreen />
            ) : section === 'penyewa' ? (
              <TenantsScreen />
            ) : section === 'tagihan' ? (
              <InvoicesScreen id={segments[1]} />
            ) : section === 'pembayaran' ? (
              <PaymentsScreen />
            ) : section === 'maintenance' ? (
              <TicketsScreen />
            ) : section === 'pengumuman' ? (
              <AnnouncementsScreen />
            ) : section === 'inspeksi' || section === 'masa-tinggal' ? (
              <StayScreen />
            ) : section === 'laporan' ? (
              <ReportsScreen />
            ) : section === 'pengaturan' ? (
              <SettingsScreen />
            ) : (
              <Empty text="Halaman tidak ditemukan">
                <Link href={base}>Kembali ke ringkasan</Link>
              </Empty>
            )}
          </main>
        </div>
      </div>
    </UserContext.Provider>
  );
}
export function InvoiceTable({ items, base }: { items: Invoice[]; base: string }) {
  return items.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tagihan / penyewa</th>
            <th>Unit</th>
            <th>Jatuh tempo</th>
            <th>Jumlah</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>
                <strong>{i.label}</strong>
                <small>{i.lease?.tenant?.name}</small>
              </td>
              <td>{i.lease?.unit?.code}</td>
              <td>{date(i.dueDate)}</td>
              <td>
                <strong>{rupiah(Number(i.amount) - Number(i.depositApplied))}</strong>
              </td>
              <td>
                <Badge value={i.status} />
              </td>
              <td>
                <Link className="detail-link" href={`${base}/tagihan/${i.id}`}>
                  Detail <ArrowUpRight size={13} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty text="Belum ada tagihan" />
  );
}
function Dashboard() {
  const user = useUser();
  const manager = user.role === 'MANAGER';
  const base = manager ? '/pengelola' : '/penyewa';
  const { data, error, reload } = useData<DashboardData>('dashboard');
  const units = useData<{ items: Unit[] }>('units?limit=100');
  useEffect(() => {
    api('invoices/generate', 'POST')
      .then(reload)
      .catch(() => {});
  }, []);
  return (
    <>
      <PageHeading
        title={`Selamat datang, ${user.name.split(' ')[0]}.`}
        description={
          manager
            ? 'Berikut kabar properti Anda hari ini.'
            : 'Semua informasi hunian Anda, dalam satu tempat.'
        }
        action={
          <span className="date-pill">
            <CalendarDays size={13} /> {date(new Date().toISOString())}
          </span>
        }
      />
      <State error={error} loading={!data}>
        {data && (
          <>
            {!manager && (
              <div className="welcome-strip">
                <div>
                  <p className="eyebrow">RUMAH ANDA</p>
                  <h2>
                    {data.leases.find((l) => l.status === 'ACTIVE')?.unit.name ||
                      'Temukan rumah yang cocok untuk Anda.'}
                  </h2>
                  <p>
                    {data.leases.find((l) => l.status === 'ACTIVE')
                      ? 'Terima kasih telah menjadi bagian dari RumahKita.'
                      : 'Lihat unit tersedia dan ajukan sewa secara online.'}
                  </p>
                </div>
                <Link
                  className="button secondary"
                  href={data.leases.length ? '/penyewa/kontrak' : '/unit'}
                >
                  {data.leases.length ? 'Lihat kontrak' : 'Cari hunian'}
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            )}
            <div className="stats">
              {manager ? (
                <>
                  <Stat
                    label="Total unit properti"
                    value={data.units}
                    detail={`${data.available} unit tersedia`}
                    icon={<House size={18} />}
                  />
                  <Stat
                    label="Unit dihuni"
                    value={
                      <>
                        {data.occupied}
                        <span className="muted"> / {data.units}</span>
                      </>
                    }
                    detail={`${data.units ? Math.round((data.occupied / data.units) * 100) : 0}% tingkat hunian`}
                    icon={<KeyRound size={18} />}
                  />
                  <Stat
                    label="Penerimaan tercatat"
                    value={rupiah(data.received)}
                    detail="Seluruh periode · di luar deposit"
                    icon={<Wallet size={18} />}
                  />
                  <Stat
                    label="Perlu verifikasi"
                    value={data.pendingPayments}
                    detail={`${data.openTickets} laporan maintenance aktif`}
                    icon={<ClipboardList size={18} />}
                  />
                </>
              ) : (
                <>
                  <Stat
                    label="Tagihan belum lunas"
                    value={rupiah(data.outstanding)}
                    detail="Termasuk tagihan yang belum jatuh tempo"
                  />
                  <Stat
                    label="Pembayaran tercatat"
                    value={data.payments.filter((p) => p.status === 'APPROVED').length}
                    detail="Pada aktivitas pembayaran terbaru"
                  />
                  <Stat
                    label="Laporan aktif"
                    value={data.openTickets}
                    detail="Sedang menunggu penyelesaian"
                  />
                  <Stat
                    label="Kontrak saya"
                    value={data.leases.length}
                    detail="Lihat dokumen & masa sewa"
                  />
                </>
              )}
            </div>
            <div className="dashboard-grid">
              {manager ? (
                <>
                  <Panel
                    title="Status unit properti"
                    action={
                      <Link href="/pengelola/unit" className="text-link">
                        Lihat semua <ArrowUpRight size={14} />
                      </Link>
                    }
                  >
                    <div className="occupancy-grid">
                      {units.data?.items.map((u) => (
                        <Link
                          key={u.id}
                          href={`/pengelola/unit/${u.id}`}
                          title={`${u.code}: ${u.status}`}
                          className={`unit-tile ${u.status === 'AVAILABLE' ? 'available' : u.status === 'MAINTENANCE' ? 'maintenance' : ''}`}
                        >
                          {u.code}
                        </Link>
                      ))}
                    </div>
                    <div className="legend">
                      <span>
                        <i />
                        Dihuni / direservasi
                      </span>
                      <span>
                        <i className="orange" />
                        Tersedia
                      </span>
                      <span>
                        <i className="gray" />
                        Perawatan
                      </span>
                    </div>
                  </Panel>
                  <PaymentChart />
                </>
              ) : (
                <Panel title="Kabar untuk penghuni">
                  {data.announcements.length ? (
                    data.announcements.map((a) => (
                      <article className="announcement-item" key={a.id}>
                        <small>{date(a.createdAt)}</small>
                        <h3>{a.title}</h3>
                        <p>{a.body}</p>
                      </article>
                    ))
                  ) : (
                    <Empty text="Belum ada pengumuman" />
                  )}
                </Panel>
              )}
              <Panel
                className="table-panel"
                title={manager ? 'Tagihan terbaru' : 'Tagihan Anda'}
                action={
                  <Link href={`${base}/tagihan`} className="text-link">
                    Lihat semua <ArrowUpRight size={14} />
                  </Link>
                }
              >
                <InvoiceTable items={data.invoices} base={base} />
              </Panel>
              <Panel title={manager ? 'Pengumuman properti' : 'Aktivitas pembayaran'}>
                {manager ? (
                  data.announcements.map((a) => (
                    <article className="announcement-item" key={a.id}>
                      <small>{date(a.createdAt)}</small>
                      <h3>{a.title}</h3>
                      <p>{a.body}</p>
                    </article>
                  ))
                ) : data.payments.length ? (
                  data.payments.slice(0, 4).map((p) => (
                    <div className="summary-row" key={p.id}>
                      <div>
                        {p.invoice.label}
                        <small className="muted"> · {date(p.createdAt)}</small>
                      </div>
                      <Badge value={p.status} />
                    </div>
                  ))
                ) : (
                  <Empty text="Belum ada pembayaran" />
                )}
              </Panel>
            </div>
          </>
        )}
      </State>
    </>
  );
}
function PaymentChart() {
  const { data, error } = useData<Payment[]>('payments');
  if (!data)
    return (
      <Panel title="Penerimaan sewa & utilitas">
        <State error={error} loading>
          <></>
        </State>
      </Panel>
    );
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 5 + i);
    const key = d.toISOString().slice(0, 7);
    return {
      label: d.toLocaleDateString('id-ID', { month: 'short' }),
      value: (data || [])
        .filter(
          (p) =>
            p.status === 'APPROVED' && p.invoice.kind !== 'DEPOSIT' && p.createdAt.startsWith(key),
        )
        .reduce((s, p) => s + Number(p.amount), 0),
    };
  });
  const max = Math.max(1, ...months.map((m) => m.value));
  return (
    <Panel title="Penerimaan sewa & utilitas" className="chart-panel">
      <p className="chart-value">{rupiah(months.at(-1)?.value)}</p>
      <p className="chart-note">Pembayaran disetujui · bulan berjalan</p>
      <div className="chart-bars" aria-label="Penerimaan enam bulan terakhir">
        {months.map((m) => (
          <div className="chart-column" key={m.label} title={`${m.label}: ${rupiah(m.value)}`}>
            <i style={{ height: `${Math.max(2, (m.value / max) * 100)}%` }} />
            <span>{m.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
