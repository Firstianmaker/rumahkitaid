import type { components } from '../../../../packages/api-client/schema';
export type LoginInput = components['schemas']['LoginDto'];
export type ApplicationInput = components['schemas']['ApplicationDto'];
export type ApprovalInput = components['schemas']['ApprovalDto'];
export type MeterInput = components['schemas']['MeterDto'];
export type UnitInput = components['schemas']['UnitDto'];
export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'MANAGER' | 'TENANT';
};
export type Unit = {
  id: string;
  code: string;
  name: string;
  description: string;
  rent: string;
  deposit: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  image?: string;
  amenities: string[];
  status: string;
  property?: Settings;
};
export type Application = {
  id: string;
  unit: Unit;
  tenant: User;
  moveInDate: string;
  occupants: number;
  occupation: string;
  currentAddress?: string | null;
  employmentType?: string | null;
  employerName?: string | null;
  monthlyIncome?: string | null;
  incomeSource?: string | null;
  incomeDocumentId?: string | null;
  householdType?: string | null;
  adultCount?: number | null;
  childCount?: number | null;
  elderlyCount?: number | null;
  petCount?: number | null;
  petTypes?: string[] | null;
  petNotes?: string | null;
  notes?: string;
  reason?: string;
  status: string;
  createdAt: string;
  lease?: { id: string; status: string };
};
export type Invoice = {
  id: string;
  leaseId: string;
  kind: string;
  period: string;
  label: string;
  amount: string;
  depositApplied: string;
  dueDate: string;
  status: string;
  items: { label?: string; amount?: number }[];
  lease: Lease;
  payments: Payment[];
};
export type Payment = {
  id: string;
  invoiceId: string;
  amount: string;
  status: string;
  simulated: boolean;
  reason?: string;
  documentId?: string;
  createdAt: string;
  invoice: Invoice;
};
export type Inspection = {
  id: string;
  kind: string;
  notes: string;
  electricity: string;
  water: string;
  documentIds: string[];
  completedAt: string;
};
export type Lease = {
  id: string;
  unit: Unit;
  tenant: User;
  status: string;
  startDate: string;
  endDate: string;
  rent: string;
  deposit: string;
  dueDay: number;
  months: number;
  contracts: { id: string; documentId: string; kind: string; version: number }[];
  invoices: Invoice[];
  inspections: Inspection[];
  meters: { period: string; electricityEnd: string; waterEnd: string }[];
  depositEntries: { id: string; kind: string; amount: string; reason: string }[];
};
export type Ticket = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  documentIds: string[];
  tenant: User;
  lease: Lease;
  createdAt: string;
  comments: { id: string; authorName: string; text: string; createdAt: string }[];
};
export type Announcement = {
  id: string;
  title: string;
  body: string;
  unitId?: string;
  createdAt: string;
};
export type Settings = {
  name: string;
  address: string;
  bankName: string;
  bankAccount: string;
  bankOwner: string;
  electricityRate: string;
  waterRate: string;
};
export type Dashboard = {
  demo: boolean;
  units: number;
  available: number;
  occupied: number;
  pendingPayments: number;
  received: number;
  outstanding: number;
  openTickets: number;
  invoices: Invoice[];
  leases: Lease[];
  payments: Payment[];
  announcements: Announcement[];
};
export type Report = {
  payments: Payment[];
  occupancy: number;
  depositBalance: number;
  arrears: number;
  rent: number;
  utilities: number;
  maintenance: { status: string; _count: number }[];
};
export async function api<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: data instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : data instanceof FormData ? data : JSON.stringify(data),
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: 'Koneksi terputus. Silakan coba lagi.' }));
    throw new Error(
      Array.isArray(body.message)
        ? body.message.join('. ')
        : body.message || 'Tindakan tidak dapat diproses',
    );
  }
  return response.json();
}
export async function upload(file: File) {
  const form = new FormData();
  form.set('file', file);
  return api<{ id: string; name: string }>('documents', 'POST', form);
}
export const rupiah = (n: unknown) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
export const date = (n: string) =>
  new Date(n).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
export const labels: Record<string, string> = {
  AVAILABLE: 'Tersedia',
  RESERVED: 'Direservasi',
  OCCUPIED: 'Dihuni',
  MAINTENANCE: 'Perawatan',
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
  DRAFT: 'Draf',
  AWAITING_SIGNATURE: 'Menunggu tanda tangan',
  SIGNED: 'Menunggu verifikasi',
  VERIFIED: 'Siap move-in',
  ACTIVE: 'Aktif',
  MOVED_OUT: 'Penyelesaian',
  CLOSED: 'Selesai',
  UNPAID: 'Belum dibayar',
  PAID: 'Lunas',
  VOID: 'Dibatalkan',
  FAILED: 'Gagal',
  OPEN: 'Diajukan',
  IN_PROGRESS: 'Diproses',
  RESOLVED: 'Selesai',
  RENT: 'Sewa',
  DEPOSIT: 'Deposit',
  UTILITY: 'Listrik & air',
  FINAL: 'Tagihan akhir',
  LOW: 'Rendah',
  NORMAL: 'Normal',
  URGENT: 'Mendesak',
  RECEIVED: 'Diterima',
  APPLIED: 'Potongan',
  REFUND_DUE: 'Menunggu pengembalian',
  REFUNDED: 'Dikembalikan',
};
