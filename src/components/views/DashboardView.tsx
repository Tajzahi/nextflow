// ============================================================
// SOURCE: ui\views\view_dashboard.py — DashboardView (Overhauled)
// ============================================================

import { useState, useEffect } from 'react';
import {
  TrendingUp, Calendar, BarChart3, Zap, PlayCircle,
  FileText, Settings, HelpCircle, ArrowUpRight, Activity
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import type { UserData } from '../../data/mockData';
import { CHART_DATA_WEEKLY, CHART_DATA_MONTHLY } from '../../data/mockData';

interface DashboardViewProps {
  user_data: UserData;
  onNavigate: (view: string) => void;
  onShowNotif?: (msg: string, type: string) => void;
}

// ─── Stat Card ───
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  glow?: string;
  trend?: string;
}

function StatCard({ icon, label, value, sub, color, glow, trend }: StatCardProps) {
  return (
    <div
      className="card-hover relative overflow-hidden rounded-2xl p-5"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: glow ? `0 4px 24px ${glow}` : undefined,
      }}
    >
      {/* Background glow blob */}
      <div
        className="pointer-events-none absolute top-0 right-0 h-24 w-24 rounded-full blur-3xl opacity-25"
        style={{ background: color, transform: 'translate(30%, -30%)' }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: `${color}22`, border: `1px solid ${color}44` }}
          >
            <span style={{ color }}>{icon}</span>
          </div>
          {trend && (
            <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: '#10b981' }}>
              <ArrowUpRight size={11} /> {trend}
            </span>
          )}
        </div>
        <p className="text-[12px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-[28px] font-bold leading-none" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
          {value}
        </p>
        {sub && <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Quick Action Button — SOURCE: view_dashboard.py → _build_action_button ───
interface ActionBtnProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  onClick: () => void;
}

function ActionBtn({ icon, title, subtitle, color, onClick }: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-4 rounded-xl px-4 py-3.5 text-left transition-all duration-200 hover:scale-[1.01]"
      style={{
        background: 'var(--input-bg)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color + '50'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-110"
        style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{title}</p>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      </div>
      <ArrowUpRight
        size={14}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ color }}
      />
    </button>
  );
}

// ─── Custom Chart Tooltip ───
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-[12px] shadow-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

