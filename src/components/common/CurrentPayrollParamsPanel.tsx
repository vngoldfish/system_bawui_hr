'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { formatCurrency, cn } from '@/lib/utils';
import {
  getAttendanceMonthForPayroll,
  getPayrollMonthForAttendanceDate,
} from '@/lib/payroll-helpers';

const STORAGE_KEY = 'payroll_params_panel_collapsed';

export interface EmployeeSalaryParams {
  salaryType?: string | null;
  salary?: number | null;
  hourlyRate?: number | null;
  dailyRate?: number | null;
  insuranceSalary?: number | null;
  contractType?: string | null;
  overtimeMultiplier?: number | null;
  benefits?: { transportation?: number; housing?: number; meal?: number };
}

interface PayrollParamsData {
  cutoffDay?: string;
  payday?: string;
  roundingPolicy?: string;
  fiscalYear?: number;
  prefecture?: string;
  healthInsuranceRate?: number;
  nursingCareRate?: number;
  pensionRate?: number;
  employmentInsuranceEmployee?: number;
  employmentInsuranceCompany?: number;
  workersCompRate?: number;
  incomeTaxYear?: number;
}

interface CurrentPayrollParamsPanelProps {
  targetMonth: string;
  mode: 'attendance' | 'payroll';
  employee?: EmployeeSalaryParams | null;
  prefetched?: PayrollParamsData;
  defaultOpen?: boolean;
}

