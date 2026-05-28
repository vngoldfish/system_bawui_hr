'use client';

import Portal from '@/components/common/Portal';
import { useI18n } from '@/lib/i18n';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  employeeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({ isOpen, employeeName, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">{t('deleteConfirm.title')}</h2>
          </div>
          <p className="text-slate-600 mb-6">
            {t('deleteConfirm.prompt').replace('{employeeName}', employeeName)}
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={onCancel} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">
              {t('deleteConfirm.cancel')}
            </button>
            <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              {t('deleteConfirm.delete')}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
