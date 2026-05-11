// ============================================================
// SOURCE: ui\components\sidebar.py — HamburgerMenu + ProfileMenu (Overhauled)
// ============================================================

import { useEffect, useRef } from 'react';
import {
  LayoutDashboard, PlayCircle, BarChart3, Settings,
  Star, LogOut, Shield, X, ChevronRight
} from 'lucide-react';
import type { UserData } from '../../data/mockData';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
  user_data: UserData;
  onLogout?: () => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  isActive: boolean;
  onClick: () => void;
  badge?: string;
}

// ── MenuItem — SOURCE: ui\components\sidebar.py → MenuItem class ──
function MenuItem({ icon, label, sublabel, isActive, onClick, badge }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl
        text-left transition-all duration-200
        ${isActive ? 'sidebar-item-active' : 'hover:bg-white/5'}
      `}
      style={{
        border: isActive ? undefined : '1px solid transparent',
      }}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
          style={{ background: '#3b82f6' }}
        />
      )}

      {/* Icon container */}
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
          isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-200'
        }`}
        style={{
          background: isActive ? 'rgba(59,130,246,0.15)' : 'var(--input-bg)',
          border: '1px solid var(--border)',
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-semibold leading-tight"
          style={{ color: isActive ? '#60a5fa' : 'var(--text)' }}
        >
          {label}
        </p>
        {sublabel && (
          <p className="text-[11px] leading-tight mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
            {sublabel}
          </p>
        )}
      </div>

      {/* Badge / Arrow */}
      {badge ? (
        <span
          className="badge"
          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', fontSize: 10 }}
        >
          {badge}
        </span>
      ) : (
        <ChevronRight
          size={13}
          className={`transition-all duration-200 ${isActive ? 'opacity-100 text-blue-400' : 'opacity-0 group-hover:opacity-50'}`}
          style={{ color: 'var(--text-muted)' }}
        />
      )}
    </button>
  );
}

// ── HamburgerMenu — SOURCE: ui\components\sidebar.py → HamburgerMenu class ──
export default function Sidebar({
  isOpen, onClose, currentView, onNavigate, user_data, onLogout
}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const initials = user_data.full_name
    ? user_data.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard', sublabel: 'Ringkasan & statistik' },
    { id: 'eksekusi',  icon: <PlayCircle size={16} />,      label: 'Mulai Eksekusi', sublabel: 'Jalankan automasi entry', badge: 'LIVE' },
    { id: 'laporan',   icon: <BarChart3 size={16} />,        label: 'Laporan Hasil', sublabel: 'Riwayat & analitik' },
  ];

  const tier = user_data.subscription_tier || 'Free';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[998] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div
        ref={sidebarRef}
        className={`
          fixed left-0 top-0 z-[999] flex h-full w-72 flex-col
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>
                Nextflow<span style={{ color: '#3b82f6' }}>Pro</span>
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>v2.1.0 Enterprise</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <X size={13} />
          </button>
        </div>

        {/* ── User Profile Card — SOURCE: ProfileMenu ── */}
        <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
          >
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white text-[14px] font-bold"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                {user_data.full_name}
              </p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                {user_data.email}
              </p>
            </div>
            <span
              className={`badge ${tier === 'Pro' ? 'tier-pro' : tier === 'Basic' ? 'tier-basic' : 'tier-free'}`}
              style={{ fontSize: 9 }}
            >
              {tier.toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── Navigation — SOURCE: HamburgerMenu ── */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Navigasi
          </p>
          {menuItems.map(item => (
            <MenuItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              sublabel={item.sublabel}
              isActive={currentView === item.id}
              badge={item.badge}
              onClick={() => { onNavigate(item.id); onClose(); }}
            />
          ))}

          <div className="pt-4 pb-1">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Akun
            </p>
          </div>

          {/* item_lisensi — SOURCE: sidebar.py → ProfileMenu.item_lisensi */}
          <MenuItem
            icon={<Star size={16} />}
            label="Perpanjang Lisensi"
            sublabel={`Tier ${tier} · Aktif`}
            isActive={false}
            onClick={() => window.open('https://tajzahi.github.io/Nextflow-web/', '_blank')}
          />

          {/* Pengaturan — DEACTIVATED (User Request) */}
          {/* 
          <MenuItem
            icon={<Settings size={16} />}
            label="Pengaturan"
            sublabel="Konfigurasi sistem"
            isActive={false}
            onClick={() => alert('Fitur segera hadir!')}
          />
          */}

          {/* <MenuItem
            icon={<Shield size={16} />}
            label="Info Lisensi"
            sublabel={`Token: ${user_data.token?.slice(0, 12) ?? '—'}...`}
            isActive={false}
            onClick={() => {}}
          /> */}
        </div>

        {/* ── Footer: Logout — SOURCE: sidebar.py → ProfileMenu.item_logout ── */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            className="group w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200"
            style={{ background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.1)', color: '#f87171' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.12)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(244,63,94,0.25)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.05)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(244,63,94,0.1)';
            }}
            onClick={() => { onLogout ? onLogout() : alert('Logout initiated'); onClose(); }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'rgba(244,63,94,0.1)' }}>
              <LogOut size={16} />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-semibold">Log Out</p>
              <p className="text-[11px] opacity-70">Keluar dari sesi</p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
