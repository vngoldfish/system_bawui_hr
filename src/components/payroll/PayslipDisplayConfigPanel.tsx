'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PayslipDisplayConfig } from '@/lib/payslip-display-config';
import { DEFAULT_PAYSLIP_DISPLAY_CONFIG } from '@/lib/payslip-display-config';

interface ConfigField {
  key: keyof PayslipDisplayConfig;
  labelKey: string;
  indent?: boolean;
  parentKey?: keyof PayslipDisplayConfig;
}

const INFO_FIELDS: ConfigField[] = [
  { key: 'showEmployeeCode', labelKey: 'payroll.employeeCode' },
  { key: 'showDeptPosition', labelKey: 'payroll.deptPos' },
  { key: 'showCompanyInfo', labelKey: 'payroll.companyName' },
  { key: 'showPayDate', labelKey: 'payroll.payDate' },
];

const ATTENDANCE_FIELDS: ConfigField[] = [
  { key: 'showAttendance', labelKey: 'payroll.attendanceHeader' },
  { key: 'showWorkDays', labelKey: 'payroll.workDays', indent: true, parentKey: 'showAttendance' },
  { key: 'showAbsentDays', labelKey: 'payroll.absentDays', indent: true, parentKey: 'showAttendance' },
  { key: 'showPaidLeaveDays', labelKey: 'payroll.paidLeaveDays', indent: true, parentKey: 'showAttendance' },
  { key: 'showPrescribedHours', labelKey: 'payroll.prescribedHours', indent: true, parentKey: 'showAttendance' },
  { key: 'showActualHours', labelKey: 'payroll.actualHours', indent: true, parentKey: 'showAttendance' },
  { key: 'showOvertimeHours', labelKey: 'payroll.overtimeHours', indent: true, parentKey: 'showAttendance' },
];

const EARNINGS_FIELDS: ConfigField[] = [
  { key: 'showOvertimePay', labelKey: 'payroll.overtimeSubject' },
  { key: 'showTransportation', labelKey: 'payroll.transportSubject' },
  { key: 'showHousing', labelKey: 'payroll.housingSubject' },
  { key: 'showMeal', labelKey: 'payroll.mealSubject' },
  { key: 'showOtherAllowances', labelKey: 'payroll.otherAllowancesAndAdjustments' },
  { key: 'showBonus', labelKey: 'payroll.bonusSubject' },
];

const DEDUCTION_FIELDS: ConfigField[] = [
  { key: 'showHealthInsurance', labelKey: 'payroll.healthInsSubject' },
  { key: 'showNursingCare', labelKey: 'payroll.nursingCareInsuranceEmployee' },
  { key: 'showPension', labelKey: 'payroll.pensionSubject' },
  { key: 'showEmploymentIns', labelKey: 'payroll.employmentInsSubject' },
  { key: 'showWorkersComp', labelKey: 'payroll.workersCompSubject' },
  { key: 'showAbsentDeductions', labelKey: 'payroll.absentAndOtherDeductions' },
  { key: 'showIncomeTax', labelKey: 'payroll.incomeTaxSubject' },
  { key: 'showResidentTax', labelKey: 'payroll.residentTaxSubject' },
];

export default function PayslipDisplayConfigPanel({
  config,
  onChange,
  onSave,
  saving,
  t,
}: {
  config: PayslipDisplayConfig;
  onChange: (config: PayslipDisplayConfig) => void;
  onSave: () => void;
  saving: boolean;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggle = useCallback((key: keyof PayslipDisplayConfig) => {
    const next = { ...config, [key]: !config[key] };
    if (key === 'showAttendance' && !next.showAttendance) {
      ATTENDANCE_FIELDS.forEach(f => {
        if (f.parentKey === 'showAttendance') next[f.key] = false;
      });
    }
    onChange(next);
  }, [config, onChange]);

  const selectAll = useCallback(() => {
    onChange({ ...DEFAULT_PAYSLIP_DISPLAY_CONFIG });
  }, [onChange]);

  const renderSection = (title: string, icon: string, fields: ConfigField[]) => (
    <div className="mb-3">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <div className="space-y-0.5">
        {fields.map(field => {
          const disabled = field.parentKey ? !config[field.parentKey] : false;
          return (
            <label
              key={field.key}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs
                ${disabled ? 'opacity-40 pointer-events-none' : 'hover:bg-slate-50'}
                ${field.indent ? 'pl-6' : ''}`}
            >
              <input
                type="checkbox"
                checked={config[field.key]}
                onChange={() => toggle(field.key)}
                disabled={disabled}
                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-1 cursor-pointer"
              />
              <span className="text-slate-700 select-none leading-tight">{t(field.labelKey)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        title={t('payroll.displayConfig')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-[300] overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-700">{t('payroll.displayConfigTitle')}</h4>
            <div className="flex gap-1.5">
              <button
                onClick={selectAll}
                className="text-[10px] px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded-md text-slate-600 font-semibold transition-colors cursor-pointer"
              >
                {t('payroll.resetDefault')}
              </button>
            </div>
          </div>

          <div className="px-3 py-3 max-h-[60vh] overflow-y-auto">
            {renderSection(t('payroll.sectionInfo'), '📋', INFO_FIELDS)}
            <hr className="border-slate-100 my-2" />
            {renderSection(t('payroll.sectionAttendance'), '📅', ATTENDANCE_FIELDS)}
            <hr className="border-slate-100 my-2" />
            {renderSection(t('payroll.sectionEarnings'), '💰', EARNINGS_FIELDS)}
            <hr className="border-slate-100 my-2" />
            {renderSection(t('payroll.sectionDeductions'), '📉', DEDUCTION_FIELDS)}
          </div>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
            <button
              onClick={() => { onSave(); setOpen(false); }}
              disabled={saving}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('payroll.configSaving')}
                </>
              ) : (
                t('payroll.configSaved').replace('Đã lưu', 'Lưu').replace('Settings saved', 'Save').replace('設定を保存しました', '保存する').replace('设置已保存', '保存')
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
