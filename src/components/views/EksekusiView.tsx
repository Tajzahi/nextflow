// ============================================================
// SOURCE: ui\views\view_eksekusi.py — ViewEksekusi (Overhauled)
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, Play, Square, CheckCircle2, AlertTriangle, 
  X, Upload, Loader2, ChevronRight, Settings, Info, Calendar, Clock
} from 'lucide-react';
import ConfirmationDialog from '../common/ConfirmationDialog';
import type { UserData } from '../../data/mockData';

interface ViewEksekusiProps {
  user_data: UserData;
  onShowNotif?: (msg: string, type: string) => void;
  globalState?: {
    file: string | null; setFile: (v: string | null) => void;
    info: {name: string, rows: number} | null; setInfo: (v: {name: string, rows: number} | null) => void;
    date: string | null; setDate: (v: string | null) => void;
    phase: number; setPhase: (v: number) => void;
    progress: number; setProgress: (v: number) => void;
    label: string; setLabel: (v: string) => void;
  };
}

type BotPhase = 0 | 1 | 2;

// ── ViewEksekusi — SOURCE: ui\views\view_eksekusi.py → ViewEksekusi class ──
export default function ViewEksekusi({ user_data, onShowNotif, globalState }: ViewEksekusiProps) {
  // Gunakan state global jika tersedia, jika tidak pakai lokal (fallback)
  const [local_file, set_local_file] = useState<string | null>(null);
  const file_excel_path = globalState?.file ?? local_file;
  const set_file_excel_path = globalState?.setFile ?? set_local_file;

  const [local_info, set_local_info] = useState<{name: string, rows: number} | null>(null);
  const excel_info = globalState?.info ?? local_info;
  const set_excel_info = globalState?.setInfo ?? set_local_info;

  const [local_date, set_local_date] = useState<string | null>(null);
  const tanggal_terpilih = globalState?.date ?? local_date;
  const set_tanggal_terpilih = globalState?.setDate ?? set_local_date;

  const [local_phase, set_local_phase] = useState<number>(0);
  const fase_bot = globalState?.phase ?? local_phase;
  const set_fase_bot = (v: number) => {
    if (globalState) globalState.setPhase(v);
    set_local_phase(v);
  };

  const [local_progress, set_local_progress] = useState(0);
  const progress = globalState?.progress ?? local_progress;
  const setProgress = globalState?.setProgress ?? set_local_progress;

  const [local_label, set_local_label] = useState('Siap untuk eksekusi');
  const progressLabel = globalState?.label ?? local_label;
  const setProgressLabel = globalState?.setLabel ?? set_local_label;

  const isSoftLocked = user_data.soft_lock || user_data.remaining <= 0;
  const isHardLocked = user_data.hard_lock;
  const [isDragOver, setIsDragOver] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- KABEL BALIK: Mendengar Update dari Python ---
  // SOURCE: view_eksekusi.py → update_progress + onBotUpdate
  useEffect(() => {
    const handleBotUpdate = (e: any) => {
      const { type, value, msg } = e.detail;
      if (type === 'status') {
        update_progress(value, msg);
      } else if (type === 'phase') {
        const newPhase = value as BotPhase;
        set_fase_bot(newPhase);
        
        // --- OTOMATISASI: Jika login/S&K selesai (Phase 1), langsung lanjut ke Eksekusi (Phase 2) ---
        if (newPhase === 1) {
          console.log("[Auto-Start] Login/S&K clear. Moving to Phase 2 automatically...");
          setTimeout(() => {
            // Kita panggil API execute secara langsung
            (window as any).pywebview.api.bot_execute().then((res: any) => {
               if (res.success) {
                 set_fase_bot(2);
                 notify('▶ Login & S&K Terdeteksi. Bot lanjut otomatis!', 'success');
               }
            });
          }, 1500); // Jeda 1.5 detik agar transisi UI halus
        }
        
        if (value === 3) {
          // phase 3 = SELESAI — SOURCE: main_window.py → eksekusi_berakhir_aman
          setProgress(100);
          setProgressLabel('100% — Eksekusi Selesai!');
          notify(msg || 'Eksekusi selesai! Laporan tersimpan.', 'success');
          // reset_after_execution: kembalikan UI ke fase 0 setelah 3 detik
          setTimeout(() => {
            set_fase_bot(0);
            setProgress(0);
            setProgressLabel('Siap untuk eksekusi berikutnya');
          }, 3000);
        } else if (msg) {
          notify(msg, 'info');
        }
      } else if (type === 'error') {
        // SOURCE: view_eksekusi.py → ErrorDialog handling
        set_fase_bot(0);
        setProgress(0);
        setProgressLabel('Terjadi kesalahan');
        notify(msg || 'Terjadi kesalahan sistem', 'error');
      }
    };

    window.addEventListener('bot-update', handleBotUpdate);
    return () => window.removeEventListener('bot-update', handleBotUpdate);
  }, []);

  const notify = (msg: string, type = 'info') => onShowNotif?.(msg, type);

  // klik_pilih_tanggal — SOURCE: view_eksekusi.py → ViewEksekusi.klik_pilih_tanggal
  const klik_pilih_tanggal = (angka: number) => {
    if (fase_bot > 0) return;
    set_tanggal_terpilih(String(angka));
    notify(`📅 Tanggal ${angka} terpilih`, 'success');
  };

  // logika_pilih_file — SOURCE: view_eksekusi.py → ViewEksekusi.logika_pilih_file
  const logika_pilih_file = async () => {
    if (fase_bot > 0) return;
    try {
      const path = await (window as any).pywebview.api.open_file_dialog();
      if (path) {
        set_file_excel_path(path);
        
        // Ambil info detail excel dari python
        const info = await (window as any).pywebview.api.get_excel_info(path);
        if (info.success) {
          set_excel_info({ name: info.file_name, rows: info.row_count });
          notify(`✅ File diterima: ${info.file_name} (${info.row_count} baris)`, 'success');
        } else {
          notify(`❌ ${info.message}`, 'error');
          set_file_excel_path(null);
        }
      }
    } catch (err) {
      notify('Gagal membuka dialog file', 'error');
    }
  };

  // logika_hapus_file — SOURCE: view_eksekusi.py → ViewEksekusi.logika_hapus_file
  const logika_hapus_file = () => {
    set_file_excel_path(null);
    set_excel_info(null);
    notify('🗑️ File dihapus dari antrean', 'info');
  };

  // set_soft_lock — SOURCE: view_eksekusi.py → ViewEksekusi.set_soft_lock
  // V2: soft_lock reaktif via user_data props, tidak perlu set state terpisah
  void 0; // placeholder for migration parity

  // update_progress — SOURCE: view_eksekusi.py → ViewEksekusi.update_progress
  const update_progress = (percentage: number, status_text = '') => {
    setProgress(percentage);
    setProgressLabel(status_text ? `${percentage.toFixed(0)}% — ${status_text}` : `${percentage.toFixed(0)}%`);
  };
  void update_progress;

  // --- DRAG & DROP HANDLERS ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (fase_bot > 0) return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (fase_bot > 0) return;

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      // Pada pywebview, kita tidak bisa ambil path asli dari File object browser 
      // karena alasan keamanan. Kita harus memicu dialog atau jika ini aplikasi desktop, 
      // biasanya file.path tersedia (di Electron). Di pywebview, kita gunakan logika 
      // yang sama dengan klik: panggil dialog atau jika path tersedia, gunakan.
      
      // Jika environment mendukung path asli (misal: build lokal/webview tertentu)
      const path = (file as any).path;
      if (path) {
        set_file_excel_path(path);
        const info = await (window as any).pywebview.api.get_excel_info(path);
        if (info.success) {
          set_excel_info({ name: info.file_name, rows: info.row_count });
          notify(`✅ File diterima: ${info.file_name}`, 'success');
        }
      } else {
        // Fallback: karena webview browser standard tidak kasih path, 
        // kita arahkan ke dialog manual agar aman.
        notify('Sistem keamanan webview: Silakan pilih file via tombol Pilih File', 'info');
        logika_pilih_file();
      }
    } else {
      notify('❌ Format file harus Excel (.xlsx / .xls)', 'error');
    }
  };

  // logika_mulai — SOURCE: view_eksekusi.py → ViewEksekusi.logika_mulai
  const logika_mulai = async () => {
    if (isHardLocked) { notify('🔒 Akun terkunci. Hubungi admin.', 'error'); return; }
    if (isSoftLocked) { notify('⚠ Kuota harian habis! Tidak dapat mengeksekusi.', 'warning'); return; }
    if (!file_excel_path) { notify('⚠ Pilih file Excel terlebih dahulu!', 'warning'); return; }
    if (!tanggal_terpilih) { notify('⚠ Pilih tanggal terlebih dahulu!', 'warning'); return; }

    if (fase_bot === 0) {
      setShowConfirm(true);
    } else {
      jalankan_eksekusi();
    }
  };

  const jalankan_eksekusi = async () => {
    setShowConfirm(false);
    
    if (fase_bot === 0) {
      // --- PRE-CHECK: Validasi kuota di cloud sebelum mulai --- SOURCE: main_window.py._pre_check_and_execute
      try {
        notify('🔄 Memvalidasi status akun...', 'info');
        const check = await (window as any).pywebview.api.pre_check();
        if (!check.success) {
          notify(`❌ Validasi gagal: ${check.message}`, 'error');
          return;
        }
        if (check.hard_lock) {
          notify('🔒 Akun terkunci oleh admin. Hubungi support.', 'error');
          return;
        }
        if (!check.can_execute || (check.remaining !== undefined && check.remaining <= 0)) {
          notify('⚠ Kuota harian habis! Silakan coba besok.', 'warning');
          return;
        }
      } catch (err) {
        console.warn('[pre_check] API not available, proceeding without check:', err);
      }

      // Panggil Python untuk mulai inisialisasi bot (Tahap 1: Buka Browser)
      const res = await (window as any).pywebview.api.bot_start(file_excel_path, tanggal_terpilih);
      if (res.success) {
        set_fase_bot(1);
        notify('🌐 Browser dibuka. Silakan login manual!', 'info');
        setProgressLabel('Menunggu login manual di browser...');
        setProgress(10);
      } else {
        notify(`❌ Gagal: ${res.message}`, 'error');
      }
    } else if (fase_bot === 1) {
      // Panggil Python untuk lanjut eksekusi (Tahap 2: Proses Data)
      const res = await (window as any).pywebview.api.bot_execute();
      if (res.success) {
        set_fase_bot(2);
        notify('▶ Mengeksekusi data Excel...', 'success');
        setProgressLabel('Memuat file Excel...');
      } else {
        notify(`❌ Gagal: ${res.message}`, 'error');
      }
    }
  };

  // logika_stop — SOURCE: view_eksekusi.py → ViewEksekusi.btn_stop
  const logika_stop = async () => {
    if (fase_bot === 0) return;
    try {
      await (window as any).pywebview.api.bot_stop();
      set_fase_bot(0);
      setProgress(0);
      setProgressLabel('Dihentikan oleh pengguna');
      notify('🛑 Proses dihentikan. Membersihkan sesi...', 'warning');
    } catch (e) {
      console.error("Stop failed", e);
    }
  };



  const btnLabel = fase_bot === 0
    ? '▶  Mulai Eksekusi'
    : fase_bot === 1
    ? '▶  Lanjut Eksekusi (Enter)'
    : '⏳  Sistem Memproses...';

  const btnColor = fase_bot === 0
    ? { from: '#059669', to: '#10b981' }
    : fase_bot === 1
    ? { from: '#c2410c', to: '#ea580c' }
    : { from: '#374151', to: '#4b5563' };

  const progressColor =
    progress >= 100 ? '#10b981' :
    progress > 60   ? '#3b82f6' :
    progress > 0    ? '#f59e0b' : 'var(--text-muted)';

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── Page Header ── */}
        <div className="fade-in">
          <div className="flex items-center gap-2 text-[12px] mb-2" style={{ color: 'var(--text-muted)' }}>
            <span>Dashboard</span> <ChevronRight size={12} /> <span style={{ color: '#3b82f6' }}>Mulai Eksekusi</span>
          </div>
          <h2 className="text-[24px] font-bold" style={{ color: 'var(--text)' }}>Eksekusi Automasi Entry</h2>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Upload file Excel dan pilih tanggal, lalu jalankan proses entry otomatis.
          </p>
        </div>

        {/* ── Phase Status Bar ── */}
        {fase_bot > 0 && (
          <div
            className="flex items-center gap-3 p-4 rounded-xl fade-in"
            style={{
              background: fase_bot === 1 ? 'rgba(245,158,11,0.08)' : 'rgba(59,130,246,0.08)',
              border: `1px solid ${fase_bot === 1 ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.25)'}`,
            }}
          >
            <div
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{
                background: fase_bot === 1 ? '#f59e0b' : '#3b82f6',
                boxShadow: `0 0 8px ${fase_bot === 1 ? '#f59e0b' : '#3b82f6'}`,
                animation: 'pulse 2s infinite',
              }}
            />
            <p className="text-[13px] font-medium" style={{ color: fase_bot === 1 ? '#fbbf24' : '#60a5fa' }}>
              {fase_bot === 1
                ? '⚠  Browser terbuka — Silakan login manual, lalu klik "Lanjut Eksekusi"'
                : '🔄  Bot sedang berjalan — Jangan tutup browser'}
            </p>
          </div>
        )}

        {/* ── Main Two-Column Layout ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* ── BOX DRAGDROP — SOURCE: self.box_dragdrop ── */}
          <div
            className="rounded-2xl p-5 fade-in"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <FileSpreadsheet size={16} style={{ color: '#60a5fa' }} />
              </div>
              <div>
                <h3 className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>Upload File Excel</h3>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Format .xlsx / .xls</p>
              </div>
            </div>

            {/* Drop zone */}
            <div
              className={`drag-zone rounded-xl transition-all duration-200 ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                minHeight: 220,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                cursor: file_excel_path ? 'default' : 'pointer',
                borderColor: file_excel_path ? '#10b981' : isDragOver ? '#3b82f6' : 'var(--border)',
                background: file_excel_path
                  ? 'rgba(16,185,129,0.05)'
                  : isDragOver
                  ? 'rgba(59,130,246,0.05)'
                  : 'var(--input-bg)',
              }}
              onClick={!file_excel_path ? logika_pilih_file : undefined}
            >
              {file_excel_path && excel_info ? (
                /* ── File berhasil dipilih ── */
                <div className="text-center space-y-3 w-full">
                  <div className="flex justify-center">
                    <CheckCircle2 size={44} style={{ color: '#10b981' }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: '#10b981' }}>File Siap Dieksekusi</p>
                    <p className="text-[12px] mt-1 font-mono truncate max-w-full" style={{ color: 'var(--text-sub)' }}>
                      {excel_info.name}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {excel_info.rows} Baris Data Ditemukan
                    </p>
                  </div>
                  {/* btn_hapus_file — SOURCE: view_eksekusi.py */}
                  <button
                    onClick={e => { e.stopPropagation(); logika_hapus_file(); }}
                    className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 hover:scale-105"
                    style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185' }}
                  >
                    <X size={13} /> Hapus File
                  </button>
                </div>
              ) : (
                /* ── Empty drop zone — SOURCE: wrapper_dragdrop ── */
                <div className="text-center space-y-3 pointer-events-none select-none">
                  <div className="flex justify-center">
                    <Upload size={40} style={{ color: isDragOver ? '#3b82f6' : 'var(--text-muted)', transition: 'color 0.2s' }} />
                  </div>
                  {/* lbl_teks_drag — SOURCE: view_eksekusi.py */}
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: isDragOver ? '#60a5fa' : 'var(--text-sub)' }}>
                      Drop Excel Disini
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>atau klik untuk memilih file</p>
                  </div>
                  {/* btn_pilih_file — SOURCE: view_eksekusi.py */}
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold pointer-events-auto"
                    style={{
                      background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      color: 'white',
                      boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                    }}
                  >
                    <Upload size={13} /> Pilih File
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── BOX KALENDER — SOURCE: self.box_kalender ── */}
          <div
            className="rounded-2xl p-5 fade-in"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <Calendar size={16} style={{ color: '#a78bfa' }} />
              </div>
              <div>
                {/* SOURCE: "Pilih Tanggal Pemeriksaan" label */}
                <h3 className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>Pilih Tanggal Pemeriksaan</h3>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {tanggal_terpilih ? `Terpilih: Tanggal ${tanggal_terpilih}` : 'Belum dipilih'}
                </p>
              </div>
            </div>

            {/* Calendar Grid — SOURCE: frame_grid_tanggal + koleksi_tombol_tanggal */}
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <button
                  key={day}
                  onClick={() => klik_pilih_tanggal(day)}
                  disabled={fase_bot > 0}
                  className={`date-btn ${tanggal_terpilih === String(day) ? 'selected' : ''}`}
                  style={{ opacity: fase_bot > 0 ? 0.5 : 1 }}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Selected date highlight */}
            {tanggal_terpilih && (
              <div
                className="mt-4 flex items-center gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <CheckCircle2 size={14} style={{ color: '#3b82f6' }} />
                <p className="text-[12px] font-medium" style={{ color: '#60a5fa' }}>
                  Tanggal {tanggal_terpilih} dipilih sebagai target eksekusi
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Action Buttons — SOURCE: frame_tombol_bawah ── */}
        <div
          className="flex items-center gap-4 p-5 rounded-2xl fade-in"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {/* Validation hints */}
          <div className="flex-1 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-[12px]" style={{ color: file_excel_path ? '#10b981' : 'var(--text-muted)' }}>
              {file_excel_path ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              {excel_info ? `File: ${excel_info.name.slice(0, 18)}...` : 'Belum ada file'}
            </div>
            <div className="flex items-center gap-2 text-[12px]" style={{ color: tanggal_terpilih ? '#10b981' : 'var(--text-muted)' }}>
              {tanggal_terpilih ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              {tanggal_terpilih ? `Tanggal: ${tanggal_terpilih}` : 'Belum pilih tanggal'}
            </div>
            <div className="flex items-center gap-2 text-[12px]" style={{ color: '#3b82f6' }}>
              <span className="badge tier-pro" style={{ fontSize: 10 }}>
                Sisa Kuota: {user_data.remaining}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* btn_stop — SOURCE: view_eksekusi.py → ViewEksekusi.btn_stop */}
            {fase_bot > 0 && (
              <button
                onClick={logika_stop}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-bold transition-all duration-150 hover:scale-105"
                style={{
                  background: 'rgba(244,63,94,0.1)',
                  border: '1px solid rgba(244,63,94,0.3)',
                  color: '#fb7185',
                }}
              >
                <Square size={14} fill="currentColor" /> Stop
              </button>
            )}

            {/* btn_mulai_pintar — SOURCE: view_eksekusi.py → ViewEksekusi.btn_mulai_pintar */}
            <button
              onClick={logika_mulai}
              disabled={fase_bot === 2 || isSoftLocked}
              className="flex items-center gap-2.5 px-7 py-3 rounded-xl text-[14px] font-bold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: isSoftLocked
                  ? 'rgba(100,116,139,0.3)'
                  : `linear-gradient(135deg, ${btnColor.from}, ${btnColor.to})`,
                boxShadow: fase_bot === 2 || isSoftLocked ? 'none' : '0 6px 24px rgba(0,0,0,0.3)',
              }}
            >
              <Play size={15} fill="white" />
              {isSoftLocked ? 'Kuota Habis' : btnLabel}
            </button>
          </div>
        </div>

        {/* ── Progress Area — SOURCE: self.frame_progress ── */}
        <div
          className="rounded-2xl p-5 space-y-3 fade-in"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>Status Eksekusi</p>
            <span className="text-[12px] font-mono font-bold" style={{ color: progressColor }}>
              {progress.toFixed(0)}%
            </span>
          </div>

          {/* progress_bar — SOURCE: view_eksekusi.py */}
          <div className="progress-track" style={{ height: 8 }}>
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
                background: progress >= 100
                  ? 'linear-gradient(90deg, #059669, #10b981)'
                  : progress > 0
                  ? 'linear-gradient(90deg, #2563eb, #3b82f6, #06b6d4)'
                  : 'transparent',
              }}
            />
          </div>

          {/* label_progress — SOURCE: view_eksekusi.py */}
          <p className="text-[12px] italic" style={{ color: 'var(--text-muted)' }}>{progressLabel}</p>

          {/* Step indicators */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {['Inisialisasi', 'Browser', 'Memproses', 'Verifikasi', 'Selesai'].map((step, i) => {
              const stepPct = (i + 1) * 20;
              const done = progress >= stepPct;
              const active = progress >= stepPct - 20 && progress < stepPct;
              return (
                <div key={i} className="flex items-center gap-1.5 text-[11px]" style={{ color: done ? '#10b981' : active ? '#3b82f6' : 'var(--text-muted)' }}>
                  <div
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ background: done ? '#10b981' : active ? '#3b82f6' : 'var(--border)', transition: 'background 0.3s' }}
                  />
                  {step}
                  {i < 4 && <ChevronRight size={10} />}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <ConfirmationDialog
        isOpen={showConfirm}
        title="Konfirmasi Eksekusi"
        message={`Mulai eksekusi data untuk tanggal ${tanggal_terpilih}?`}
        details="Bot akan membuka browser Chrome. Pastikan Anda tidak menutup browser selama proses berlangsung."
        confirmText="Ya, Buka Browser"
        onConfirm={jalankan_eksekusi}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
