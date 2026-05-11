// ============================================================
// SOURCE: core\mock_data — Nextflow Pro (UI Preview)
// ============================================================

export interface UserData {
  token: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  subscription_tier: 'Free' | 'Basic' | 'Pro';
  subscription_start_date: string;
  subscription_end_date: string;
  daily_limit: number;
  daily_count: number;
  weekly_success_count: number;
  monthly_success_count: number;
  remaining: number;
  can_execute: boolean;
  soft_lock: boolean;
  hard_lock: boolean;
}

export interface LaporanRow {
  id: number;
  tanggal: string;
  status: string;
  berhasil: number;
  inkomplet: number;
  gagal_data: number;
  gagal_sistem: number;
  total: number;
  persen: number;
}

export const MOCK_USER: UserData = {
  token: 'NXF-PRO-XXXX-YYYY',
  user_id: 'usr_01jxzk9m2p',
  email: 'admin@nextflowpro.id',
  full_name: 'Rendra Pratama',
  avatar_url: null,
  subscription_tier: 'Pro',
  subscription_start_date: '2025-01-01T00:00:00Z',
  subscription_end_date: '2026-12-31T23:59:59Z',
  daily_limit: 150,
  daily_count: 87,
  weekly_success_count: 432,
  monthly_success_count: 1847,
  remaining: 63,
  can_execute: true,
  soft_lock: false,
  hard_lock: false,
};

export const MOCK_LAPORAN: LaporanRow[] = [
  { id: 1, tanggal: '15 Juli 2025', status: 'Sukses', berhasil: 142, inkomplet: 3, gagal_data: 1, gagal_sistem: 0, total: 146, persen: 97 },
  { id: 2, tanggal: '14 Juli 2025', status: 'Sukses', berhasil: 138, inkomplet: 5, gagal_data: 2, gagal_sistem: 1, total: 146, persen: 94 },
  { id: 3, tanggal: '13 Juli 2025', status: 'Peringatan', berhasil: 110, inkomplet: 22, gagal_data: 8, gagal_sistem: 1, total: 141, persen: 78 },
  { id: 4, tanggal: '12 Juli 2025', status: 'Sukses', berhasil: 149, inkomplet: 1, gagal_data: 0, gagal_sistem: 0, total: 150, persen: 99 },
  { id: 5, tanggal: '11 Juli 2025', status: 'Error', berhasil: 88, inkomplet: 15, gagal_data: 32, gagal_sistem: 5, total: 140, persen: 63 },
  { id: 6, tanggal: '10 Juli 2025', status: 'Sukses', berhasil: 145, inkomplet: 4, gagal_data: 1, gagal_sistem: 0, total: 150, persen: 97 },
  { id: 7, tanggal: '9 Juli 2025',  status: 'Sukses', berhasil: 140, inkomplet: 6, gagal_data: 3, gagal_sistem: 1, total: 150, persen: 93 },
  { id: 8, tanggal: '8 Juli 2025',  status: 'Peringatan', berhasil: 120, inkomplet: 18, gagal_data: 9, gagal_sistem: 0, total: 147, persen: 82 },
  { id: 9, tanggal: '7 Juli 2025',  status: 'Sukses', berhasil: 148, inkomplet: 2, gagal_data: 0, gagal_sistem: 0, total: 150, persen: 99 },
  { id: 10, tanggal: '6 Juli 2025', status: 'Sukses', berhasil: 143, inkomplet: 5, gagal_data: 2, gagal_sistem: 0, total: 150, persen: 95 },
];

export const CHART_DATA_WEEKLY = [
  { day: 'Sen', berhasil: 138, gagal: 8 },
  { day: 'Sel', berhasil: 142, gagal: 4 },
  { day: 'Rab', berhasil: 110, gagal: 30 },
  { day: 'Kam', berhasil: 149, gagal: 1 },
  { day: 'Jum', berhasil: 88,  gagal: 52 },
  { day: 'Sab', berhasil: 145, gagal: 5 },
  { day: 'Min', berhasil: 0,   gagal: 0 },
];

export const CHART_DATA_MONTHLY = [
  { week: 'Mgg 1', sukses: 680, gagal: 42 },
  { week: 'Mgg 2', sukses: 720, gagal: 28 },
  { week: 'Mgg 3', sukses: 695, gagal: 55 },
  { week: 'Mgg 4', sukses: 752, gagal: 19 },
];
