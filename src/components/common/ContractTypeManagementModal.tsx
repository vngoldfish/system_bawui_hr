'use client';

import Portal from './Portal';
import ContractTypesClient from '@/components/contract-types/ContractTypesClient';
import { useI18n } from '@/lib/i18n';

interface ContractTypeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContractTypeManagementModal({
  isOpen,
  onClose,
}: ContractTypeManagementModalProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col border border-slate-100 animate-fadeIn">
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-md z-10">
            <h2 className="text-base font-extrabold text-slate-800 tracking-wide">
              {t('common.manageTitle')?.replace('{title}', t('form.contractType')) ||
                `${t('form.contractType')}の管理`}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-655 flex items-center justify-center text-lg leading-none hover:bg-slate-50 transition-colors cursor-pointer"
            >
              &times;
            </button>
          </div>

          <div className="p-6">
            <ContractTypesClient active={isOpen} variant="embedded" />
          </div>
        </div>
      </div>
    </Portal>
  );
}