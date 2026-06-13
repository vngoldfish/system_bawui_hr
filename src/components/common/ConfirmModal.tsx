'use client';

import Portal from './Portal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-100 animate-fadeIn p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-lg shadow-2xs">
              ⚠️
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            {message}
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-650 transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onClose();
                onConfirm();
              }}
              className="px-3.5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
