'use client';

import Portal from './Portal';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'error';
  closeText?: string;
}

export default function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type,
  closeText = 'Close',
}: NotificationModalProps) {
  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs animate-fadeIn" onClick={onClose} />
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-100 animate-fadeIn p-6 space-y-4 text-center items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-2xs border ${
            type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-600'
              : 'bg-emerald-50 border-emerald-200 text-emerald-600'
          }`}>
            {type === 'error' ? '❌' : '✅'}
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md w-full mt-2 ${
              type === 'error'
                ? 'bg-rose-500 hover:bg-rose-600'
                : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {closeText}
          </button>
        </div>
      </div>
    </Portal>
  );
}
