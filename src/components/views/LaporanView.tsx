// ============================================================
// SOURCE: ui\views\view_laporan.py — ViewLaporan (Overhauled)
// ============================================================

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Download, Filter, RefreshCw, ChevronRight,
  CheckCircle2, AlertTriangle, XCircle, TrendingUp, Loader2, Settings, Activity
} from 'lucide-react';
import { MOCK_LAPORAN } from '../../data/mockData';
import type { LaporanRow } from '../../data/mockData';

interface ViewLaporanProps {
  onShowNotif?: (msg: string, type: string) => void;
}

// ─── Status helpers ───
const getStatusConfig = (row: LaporanRow) => {
  if (!row) return { label: 'Sukses', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircle2 size={13} />, cls: 'status-sukses' };
  
  const counts = {
    Sukses: row.berhasil,
    Peringatan: row.inkomplet,
    Gagal: row.gagal_data,
    Sistem: row.gagal_sistem
  };

  // Cari label dengan nilai tertinggi (Dominasi)
  const dominantLabel = Object.keys(counts).reduce((a, b) => 
    counts[a as keyof typeof counts] >= counts[b as keyof typeof counts] ? a : b
  );

  const config: Record<string, any> = {
    Sukses:     { label: 'Sukses',     color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: <CheckCircle2 size={13} />,  cls: 'status-sukses' },
    Peringatan: { label: 'Peringatan', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <AlertTriangle size={13} />, cls: 'status-peringatan' },
    Gagal:      { label: 'Error Data', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',  icon: <XCircle size={13} />,       cls: 'status-error' },
    Sistem:     { label: 'Sistem',     color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: <Settings size={13} />,      cls: 'status-system' }
  };

  if (row.total === 0) return config.Sukses;
  return config[dominantLabel];
};

// ─── Column header ───
function Th({ children, align = 'center' }: { children: React.ReactNode; align?: 'left' | 'center' | 'right' }) {
  return (
    <th
      className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
      style={{ color: 'var(--text-muted)', textAlign: align, borderBottom: '1px solid var(--border)' }}
    >
      {children}
    </th>
  );
}

// ─── Summary Stat Card ───
function SummaryCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-xl"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-[20px] font-bold font-mono leading-tight" style={{ color: 'var(--text)' }}>{value.toLocaleString('id-ID')}</p>
      </div>
    </div>
  );
}

// ─── Helper: konversi raw data dari bridge ke LaporanRow ───
function parseBridgeRow(raw: any, idx: number): LaporanRow {
  const sukses     = Number(raw.sukses ?? raw.berhasil ?? 0);
  const inkomplet  = Number(raw.inkomplet ?? 0);
  const gagal_data = Number(raw.gagal_data ?? 0);
  const gagal_sistem = Number(raw.gagal_sistem ?? 0);
  const total      = Number(raw.total ?? (sukses + inkomplet + gagal_data + gagal_sistem));
  const persen     = total > 0 ? Math.round((sukses / total) * 100) : 0;
  return {
    id:           idx + 1,
    tanggal:      String(raw.tanggal ?? raw.tanggal_str ?? '—'),
    status:       persen >= 90 ? 'Sukses' : persen >= 70 ? 'Peringatan' : 'Error',
    berhasil:     sukses,
    inkomplet,
    gagal_data,
    gagal_sistem,
    total,
    persen,
  };
}

