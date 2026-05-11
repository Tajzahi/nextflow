// ============================================================
// SOURCE: ui\auth\login_view.py — LoginView (Overhauled)
// ============================================================

import { useState, useRef } from 'react';
import { Key, ArrowRight, Loader2, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import ErrorDialog, { ErrorType } from '../common/ErrorDialog';
import { MOCK_USER } from '../../data/mockData';
import type { UserData } from '../../data/mockData';

interface LoginViewProps {
  on_login_success: (user_data: UserData) => void;
}

// ── LoginView — SOURCE: ui\auth\login_view.py → LoginView class ──
export default function LoginView({ on_login_success }: LoginViewProps) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; type: ErrorType; message: string; details?: string }>({
    open: false, type: 'ERROR', message: ''
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // proses_login — SOURCE: login_view.py → LoginView.proses_login
  const proses_login = async () => {
    const tokenInput = token.trim().toUpperCase();

    if (!tokenInput) {
      setErrorMsg('⚠ Harap masukkan token lisensi Anda.');
      inputRef.current?.focus();
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      // Panggil API Bridge Python
      const response = await window.pywebview.api.auth_login(tokenInput);
      
      if (response.success && response.user_data) {
        on_login_success(response.user_data);
      } else {
        const code = response.code || 'ERROR';
        const msg = response.message || 'Token tidak valid';
        
        // Critical Errors — SOURCE: login_view.py.tampilkan_error mapping
        const criticalCodes = ['EXPIRED', 'TOKEN_BLOCKED', 'DEVICE_MISMATCH', 'MAINTENANCE', 'HARD_LOCK'];
        if (criticalCodes.includes(code)) {
          setErrorDialog({
            open: true,
            type: code === 'EXPIRED' ? 'SOFT_LOCK' : code === 'MAINTENANCE' ? 'MAINTENANCE' : 'HARD_LOCK',
            message: msg,
            details: `Kode Error: ${code}`
          });
        } else {
          setErrorMsg(`⚠ ${msg}`);
        }
      }
    } catch (err) {
      setErrorMsg('⚠ Gagal menghubungi sistem. Pastikan aplikasi berjalan dengan benar.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') proses_login();
  };

  // tampilkan_error — SOURCE: login_view.py → LoginView.tampilkan_error
  const tampilkan_error = (msg: string) => {
    setErrorMsg(msg);
  };
  void tampilkan_error; // referenced for naming parity

  const featureList = [
    { icon: '⚡', label: 'Automasi Entry Data', desc: 'Proses ratusan data dalam hitungan menit' },
    { icon: '📊', label: 'Laporan Lengkap',     desc: 'Analitik real-time & export Excel' },
    { icon: '🛡️', label: 'Keamanan Enterprise', desc: 'Enkripsi end-to-end & audit trail' },
  ];

  return (
    <div
      className="relative flex min-h-full w-full items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* ── Ambient background glows ── */}
      <div
        className="pointer-events-none absolute top-[-200px] left-[-100px] h-[500px] w-[500px] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-200px] right-[-100px] h-[500px] w-[500px] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 flex w-full max-w-5xl items-center justify-center gap-16 px-6 py-12 fade-in">

        {/* ── LEFT: Branding Panel ── */}
        <div className="hidden lg:flex flex-col max-w-xs space-y-8">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-none" style={{ color: 'var(--text)' }}>
                  Nextflow<span style={{ color: '#3b82f6' }}>Pro</span>
                </h1>
                <p className="text-[11px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Enterprise Suite
                </p>
              </div>
            </div>
            <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              Platform automasi data entry generasi berikutnya untuk tim profesional.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4">
            {featureList.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <span className="text-xl flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{f.label}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust signal */}
          <div className="flex items-center gap-2 pt-2">
            <Shield size={13} style={{ color: '#10b981' }} />
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Dilindungi enkripsi AES-256 & lisensi terikat perangkat</p>
          </div>
        </div>

        {/* ── RIGHT: Login Card — SOURCE: login_view.py → login_card ── */}
        <div
          className="gradient-border w-full max-w-md"
          style={{
            background: 'var(--card)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 40px rgba(59,130,246,0.1)',
          }}
        >
          <div className="p-8 space-y-6">
            {/* Card Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}
                >
                  <Key size={17} style={{ color: '#60a5fa' }} />
                </div>
                <span className="badge tier-free" style={{ fontSize: 10 }}>AKTIVASI LISENSI</span>
              </div>
              {/* lbl_judul — SOURCE: login_view.py */}
              <h2 className="text-[24px] font-bold leading-tight" style={{ color: 'var(--text)' }}>
                Aktivasi Sistem
              </h2>
              {/* lbl_sub — SOURCE: login_view.py */}
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                Masukkan lisensi untuk melanjutkan ke dashboard
              </p>
            </div>

            {/* ── entry_lisensi — SOURCE: login_view.py ── */}
            <div className="space-y-2">
              <label className="block text-[12px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-sub)' }}>
                Kode Lisensi
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={e => setToken(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  placeholder="NXF-PRO-XXXX-YYYY"
                  disabled={isLoading}
                  autoFocus
                  className="w-full rounded-xl px-4 py-3.5 pr-12 font-mono text-[14px] transition-all duration-200"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    letterSpacing: '0.08em',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error — SOURCE: login_view.py → lbl_error */}
            {errorMsg && (
              <div
                className="flex items-start gap-2 p-3 rounded-xl text-[12px] fade-in"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185' }}
              >
                <span className="flex-shrink-0 mt-0.5">⚠</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ── btn_aktivasi — SOURCE: login_view.py ── */}
            <button
              onClick={proses_login}
              disabled={isLoading || !token}
              className="group relative w-full overflow-hidden rounded-xl py-4 text-[14px] font-bold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: isLoading
                  ? 'rgba(37,99,235,0.6)'
                  : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #1d4ed8 100%)',
                boxShadow: isLoading ? 'none' : '0 8px 32px rgba(37,99,235,0.45)',
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Memvalidasi Lisensi...
                  </>
                ) : (
                  <>
                    Aktivasi Sekarang
                    <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </span>
              {/* Shine sweep */}
              {!isLoading && (
                <div
                  className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
                />
              )}
            </button>

            {/* Demo hint */}
            <div
              className="rounded-xl p-3 text-center text-[12px]"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              🎯 <strong style={{ color: 'var(--text-sub)' }}>Demo Mode:</strong>{' '}
              Ketik sembarang token dan tekan Aktivasi untuk melihat dashboard
            </div>
          </div>
        </div>
      </div>
      {/* Error Dialog — SOURCE: login_view.py.show_error_dialog */}
      <ErrorDialog 
        isOpen={errorDialog.open}
        type={errorDialog.type}
        message={errorDialog.message}
        details={errorDialog.details}
        onClose={() => setErrorDialog({ ...errorDialog, open: false })}
      />
    </div>
  );
}
