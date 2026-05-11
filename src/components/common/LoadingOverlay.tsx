import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isOpen,
  message = "Memproses Data..."
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm transition-all animate-fade-in">
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full" />
        
        <div className="relative bg-[#1e293b] p-10 rounded-3xl border border-slate-700 shadow-2xl flex flex-col items-center">
          <div className="relative mb-6">
            <Loader2 className="animate-spin text-blue-500" size={56} strokeWidth={1.5} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 bg-blue-500 rounded-full animate-ping" />
            </div>
          </div>
          
          <h3 className="text-[16px] font-bold text-white mb-2 tracking-wide">
            {message}
          </h3>
          <p className="text-[12px] text-slate-400 animate-pulse">
            Mohon tunggu sebentar
          </p>
          
          {/* Decorative bar */}
          <div className="mt-8 w-40 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 animate-loading-bar" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
