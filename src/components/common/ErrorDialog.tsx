import React from 'react';
import { Lock, Timer, Info, WifiOff, XCircle, X } from 'lucide-react';

export type ErrorType = 'HARD_LOCK' | 'SOFT_LOCK' | 'MAINTENANCE' | 'NETWORK_ERROR' | 'ERROR';

interface ErrorDialogProps {
  isOpen: boolean;
  type: ErrorType;
  message: string;
  details?: string;
  onClose: () => void;
  actionText?: string;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({
  isOpen,
  type,
  message,
  details,
  onClose,
  actionText = "Siap, Saya Mengerti"
}) => {
  if (!isOpen) return null;

  const configs = {
    HARD_LOCK: { icon: <Lock size={40} />, color: '#ef4444', title: 'Akses Terkunci' },
    SOFT_LOCK: { icon: <Timer size={40} />, color: '#f59e0b', title: 'Kuota Habis' },
    MAINTENANCE: { icon: <Info size={40} />, color: '#f59e0b', title: 'Pemeliharaan Sistem' },
    NETWORK_ERROR: { icon: <WifiOff size={40} />, color: '#64748b', title: 'Koneksi Bermasalah' },
    ERROR: { icon: <XCircle size={40} />, color: '#ef4444', title: 'Terjadi Kesalahan' }
  };

  const config = configs[type] || configs.ERROR;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />
      
      <div 
        className="relative bg-[#0f172a] border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Strip — SOURCE: error_dialog.py.header */}
        <div 
          className="h-24 flex items-center justify-center text-white"
          style={{ background: config.color }}
        >
          <div className="animate-bounce-subtle">
            {config.icon}
          </div>
        </div>

        {/* Content Area — SOURCE: error_dialog.py.content */}
        <div className="p-8 text-center">
          <h2 className="text-[20px] font-bold text-white mb-3">{config.title}</h2>
          <p className="text-[14px] text-slate-300 leading-relaxed font-medium">
            {message}
          </p>
          {details && (
            <div className="mt-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <p className="text-[11px] text-slate-500 font-mono italic">
                {details}
              </p>
            </div>
          )}
        </div>

        {/* Action Button — SOURCE: error_dialog.py.btn_ok */}
        <div className="p-8 pt-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-4 rounded-xl text-[14px] font-bold text-white transition-all hover:brightness-110 active:scale-95 shadow-lg"
            style={{ 
              background: config.color,
              boxShadow: `0 4px 20px ${config.color}40`
            }}
          >
            {actionText}
          </button>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default ErrorDialog;
