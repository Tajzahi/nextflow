// ============================================================
// SOURCE: ui\main_window.py — AplikasiAutoEntry (Overhauled)
// ============================================================

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import TopBar from './components/topbar/TopBar';
import Sidebar from './components/sidebar/Sidebar';
import LoginView from './components/views/LoginView';
import { ToastContainer, useToasts } from './components/common/NotificationToast';
import LoadingOverlay from './components/common/LoadingOverlay';
import ErrorDialog, { ErrorType } from './components/common/ErrorDialog';

// Tiga view berat: LAZY — hanya didownload saat user navigasi ke halaman itu
const DashboardView = lazy(() => import('./components/views/DashboardView'));
const EksekusiView  = lazy(() => import('./components/views/EksekusiView'));
const LaporanView   = lazy(() => import('./components/views/LaporanView'));

// ============================================================
// ENTERPRISE LAZY LOAD: Fallback menggunakan LoadingOverlay
// yang sudah ada di proyek (reuse, tidak buat komponen baru)
// ============================================================
function ViewLoadingFallback() {
  return (
    <LoadingOverlay
      isOpen={true}
      message="Memuat halaman..."
    />
  );
}
import type { UserData } from './data/mockData';

// --- BRIDGE TYPE DEFINITION ---
declare global {
  interface Window {
    pywebview: {
      api: {
        // Auth
        auth_login:       (token: string) => Promise<{ success: boolean; message?: string; user_data?: UserData }>;
        sync_data:        () => Promise<UserData | null>;
        logout:           () => Promise<{ success: boolean }>;
        // Health
        ping:             () => Promise<string>;
        // Pre-check sebelum eksekusi
        pre_check:        () => Promise<{ success: boolean; remaining?: number; soft_lock?: boolean; hard_lock?: boolean; can_execute?: boolean; user_data?: UserData; message?: string }>;
        // Dashboard & Laporan
        get_dashboard_stats: () => Promise<{ success: boolean; chart_data: any[]; total_berhasil: number; message?: string }>;
        get_reports:      (limit?: number) => Promise<any[]>;
        // Bot Control
        bot_start:        (filePath: string, date: string) => Promise<{ success: boolean; message: string }>;
        bot_execute:      () => Promise<{ success: boolean }>;
        bot_stop:         () => Promise<{ success: boolean }>;
        // File Operations
        open_file_dialog: () => Promise<string | null>;
        get_excel_info:   (filePath: string) => Promise<{ success: boolean; message: string; file_name: string; row_count: number }>;
        // Background sync
        background_sync:  () => Promise<{ success: boolean; message?: string }>;
        // Export Laporan — SOURCE: view_laporan.py → saat_tabel_diklik → db.export_laporan_excel
        export_laporan:   (tanggal: string) => Promise<{ success: boolean; file_path?: string; message: string }>;
      };
    };
  }
}

// ── View type — SOURCE: main_window.py → current_view ──
type ViewName = 'login' | 'dashboard' | 'eksekusi' | 'laporan';

