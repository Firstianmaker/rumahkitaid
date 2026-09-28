'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  House,
  MapPin,
  BedDouble,
  Scan,
  ShieldCheck,
  Check,
  ArrowLeft,
  KeyRound,
  FileCheck2,
  Wallet,
  Search,
} from 'lucide-react';
import { api, Unit, User, ApplicationInput, LoginInput, rupiah, today } from '@/lib/api';
import { useData, State, Badge, Empty, Form, PageHeading, Panel } from './ui';
export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark">
        <House size={23} strokeWidth={2.3} />
      </span>
      <span>
        RumahKita<span className="brand-id">.id</span>
      </span>
    </Link>
  );
}
export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="container header-inner">
        <Brand />
        <nav>
          <Link href="/unit">Cari hunian</Link>
          <Link href="/#cara-sewa">Cara menyewa</Link>
        </nav>
        <Link className="button secondary small" href="/masuk">
          Masuk <ArrowUpRight size={16} />
        </Link>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="container footer">
      <Brand />
      <span>Rumah nyaman. Urusan sewa lebih mudah.</span>
      <small>© {new Date().getFullYear()} RumahKita.id · Demo lokal</small>
    </footer>
  );
}
export function UnitCard({ unit }: { unit: Unit }) {
  return (
    <Link className="unit-card" href={`/unit/${unit.id}`}>
      <div className="unit-photo">
        <img src={unit.image || '/images/residence.jpg'} alt={`Ilustrasi hunian ${unit.code}`} />
        <Badge value={unit.status} />
        <span className="unit-code">{unit.code}</span>
      </div>
      <div className="unit-content">
        <span className="location">
          <MapPin size={13} /> RumahKita Residence, Bandung
        </span>
        <h3>{unit.name}</h3>
        <div className="unit-spec">
          <span>
            <BedDouble size={16} />
            {unit.bedrooms} kamar
          </span>
          <span>
            <Scan size={16} />
            {unit.area} m²
          </span>
          <span>{unit.bathrooms} kamar mandi</span>
        </div>
        <div className="unit-bottom">
          <div>
            <strong>{rupiah(unit.rent)}</strong>
            <small> / bulan</small>
          </div>
          <span className="circle-arrow">
            <ArrowUpRight size={19} />
          </span>
        </div>
      </div>
    </Link>
  );
}
export function Home() {
  const { data, error } = useData<{ items: Unit[]; total: number }>(
    'units?status=AVAILABLE&limit=3',
  );
  return (
    <>
      <PublicHeader />
      <main>
        <section className="container hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="tiny-line" /> SELAMAT DATANG DI RUMAHKITA
            </p>
            <h1>
              Ruang nyaman.
              <br />
              Cerita <em>baru.</em>
            </h1>
            <p>
              Temukan rumah untuk keseharian Anda.
              <br />
              Dari pengajuan hingga urusan sewa, semua
              <br className="desktop" /> lebih mudah dalam satu tempat.
            </p>
            <Link className="button" href="/unit">
              Temukan rumah Anda <ArrowRight size={18} />
            </Link>
            <div className="hero-note">
              <ShieldCheck size={19} />
              <span>Dikelola langsung · Proses sewa transparan</span>
            </div>
          </div>
          <div className="hero-visual">
            <img src="/images/residence.jpg" alt="Ilustrasi rumah putih dengan taman tropis" />
            <span className="image-caption">RUMAHKITA RESIDENCE — BANDUNG</span>
            <div className="hero-float">
              <span className="float-icon">
                <KeyRound />
              </span>
              <div>
                <strong>Tempat untuk pulang</strong>
                <span>Rumah pilihan, pengelolaan yang terjaga.</span>
              </div>
            </div>
            <span className="photo-note">Foto ilustrasi hunian</span>
          </div>
        </section>
        <section className="trust-strip">
          <div className="container">
            <div>
              <strong>20</strong>
              <span>Unit dalam satu lingkungan</span>
            </div>
            <div>
              <FileCheck2 />
              <span>Pengajuan & kontrak online</span>
            </div>
            <div>
              <Wallet />
              <span>Tagihan tercatat dengan rapi</span>
            </div>
            <div>
              <House />
              <span>Nyaman sejak hari pertama</span>
            </div>
          </div>
        </section>
        <section className="container section">
          <PageHeading
            eyebrow="PILIH TEMPAT PULANG ANDA"
            title="Hunian yang tersedia"
            description="Ruang yang pas untuk memulai langkah berikutnya."
            action={
              <Link href="/unit" className="text-link">
                Lihat semua hunian <ArrowRight size={17} />
              </Link>
            }
          />
          <State error={error} loading={!data}>
            {data?.items.length ? (
              <div className="unit-grid">
                {data.items.map((u) => (
                  <UnitCard key={u.id} unit={u} />
                ))}
              </div>
            ) : (
              <Empty text="Belum ada unit tersedia" />
            )}
          </State>
        </section>
        <section className="steps-section" id="cara-sewa">
          <div className="container">
            <div className="steps-heading">
              <p className="eyebrow">SEDERHANA DARI AWAL</p>
              <h2>
                Tiga langkah menuju
                <br />
                rumah baru Anda.
              </h2>
            </div>
            <div className="steps">
              <article>
                <span>01</span>
                <h3>Temukan yang cocok</h3>
                <p>Lihat ketersediaan, fasilitas, dan harga sewa dengan jelas.</p>
              </article>
              <article>
                <span>02</span>
                <h3>Ajukan secara online</h3>
                <p>Lengkapi pengajuan dan pantau persetujuan pengelola.</p>
              </article>
              <article>
                <span>03</span>
                <h3>Siap menempati</h3>
                <p>Selesaikan kontrak, pembayaran awal, dan serah terima kunci.</p>
              </article>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
export function Catalog() {
  const [search, setSearch] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [available, setAvailable] = useState(true);
  const { data, error } = useData<{ items: Unit[]; total: number }>(
    `units?limit=100&status=${available ? 'AVAILABLE' : ''}&search=${encodeURIComponent(search)}&bedrooms=${bedrooms}`,
  );
  return (
    <>
      <PublicHeader />
      <main className="container section">
        <PageHeading
          eyebrow="RUMAHKITA RESIDENCE"
          title="Temukan ruang untuk Anda."
          description="Lingkungan tenang, rumah nyaman, dan urusan sewa yang mudah."
        />
        <div className="filter-bar">
          <div className="search-input">
            <Search size={18} />
            <input
              placeholder="Cari nama atau nomor unit…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari unit"
            />
          </div>
          <select
            aria-label="Jumlah kamar"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
          >
            <option value="">Semua kamar</option>
            <option value="2">2 kamar tidur</option>
            <option value="3">3 kamar tidur</option>
          </select>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            Hanya yang tersedia
          </label>
        </div>
        <p className="muted results-count">
          {data?.total ?? '…'} hunian ditemukan <span>Bandung, Jawa Barat</span>
        </p>
        <State error={error} loading={!data}>
          {data?.items.length ? (
            <div className="unit-grid">
              {data.items.map((u) => (
                <UnitCard key={u.id} unit={u} />
              ))}
            </div>
          ) : (
            <Empty text="Tidak ada hunian yang sesuai">
              <p>Coba ubah filter pencarian Anda.</p>
            </Empty>
          )}
        </State>
      </main>
      <Footer />
    </>
  );
}
export function UnitDetail({ id }: { id: string }) {
  const { data: unit, error } = useData<Unit>(`units/${id}`);
  return (
    <>
      <PublicHeader />
      <main className="container section">
        <Link className="text-link" href="/unit">
          <ArrowLeft size={16} />
          Kembali ke hunian
        </Link>
        <State error={error} loading={!unit}>
          {unit && (
            <>
              <div className="detail-title">
                <div>
                  <p className="eyebrow">{unit.code} · RUMAHKITA RESIDENCE</p>
                  <h1>{unit.name}</h1>
                  <p className="location">
                    <MapPin size={16} />
                    {unit.property?.address}
                  </p>
                </div>
                <Badge value={unit.status} />
              </div>
              <div className="detail-image">
                <img src={unit.image || '/images/residence.jpg'} alt={`Ilustrasi ${unit.name}`} />
                <small>Foto ilustrasi hunian</small>
              </div>
              <div className="detail-columns">
                <section>
                  <div className="spec-block">
                    <span>
                      <BedDouble />
                      {unit.bedrooms} kamar tidur
                    </span>
                    <span>
                      <Scan />
                      {unit.area} m² luas bangunan
                    </span>
                    <span>
                      <House />
                      {unit.bathrooms} kamar mandi
                    </span>
                  </div>
                  <h2>Tentang rumah ini</h2>
                  <p className="description">{unit.description}</p>
                  <h2>Fasilitas untuk keseharian Anda</h2>
                  <div className="amenities">
                    {unit.amenities.map((a) => (
                      <span key={a}>
                        <Check size={18} />
                        {a}
                      </span>
                    ))}
                  </div>
                </section>
                <Panel className="rent-panel">
                  <p className="muted">Harga sewa bulanan</p>
                  <h2>
                    {rupiah(unit.rent)}
                    <small> / bulan</small>
                  </h2>
                  <div className="summary-row">
                    <span>Deposit jaminan</span>
                    <strong>{rupiah(unit.deposit)}</strong>
                  </div>
                  <p className="muted">
                    Listrik dan air dihitung sesuai pemakaian. Pengajuan akan ditinjau oleh
                    pengelola.
                  </p>
                  {unit.status === 'AVAILABLE' ? (
                    <Link className="button wide" href={`/penyewa/pengajuan?unit=${unit.id}`}>
                      Ajukan sewa <ArrowRight size={18} />
                    </Link>
                  ) : (
                    <div className="notice">Unit ini belum dapat diajukan.</div>
                  )}
                  <small className="secure-note">
                    <ShieldCheck size={16} />
                    Tidak ada pembayaran saat pengajuan
                  </small>
                </Panel>
              </div>
            </>
          )}
        </State>
      </main>
      <Footer />
    </>
  );
}
export function AuthPage() {
  const [register, setRegister] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  return (
    <div className="auth-page">
      <div className="auth-image">
        <img src="/images/residence.jpg" alt="Ilustrasi rumah dengan taman" />
        <div>
          <Brand />
          <h1>
            Semua urusan rumah.
            <br />
            Satu tempat.
          </h1>
          <p>Lebih banyak waktu untuk menikmati rumah Anda.</p>
        </div>
      </div>
      <main className="auth-form">
        <Link className="text-link" href="/">
          <ArrowLeft size={16} />
          Kembali ke beranda
        </Link>
        <div>
          <p className="eyebrow">RUMAHKITA.ID</p>
          <h1>{register ? 'Mulai cerita baru.' : 'Senang Anda kembali.'}</h1>
          <p className="muted">
            {register
              ? 'Buat akun untuk mengajukan rumah pilihan Anda.'
              : 'Masuk untuk mengelola kebutuhan hunian Anda.'}
          </p>
          <Form
            key={String(register)}
            fields={[
              ...(register
                ? [
                    { name: 'name', label: 'Nama lengkap' },
                    { name: 'phone', label: 'Nomor telepon', type: 'tel' },
                  ]
                : []),
              { name: 'email', label: 'Email', type: 'email' },
              {
                name: 'password',
                label: 'Password',
                type: 'password',
                hint: 'Minimal 10 karakter.',
              },
            ]}
            submit={register ? 'Buat akun' : 'Masuk'}
            onSubmit={async (values) => {
              if (register) await api('auth/register', 'POST', values);
              const input: LoginInput = {
                email: String(values.email),
                password: String(values.password),
              };
              const user = await api<User>('auth/login', 'POST', input);
              const next = params.get('next');
              router.push(
                next?.startsWith('/penyewa/') && user.role === 'TENANT'
                  ? next
                  : user.role === 'MANAGER'
                    ? '/pengelola'
                    : '/penyewa',
              );
            }}
          />
          <p className="auth-switch">
            {register ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <button className="text-button" onClick={() => setRegister(!register)}>
              {register ? 'Masuk' : 'Daftar sekarang'}
            </button>
          </p>
          <div className="demo-note">
            <strong>Demo lokal</strong>
            <p>
              Gunakan akun demo pada panduan proyek atau buat akun penyewa baru. Semua transaksi
              adalah data simulasi.
            </p>
          </div>
        </div>
        <small className="muted">RumahKita.id · Hunian yang lebih terorganisasi.</small>
      </main>
    </div>
  );
}
