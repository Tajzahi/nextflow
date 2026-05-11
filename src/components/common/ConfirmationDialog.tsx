import React from 'react';
import { AlertTriangle, X, CheckCircle2 } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  dangerMode?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title = "Konfirmasi",
  message,
  details,
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  onConfirm,
  onCancel,
  dangerMode = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />
      
      <div 
        className="relative bg-[#1e293b] border border-slate-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Area — SOURCE: confirmation_dialog.py.header */}
        <div 
          className="h-20 flex flex-col items-center justify-center text-white"
          style={{ background: dangerMode ? '#ef4444' : '#3b82f6' }}
        >
          <div className="mb-1">
            {dangerMode ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
          </div>
          <h2 className="text-[15px] font-bold uppercase tracking-wider">{title}</h2>
        </div>

        {/* Content Area — SOURCE: confirmation_dialog.py.content */}
        <div className="p-8 text-center">
          <p className="text-[15px] font-bold text-slate-200 leading-relaxed mb-2">
            {message}
          </p>
          {details && (
            <p className="text-[12px] text-slate-400 font-medium">
              {details}
            </p>
          )}
        </div>

        {/* Buttons — SOURCE: confirmation_dialog.py.btn_frame */}
        <div className="flex items-center gap-3 p-6 pt-0">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl text-[13px] font-bold text-slate-300 bg-slate-800 border border-slate-700 transition-all hover:bg-slate-700"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-xl text-[13px] font-bold text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
            style={{ 
              background: dangerMode ? '#ef4444' : '#10b981',
              boxShadow: dangerMode ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(16,185,129,0.3)'
            }}
          >
            {confirmText}
          </button>
        </div>

        <button 
          onClick={onCancel}
          className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