// ── Inner App (has theme context) ──
function AppInner() {
  const { toggleTheme } = useTheme();

  // State — mirrors AplikasiAutoEntry instance vars
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; type: ErrorType; message: string; details?: string }>({
    open: false, type: 'ERROR', message: ''
  });
  
  // Persistence Cache: Ambil dari localStorage sebagai data awal agar tidak logout saat refresh
  const [user_data, set_user_data] = useState<UserData | null>(() => {
    const cached = localStorage.getItem('nxf_user_ui_cache');
    if (cached) {
      try { return JSON.parse(cached); } catch { return null; }
    }
    return null;
  });
  
  // Set view awal berdasarkan keberadaan cache
  const [current_view, set_current_view] = useState<ViewName>(() => {
    return localStorage.getItem('nxf_user_ui_cache') ? 'dashboard' : 'login';
  });

  const [menu_hamburger_terbuka, set_menu_hamburger] = useState(false); // SOURCE: self.menu_hamburger_terbuka

  // --- GLOBAL BOT STATE (Untuk Persistensi saat Pindah Halaman) ---
  const [botFile, setBotFile] = useState<string | null>(null);
  const [botExcelInfo, setBotExcelInfo] = useState<{name: string, rows: number} | null>(null);
  const [botDate, setBotDate] = useState<string | null>(null);
  const [botPhase, setBotPhase] = useState<number>(0);
  const [botProgress, setBotProgress] = useState(0);
  const [botProgressLabel, setBotProgressLabel] = useState('Siap untuk eksekusi');

  const { toasts, show: showToast, dismiss } = useToasts();

  // --- AUTO LOGIN SYNC (Ultimate Polling Method) ---
  const hasRun = useRef(false);

  // FIX: Fungsi khusus untuk REFRESH stats setelah bot berjalan.
  // Tidak punya guard hasRun/user_data agar bisa dipanggil kapan saja.
  const refresh_user_data = useCallback(async () => {
    try {
      if (window.pywebview?.api?.sync_data) {
        console.log("[refresh_user_data] Fetching latest quota from cloud...");
        const data = await window.pywebview.api.sync_data();
        if (data) {
          console.log("[refresh_user_data] Updated user_data:", data.remaining, "remaining");
          set_user_data(data);
          
          // SECURITY FIX: Simpan data UI saja, JANGAN simpan token di localStorage
          const ui_only_data = { ...data };
          delete (ui_only_data as any).token; 
          localStorage.setItem('nxf_user_ui_cache', JSON.stringify(ui_only_data));
          // Trigger event agar halaman operasional (Laporan/Eksekusi) tahu bahwa backend telah tervalidasi
          window.dispatchEvent(new CustomEvent('nxf-auth-verified'));
        } else {
          localStorage.removeItem('nxf_user_ui_cache');
          set_user_data(null);
          set_current_view('login');
        }
      }
    } catch (err) {
      console.error("[refresh_user_data] Failed:", err);
    }
  }, []);

  useEffect(() => {
    // Fungsi ini HANYA untuk auto-login saat startup (sekali saja)
    const sync_initial_data = async () => {
      if (hasRun.current) return;
      
      try {
        const hasCache = localStorage.getItem('nxf_user_ui_cache');
        
        // Hanya tampilkan loading overlay jika tidak ada cache (First time / Logout state)
        if (!hasCache) setIsSyncing(true);
        
        if (window.pywebview?.api?.sync_data) {
          hasRun.current = true;
          console.log("[App] Memulai sinkronisasi sesi di latar belakang...");
          
          const data = await window.pywebview.api.sync_data();
          
          if (data) {
            console.log("[App] Sesi valid, sinkronisasi berhasil.");
            set_user_data(data);
            set_current_view('dashboard');
            
            // Simpan cache UI
            const ui_only_data = { ...data };
            delete (ui_only_data as any).token; 
            localStorage.setItem('nxf_user_ui_cache', JSON.stringify(ui_only_data));
            
            window.dispatchEvent(new CustomEvent('nxf-auth-verified'));
            
            if (data.hard_lock) {
              setErrorDialog({
                open: true,
                type: 'HARD_LOCK',
                message: 'Akses Akun Terkunci',
                details: 'Lisensi Anda telah kedaluwarsa atau diblokir.'
              });
            }
          } else {
            console.log("[App] Tidak ada sesi valid, arahkan ke login.");
            localStorage.removeItem('nxf_user_ui_cache');
            set_user_data(null);
            set_current_view('login');
          }
        }
      } catch (err) {
        console.error("[App] Sinkronisasi gagal:", err);
        // Jika gagal koneksi tapi ada cache, biarkan tetap di dashboard (offline mode)
      } finally {
        setIsSyncing(false);
      }
    };

    // Polling untuk memastikan pywebview ready
    const timer = setInterval(() => {
      if (window.pywebview?.api) {
        clearInterval(timer);
        sync_initial_data();
      }
    }, 100);

    // KABEL BALIK: Pendengar update dari Python via bridge._bot_callback
    (window as any).onBotUpdate = (type: string, value: any, msg: string) => {
      if (type === 'status') {
        setBotProgress(value);
        setBotProgressLabel(msg);
      } else if (type === 'phase') {
        setBotPhase(value);
        if (value === 3) { // 3 = SELESAI
          setBotPhase(0);
          setBotProgress(100);
          refresh_user_data();
        }
      } else if (type === 'refresh-stats') {
        if (value && typeof value === 'object' && value.email) {
          set_user_data(value);
        } else {
          refresh_user_data();
        }
      }
      
      const event = new CustomEvent('bot-update', { detail: { type, value, msg } });
      window.dispatchEvent(event);
    };

    // BACKGROUND SYNC — SOURCE: main_window.py → _jalankan_background_sync
    const bgSyncInterval = setInterval(() => {
      if (window.pywebview?.api?.background_sync) {
        window.pywebview.api.background_sync()
          .catch(err => console.warn('[background_sync] error:', err));
      }
    }, 300_000);

    return () => {
      clearInterval(timer);
      clearInterval(bgSyncInterval);
    };
  }, [user_data, refresh_user_data]);


  // _show_view — SOURCE: main_window.py → AplikasiAutoEntry._show_view
  const _show_view = useCallback((view_name: ViewName) => {
    set_current_view(view_name);
    set_menu_hamburger(false);
  }, []);

  // tampilkan_halaman — SOURCE: main_window.py → AplikasiAutoEntry.tampilkan_halaman
  const tampilkan_halaman = useCallback((nama_halaman: string) => {
    set_menu_hamburger(false);
    _show_view(nama_halaman as ViewName);
  }, [_show_view]);

  // _handle_login_success — SOURCE: main_window.py → AplikasiAutoEntry._handle_login_success
  const _handle_login_success = useCallback((userData: UserData) => {
    set_user_data(userData);
    _show_view('dashboard');
    showToast(`Selamat datang, ${userData.full_name}! 🎉`, 'success');

    // ENTERPRISE PREFETCH: Setelah login sukses, download chunk view lain
    // di background saat user membaca toast — sehingga navigasi berikutnya instan
    // Delay 1.5 detik agar tidak bersaing dengan render DashboardView
    setTimeout(() => {
      import('./components/views/EksekusiView').catch(() => {});
      import('./components/views/LaporanView').catch(() => {});
    }, 1500);
  }, [_show_view, showToast]);

  // _handle_logout — SOURCE: main_window.py → AplikasiAutoEntry._handle_logout → db_mgr.hapus_token()
  // FIX: Panggil bridge.logout() agar token terhapus dari DB lokal, mencegah auto-login setelah logout
  const _handle_logout = useCallback(async () => {
    try {
      if (window.pywebview?.api?.logout) {
        await window.pywebview.api.logout();
      }
    } catch (err) {
      console.error('[_handle_logout] bridge.logout() error:', err);
    }
    set_user_data(null);
    localStorage.removeItem('nxf_user_ui_cache');
    hasRun.current = false; // Reset agar auto-login bisa jalan ulang jika user login lagi
    _show_view('login');
    showToast('Logout berhasil', 'info');
  }, [_show_view, showToast]);

  // toggle_hamburger — SOURCE: main_window.py → AplikasiAutoEntry.toggle_hamburger
  const toggle_hamburger = useCallback(() => {
    set_menu_hamburger(v => !v);
  }, []);

  // ubah_tema — SOURCE: main_window.py → AplikasiAutoEntry.ubah_tema
  const ubah_tema = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  // notif_manager bridge — SOURCE: main_window.py → self.notif_manager
  const notif_manager_show = useCallback((msg: string, type = 'info') => {
    showToast(msg, type as 'success' | 'error' | 'warning' | 'info');
  }, [showToast]);

  const isLoggedIn = user_data !== null;

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}
    >
      {/* ── TopBar — SOURCE: ui\components\topbar.py → TopBar ── */}
      {isLoggedIn && user_data && (
        <TopBar
          user_data={user_data}
          command_hamburger={toggle_hamburger}
          command_tema={ubah_tema}
          command_profil={() => showToast('Profil menu segera hadir!', 'info')}
          onViewChange={tampilkan_halaman}
        />
      )}

      {/* ── Sidebar (HamburgerMenu) — SOURCE: ui\components\sidebar.py ── */}
      {isLoggedIn && user_data && (
        <Sidebar
          isOpen={menu_hamburger_terbuka}
          onClose={() => set_menu_hamburger(false)}
          currentView={current_view}
          onNavigate={tampilkan_halaman}
          user_data={user_data}
          onLogout={_handle_logout}
        />
      )}

      {/* ── Main Content Area — SOURCE: container_halaman ── */}
      <main
        className="flex-1 overflow-hidden"
        style={{ 
          height: isLoggedIn ? 'calc(100dvh - 60px)' : '100dvh',
          marginTop: isLoggedIn ? '60px' : '0'
        }}
      >
        {/* Login View — SOURCE: ui\auth\login_view.py */}
        {current_view === 'login' && (
          <LoginView on_login_success={_handle_login_success} />
        )}

        {/* Dashboard View — LAZY dengan Suspense */}
        {current_view === 'dashboard' && user_data && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <DashboardView
              user_data={user_data}
              onNavigate={tampilkan_halaman}
              onShowNotif={notif_manager_show}
            />
          </Suspense>
        )}

        {/* Eksekusi View — LAZY dengan Suspense */}
        {current_view === 'eksekusi' && user_data && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <EksekusiView
              user_data={user_data}
              onShowNotif={notif_manager_show}
              globalState={{
                file: botFile, setFile: setBotFile,
                info: botExcelInfo, setInfo: setBotExcelInfo,
                date: botDate, setDate: setBotDate,
                phase: botPhase, setPhase: setBotPhase,
                progress: botProgress, setProgress: setBotProgress,
                label: botProgressLabel, setLabel: setBotProgressLabel
              }}
            />
          </Suspense>
        )}

        {/* Laporan View — LAZY dengan Suspense */}
        {current_view === 'laporan' && user_data && (
          <Suspense fallback={<ViewLoadingFallback />}>
            <LaporanView
              onShowNotif={notif_manager_show}
            />
          </Suspense>
        )}
      </main>

      {/* ── Notification Toast System — SOURCE: ui\components\notification.py ── */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── Bottom navigation (mobile only when logged in) ── */}
      {isLoggedIn && (
        <nav
          className="flex md:hidden items-center justify-around px-4 py-2"
          style={{
            background: 'var(--card)',
            borderTop: '1px solid var(--border)',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
          }}
        >
          {[
            { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
            { id: 'eksekusi',  icon: '▶', label: 'Eksekusi' },
            { id: 'laporan',   icon: '◫', label: 'Laporan' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => tampilkan_halaman(item.id)}
              className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all duration-150"
              style={{
                color: current_view === item.id ? '#3b82f6' : 'var(--text-muted)',
                background: current_view === item.id ? 'rgba(59,130,246,0.1)' : 'transparent',
              }}
            >
              <span className="text-[18px] leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

// ── Root App with ThemeProvider ──
export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

// ── Exported handler names for migration parity ──
// _on_start_bot   → DashboardView._on_start_bot
// _on_view_history→ DashboardView._on_view_history
// _on_settings    → DashboardView._on_settings
// _on_help        → DashboardView._on_help
// logika_mulai    → EksekusiView.logika_mulai
// logika_stop     → EksekusiView.logika_stop
// proses_login    → LoginView.proses_login
// tampilkan_error → LoginView.tampilkan_error
// muat_data_asli  → LaporanView.muat_data_asli
// logika_cari_data→ LaporanView.logika_cari_data
// saat_tabel_diklik → LaporanView.saat_tabel_diklik
