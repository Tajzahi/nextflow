// ============================================================
// SOURCE: ui\components\topbar.py — TopBar (Overhauled)
// ============================================================

import { useState } from 'react';
import { Sun, Moon, Menu, Bell, ChevronDown } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import type { UserData } from '../../data/mockData';

interface TopBarProps {
  user_data: UserData;
  command_hamburger: () => void;
  command_tema: () => void;
  command_profil: () => void;
  onViewChange: (view: string) => void;
}

const tierConfig = {
  Free:  { label: 'FREE',  cls: 'tier-free',  icon: '◆' },
  Basic: { label: 'BASIC', cls: 'tier-basic', icon: '★' },
  Pro:   { label: 'PRO',   cls: 'tier-pro',   icon: '◈' },
};

export default function TopBar({
  user_data,
  command_hamburger,
  command_tema,
  command_profil,
}: TopBarProps) {
  const { isDark } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);

  const tier = user_data.subscription_tier || 'Free';
  const tierCfg = tierConfig[tier] ?? tierConfig.Free;
  const daily_limit  = user_data.daily_limit  ?? 0;
  const daily_count  = user_data.daily_count  ?? 0;
  const remaining    = user_data.remaining    ?? 0;
  const progress     = daily_limit > 0 ? Math.min((daily_count / daily_limit) * 100, 100) : 0;

  const progressColor =
    remaining <= 0               ? '#f43f5e' :
    remaining <= 5               ? '#f59e0b' :
    remaining <= daily_limit * 0.2 ? '#fbbf24' : '#10b981';

  const initials = user_data.full_name
    ? user_data.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  // Parse end date
  let endDateLabel = '';
  try {
    const dt = new Date(user_data.subscription_end_date);
    endDateLabel = dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { /* empty */ }

  return (
    <header
      className="topbar-blur fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
      style={{ height: 60 }}
    >
      {/* ── LEFT: Hamburger + Logo ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={command_hamburger}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 hover:scale-105"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          aria-label="Toggle Menu"
        >
          <Menu size={18} />
        </button>

        {/* Logo wordmark */}
        <div className="flex items-center gap-2 select-none">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <span
            className="text-[15px] font-bold tracking-tight"
            style={{ color: 'var(--text)' }}
          >
            Nextflow
            <span style={{ color: '#3b82f6' }}>Pro</span>
          </span>
        </div>
      </div>

      {/* ── CENTER: Quota Bar ── */}
      <div className="hidden md:flex items-center gap-4 px-6 py-2 rounded-xl"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>

        {/* Tier Badge */}
        <span className={`badge ${tierCfg.cls}`} style={{ fontSize: 10 }}>
          {tierCfg.icon} {tierCfg.label}
        </span>

        {/* Progress Track */}
        <div className="flex items-center gap-2">
          <div className="progress-track" style={{ width: 130, height: 6 }}>
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${progressColor}cc, ${progressColor})`,
              }}
            />
          </div>
          <span className="text-[12px] font-medium font-mono" style={{ color: 'var(--text-sub)' }}>
            {daily_count}/{daily_limit}
          </span>
        </div>

        {/* Remaining */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Sisa:</span>
          <span className="text-[13px] font-bold font-mono" style={{ color: progressColor }}>
            {remaining}
          </span>
        </div>
      </div>

      {/* ── RIGHT: Actions + Profile ── */}
      <div className="flex items-center gap-2">

        {/* Theme toggle */}
        <button
          onClick={command_tema}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:scale-110"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          aria-label="Toggle Theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notification bell - DEACTIVATED (User Request) */}
        {/* 
        <button
          onClick={() => setNotifOpen(v => !v)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:scale-110"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
            style={{ background: '#f43f5e', boxShadow: '0 0 6px #f43f5e' }}
          />
        </button>
        */}

        {/* Divider */}
        <div className="h-8 w-px mx-1" style={{ background: 'var(--border)' }} />

        {/* Profile */}
        <button
          onClick={command_profil}
          className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition-all duration-150 hover:scale-[1.02]"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
        >
          {/* Avatar */}
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-white text-[12px] font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
          >
            {initials}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
              {user_data.full_name}
            </p>
            {endDateLabel && (
              <p className="text-[10px]" style={{ color: '#10b981' }}>
                s/d {endDateLabel}
              </p>
            )}
          </div>
          <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Notification Dropdown */}
      {notifOpen && (
        <div
          className="absolute top-[68px] right-4 w-80 rounded-2xl p-4 shadow-2xl fade-in"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', zIndex: 9999 }}
        >
          <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text)' }}>Notifikasi</p>
          {[
            { icon: '✅', msg: 'Eksekusi 15 Juli berhasil (97%)', time: '5 mnt lalu', color: '#10b981' },
            { icon: '⚠️', msg: 'Kuota mendekati batas (63 sisa)', time: '1 jam lalu', color: '#f59e0b' },
            { icon: 'ℹ️', msg: 'Versi terbaru tersedia: v2.1.0', time: '1 hr lalu', color: '#3b82f6' },
          ].map((n, i) => (
            <div key={i} className="flex items-start gap-3 mb-3 p-2 rounded-lg" style={{ background: 'var(--input-bg)' }}>
              <span className="text-xl leading-none pt-0.5">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] leading-snug" style={{ color: 'var(--text)' }}>{n.msg}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

// ─── Quota Display Update (exposed ref method equivalent) ───
export function update_kuota_display(userData: UserData) {
  return userData; // Logic handled reactively via props
}