function formatRate(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value}%`;
}

export default function CurrentPayrollParamsPanel({
  targetMonth,
  mode,
  employee,
  prefetched,
  defaultOpen = true,
}: CurrentPayrollParamsPanelProps) {
  const { t, locale } = useI18n();
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<PayrollParamsData | null>(prefetched ?? null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      setCollapsed(saved === 'true');
    }
  }, []);

  useEffect(() => {
    if (prefetched) {
      setData(prev => ({ ...prev, ...prefetched }));
    }
  }, [prefetched]);

  useEffect(() => {
    if (prefetched) return;
    let cancelled = false;
    Promise.all([
      fetch('/api/company').then(r => (r.ok ? r.json() : null)),
      fetch('/api/payroll-rates').then(r => (r.ok ? r.json() : null)),
    ])
      .then(([company, ratesPayload]) => {
        if (cancelled) return;
        const rates = ratesPayload?.data ?? ratesPayload;
        setData({
          cutoffDay: company?.salaryCutoffDay,
          payday: company?.payday,
          roundingPolicy: company?.roundingPolicy,
          fiscalYear: rates?.fiscalYear,
          prefecture: rates?.prefecture,
          healthInsuranceRate: rates?.healthInsuranceRate ?? company?.healthInsuranceRate,
          nursingCareRate: rates?.nursingCareRate,
          pensionRate: rates?.pensionRate,
          employmentInsuranceEmployee: rates?.employmentInsuranceEmployee,
          employmentInsuranceCompany: rates?.employmentInsuranceCompany,
          workersCompRate: rates?.workersCompRate,
          incomeTaxYear: rates?.incomeTaxYear,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [prefetched]);

  const monthContext = useMemo(() => {
    if (mode === 'payroll') {
      const attendanceMonth = getAttendanceMonthForPayroll(targetMonth);
      return { payrollMonth: targetMonth, attendanceMonth };
    }
    const payrollMonth = getPayrollMonthForAttendanceDate(new Date(`${targetMonth}-01T12:00:00+09:00`));
    return { payrollMonth, attendanceMonth: targetMonth };
  }, [mode, targetMonth]);

  const roundingLabel = useMemo(() => {
    const p = data?.roundingPolicy || 'exact';
    if (p === 'exact') return t('company.roundingExact');
    if (p === '10min') return t('company.rounding10');
    if (p === '15min') return t('company.rounding15');
    if (p === '30min') return t('company.rounding30');
    return p;
  }, [data?.roundingPolicy, t]);

  const salaryAmount = useMemo(() => {
    if (!employee) return null;
    const type = employee.salaryType || '月給';
    if (type === '時給') return { label: t('payrollParams.hourlyRate'), value: formatCurrency(employee.hourlyRate || 0) };
    if (type === '日給') return { label: t('payrollParams.dailyRate'), value: formatCurrency(employee.dailyRate || 0) };
    return { label: t('payrollParams.monthlySalary'), value: formatCurrency(employee.salary || 0) };
  }, [employee, t]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  if (!mounted) return null;

  const monthLabel = (m: string) => {
    const [y, mo] = m.split('-');
    if (locale === 'ja' || locale === 'zh') return `${y}年${Number(mo)}月`;
    if (locale === 'vi') return `Tháng ${Number(mo)}/${y}`;
    return m;
  };

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">📊</span>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
              {t('payrollParams.title')}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {mode === 'payroll'
                ? t('payrollParams.payrollMonthContext')
                    .replace('{payroll}', monthLabel(monthContext.payrollMonth))
                    .replace('{attendance}', monthLabel(monthContext.attendanceMonth))
                : t('payrollParams.attendanceMonthContext')
                    .replace('{attendance}', monthLabel(monthContext.attendanceMonth))
                    .replace('{payroll}', monthLabel(monthContext.payrollMonth))}
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{collapsed ? '▼' : '▲'}</span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-3">
            {[
              { label: t('payrollParams.cutoffDay'), value: data?.cutoffDay || '—' },
              { label: t('payrollParams.payday'), value: data?.payday ? `${data.payday}${locale === 'ja' ? '日' : locale === 'vi' ? '' : ''}` : '—' },
              { label: t('payrollParams.rounding'), value: roundingLabel },
              { label: t('payrollParams.fiscalYear'), value: data?.fiscalYear ? `${data.fiscalYear}${locale === 'ja' ? '年度' : ''}` : '—' },
              { label: t('payrollParams.prefecture'), value: data?.prefecture || '—' },
              { label: t('payrollParams.incomeTaxYear'), value: data?.incomeTaxYear ? String(data.incomeTaxYear) : '—' },
            ].map(item => (
              <div key={item.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.label}</p>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
              {t('payrollParams.insuranceRates')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { label: t('payrollParams.healthInsurance'), value: formatRate(data?.healthInsuranceRate) },
                { label: t('payrollParams.nursingCare'), value: formatRate(data?.nursingCareRate) },
                { label: t('payrollParams.pension'), value: formatRate(data?.pensionRate) },
                { label: t('payrollParams.employmentEmployee'), value: formatRate(data?.employmentInsuranceEmployee) },
                { label: t('payrollParams.employmentCompany'), value: formatRate(data?.employmentInsuranceCompany) },
                { label: t('payrollParams.workersComp'), value: formatRate(data?.workersCompRate) },
              ].map(item => (
                <div key={item.label} className="rounded-xl bg-blue-50/60 dark:bg-blue-950/20 px-3 py-2 border border-blue-100 dark:border-blue-900/40">
                  <p className="text-[10px] font-bold text-blue-600/80">{item.label}</p>
                  <p className="text-xs font-black text-blue-900 dark:text-blue-200 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {employee && (
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                {t('payrollParams.employeeSalary')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { label: t('payrollParams.contractType'), value: employee.contractType || '—' },
                  { label: t('payrollParams.salaryType'), value: employee.salaryType || '—' },
                  salaryAmount ? { label: salaryAmount.label, value: salaryAmount.value } : null,
                  employee.insuranceSalary
                    ? { label: t('payrollParams.insuranceSalary'), value: formatCurrency(employee.insuranceSalary) }
                    : null,
                  employee.overtimeMultiplier
                    ? { label: t('payrollParams.otMultiplier'), value: `×${employee.overtimeMultiplier}` }
                    : null,
                  employee.benefits?.transportation
                    ? { label: t('payrollParams.transport'), value: formatCurrency(employee.benefits.transportation) }
                    : null,
                  employee.benefits?.housing
                    ? { label: t('payrollParams.housing'), value: formatCurrency(employee.benefits.housing) }
                    : null,
                  employee.benefits?.meal
                    ? { label: t('payrollParams.meal'), value: formatCurrency(employee.benefits.meal) }
                    : null,
                ]
                  .filter((item): item is { label: string; value: string } => !!item)
                  .map(item => (
                    <div
                      key={item.label}
                      className="rounded-xl bg-violet-50/60 dark:bg-violet-950/20 px-3 py-2 border border-violet-100 dark:border-violet-900/40"
                    >
                      <p className="text-[10px] font-bold text-violet-600/80">{item.label}</p>
                      <p className="text-xs font-black text-violet-900 dark:text-violet-200 mt-0.5">{item.value}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-[10px] text-slate-400 font-medium">{t('payrollParams.hint')}</p>
            <Link
              href="/salary-table"
              className={cn(
                'text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline'
              )}
            >
              {t('payrollParams.editRates')} →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}