// ─── DashboardView — SOURCE: ui\views\view_dashboard.py → DashboardView class ───
export default function DashboardView({ user_data, onNavigate, onShowNotif }: DashboardViewProps) {
  const notify = (msg: string, type = 'info') => onShowNotif?.(msg, type);
  const [chartTab, setChartTab] = useState<'weekly' | 'monthly'>('weekly');
  const [realChartData, setRealChartData] = useState<any[]>(CHART_DATA_WEEKLY);
  const [totalSukses, setTotalSukses] = useState<number>(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if ((window as any).pywebview) {
          const stats = await (window as any).pywebview.api.get_dashboard_stats();
          if (stats.success) {
            setRealChartData(stats.chart_data);
            setTotalSukses(stats.total_berhasil || 0);
          }
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      }
    };

    fetchStats();

    // KABEL BALIK: Segarkan data jika ada sinyal dari Python
    const handleUpdate = (e: any) => {
      if (e.detail.type === 'refresh-stats') {
        fetchStats();
      }
    };

    window.addEventListener('bot-update', handleUpdate);
    return () => window.removeEventListener('bot-update', handleUpdate);
  }, []);

  const tier = user_data.subscription_tier;
  const tierIcon = { Free: '◆', Basic: '★', Pro: '◈' }[tier] ?? '◆';
  const dailyUsedPct = user_data.daily_limit > 0
    ? Math.round((user_data.daily_count / user_data.daily_limit) * 100)
    : 0;

  // Parse subscription end date
  let endDateLabel = '—';
  try {
    const dt = new Date(user_data.subscription_end_date);
    endDateLabel = dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { /* empty */ }

  // update_stats — SOURCE: view_dashboard.py → DashboardView.update_stats
  const stat_labels = {
    quota:   `${user_data.remaining} / ${user_data.daily_limit}`,
    weekly:  user_data.weekly_success_count,
    monthly: user_data.monthly_success_count,
  };

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: 'var(--bg)' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Welcome Banner — SOURCE: _build_welcome_section ── */}
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-5 fade-in"
          style={{
            background: 'linear-gradient(135deg, #0f2044 0%, #1a3561 50%, #0d1f3c 100%)',
            border: '1px solid rgba(59,130,246,0.2)',
            boxShadow: '0 8px 40px rgba(37,99,235,0.2)',
          }}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 right-0 w-96 h-full opacity-20"
              style={{ background: 'radial-gradient(ellipse at right center, #3b82f6, transparent 70%)' }} />
            <div className="absolute top-2 right-8 text-[80px] opacity-5 leading-none select-none">◈</div>
          </div>
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-widest text-blue-300 mb-1">Selamat datang kembali</p>
              <h2 className="text-[22px] font-bold text-white leading-tight">
                {tierIcon} {user_data.full_name}
              </h2>
              <p className="text-[13px] text-blue-200 mt-1">
                Subscription aktif hingga <strong className="text-white">{endDateLabel}</strong>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[11px] text-blue-300">Kuota hari ini</p>
                <p className="text-[28px] font-bold text-white font-mono leading-none">{user_data.remaining}</p>
                <p className="text-[11px] text-blue-300">tersisa dari {user_data.daily_limit}</p>
              </div>
              {/* Mini radial indicator */}
              <div className="relative flex h-14 w-14 items-center justify-center">
                <svg viewBox="0 0 42 42" className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="21" cy="21" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <circle
                    cx="21" cy="21" r="16" fill="none"
                    stroke="#3b82f6" strokeWidth="3"
                    strokeDasharray={`${dailyUsedPct} ${100 - dailyUsedPct}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                </svg>
                <span className="text-[10px] font-bold text-white">{dailyUsedPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Row — SOURCE: _build_stats_cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-in">
          {/* stat_labels.quota — SOURCE: DashboardView.stat_labels */}
          <StatCard
            icon={<Calendar size={18} />}
            label="Sisa Kuota Hari Ini"
            value={stat_labels.quota}
            sub={`${dailyUsedPct}% terpakai`}
            color="#3b82f6"
            glow="rgba(59,130,246,0.1)"
            trend="+3 dari kemarin"
          />
          {/* stat_labels.weekly */}
          <StatCard
            icon={<TrendingUp size={18} />}
            label="Berhasil Minggu Ini"
            value={stat_labels.weekly.toLocaleString('id-ID')}
            sub="7 hari terakhir"
            color="#10b981"
            glow="rgba(16,185,129,0.1)"
            trend="+12%"
          />
          {/* stat_labels.monthly */}
          <StatCard
            icon={<BarChart3 size={18} />}
            label="Berhasil Bulan Ini"
            value={stat_labels.monthly.toLocaleString('id-ID')}
            sub="Akumulasi 30 hari"
            color="#8b5cf6"
            glow="rgba(139,92,246,0.1)"
            trend="+8%"
          />
          <StatCard
            icon={<Zap size={20} />}
            label="Tingkat Sukses"
            value={`${user_data.monthly_success_count > 0 ? ((user_data.monthly_success_count / (user_data.monthly_success_count + 1)) * 100).toFixed(1) : '100'}%`}
            trend="↑ Stabil"
            sub="Akumulasi 30 hari"
            color="#f59e0b"
            glow="rgba(245,158,11,0.1)"
          />
        </div>

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Chart Panel ── */}
          <div
            className="lg:col-span-2 rounded-2xl p-5 fade-in"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>Hasil Performa Entri</h3>
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Analisis detail per kategori</p>
              </div>
              <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                {(['weekly', 'monthly'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setChartTab(tab)}
                    className="px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150"
                    style={{
                      background: chartTab === tab ? '#2563eb' : 'transparent',
                      color: chartTab === tab ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    {tab === 'weekly' ? 'Mingguan' : 'Bulanan'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: 220, minHeight: 220, width: '100%', display: 'block' }}>
              <ResponsiveContainer width="99%" height={220} minWidth={0} minHeight={200} debounce={1}>
                {chartTab === 'weekly' ? (
                  <AreaChart data={realChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gbSuccess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gbIncomplete" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gbErrorData" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gbErrorSystem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="berhasil" name="Sukses" stroke="#10b981" fill="url(#gbSuccess)" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
                    <Area type="monotone" dataKey="inkomplet" name="Inkomplet" stroke="#f59e0b" fill="url(#gbIncomplete)" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
                    <Area type="monotone" dataKey="error_data" name="Error Data" stroke="#ef4444" fill="url(#gbErrorData)" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
                    <Area type="monotone" dataKey="error_sistem" name="Error Sistem" stroke="#3b82f6" fill="url(#gbErrorSystem)" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
                  </AreaChart>
                ) : (
                  <BarChart data={realChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="berhasil" name="Sukses" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="inkomplet" name="Inkomplet" fill="#f59e0b" radius={[4,4,0,0]} />
                    <Bar dataKey="error_data" name="Error Data" fill="#ef4444" radius={[4,4,0,0]} />
                    <Bar dataKey="error_sistem" name="Error Sistem" fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Quick Actions — SOURCE: _build_quick_actions ── */}
          <div
            className="rounded-2xl p-5 space-y-3 fade-in"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="mb-2">
              <h3 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>
                <Zap size={14} className="inline mr-1.5 text-yellow-400" />
                Quick Actions
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Akses cepat ke fitur utama</p>
            </div>

            {/* _on_start_bot — SOURCE: view_dashboard.py */}
            <ActionBtn
              icon={<PlayCircle size={18} />}
              title="Mulai Eksekusi"
              subtitle="Proses data Excel otomatis"
              color="#3b82f6"
              onClick={() => onNavigate('eksekusi')}
            />
            {/* _on_view_history — SOURCE: view_dashboard.py */}
            <ActionBtn
              icon={<FileText size={18} />}
              title="Laporan Hasil"
              subtitle="Riwayat & export Excel"
              color="#8b5cf6"
              onClick={() => onNavigate('laporan')}
            />
            {/* _on_settings — DEACTIVATED (User Request) */}
            {/* 
            <ActionBtn
              icon={<Settings size={18} />}
              title="Pengaturan"
              subtitle="Konfigurasi sistem"
              color="#10b981"
              onClick={() => notify('⚙️ Fitur Pengaturan akan segera hadir!', 'info')}
            />
            */}
            {/* _on_help — SOURCE: view_dashboard.py */}
            <ActionBtn
              icon={<HelpCircle size={18} />}
              title="Panduan Penggunaan"
              subtitle="Tutorial & dokumentasi"
              color="#f59e0b"
              onClick={() => notify('📚 Panduan: Pilih File Excel → Pilih Tanggal → Mulai Eksekusi. Hubungi admin jika ada kendala.', 'info')}
            />
          </div>
        </div>

        {/* ── Subscription Details ── */}
        <div
          className="rounded-2xl p-5 fade-in"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Tier</p>
              <p className="text-[13px] font-semibold" style={{ color: '#8b5cf6' }}>{tierIcon} {user_data.subscription_tier}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Berlaku Hingga</p>
              <p className="text-[13px] font-semibold" style={{ color: '#10b981' }}>{endDateLabel}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Status Akun</p>
              <p className="text-[13px] font-semibold" style={{ color: '#10b981' }}>✓ Aktif</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
