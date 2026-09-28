'use client';
import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Application, ApplicationInput, api, upload, today, rupiah } from '@/lib/api';
import { Form } from './ui';

export const amenities = [
  'Teras pribadi',
  'Area parkir',
  'Dapur',
  'Keamanan 24 jam',
  'Wi-Fi',
  'AC',
  'Kamar mandi dalam',
  'Taman',
  'Pagar',
  'Furnitur',
  'Pemanas air',
  'Area jemur',
];
const petOptions = ['Kucing', 'Anjing', 'Burung', 'Ikan', 'Kelinci', 'Lainnya'];
const employmentOptions = [
  { value: 'EMPLOYEE', label: 'Karyawan' },
  { value: 'SELF_EMPLOYED', label: 'Wiraswasta / pemilik usaha' },
  { value: 'FREELANCE', label: 'Freelancer / pekerja lepas' },
  { value: 'RETIRED', label: 'Pensiunan' },
  { value: 'OTHER', label: 'Lainnya' },
];
const householdOptions = [
  { value: 'ALONE', label: 'Sendiri' },
  { value: 'PARTNER', label: 'Bersama pasangan' },
  { value: 'FAMILY', label: 'Bersama keluarga' },
  { value: 'SHARED', label: 'Bersama teman / rekan' },
];

