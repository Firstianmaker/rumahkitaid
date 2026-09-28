'use client';
import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { api, upload, Ticket, Lease, Announcement, Unit, date, labels } from '@/lib/api';
import { useUser } from './workspace';
import { useData, State, PageHeading, Panel, Badge, Empty, Form, Modal, Action } from './ui';
export function TicketsScreen() {
  const manager = useUser().role === 'MANAGER';
  const { data, error, reload } = useData<Ticket[]>('tickets');
  const leases = useData<Lease[]>('leases');
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<Ticket>();
  const [filter, setFilter] = useState('');
  const active = leases.data?.filter((l) => l.status === 'ACTIVE') || [];
  return (
    <>
      <PageHeading
        title={manager ? 'Maintenance' : 'Laporan kerusakan'}
        description={
          manager
            ? 'Tindak lanjuti kebutuhan perbaikan penghuni.'
            : 'Ada yang perlu diperbaiki? Sampaikan kepada pengelola.'
        }
        action={
          !manager ? (
            <button className="button" disabled={!active.length} onClick={() => setCreate(true)}>
              <Plus size={17} />
              Buat laporan
            </button>
          ) : undefined
        }
      />
      <div className="inline-filter">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter laporan"
        >
          <option value="">Semua status</option>
          {['OPEN', 'IN_PROGRESS', 'RESOLVED'].map((s) => (
            <option key={s} value={s}>
              {labels[s]}
            </option>
          ))}
        </select>
      </div>
      <State error={error} loading={!data}>
        {data?.filter((t) => !filter || t.status === filter).length ? (
          <div className="cards-list">
            {data
              .filter((t) => !filter || t.status === filter)
              .map((t) => (
                <article className="record" key={t.id}>
                  <div className="record-head">
                    <div>
                      <p className="eyebrow">
                        {t.lease.unit.code} · {date(t.createdAt)}
                      </p>
                      <h3>{t.title}</h3>
                    </div>
                    <Badge value={t.status} />
                  </div>
                  <p>{t.description}</p>
                  <div className="record-meta">
                    <span>{t.tenant.name}</span>
                    <span>Prioritas: {labels[t.priority]}</span>
                  </div>
                  {t.documentIds.map((id, i) => (
                    <a key={id} className="file-link" href={`/api/documents/${id}`}>
                      <FileText size={15} />
                      Foto laporan {i + 1}
                    </a>
                  ))}
                  {t.comments.map((c) => (
                    <div key={c.id} className="comment">
                      <strong>{c.authorName}</strong>
                      <p>{c.text}</p>
                      <small className="muted">{date(c.createdAt)}</small>
                    </div>
                  ))}
                  <div className="record-actions">
                    <button className="button secondary" onClick={() => setSelected(t)}>
                      Tambah komentar
                    </button>
                    {manager && t.status !== 'RESOLVED' && (
                      <Action
                        onClick={async () => {
                          await api(`tickets/${t.id}/status`, 'PATCH', {
                            status: t.status === 'OPEN' ? 'IN_PROGRESS' : 'RESOLVED',
                          });
                          reload();
                        }}
                      >
                        {t.status === 'OPEN' ? 'Mulai penanganan' : 'Tandai selesai'}
                      </Action>
                    )}
                  </div>
                </article>
              ))}
          </div>
        ) : (
          <Empty text="Tidak ada laporan pada status ini">
            <p>
              {manager
                ? 'Laporan penghuni akan muncul di sini.'
                : 'Buat laporan setelah masa tinggal Anda aktif.'}
            </p>
          </Empty>
        )}
      </State>
      {create && (
        <Modal title="Buat laporan kerusakan" onClose={() => setCreate(false)}>
          <Form
            fields={[
              {
                name: 'leaseId',
                label: 'Unit',
                options: active.map((l) => ({ value: l.id, label: l.unit.name })),
              },
              { name: 'title', label: 'Judul laporan' },
              {
                name: 'priority',
                label: 'Prioritas',
                options: [
                  { value: 'NORMAL', label: 'Normal' },
                  { value: 'LOW', label: 'Rendah' },
                  { value: 'URGENT', label: 'Mendesak' },
                ],
              },
              { name: 'description', label: 'Ceritakan masalahnya', type: 'textarea' },
              {
                name: 'file',
                label: 'Foto (opsional)',
                type: 'file',
                accept: 'image/jpeg,image/png',
                required: false,
              },
            ]}
            submit="Kirim laporan"
            onSubmit={async (v) => {
              const file = v.file as File;
              const documentIds = file?.size ? [(await upload(file)).id] : [];
              await api('tickets', 'POST', {
                leaseId: String(v.leaseId),
                title: String(v.title),
                priority: String(v.priority),
                description: String(v.description),
                documentIds,
              });
              setCreate(false);
              reload();
            }}
          />
        </Modal>
      )}
      {selected && (
        <Modal title={`Komentar · ${selected.title}`} onClose={() => setSelected(undefined)}>
          <Form
            fields={[{ name: 'text', label: 'Komentar', type: 'textarea' }]}
            submit="Kirim komentar"
            onSubmit={async (v) => {
              await api(`tickets/${selected.id}/comments`, 'POST', v);
              setSelected(undefined);
              reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
export function AnnouncementsScreen() {
  const manager = useUser().role === 'MANAGER';
  const { data, error, reload } = useData<Announcement[]>('announcements');
  const units = useData<{ items: Unit[] }>('units?limit=100');
  const [create, setCreate] = useState(false);
  return (
    <>
      <PageHeading
        title="Pengumuman"
        description="Informasi terbaru untuk lingkungan hunian yang lebih nyaman."
        action={
          manager ? (
            <button className="button" onClick={() => setCreate(true)}>
              <Plus size={17} />
              Buat pengumuman
            </button>
          ) : undefined
        }
      />
      <State error={error} loading={!data}>
        {data?.length ? (
          <div className="cards-list">
            {data.map((a) => (
              <article className="record" key={a.id}>
                <p className="eyebrow">
                  {date(a.createdAt)} ·{' '}
                  {a.unitId
                    ? `UNIT ${units.data?.items.find((u) => u.id === a.unitId)?.code || ''}`
                    : 'SEMUA PENGHUNI'}
                </p>
                <h2>{a.title}</h2>
                <p className="announcement-body">{a.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <Empty text="Belum ada pengumuman" />
        )}
      </State>
      {create && (
        <Modal title="Pengumuman baru" onClose={() => setCreate(false)}>
          <Form
            fields={[
              { name: 'title', label: 'Judul' },
              {
                name: 'unitId',
                label: 'Penerima',
                required: false,
                options: [
                  { value: '', label: 'Semua penghuni' },
                  ...(units.data?.items.map((u) => ({ value: u.id, label: u.code })) || []),
                ],
              },
              { name: 'body', label: 'Isi pengumuman', type: 'textarea' },
            ]}
            submit="Terbitkan pengumuman"
            onSubmit={async (v) => {
              await api('announcements', 'POST', v);
              setCreate(false);
              reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