// ─── ViewLaporan — SOURCE: ui\views\view_laporan.py → ViewLaporan class ───
export default function ViewLaporan({ onShowNotif }: ViewLaporanProps) {
  // entry_tanggal — SOURCE: view_laporan.py → self.entry_tanggal
  const [entry_tanggal, set_entry_tanggal] = useState('');
  const [data, setData] = useState<LaporanRow[]>(MOCK_LAPORAN); // MOCK sebagai initial
  const [allData, setAllData] = useState<LaporanRow[]>(MOCK_LAPORAN); // master data
  const [isFiltered, setIsFiltered] = useState(false);
  const [sortKey, setSortKey] = useState<keyof LaporanRow>('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRealData, setIsRealData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notify = (msg: string, type = 'info') => onShowNotif?.(msg, type);

  // muat_data_asli dari bridge — menggantikan MOCK
  const fetch_real_data = useCallback(async (limit = 50, silent = false) => {
    try {
      setError(null);
      if (!(window as any).pywebview?.api?.get_reports) {
        if (!silent) setError("API get_reports tidak ditemukan. Pastikan bridge berjalan.");
        return;
      }
      if (!silent) setIsLoading(true);
      const rows: any[] = await (window as any).pywebview.api.get_reports(limit);
      
      if (Array.isArray(rows)) {
        if (rows.length > 0) {
          const parsed = rows.map((r, i) => parseBridgeRow(r, i));
          setAllData(parsed);
          setData(parsed.slice(0, 10));
          setIsRealData(true);
          setIsFiltered(false);
          set_entry_tanggal('');
          if (!silent) notify(`📋 ${parsed.length} laporan berhasil dimuat`, 'success');
        } else {
          if (!silent) notify('📋 Belum ada data eksekusi. Menampilkan data contoh.', 'info');
        }
      } else {
        throw new Error("Data yang diterima dari sistem bukan berupa daftar (Array).");
      }
    } catch (err: any) {
      console.error('[LaporanView] fetch_real_data error:', err);
      setError(`Gagal memuat data: ${err.message || "Unknown Error"}`);
      if (!silent) notify('Gagal memuat data laporan', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch saat komponen pertama kali mount
  useEffect(() => {
    fetch_real_data(50, true);

    // Refresh juga saat bot selesai (bot-update event)
    const handleBotUpdate = (e: any) => {
      if (e.detail.type === 'refresh-stats' || (e.detail.type === 'phase' && e.detail.value === 3)) {
        fetch_real_data(50, true);
      }
    };
    window.addEventListener('bot-update', handleBotUpdate);
    return () => window.removeEventListener('bot-update', handleBotUpdate);
  }, [fetch_real_data]);

  // logika_cari_data — SOURCE: view_laporan.py → ViewLaporan.logika_cari_data
  // FIX: Tambah normalisasi bulan angka→nama (PILAR 2) seperti V1
  const logika_cari_data = () => {
    const input_raw = entry_tanggal.trim();
    if (!input_raw) {
      muat_data_asli(10);
      notify('📋 Menampilkan 10 laporan terbaru', 'info');
      return;
    }

    // PILAR 1: Normalisasi separator — SOURCE: view_laporan.py L172-173
    const clean = input_raw.replace(/[\/\-\.,]/g, ' ');
    const bagian = clean.trim().split(/\s+/);

    // PILAR 2: Kamus bulan pintar — SOURCE: view_laporan.py L176-181
    const kamus_bulan: Record<string, string> = {
      '1': 'Januari', '2': 'Februari', '3': 'Maret', '4': 'April', '5': 'Mei', '6': 'Juni',
      '7': 'Juli', '8': 'Agustus', '9': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
      '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April', '05': 'Mei', '06': 'Juni',
      '07': 'Juli', '08': 'Agustus', '09': 'September',
    };

    let target_final = clean;
    if (bagian.length >= 2 && kamus_bulan[bagian[1]]) {
      bagian[1] = kamus_bulan[bagian[1]];
      target_final = bagian.join(' ');
    }

    // PILAR 3: Filter dari allData — SOURCE: view_laporan.py L191-202
    const filtered = allData.filter(row =>
      row.tanggal.toLowerCase().includes(target_final.toLowerCase()) ||
      row.tanggal.toLowerCase().includes(input_raw.toLowerCase())
    );

    if (filtered.length > 0) {
      setData(filtered);
      setIsFiltered(true);
      notify(`🎯 Fokus pada laporan: ${target_final}`, 'success');
    } else {
      notify(`❓ Data '${input_raw}' tidak ditemukan.`, 'warning');
    }
  };

  // muat_data_asli — SOURCE: view_laporan.py → ViewLaporan.muat_data_asli
  // FIX: gunakan allData (real) bukan MOCK_LAPORAN
  const muat_data_asli = (limit = 10) => {
    setData(allData.slice(0, limit));
    setIsFiltered(false);
    set_entry_tanggal('');
  };

  // saat_tabel_diklik (download col) — SOURCE: view_laporan.py → ViewLaporan.saat_tabel_diklik
  // FIX: Implementasi nyata via bridge.export_laporan() — bukan lagi mock notification
  const saat_tabel_diklik = async (row: LaporanRow) => {
    try {
      notify(`⏳ Mengekspor laporan: ${row.tanggal}...`, 'info');
      const result = await (window as any).pywebview.api.export_laporan(row.tanggal);
      if (result?.success) {
        notify(`✅ Laporan disimpan ke Downloads: ${result.message}`, 'success');
      } else {
        notify(`❌ Gagal ekspor: ${result?.message || 'Error tidak diketahui'}`, 'error');
      }
    } catch (err) {
      console.error('[saat_tabel_diklik] export error:', err);
      notify('❌ Gagal terhubung ke sistem untuk ekspor', 'error');
    }
  };

  const handleSort = (key: keyof LaporanRow) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [data, sortKey, sortAsc]);

  // ─── Agregasi Data untuk Kartu Ringkasan ───
  // Gunakan fallback || 0 untuk mencegah NaN jika ada mismatch key
  const totalBerhasil = data.reduce((s, r) => s + (r.berhasil || 0), 0);
  const totalInkomplet = data.reduce((s, r) => s + (r.inkomplet || 0), 0);
  const totalErrorData = data.reduce((s, r) => s + (r.gagal_data || 0), 0);
  const totalErrorSistem = data.reduce((s, r) => s + (r.gagal_sistem || 0), 0);

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        {/* Error Alert Display */}
        {error && (
          <div className="p-4 rounded-xl flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400">
            <XCircle size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[14px] font-bold">Terjadi Kesalahan di Halaman Laporan</p>
              <p className="text-[12px] opacity-80 mt-0.5">{error}</p>
              <button 
                onClick={() => fetch_real_data(50)}
                className="mt-2 text-[11px] font-bold underline hover:no-underline"
              >
                Coba Muat Ulang
              </button>
            </div>
          </div>
        )}

        {/* ── Page Header ── */}
        <div className="fade-in">
          <div className="flex items-center gap-2 text-[12px] mb-2" style={{ color: 'var(--text-muted)' }}>
            <span>Dashboard</span> <ChevronRight size={12} /> <span style={{ color: '#8b5cf6' }}>Laporan Hasil</span>
          </div>
          <h2 className="text-[24px] font-bold" style={{ color: 'var(--text)' }}>Laporan & Riwayat Eksekusi</h2>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Analitik performa dan riwayat lengkap seluruh sesi otomasi.
          </p>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-in">
          <SummaryCard label="Total Berhasil" value={totalBerhasil} color="#10b981" icon={<CheckCircle2 size={16} />} />
          <SummaryCard label="Inkomplet" value={totalInkomplet} color="#f59e0b" icon={<AlertTriangle size={16} />} />
          <SummaryCard label="Error Data" value={totalErrorData} color="#ef4444" icon={<AlertTriangle size={16} />} />
          <SummaryCard label="Error Sistem" value={totalErrorSistem} color="#3b82f6" icon={<Activity size={16} />} />
        </div>

        {/* ── Table Panel ── */}
        <div
          className="rounded-2xl overflow-hidden fade-in"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {/* ── HEADER & FILTER — SOURCE: frame_header ── */}
          <div
            className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <Filter size={14} style={{ color: 'var(--text-muted)' }} />
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>
                Riwayat Eksekusi
              </h3>
              {/* Badge: real data vs contoh */}
              {isRealData ? (
                <span className="badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontSize: 10 }}>
                  ● LIVE
                </span>
              ) : (
                <span className="badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', fontSize: 10 }}>
                  CONTOH
                </span>
              )}
              {isFiltered && (
                <span className="badge" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', fontSize: 10 }}>
                  Filter Aktif
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* entry_tanggal — SOURCE: view_laporan.py */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={entry_tanggal}
                  onChange={e => set_entry_tanggal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && logika_cari_data()}
                  placeholder="Cari tanggal... (DD/MM/YYYY)"
                  className="h-9 pl-8 pr-4 rounded-xl text-[12px] w-52"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>

              {/* btn_cari — SOURCE: view_laporan.py */}
              <button
                onClick={logika_cari_data}
                className="flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-semibold text-white transition-all duration-150 hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
              >
                <Search size={13} /> Cari
              </button>

              {/* btn_refresh — SOURCE: new (tidak ada di V1) */}
              <button
                onClick={() => fetch_real_data(50, false)}
                disabled={isLoading}
                className="flex items-center gap-2 h-9 px-3 rounded-xl text-[12px] font-semibold transition-all duration-150 hover:scale-105"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-sub)', opacity: isLoading ? 0.6 : 1 }}
              >
                {isLoading
                  ? <Loader2 size={13} className="animate-spin" />
                  : <RefreshCw size={13} />}
                {isLoading ? 'Memuat...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* ── TABLE — SOURCE: self.tabel (Treeview) ── */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: 'var(--input-bg)' }}>
                  {[
                    { key: 'id',          label: 'No.',         align: 'center' as const },
                    { key: 'tanggal',     label: 'Tanggal',     align: 'left'   as const },
                    { key: 'status',      label: 'Status',      align: 'center' as const },
                    { key: 'berhasil',    label: 'Berhasil',    align: 'center' as const },
                    { key: 'inkomplet',   label: 'Inkomplet',   align: 'center' as const },
                    { key: 'gagal_data',  label: 'Error Data',  align: 'center' as const },
                    { key: 'gagal_sistem',label: 'Error Sistem',align: 'center' as const },
                    { key: 'persen',      label: 'Skor',        align: 'center' as const },
                    { key: 'aksi',        label: 'Aksi',        align: 'center' as const },
                  ].map(col => (
                    <Th key={col.key} align={col.align}>
                      {col.key !== 'aksi' ? (
                        <button
                          onClick={() => handleSort(col.key as keyof LaporanRow)}
                          className="flex items-center gap-1 hover:text-blue-400 transition-colors duration-150 mx-auto"
                          style={{ color: 'inherit' }}
                        >
                          {col.label}
                          <span className="text-[9px]">{sortKey === col.key ? (sortAsc ? '↑' : '↓') : '↕'}</span>
                        </button>
                      ) : col.label}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, idx) => {
                  const sc = getStatusConfig(row);
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={row.id}
                      className="group transition-colors duration-100"
                      style={{
                        background: isEven ? 'var(--card)' : 'rgba(0,0,0,0.06)',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--card-hover)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isEven ? 'var(--card)' : 'rgba(0,0,0,0.06)'; }}
                    >
                      <td className="px-4 py-3.5 text-center text-[12px] font-mono" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-soft)' }}>
                        {row.id}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-medium whitespace-nowrap" style={{ color: 'var(--text)', borderBottom: '1px solid var(--border-soft)' }}>
                        {row.tanggal}
                      </td>
                      <td className="px-4 py-3.5 text-center" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30` }}
                        >
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center text-[13px] font-bold font-mono" style={{ color: '#10b981', borderBottom: '1px solid var(--border-soft)' }}>
                        {row.berhasil}
                      </td>
                      <td className="px-4 py-3.5 text-center text-[13px] font-mono" style={{ color: '#f59e0b', borderBottom: '1px solid var(--border-soft)' }}>
                        {row.inkomplet}
                      </td>
                      <td className="px-4 py-3.5 text-center text-[13px] font-mono" style={{ color: '#f43f5e', borderBottom: '1px solid var(--border-soft)' }}>
                        {row.gagal_data}
                      </td>
                      <td className="px-4 py-3.5 text-center text-[13px] font-mono" style={{ color: '#60a5fa', borderBottom: '1px solid var(--border-soft)' }}>
                        {row.gagal_sistem}
                      </td>
                      <td className="px-4 py-3.5 text-center" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                        <div className="flex items-center justify-center gap-2">
                          <div className="progress-track" style={{ width: 50, height: 4 }}>
                            <div
                              className="progress-fill"
                              style={{
                                width: `${row.persen}%`,
                                background: sc.color,
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-bold" style={{ color: sc.color }}>{row.persen}%</span>
                        </div>
                      </td>
                      {/* aksi col — SOURCE: view_laporan.py → saat_tabel_diklik */}
                      <td className="px-4 py-3.5 text-center" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                        <button
                          onClick={() => saat_tabel_diklik(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 hover:scale-105"
                          style={{
                            background: 'rgba(139,92,246,0.1)',
                            border: '1px solid rgba(139,92,246,0.25)',
                            color: '#a78bfa',
                          }}
                        >
                          <Download size={12} /> Export
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {sortedData.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Tidak ada data yang ditemukan</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--input-bg)' }}
          >
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Menampilkan <strong style={{ color: 'var(--text)' }}>{sortedData.length}</strong> dari {allData.length} laporan
              {!isRealData && <span style={{ color: '#f59e0b' }}> (data contoh)</span>}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => muat_data_asli(allData.length)}
                className="text-[11px] px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-sub)' }}
              >
                Tampilkan Semua
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