export function FacilityChoices({ selected = [] }: { selected?: string[] }) {
  // Keep legacy/custom values visible and checked when editing existing units.
  return (
    <fieldset className="choice-fieldset full">
      <legend>Fasilitas unit</legend>
      <p className="muted">Centang fasilitas yang tersedia.</p>
      <div className="choice-grid">
        {Array.from(new Set([...amenities, ...selected])).map((item) => (
          <label className="choice" key={item}>
            <input
              type="checkbox"
              name="amenities"
              value={item}
              defaultChecked={selected.includes(item)}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ApplicantForm({ unitId, done }: { unitId: string; done: () => void }) {
  const [children, setChildren] = useState(false),
    [elderly, setElderly] = useState(false),
    [pets, setPets] = useState(false);
  const [adults, setAdults] = useState(1),
    [childCount, setChildCount] = useState(1),
    [elderlyCount, setElderlyCount] = useState(1);
  const occupants = adults + (children ? childCount : 0) + (elderly ? elderlyCount : 0);
  return (
    <Form
      fields={[]}
      submit="Kirim pengajuan sewa"
      onSubmit={async (v, data) => {
        const file = data.get('incomeFile') as File;
        const incomeDocumentId = file?.size ? (await upload(file)).id : undefined;
        const input: ApplicationInput = {
          unitId,
          moveInDate: String(v.moveInDate),
          occupation: String(v.occupation),
          currentAddress: String(v.currentAddress),
          employmentType: String(v.employmentType) as ApplicationInput['employmentType'],
          employerName: String(v.employerName),
          monthlyIncome: Number(v.monthlyIncome),
          incomeSource: String(v.incomeSource),
          ...(incomeDocumentId ? { incomeDocumentId } : {}),
          householdType: String(v.householdType) as ApplicationInput['householdType'],
          occupants,
          adultCount: adults,
          childCount: children ? childCount : 0,
          elderlyCount: elderly ? elderlyCount : 0,
          petCount: pets ? Number(v.petCount) : 0,
          petTypes: pets
            ? (data.getAll('petTypes').map(String) as ApplicationInput['petTypes'])
            : [],
          petNotes: pets ? String(v.petNotes || '') : '',
          notes: String(v.notes || ''),
        };
        await api('applications', 'POST', input);
        done();
      }}
    >
      <fieldset className="application-section full">
        <legend>Data pemohon & penghasilan</legend>
        <p className="muted">Nama, email, dan nomor telepon mengikuti akun Anda.</p>
        <div className="form-grid">
          <label className="full">
            Alamat tempat tinggal saat ini *
            <textarea name="currentAddress" required minLength={10} maxLength={1000} rows={2} />
          </label>
          <label>
            Rencana tanggal masuk *
            <input name="moveInDate" type="date" defaultValue={today()} min={today()} required />
          </label>
          <label>
            Status pekerjaan *
            <select name="employmentType" required>
              {employmentOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Pekerjaan / profesi *<input name="occupation" required minLength={2} maxLength={150} />
          </label>
          <label>
            Tempat bekerja / nama usaha
            <input name="employerName" maxLength={150} />
            <small className="muted">Wajib untuk karyawan, wiraswasta, dan pekerja lepas.</small>
          </label>
          <label>
            Penghasilan bersih per bulan (Rp) *
            <input
              name="monthlyIncome"
              type="number"
              min={0}
              max={999999999999}
              step="0.01"
              required
            />
            <small className="muted">
              Penghasilan pemohon setelah potongan; isi 0 jika belum berpenghasilan.
            </small>
          </label>
          <label>
            Sumber dana pembayaran sewa *
            <input
              name="incomeSource"
              placeholder="Misalnya gaji, usaha, pensiun, atau dukungan keluarga"
              minLength={3}
              maxLength={150}
              required
            />
          </label>
          <label className="full">
            Bukti penghasilan (opsional)
            <input name="incomeFile" type="file" accept="application/pdf,image/jpeg,image/png" />
            <small className="muted">
              Slip gaji atau bukti penghasilan lain, PDF/JPG/PNG maksimal 5 MB. Hanya Anda dan
              pengelola yang dapat mengakses.
            </small>
          </label>
        </div>
      </fieldset>
      <fieldset className="application-section full">
        <legend>Siapa yang akan tinggal?</legend>
        <p className="muted">
          Hitung semua penghuni termasuk Anda. Kelompok usia tidak saling tumpang tindih.
        </p>
        <div className="form-grid">
          <label>
            Rencana tinggal *
            <select name="householdType" required>
              {householdOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Jumlah dewasa (18–59 tahun) *
            <input
              name="adultCount"
              type="number"
              min={0}
              max={10}
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              required
            />
          </label>
          <label className="choice">
            <input
              type="checkbox"
              checked={children}
              onChange={(e) => setChildren(e.target.checked)}
            />
            <span>Ada anak (di bawah 18 tahun)</span>
          </label>
          {children && (
            <label>
              Jumlah anak *
              <input
                type="number"
                min={1}
                max={9}
                value={childCount}
                onChange={(e) => setChildCount(Number(e.target.value))}
                required
              />
            </label>
          )}
          <label className="choice">
            <input
              type="checkbox"
              checked={elderly}
              onChange={(e) => setElderly(e.target.checked)}
            />
            <span>Ada lansia (60 tahun ke atas)</span>
          </label>
          {elderly && (
            <label>
              Jumlah lansia *
              <input
                type="number"
                min={1}
                max={10}
                value={elderlyCount}
                onChange={(e) => setElderlyCount(Number(e.target.value))}
                required
              />
            </label>
          )}
          <output className="household-total full" aria-live="polite">
            Total penghuni: <strong>{occupants} orang</strong> · maksimal 10 orang, termasuk pemohon
          </output>
        </div>
      </fieldset>
      <fieldset className="application-section full">
        <legend>Hewan peliharaan</legend>
        <label className="choice">
          <input type="checkbox" checked={pets} onChange={(e) => setPets(e.target.checked)} />
          <span>Membawa hewan peliharaan</span>
        </label>
        {pets && (
          <div className="form-grid pets-detail">
            <label>
              Jumlah hewan peliharaan *
              <input type="number" name="petCount" min={1} max={20} defaultValue={1} required />
            </label>
            <fieldset className="choice-fieldset full">
              <legend>Jenis peliharaan</legend>
              <div className="choice-grid">
                {petOptions.map((p) => (
                  <label className="choice" key={p}>
                    <input type="checkbox" name="petTypes" value={p} />
                    <span>{p}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="full">
              Rincian peliharaan
              <textarea
                name="petNotes"
                maxLength={1000}
                rows={2}
                placeholder="Misalnya 2 kucing. Jelaskan jika memilih Lainnya."
              />
            </label>
          </div>
        )}
      </fieldset>
      <label className="standalone-label full">
        Catatan untuk pengelola
        <textarea name="notes" maxLength={2000} rows={3} />
      </label>
      <p className="muted full">
        Informasi ini digunakan pengelola untuk meninjau pengajuan dan kebutuhan hunian. Persetujuan
        tetap dilakukan oleh pengelola.
      </p>
    </Form>
  );
}

export function ApplicationProfile({ application: a }: { application: Application }) {
  return (
    <div className="applicant-details">
      <div className="profile-details-grid">
        <section>
          <h4>Data pemohon</h4>
          <dl>
            <dt>Nama</dt>
            <dd>{a.tenant.name}</dd>
            <dt>Email</dt>
            <dd>{a.tenant.email}</dd>
            <dt>Telepon</dt>
            <dd>{a.tenant.phone}</dd>
            <dt>Alamat saat pengajuan</dt>
            <dd>{a.currentAddress || 'Belum dilengkapi'}</dd>
          </dl>
        </section>
        <section>
          <h4>Pekerjaan & penghasilan</h4>
          <dl>
            <dt>Pekerjaan</dt>
            <dd>{a.occupation}</dd>
            <dt>Status</dt>
            <dd>
              {employmentOptions.find((o) => o.value === a.employmentType)?.label ||
                'Belum dilengkapi'}
            </dd>
            <dt>Tempat bekerja / usaha</dt>
            <dd>{a.employerName || 'Tidak dicantumkan'}</dd>
            <dt>Penghasilan bersih / bulan</dt>
            <dd>{a.monthlyIncome != null ? rupiah(a.monthlyIncome) : 'Belum dilengkapi'}</dd>
            <dt>Sumber pembayaran sewa</dt>
            <dd>{a.incomeSource || 'Belum dilengkapi'}</dd>
          </dl>
          {a.incomeDocumentId ? (
            <a
              className="file-link"
              href={`/api/documents/${a.incomeDocumentId}`}
              target="_blank"
              rel="noreferrer"
            >
              <FileText size={15} />
              Lihat bukti penghasilan
            </a>
          ) : (
            <p className="muted">Bukti penghasilan belum dilampirkan.</p>
          )}
          <small className="muted">
            Penghasilan dilaporkan oleh pemohon. Periksa bukti sebelum menyetujui.
          </small>
        </section>
        <section>
          <h4>Komposisi penghuni</h4>
          <dl>
            <dt>Rencana tinggal</dt>
            <dd>
              {householdOptions.find((o) => o.value === a.householdType)?.label ||
                'Belum dilengkapi'}
            </dd>
            <dt>Total penghuni</dt>
            <dd>{a.occupants} orang</dd>
            <dt>Dewasa (18–59 tahun)</dt>
            <dd>{a.adultCount != null ? `${a.adultCount} orang` : 'Belum dilengkapi'}</dd>
            <dt>Anak (di bawah 18 tahun)</dt>
            <dd>{a.childCount != null ? `${a.childCount} orang` : 'Belum dilengkapi'}</dd>
            <dt>Lansia (60 tahun ke atas)</dt>
            <dd>{a.elderlyCount != null ? `${a.elderlyCount} orang` : 'Belum dilengkapi'}</dd>
          </dl>
        </section>
        <section>
          <h4>Hewan peliharaan</h4>
          <p>
            {a.petCount == null
              ? 'Belum dilengkapi'
              : a.petCount === 0
                ? 'Tidak membawa peliharaan'
                : `${a.petCount} ekor · ${a.petTypes?.join(', ')}`}
          </p>
          {a.petNotes && <p>{a.petNotes}</p>}
        </section>
      </div>
    </div>
  );
}
