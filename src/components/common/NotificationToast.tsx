// ============================================================
// SOURCE: ui\components\notification.py — NotificationPopup (Overhauled)
// SOURCE: ui\components\confirmation_dialog.py — ConfirmationDialog (Overhauled)
// ============================================================

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  exiting?: boolean;
}

interface ToastProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

const toastConfig = {
  success: { icon: <CheckCircle2 size={16} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
  error:   { icon: <XCircle size={16} />,       color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',  border: 'rgba(244,63,94,0.25)' },
  warning: { icon: <AlertTriangle size={16} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  info:    { icon: <Info size={16} />,           color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)' },
};

// ── Toast Item ──
function Toast({ item, onDismiss }: ToastProps) {
  const cfg = toastConfig[item.type];

  useEffect(() => {
    const t = setTimeout(() => onDismiss(item.id), 3500);
    return () => clearTimeout(t);
  }, [item.id, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-2xl max-w-xs w-full pointer-events-auto ${item.exiting ? 'toast-out' : 'toast-in'}`}
      style={{
        background: 'var(--card)',
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${cfg.border}`,
      }}
    >
      <div
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg mt-0.5"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-snug" style={{ color: 'var(--text)' }}>
          {item.message}
        </p>
      </div>
      <button
        onClick={() => onDismiss(item.id)}
        className="flex-shrink-0 mt-0.5 rounded-md p-0.5 transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ── NotificationToastContainer — SOURCE: notification.py → NotificationPopup ──
interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed top-[72px] right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: 320 }}
    >
      {toasts.map(t => (
        <Toast key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ── useToasts hook ──
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // tampilkan / show — SOURCE: notification.py → NotificationPopup.tampilkan / show
  const show = (message: string, type: ToastItem['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
  };

  // sembunyikan — SOURCE: notification.py → NotificationPopup.sembunyikan
  const dismiss = (id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  };

  return { toasts, show, dismiss };
}

// ── ConfirmationDialog — SOURCE: ui\components\confirmation_dialog.py → ConfirmationDialog ──
interface ConfirmationDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  details?: string;
  confirm_text?: string;
  cancel_text?: string;
  on_confirm: () => void;
  on_cancel: () => void;
  icon?: string;
  danger_mode?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  title = 'Konfirmasi',
  message,
  details,
  confirm_text = 'Ya, Lanjutkan',
  cancel_text = 'Batal',
  on_confirm,
  on_cancel,
  icon = '❓',
  danger_mode = false,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const confirmColor = danger_mode ? '#f43f5e' : '#10b981';

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl fade-in"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Header stripe */}
        <div
          className="flex flex-col items-center justify-center py-5 px-6"
          style={{
            background: danger_mode
              ? 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(244,63,94,0.05))'
              : 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
            borderBottom: `1px solid ${danger_mode ? 'rgba(244,63,94,0.2)' : 'rgba(59,130,246,0.2)'}`,
          }}
        >
          <span className="text-4xl mb-2">{icon}</span>
          <h3 className="text-[17px] font-bold" style={{ color: 'var(--text)' }}>{title}</h3>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-[14px] font-semibold text-center leading-snug" style={{ color: 'var(--text)' }}>{message}</p>
          {details && (
            <div className="rounded-xl p-4 text-[12px] leading-relaxed whitespace-pre-line" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-sub)' }}>
              {details}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-6 pb-6">
          {/* btn_cancel — SOURCE: confirmation_dialog.py */}
          <button
            onClick={on_cancel}
            className="flex-1 py-3 rounded-xl text-[13px] font-semibold transition-all duration-150 hover:scale-[1.02]"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-sub)' }}
          >
            {cancel_text}
          </button>
          {/* btn_confirm — SOURCE: confirmation_dialog.py */}
          <button
            onClick={on_confirm}
            className="flex-1 py-3 rounded-xl text-[13px] font-bold text-white transition-all duration-150 hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${confirmColor}cc, ${confirmColor})`,
              boxShadow: `0 6px 20px ${confirmColor}40`,
            }}
          >
            {confirm_text}
          </button>
        </div>
      </div>
    </div>
  );
}
