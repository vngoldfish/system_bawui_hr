'use client';

import { useState, useEffect } from 'react';
import Portal from '@/components/common/Portal';
import { useI18n } from '@/lib/i18n';
import type { Employee, SalaryAdjustment } from '@/types';

interface NewSalaryAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: Employee;
  adjustmentToEdit?: SalaryAdjustment | any | null;
}

export default function NewSalaryAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  employee,
  adjustmentToEdit,
}: NewSalaryAdjustmentModalProps) {
  const { t } = useI18n();

  const [effectiveFrom, setEffectiveFrom] = useState(
    adjustmentToEdit?.effectiveFrom || new Date().toISOString().slice(0, 7)
  );
  const [newBaseSalary, setNewBaseSalary] = useState(
    String(adjustmentToEdit?.newBaseSalary ?? employee.salary ?? 0)
  );
  const [newHourlyRate, setNewHourlyRate] = useState(
    String(adjustmentToEdit?.newHourlyRate ?? employee.hourlyRate ?? 0)
  );
  const [newDailyRate, setNewDailyRate] = useState(
    String(adjustmentToEdit?.newDailyRate ?? employee.dailyRate ?? 0)
  );
  const [reason, setReason] = useState(adjustmentToEdit?.reason || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (adjustmentToEdit) {
        setEffectiveFrom(adjustmentToEdit.effectiveFrom || new Date().toISOString().slice(0, 7));
        setNewBaseSalary(String(adjustmentToEdit.newBaseSalary ?? employee.salary ?? 0));
        setNewHourlyRate(String(adjustmentToEdit.newHourlyRate ?? employee.hourlyRate ?? 0));
        setNewDailyRate(String(adjustmentToEdit.newDailyRate ?? employee.dailyRate ?? 0));
        setReason(adjustmentToEdit.reason || '');
      } else {
        setEffectiveFrom(new Date().toISOString().slice(0, 7));
        setNewBaseSalary(String(employee.salary ?? 0));
        setNewHourlyRate(String(employee.hourlyRate ?? 0));
        setNewDailyRate(String(employee.dailyRate ?? 0));
        setReason('');
      }
      setError(null);
    }
  }, [isOpen, adjustmentToEdit, employee]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const isEdit = Boolean(adjustmentToEdit?.id);
      const method = isEdit ? 'PUT' : 'POST';
      const body: any = {
        ...(isEdit ? { id: adjustmentToEdit.id } : { employeeId: employee.id }),
        effectiveFrom,
        newBaseSalary: employee.salaryType === '月給' ? (parseFloat(newBaseSalary) || 0) : (employee.salary || 0),
        newHourlyRate: employee.salaryType === '時給' ? (parseFloat(newHourlyRate) || 0) : (employee.hourlyRate || 0),
        newDailyRate: employee.salaryType === '日給' ? (parseFloat(newDailyRate) || 0) : (employee.dailyRate || 0),
        reason,
      };

      const res = await fetch('/api/salary-adjustments', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit salary adjustment');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the salary adjustment.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50/50 hover:bg-slate-50/80 transition-colors duration-200';

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60 animate-fadeIn">
        <div
          className="bg-white rounded-3xl shadow-premium max-w-md w-full border border-slate-100 flex flex-col max-h-[90vh] animate-scaleUp transition-all duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex-shrink-0 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">
                {adjustmentToEdit?.id
                  ? (t('client.editSalaryAdjustment') || '給与改定の編集')
                  : (t('client.adjustSalaryBtn') || 'Adjust Salary')}
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                {employee.lastName} {employee.firstName} ({employee.employeeCode})
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg leading-none hover:bg-slate-50 transition-colors"
            >
              &times;
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200/60 text-rose-600 text-xs font-bold rounded-xl flex items-center gap-2 animate-shake">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Salary Type Notice */}
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700 font-semibold flex justify-between items-center">
              <span>{t('form.salaryType') || 'Salary Type'}:</span>
              <span className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-md text-[10px] font-bold">
                {employee.salaryType || '-'}
              </span>
            </div>

            {/* Effective Month */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('client.effectiveMonth') || 'Effective Month'} <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Monthly Base Salary */}
            {employee.salaryType === '月給' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  <span>{t('client.newSalary') || 'New Base Salary (Monthly)'}</span>
                  <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                    Active
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    value={newBaseSalary}
                    onChange={(e) => setNewBaseSalary(e.target.value)}
                    className={`${inputCls} ring-2 ring-indigo-500/20`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {t('common.yen') || '¥'}
                  </span>
                </div>
              </div>
            )}

            {/* Hourly Rate */}
            {employee.salaryType === '時給' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  <span>{t('client.newHourlyRate') || 'New Hourly Rate'}</span>
                  <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                    Active
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    value={newHourlyRate}
                    onChange={(e) => setNewHourlyRate(e.target.value)}
                    className={`${inputCls} ring-2 ring-indigo-500/20`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {t('client.hourlyRateUnit') || '¥ / Hour'}
                  </span>
                </div>
              </div>
            )}

            {/* Daily Rate */}
            {employee.salaryType === '日給' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  <span>{t('client.newDailyRate') || 'New Daily Rate'}</span>
                  <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                    Active
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    value={newDailyRate}
                    onChange={(e) => setNewDailyRate(e.target.value)}
                    className={`${inputCls} ring-2 ring-indigo-500/20`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {t('client.dailyRateUnit') || '¥ / Day'}
                  </span>
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('client.changeReason') || 'Change Reason'}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className={`${inputCls} resize-none`}
                placeholder={t('client.changeReasonPlaceholder') || 'Enter reason for salary adjustment...'}
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 premium-btn-primary rounded-xl text-xs font-bold shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:scale-100"
              >
                {loading && (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {t('common.save') || 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

