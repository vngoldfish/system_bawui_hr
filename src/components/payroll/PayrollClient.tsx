'use client';
/* eslint-disable react-hooks/preserve-manual-memoization */

import { useState, useMemo, useRef, useEffect } from 'react';
import Card from '@/components/common/Card';
import ExportButtons from '@/components/common/ExportButtons';
import { formatCurrency } from '@/lib/utils';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { useI18n } from '@/lib/i18n';
import { calculatePayrollDetails } from '@/lib/payroll-calculator';

interface Employee {
  id: string; employeeCode: string; firstName: string; lastName: string; firstNameKana: string; lastNameKana: string;
  department: string; position: string; positionAllowance?: number; salary: number; salaryType: string; hourlyRate: number; dailyRate: number;
  contractType: string; benefits: {
    healthInsurance: boolean; pension: boolean; employmentInsurance: boolean; workersComp: boolean;
    transportation: number; housing: number; meal: number;
    residentTax?: boolean;
    residentTaxAmount?: number;
  };
  birthDate?: string | null;
  dependents?: Array<{
    id: string;
    name: string;
    relationship: string;
    birthDate: string | null;
    gender: string | null;
    cohabitation: string;
  }>;
}

interface PayrollRecord {
  id: string; employeeId: string; month: string;
  baseSalary: number; overtimePay: number; allowances: number;
  healthInsurance: number; pension: number; employmentInsurance: number; workersComp: number;
  incomeTax: number; residentTax: number;
  totalGross: number; totalDeductions: number; netSalary: number;
  salaryType: string; workDays: number; workHours: number; overtimeHours: number;
  absentDays: number;
  status: string;
  paymentDate?: string;
  deductions?: number;
  tax?: number;
  insurance?: number;
  healthInsuranceCompany?: number;
  pensionCompany?: number;
  employmentInsuranceCompany?: number;
  workersCompCompany?: number;
  healthInsuranceEmployee?: number;
  pensionEmployee?: number;
  employmentInsuranceEmployee?: number;
  nursingCareInsurance?: number;
  totalCompanyCost?: number;
}

const getDisplayMonth = (monthStr: string, loc: string) => {
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString(loc, { year: 'numeric', month: 'long' });
  } catch (e) {
    return monthStr;
  }
};

const PAGE_SIZE = 10;

const statusOptions = [
  { value: 'CALCULATED', label: '計算済み' },
  { value: 'APPROVED', label: '承認済み' },
  { value: 'PAID', label: '支払い済み' },
  { value: 'PENDING', label: '未処理' },
];

const statusColor = (s: string) =>
  s === 'PAID' ? 'bg-green-100 text-green-800' :
  s === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
  s === 'CALCULATED' ? 'bg-yellow-100 text-yellow-800' :
  'bg-slate-100 text-slate-800';

const statusLabel = (s: string) =>
  s === 'PAID' ? '支払い済み' : s === 'APPROVED' ? '承認済み' :
  s === 'CALCULATED' ? '計算済み' : s === 'PENDING' ? '未処理' : s;

const salaryTypeColor = (t: string) =>
  t === '月給' ? 'bg-blue-100 text-blue-700' :
  t === '日給' ? 'bg-green-100 text-green-700' :
  t === '時給' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700';

function FilterDropdown({ options, selected, onSelect, onClose }: {
  options: { value: string; label: string }[]; selected: string[];
  onSelect: (values: string[]) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-[150px]">
      {options.map(opt => (
        <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
          <input type="checkbox" checked={selected.includes(opt.value)}
            onChange={e => onSelect(e.target.checked ? [...selected, opt.value] : selected.filter(v => v !== opt.value))}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm text-slate-700">{opt.label}</span>
        </label>
      ))}
      {selected.length > 0 && (
        <button onClick={() => onSelect([])} className="w-full mt-1 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded border-t border-slate-100">クリア</button>
      )}
    </div>
  );
}

function FilterTh({ label, filterKey, options, activeFilter, columnFilters, onFilterChange, onActiveFilterChange, widthClass }: {
  label: string; filterKey: string; options: { value: string; label: string }[];
  activeFilter: string | null; columnFilters: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void; onActiveFilterChange: (key: string | null) => void;
  widthClass?: string;
}) {
  const hasFilter = (columnFilters[filterKey]?.length ?? 0) > 0;
  const isActive = activeFilter === filterKey;
  return (
    <th className={`px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer select-none relative whitespace-nowrap ${widthClass || ''}`}
      onDoubleClick={() => onActiveFilterChange(isActive ? null : filterKey)} title="ダブルクリックでフィルター">
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {hasFilter && <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>}
      </div>
      {isActive && <FilterDropdown options={options} selected={columnFilters[filterKey] || []} onSelect={vals => onFilterChange(filterKey, vals)} onClose={() => onActiveFilterChange(null)} />}
    </th>
  );
}

function PayslipModal({ record, employee, companyInfo, isAdmin = false, onSave, onClose }: { 
  record: PayrollRecord; 
  employee: Employee; 
  companyInfo?: { name: string; address: string; healthInsuranceRate?: number | null };
  isAdmin?: boolean;
  onSave?: (updated: PayrollRecord) => void;
  onClose: () => void 
}) {
  const { t, locale } = useI18n();
  const [emailing, setEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const transAllow = employee.benefits?.transportation || 0;
  const houseAllow = employee.benefits?.housing || 0;
  const mealAllow = employee.benefits?.meal || 0;
  const fixedAllowances = transAllow + houseAllow + mealAllow;
  const displayBonus = Math.max(0, record.allowances - fixedAllowances);

  // Company contributions display
  const companyHealthIns = record.healthInsuranceCompany || 0;
  const companyPension = record.pensionCompany || 0;
  const companyEmpIns = record.employmentInsuranceCompany || 0;
  const companyWorkersComp = record.workersCompCompany || 0;
  const totalCompanyCost = record.totalCompanyCost || 0;

  // Employee contributions detailed
  const empHealthIns = record.healthInsuranceEmployee || 0;
  const empPension = record.pensionEmployee || 0;
  const empEmpIns = record.employmentInsuranceEmployee || 0;
  const nursingCare = record.nursingCareInsurance || 0;
  const resTax = record.residentTax || 0;
  const incTax = record.incomeTax || record.tax || 0;

  const [editFields, setEditFields] = useState({
    baseSalary: record.baseSalary,
    overtimePay: record.overtimePay,
    transportation: transAllow,
    housing: houseAllow,
    meal: mealAllow,
    allowances: 0, // "Other Allowances" adjustment in edit mode
    bonus: displayBonus, // "Bonus" adjustment in edit mode
    deductions: record.deductions || 0,
    tax: record.tax || 0,
    insurance: record.insurance || 0,
    paymentDate: record.paymentDate ? new Date(record.paymentDate).toISOString().split('T')[0] : record.month + '-25',
    status: record.status,
    workDays: record.workDays || 22,
    absentDays: record.absentDays || 0,
    overtimeHours: record.overtimeHours || 0,
    healthInsuranceEmployee: record.healthInsuranceEmployee ?? 0,
    nursingCareInsurance: record.nursingCareInsurance ?? 0,
    pensionEmployee: record.pensionEmployee ?? 0,
    employmentInsuranceEmployee: record.employmentInsuranceEmployee ?? 0,
    residentTax: record.residentTax ?? 0,
    incomeTax: record.incomeTax ?? 0,
    healthInsuranceCompany: record.healthInsuranceCompany ?? 0,
    pensionCompany: record.pensionCompany ?? 0,
    employmentInsuranceCompany: record.employmentInsuranceCompany ?? 0,
    workersCompCompany: record.workersCompCompany ?? 0,
  });


  // Sync edits if record changes
  useEffect(() => {
    const transAllow = employee.benefits?.transportation || 0;
    const houseAllow = employee.benefits?.housing || 0;
    const mealAllow = employee.benefits?.meal || 0;
    const fixedAllowances = transAllow + houseAllow + mealAllow;
    const displayBonus = Math.max(0, record.allowances - fixedAllowances);

    setEditFields({
      baseSalary: record.baseSalary,
      overtimePay: record.overtimePay,
      transportation: transAllow,
      housing: houseAllow,
      meal: mealAllow,
      allowances: 0,
      bonus: displayBonus,
      deductions: record.deductions || 0,
      tax: record.tax || 0,
      insurance: record.insurance || 0,
      paymentDate: record.paymentDate ? new Date(record.paymentDate).toISOString().split('T')[0] : record.month + '-25',
      status: record.status,
      workDays: record.workDays || 22,
      absentDays: record.absentDays || 0,
      overtimeHours: record.overtimeHours || 0,
      healthInsuranceEmployee: record.healthInsuranceEmployee ?? 0,
      nursingCareInsurance: record.nursingCareInsurance ?? 0,
      pensionEmployee: record.pensionEmployee ?? 0,
      employmentInsuranceEmployee: record.employmentInsuranceEmployee ?? 0,
      residentTax: record.residentTax ?? 0,
      incomeTax: record.incomeTax ?? 0,
      healthInsuranceCompany: record.healthInsuranceCompany ?? 0,
      pensionCompany: record.pensionCompany ?? 0,
      employmentInsuranceCompany: record.employmentInsuranceCompany ?? 0,
      workersCompCompany: record.workersCompCompany ?? 0,
    });
  }, [record, employee]);

  const handleRecalculate = () => {
    const calc = calculatePayrollDetails({
      baseSalary: editFields.baseSalary,
      salaryType: employee.salaryType || '月給',
      workDays: editFields.workDays,
      hourlyRate: employee.hourlyRate || 0,
      dailyRate: employee.dailyRate || 0,
      overtimeHours: editFields.overtimeHours,
      benefits: {
        ...employee.benefits,
        transportation: editFields.transportation,
        housing: editFields.housing,
        meal: editFields.meal,
      },
      birthDate: employee.birthDate,
      month: record.month,
      dependents: employee.dependents,
      customAllowances: editFields.transportation + editFields.housing + editFields.meal + editFields.allowances,
      customBonus: editFields.bonus,
      companyRate: companyInfo?.healthInsuranceRate,
      positionAllowance: employee.positionAllowance || 0,
    });

    setEditFields(prev => ({
      ...prev,
      overtimePay: calc.overtimePay,
      tax: calc.incomeTax + calc.residentTax,
      insurance: calc.healthInsuranceEmployee + calc.nursingCareInsurance + calc.pensionEmployee + calc.employmentInsuranceEmployee,
      healthInsuranceEmployee: calc.healthInsuranceEmployee,
      nursingCareInsurance: calc.nursingCareInsurance,
      pensionEmployee: calc.pensionEmployee,
      employmentInsuranceEmployee: calc.employmentInsuranceEmployee,
      residentTax: calc.residentTax,
      incomeTax: calc.incomeTax,
      healthInsuranceCompany: calc.healthInsuranceCompany,
      pensionCompany: calc.pensionCompany,
      employmentInsuranceCompany: calc.employmentInsuranceCompany,
      workersCompCompany: calc.workersCompCompany,
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('payslip-print-area');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${t('payroll.payslipTitle')}_${employee.lastName}_${employee.firstName}_${record.month}.pdf`);
    } catch (e) {
      console.error(e);
      alert(t('payroll.exportPdfFailed'));
    }
  };

  const handleSendEmail = async () => {
    setEmailing(true);
    setEmailStatus('idle');
    try {
      const res = await fetch('/api/payroll/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollRecordId: record.id })
      });
      if (res.ok) {
        setEmailStatus('success');
      } else {
        setEmailStatus('error');
      }
    } catch (e) {
      console.error(e);
      setEmailStatus('error');
    } finally {
      setEmailing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        id: record.id,
        baseSalary: editFields.baseSalary,
        overtimePay: editFields.overtimePay,
        allowances: editFields.transportation + editFields.housing + editFields.meal + editFields.allowances + editFields.bonus,
        deductions: editFields.deductions,
        tax: editFields.incomeTax + editFields.residentTax,
        insurance: editFields.healthInsuranceEmployee + editFields.nursingCareInsurance + editFields.pensionEmployee + editFields.employmentInsuranceEmployee,
        paymentDate: editFields.paymentDate,
        status: editFields.status,
        workDays: editFields.workDays,
        workHours: editFields.workDays * 8,
        overtimeHours: editFields.overtimeHours,
        absentDays: editFields.absentDays,
        // Detailed fields
        healthInsuranceEmployee: editFields.healthInsuranceEmployee,
        nursingCareInsurance: editFields.nursingCareInsurance,
        pensionEmployee: editFields.pensionEmployee,
        employmentInsuranceEmployee: editFields.employmentInsuranceEmployee,
        residentTax: editFields.residentTax,
        incomeTax: editFields.incomeTax,
        healthInsuranceCompany: editFields.healthInsuranceCompany,
        pensionCompany: editFields.pensionCompany,
        employmentInsuranceCompany: editFields.employmentInsuranceCompany,
        workersCompCompany: editFields.workersCompCompany,
      };

      const res = await fetch('/api/payroll', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save edits');
      }

      const updatedRes = await res.json();
      const updated = updatedRes.data || updatedRes;

      if (onSave) {
        onSave({
          ...record,
          baseSalary: updated.baseSalary,
          overtimePay: updated.overtimePay,
          allowances: updated.bonus, // backend bonus maps to allowances
          deductions: updated.deductions,
          tax: updated.tax,
          insurance: updated.insurance,
          netSalary: updated.netSalary,
          status: updated.status,
          paymentDate: updated.paymentDate,
          workDays: updated.workDays !== null && updated.workDays !== undefined ? updated.workDays : record.workDays,
          workHours: updated.workHours !== null && updated.workHours !== undefined ? updated.workHours : record.workHours,
          overtimeHours: updated.overtimeHours !== null && updated.overtimeHours !== undefined ? updated.overtimeHours : record.overtimeHours,
          absentDays: updated.absentDays !== null && updated.absentDays !== undefined ? updated.absentDays : record.absentDays,
          // Recalculated values for client UI consistency
          totalGross: updated.baseSalary + updated.overtimePay + updated.bonus,
          totalDeductions: updated.deductions + updated.tax + updated.insurance,
          healthInsurance: updated.healthInsuranceEmployee + (updated.nursingCareInsurance || 0),
          pension: updated.pensionEmployee,
          employmentInsurance: updated.employmentInsuranceEmployee,
          workersComp: 0,
          // Copy all 11 detailed breakdown columns from DB
          healthInsuranceCompany: updated.healthInsuranceCompany,
          pensionCompany: updated.pensionCompany,
          employmentInsuranceCompany: updated.employmentInsuranceCompany,
          workersCompCompany: updated.workersCompCompany,
          healthInsuranceEmployee: updated.healthInsuranceEmployee,
          pensionEmployee: updated.pensionEmployee,
          employmentInsuranceEmployee: updated.employmentInsuranceEmployee,
          residentTax: updated.residentTax,
          incomeTax: updated.incomeTax,
          nursingCareInsurance: updated.nursingCareInsurance,
          totalCompanyCost: updated.totalCompanyCost,
        });
      }
      setIsEditing(false);
    } catch (e: any) {
      console.error(e);
      alert('Error updating payroll: ' + (e.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  const displayMonth = getDisplayMonth(record.month, locale);

  const formatPayday = (dateStrOrObj: any) => {
    if (!dateStrOrObj) return '-';
    const date = new Date(dateStrOrObj);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  const displayAllowances = record.allowances - displayBonus;

  const currentBase = (isEditing ? editFields.baseSalary : record.baseSalary) || 0;
  const currentOTPay = (isEditing ? editFields.overtimePay : record.overtimePay) || 0;
  const currentAllowances = (isEditing ? (editFields.transportation + editFields.housing + editFields.meal + editFields.allowances) : displayAllowances) || 0;
  const currentBonus = (isEditing ? editFields.bonus : displayBonus) || 0;
  const currentDeductions = (isEditing ? editFields.deductions : record.deductions) || 0;
  const currentTax = isEditing
    ? (editFields.incomeTax + editFields.residentTax)
    : (record.tax || 0);
  const currentInsurance = isEditing
    ? (editFields.healthInsuranceEmployee + editFields.nursingCareInsurance + editFields.pensionEmployee + editFields.employmentInsuranceEmployee)
    : (record.insurance || 0);

  const currentOtherAllow = isEditing ? editFields.allowances : 0;
  const currentTotalGross = currentBase + currentOTPay + currentAllowances + currentBonus;
  const currentTotalDeductions = currentDeductions + currentTax + currentInsurance;
  const currentNetSalary = currentTotalGross - currentTotalDeductions;

  // Company burden computed variables
  const currentCompanyHealthIns = isEditing ? editFields.healthInsuranceCompany : companyHealthIns;
  const currentCompanyPension = isEditing ? editFields.pensionCompany : companyPension;
  const currentCompanyEmpIns = isEditing ? editFields.employmentInsuranceCompany : companyEmpIns;
  const currentCompanyWorkersComp = isEditing ? editFields.workersCompCompany : companyWorkersComp;
  const currentCompanyTotalCost = currentCompanyHealthIns + currentCompanyPension + currentCompanyEmpIns + currentCompanyWorkersComp;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:static" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:w-full print:p-0" onClick={e => e.stopPropagation()}>
        
        {/* Action Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between print:hidden bg-slate-50 rounded-t-2xl">
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={handlePrint} className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              {t('payroll.printBtn')}
            </button>
            <button onClick={handleDownloadPDF} className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {t('payroll.pdfDownloadBtn')}
            </button>
            <button onClick={handleSendEmail} disabled={emailing} className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer">
              {emailing ? (
                <span>{t('payroll.emailSending')}</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {t('payroll.emailSendBtn')}
                </>
              )}
            </button>
            {emailStatus === 'success' && <span className="text-green-600 text-xs flex items-center gap-1 font-semibold">{t('payroll.emailSuccess')}</span>}
            {emailStatus === 'error' && <span className="text-red-600 text-xs flex items-center gap-1 font-semibold">{t('payroll.emailFailed')}</span>}

            {isAdmin && (
              <div className="ml-auto flex gap-2">
                {isEditing ? (
                  <>
                    <button onClick={handleRecalculate} className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors cursor-pointer mr-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      再計算
                    </button>
                    <button onClick={handleSave} disabled={saving} className="px-3.5 py-2 bg-green-650 hover:bg-green-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors cursor-pointer disabled:opacity-50">
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button onClick={() => setIsEditing(false)} className="px-3.5 py-2 bg-white border border-slate-350 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium shadow-sm transition-colors cursor-pointer">
                      キャンセル
                    </button>
                  </>
                ) : (
                  <>
                    {/* Show revert button only for APPROVED, PAID, or PENDING states */}
                    {['APPROVED', 'PAID', 'PENDING'].includes(record.status) ? (
                      <button
                        onClick={async () => {
                          if (confirm('この給与明細を未確定に戻しますか？勤怠や明細の修正が可能になります。(Bạn có muốn hủy chốt bảng lương này không? Sẽ có thể sửa lại chấm công và chi tiết lương.)')) {
                            setSaving(true);
                            try {
                              const res = await fetch('/api/payroll', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: record.id, status: 'CALCULATED' })
                              });
                              if (res.ok) {
                                const json = await res.json();
                                const updated = json.data || json;
                                if (onSave) {
                                  onSave({
                                    ...record,
                                    status: 'CALCULATED'
                                  });
                                }
                                alert('未確定に戻しました。 (Đã hủy chốt bảng lương.)');
                              } else {
                                const err = await res.json();
                                alert('Failed to change status: ' + (err.error || res.statusText));
                              }
                            } catch (e) {
                              console.error(e);
                              alert('Error updating status: ' + (e instanceof Error ? e.message : String(e)));
                            } finally {
                              setSaving(false);
                            }
                          }
                        }}
                        disabled={saving}
                        className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                        未確定に戻す
                      </button>
                    ) : (
                      <button onClick={() => setIsEditing(true)} className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium shadow-sm transition-colors cursor-pointer flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        編集
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer ml-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Payslip Print Sheet */}
        {record.baseSalary !== employee.salary && (
          <div className="mx-8 mt-6 -mb-2 p-4 bg-amber-50 border border-amber-250 text-amber-800 rounded-xl flex items-start gap-2.5 text-xs font-semibold print:hidden shadow-sm">
            <svg className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-bold text-sm text-amber-900">{t('payroll.salaryMismatchAlert')}</p>
              <p className="text-xs text-amber-700 mt-1 font-medium">
                {t('payroll.appliedSalary')}: <span className="font-bold text-slate-800">{formatCurrency(record.baseSalary)}</span> | {t('payroll.profileSalary')}: <span className="font-bold text-slate-800">{formatCurrency(employee.salary)}</span>
              </p>
            </div>
          </div>
        )}
        <div id="payslip-print-area" className="p-8 bg-white print:p-0 print:w-full print:text-black">
          
          {/* Header Block */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold border-b-2 border-slate-800 pb-2 inline-block px-12 tracking-widest text-slate-800 print:text-black print:border-black">{t('payroll.payslipTitle')}</h2>
            <p className="text-lg font-semibold mt-2 text-slate-700 print:text-black">{displayMonth}</p>
          </div>

          {/* Employee & Company Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 border border-slate-300 p-4 rounded-xl print:rounded-none print:border-black">
            <div className="space-y-2 text-sm text-slate-700 print:text-black">
              <div className="flex"><span className="w-28 font-medium text-slate-500 print:text-black">{t('payroll.employeeCode')}:</span><span className="font-bold">{employee.employeeCode}</span></div>
              <div className="flex"><span className="w-28 font-medium text-slate-500 print:text-black">{t('payroll.colName')}:</span><span className="text-base font-bold">{locale === 'vi' || locale === 'en' ? t('payroll.recipientSuffix') + ' ' : ''}{employee.lastName} {employee.firstName}{locale === 'ja' || locale === 'zh' ? ' ' + t('payroll.recipientSuffix') : ''}</span></div>
              <div className="flex"><span className="w-28 font-medium text-slate-500 print:text-black">{t('payroll.deptPos')}:</span><span>{employee.department} / {employee.position}</span></div>
            </div>
            <div className="space-y-2 text-sm text-slate-700 print:text-black md:text-right md:border-l md:border-slate-200 md:pl-6 print:border-black">
              <div className="font-bold text-base">{companyInfo?.name || t('payroll.companyName')}</div>
              <div>{companyInfo?.address || t('payroll.companyAddress')}</div>
              <div className="flex md:justify-end items-center">
                <span className="w-28 font-medium text-slate-500 print:text-black text-left md:text-right mr-2">{t('payroll.payDate')}:</span>
                {isEditing ? (
                  <input 
                    type="date" 
                    value={editFields.paymentDate}
                    onChange={e => setEditFields(prev => ({ ...prev, paymentDate: e.target.value }))}
                    className="px-2 py-1 border border-slate-300 rounded text-sm bg-white text-slate-800"
                  />
                ) : (
                  <span className="font-semibold">{record.paymentDate ? formatPayday(record.paymentDate) : '2026/05/25'}</span>
                )}
              </div>
              {isEditing && (
                <div className="flex md:justify-end items-center mt-2">
                  <span className="w-28 font-medium text-slate-500 mr-2 text-left md:text-right">ステータス:</span>
                  <select
                    value={editFields.status}
                    onChange={e => setEditFields(prev => ({ ...prev, status: e.target.value }))}
                    className="px-2 py-1 border border-slate-300 rounded text-sm bg-white text-slate-800"
                  >
                    <option value="PENDING">未処理</option>
                    <option value="CALCULATED">計算済み</option>
                    <option value="APPROVED">承認済み</option>
                    <option value="PAID">支払い済み</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Attendance Section (勤怠) */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1.5 mb-2 rounded border-l-4 border-slate-700 print:bg-slate-200 print:text-black print:border-black">【{t('payroll.attendanceHeader')}】</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-300 print:border-black">
                <thead>
                  <tr className="bg-slate-50 print:bg-slate-100">
                    <th className="border border-slate-300 p-2 text-center font-medium print:border-black">{t('payroll.workDays')}</th>
                    <th className="border border-slate-300 p-2 text-center font-medium print:border-black">{t('payroll.absentDays')}</th>
                    <th className="border border-slate-300 p-2 text-center font-medium print:border-black">{t('payroll.paidLeaveDays')}</th>
                    <th className="border border-slate-300 p-2 text-center font-medium print:border-black">{t('payroll.prescribedHours')}</th>
                    <th className="border border-slate-300 p-2 text-center font-medium print:border-black">{t('payroll.actualHours')}</th>
                    <th className="border border-slate-300 p-2 text-center font-medium print:border-black">{t('payroll.overtimeHours')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 text-center print:border-black font-semibold">
                      {isEditing ? (
                        <input 
                          type="number" 
                          step="0.5"
                          value={editFields.workDays}
                          onChange={e => setEditFields(prev => ({ ...prev, workDays: parseFloat(e.target.value) || 0 }))}
                          className="w-20 px-1 py-0.5 text-center border border-slate-300 rounded bg-white text-slate-800 font-bold"
                        />
                      ) : (
                        `${record.workDays} ${t('payroll.daysUnit')}`
                      )}
                    </td>
                    <td className="border border-slate-300 p-2 text-center text-red-600 print:text-black print:border-black font-semibold">
                      {isEditing ? (
                        <input 
                          type="number" 
                          step="0.5"
                          value={editFields.absentDays}
                          onChange={e => setEditFields(prev => ({ ...prev, absentDays: parseFloat(e.target.value) || 0 }))}
                          className="w-20 px-1 py-0.5 text-center border border-slate-300 rounded bg-white text-red-650 font-bold"
                        />
                      ) : (
                        `${record.absentDays || 0} ${t('payroll.daysUnit')}`
                      )}
                    </td>
                    <td className="border border-slate-300 p-2.5 text-center font-bold text-sm print:border-black">
                      {22 - (isEditing ? editFields.workDays : record.workDays) - (isEditing ? editFields.absentDays : (record.absentDays || 0)) > 0 
                        ? 22 - (isEditing ? editFields.workDays : record.workDays) - (isEditing ? editFields.absentDays : (record.absentDays || 0)) 
                        : 0} {t('payroll.daysUnit')}
                    </td>
                    <td className="border border-slate-300 p-2.5 text-center print:border-black">
                      {isEditing ? editFields.workDays * 8 : record.workHours} {t('payroll.hoursUnit')}
                    </td>
                    <td className="border border-slate-300 p-2.5 text-center print:border-black">
                      {isEditing ? editFields.workDays * 8 : record.workDays * 8} {t('payroll.hoursUnit')}
                    </td>
                    <td className="border border-slate-300 p-2 text-center text-orange-600 print:text-black print:border-black font-semibold">
                      {isEditing ? (
                        <input 
                          type="number" 
                          step="0.1"
                          value={editFields.overtimeHours}
                          onChange={e => setEditFields(prev => ({ ...prev, overtimeHours: parseFloat(e.target.value) || 0 }))}
                          className="w-20 px-1 py-0.5 text-center border border-slate-300 rounded bg-white text-orange-655 font-bold"
                        />
                      ) : (
                        `${Math.round((record.overtimeHours || 0) * 10) / 10} ${t('payroll.hoursUnit')}`
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Earnings & Deductions Tables Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            
            {/* Earnings (支給) */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 bg-slate-100 bg-opacity-100 px-3 py-1.5 mb-2 rounded border-l-4 border-slate-700 print:bg-slate-200 print:text-black print:border-black">【{t('payroll.earnings')}】</h3>
              <table className="w-full text-xs border-collapse border border-slate-300 print:border-black">
                <thead>
                  <tr className="bg-slate-50 print:bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left font-medium print:border-black">{t('payroll.earningSubject')}</th>
                    <th className="border border-slate-300 p-2 text-right font-medium print:border-black">{t('payroll.colGross')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 print:divide-black">
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">
                      <div className="flex flex-col">
                        <span>{t('payroll.baseSalarySubject')}</span>
                        {!isEditing && record.baseSalary !== employee.salary && (
                          <span className="text-[10px] text-amber-600 font-normal print:hidden">
                            ({t('payroll.profileSalary')}: {formatCurrency(employee.salary)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border border-slate-300 p-2.5 text-right font-semibold print:border-black">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editFields.baseSalary}
                          onChange={e => setEditFields(prev => ({ ...prev, baseSalary: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                        />
                      ) : (
                        <div className="flex flex-col items-end">
                          <span>{formatCurrency(record.baseSalary)}</span>
                          {record.baseSalary !== employee.salary && (
                            <span className="text-[10px] text-amber-650 font-bold block mt-0.5 print:hidden">
                              ⚠️
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">{t('payroll.overtimeSubject')}</td>
                    <td className="border border-slate-300 p-2.5 text-right font-semibold text-green-650 print:text-black print:border-black">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editFields.overtimePay}
                          onChange={e => setEditFields(prev => ({ ...prev, overtimePay: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                        />
                      ) : (
                        `+${formatCurrency(record.overtimePay)}`
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">{t('payroll.transportSubject')}</td>
                    <td className="border border-slate-300 p-2.5 text-right print:border-black">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFields.transportation}
                          onChange={e => setEditFields(prev => ({ ...prev, transportation: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                        />
                      ) : (
                        `+${formatCurrency(transAllow)}`
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-305 p-2.5 text-slate-600 print:text-black print:border-black">{t('payroll.housingSubject')}</td>
                    <td className="border border-slate-300 p-2.5 text-right print:border-black">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFields.housing}
                          onChange={e => setEditFields(prev => ({ ...prev, housing: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                        />
                      ) : (
                        `+${formatCurrency(houseAllow)}`
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">{t('payroll.mealSubject')}</td>
                    <td className="border border-slate-300 p-2.5 text-right print:border-black">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFields.meal}
                          onChange={e => setEditFields(prev => ({ ...prev, meal: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                        />
                      ) : (
                        `+${formatCurrency(mealAllow)}`
                      )}
                    </td>
                  </tr>
                  
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">その他手当・調整等 (Phụ cấp khác)</td>
                    <td className="border border-slate-300 p-2.5 text-right print:border-black">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editFields.allowances}
                          onChange={e => setEditFields(prev => ({ ...prev, allowances: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                        />
                      ) : (
                        currentOtherAllow > 0 ? `+${formatCurrency(currentOtherAllow)}` : '-'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">賞与 (Thưởng)</td>
                    <td className="border border-slate-300 p-2.5 text-right print:border-black">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editFields.bonus}
                          onChange={e => setEditFields(prev => ({ ...prev, bonus: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                        />
                      ) : (
                        currentBonus > 0 ? `+${formatCurrency(currentBonus)}` : '-'
                      )}
                    </td>
                  </tr>

                  <tr className="bg-blue-50/50 font-bold print:bg-slate-100">
                    <td className="border border-slate-300 p-3 text-slate-800 print:text-black print:border-black">{t('payroll.totalEarnings')}</td>
                    <td className="border border-slate-300 p-3 text-right text-blue-700 print:text-black print:border-black">{formatCurrency(currentTotalGross)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions (控除) */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 bg-slate-100 bg-opacity-100 px-3 py-1.5 mb-2 rounded border-l-4 border-slate-700 print:bg-slate-200 print:text-black print:border-black">【{t('payroll.deductions')}】</h3>
              <table className="w-full text-xs border-collapse border border-slate-300 print:border-black">
                <thead>
                  <tr className="bg-slate-50 print:bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left font-medium print:border-black">{t('payroll.deductionSubject')}</th>
                    <th className="border border-slate-300 p-2 text-right font-medium print:border-black">{t('payroll.colDeduction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 print:divide-black">
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">{t('payroll.healthInsSubject')}</td>
                    <td className="border border-slate-300 p-2.5 text-right font-semibold text-red-500 print:text-black print:border-black">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFields.healthInsuranceEmployee}
                          onChange={e => setEditFields(prev => ({ ...prev, healthInsuranceEmployee: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                        />
                      ) : (
                        `-${formatCurrency(record.healthInsuranceEmployee || 0)}`
                      )}
                    </td>
                  </tr>
                  {((record.nursingCareInsurance ?? 0) > 0 || isEditing) && (
                    <tr>
                      <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">介護保険料 (BH Chăm sóc dài hạn)</td>
                      <td className="border border-slate-300 p-2.5 text-right font-semibold text-red-500 print:text-black print:border-black">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFields.nursingCareInsurance}
                            onChange={e => setEditFields(prev => ({ ...prev, nursingCareInsurance: parseFloat(e.target.value) || 0 }))}
                            className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                          />
                        ) : (
                          `-${formatCurrency(record.nursingCareInsurance || 0)}`
                        )}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">{t('payroll.pensionSubject')}</td>
                    <td className="border border-slate-300 p-2.5 text-right font-semibold text-red-500 print:text-black print:border-black">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFields.pensionEmployee}
                          onChange={e => setEditFields(prev => ({ ...prev, pensionEmployee: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                        />
                      ) : (
                        `-${formatCurrency(record.pensionEmployee || 0)}`
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">{t('payroll.employmentInsSubject')}</td>
                    <td className="border border-slate-300 p-2.5 text-right font-semibold text-red-500 print:text-black print:border-black">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFields.employmentInsuranceEmployee}
                          onChange={e => setEditFields(prev => ({ ...prev, employmentInsuranceEmployee: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                        />
                      ) : (
                        `-${formatCurrency(record.employmentInsuranceEmployee || 0)}`
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">{t('payroll.workersCompSubject')}</td>
                    <td className="border border-slate-300 p-2.5 text-right font-semibold text-red-500 print:text-black print:border-black">
                      -{formatCurrency(0)}
                    </td>
                  </tr>

                  <tr>
                    <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">欠勤控除・その他控除</td>
                    <td className="border border-slate-300 p-2.5 text-right font-semibold text-red-505 print:text-black print:border-black">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editFields.deductions}
                          onChange={e => setEditFields(prev => ({ ...prev, deductions: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                        />
                      ) : (
                        `-${formatCurrency(currentDeductions)}`
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">{t('payroll.incomeTaxSubject')}</td>
                    <td className="border border-slate-300 p-2.5 text-right font-semibold text-red-505 print:text-black print:border-black">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editFields.incomeTax}
                          onChange={e => setEditFields(prev => ({ ...prev, incomeTax: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                        />
                      ) : (
                        `-${formatCurrency(record.incomeTax || 0)}`
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">{t('payroll.residentTaxSubject')}</td>
                    <td className="border border-slate-300 p-2.5 text-right font-semibold text-red-500 print:text-black print:border-black">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFields.residentTax}
                          onChange={e => setEditFields(prev => ({ ...prev, residentTax: parseFloat(e.target.value) || 0 }))}
                          className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                        />
                      ) : (
                        `-${formatCurrency(record.residentTax || 0)}`
                      )}
                    </td>
                  </tr>
                  <tr className="bg-red-50/50 font-bold print:bg-slate-100">
                    <td className="border border-slate-300 p-3 text-slate-800 print:text-black print:border-black">{t('payroll.totalDeductions')}</td>
                    <td className="border border-slate-300 p-3 text-right text-red-700 print:text-black print:border-black">-{formatCurrency(currentTotalDeductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 【会社負担分】 */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="text-sm font-semibold text-slate-700 mb-2">【会社負担分】</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">健康保険 会社負担</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editFields.healthInsuranceCompany}
                      onChange={e => setEditFields(prev => ({ ...prev, healthInsuranceCompany: parseFloat(e.target.value) || 0 }))}
                      className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                    />
                  ) : (
                    <span>¥{companyHealthIns.toLocaleString()}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">厚生年金 会社負担</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editFields.pensionCompany}
                      onChange={e => setEditFields(prev => ({ ...prev, pensionCompany: parseFloat(e.target.value) || 0 }))}
                      className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                    />
                  ) : (
                    <span>¥{companyPension.toLocaleString()}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">雇用保険 会社負担</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editFields.employmentInsuranceCompany}
                      onChange={e => setEditFields(prev => ({ ...prev, employmentInsuranceCompany: parseFloat(e.target.value) || 0 }))}
                      className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                    />
                  ) : (
                    <span>¥{companyEmpIns.toLocaleString()}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">労災保険 会社負担</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editFields.workersCompCompany}
                      onChange={e => setEditFields(prev => ({ ...prev, workersCompCompany: parseFloat(e.target.value) || 0 }))}
                      className="w-32 px-2 py-1 text-right border border-slate-300 rounded text-sm bg-white text-slate-850"
                    />
                  ) : (
                    <span>¥{companyWorkersComp.toLocaleString()}</span>
                  )}
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold text-blue-700">
                  <span>総額 会社負担</span>
                  <span>¥{currentCompanyTotalCost.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 【従業員負担分】 */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="text-sm font-semibold text-slate-700 mb-2">【従業員負担分】</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">健康保険 従業員負担</span><span>¥{empHealthIns.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">厚生年金 従業員負担</span><span>¥{empPension.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">雇用保険 従業員負担</span><span>¥{empEmpIns.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">介護保険</span><span>¥{nursingCare.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">住民税</span><span>¥{resTax.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">所得税</span><span>¥{incTax.toLocaleString()}</span></div>
              </div>
            </div>

          </div>

          {/* Net pay summary box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:bg-white print:border-black print:rounded-none">
            <div>
              <p className="text-xs text-slate-500 print:text-black font-bold uppercase tracking-wider">{t('payroll.grossPayMinusDeductions')}</p>
              <p className="text-xs text-slate-400 print:text-black">Gross Pay minus Deductions</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-blue-600 print:text-black tracking-wide">{formatCurrency(currentNetSalary)}</span>
            </div>
          </div>

          {/* Employer Cost Section (Only visible to Admin) */}
          {isAdmin && (
            <div className="mt-6 border border-slate-200 rounded-xl p-5 bg-slate-50/80 space-y-3 print:hidden">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                会社負担分 (Khoản Công ty chi trả thực tế)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>健康保険 会社負担</span>
                    <span className="font-semibold">{formatCurrency(currentCompanyHealthIns)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>厚生年金 会社負担</span>
                    <span className="font-semibold">{formatCurrency(currentCompanyPension)}</span>
                  </div>
                </div>
                <div className="space-y-2 md:border-l md:border-slate-200 md:pl-4">
                  <div className="flex justify-between text-slate-600">
                    <span>雇用保険 会社負担</span>
                    <span className="font-semibold">{formatCurrency(currentCompanyEmpIns)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>労災保険 会社負担</span>
                    <span className="font-semibold">{formatCurrency(currentCompanyWorkersComp)}</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700">法定福利費 会社負担合計 (Tổng BHXH doanh nghiệp trả)</span>
                  <p className="text-[10px] text-slate-400">Total Employer Social Insurance Burden</p>
                </div>
                <span className="text-sm font-bold text-slate-800">
                  +{formatCurrency(currentCompanyTotalCost)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                <div>
                  <span className="text-xs font-extrabold text-blue-800">総人件費 (Tổng chi phí nhân sự thực tế của Công ty)</span>
                  <p className="text-[10px] text-blue-500">Gross Salary + Employer Burden</p>
                </div>
                <span className="text-base font-black text-blue-700">
                  {formatCurrency(currentTotalGross + currentCompanyTotalCost)}
                </span>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}


interface PayrollSettings {
  cutoffDay: string;
  payday: string;
}

export default function PayrollClient({ 
  employees, 
  initialRecords, 
  payrollSettings, 
  isEmployeeMode = false,
  companyInfo
}: {
  employees: Employee[]; 
  initialRecords: PayrollRecord[]; 
  payrollSettings?: PayrollSettings; 
  isEmployeeMode?: boolean;
  companyInfo?: { name: string; address: string; healthInsuranceRate?: number | null };
}) {
  const { t, locale } = useI18n();
  const getStatusLabel = (s: string) =>
    s === 'PAID' ? t('payroll.statusPaid') :
    s === 'APPROVED' ? t('payroll.statusApproved') :
    s === 'CALCULATED' ? t('payroll.statusCalculated') :
    s === 'PENDING' ? t('payroll.statusPending') : s;
  const [records, setRecords] = useState(initialRecords);
  const [viewType, setViewType] = useState<'month' | 'employee'>('month');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(() => employees[0]?.id || '');
  const [empCodeInput, setEmpCodeInput] = useState(() => employees[0]?.employeeCode || '');
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);

  const targetMonthStr = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth]);

  const workingMonthStr = useMemo(() => {
    const [year, month] = targetMonthStr.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  }, [targetMonthStr]);

  const startMonth = useMemo(() => {
    return targetMonthStr;
  }, [targetMonthStr]);

  const endMonth = useMemo(() => {
    return targetMonthStr;
  }, [targetMonthStr]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => currentYear - 4 + i);
  }, []);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const allPayrollColumns = [
    { key: 'name', label: t('payroll.colName') },
    { key: 'salaryType', label: t('payroll.contractSalaryType') },
    { key: 'baseSalary', label: t('payroll.baseSalarySubject') },
    { key: 'overtimePay', label: t('payroll.overtimeHours') },
    { key: 'allowances', label: t('payroll.colAllowance') },
    { key: 'bonus', label: '賞与' },
    { key: 'deductions', label: t('payroll.colDeduction') },
    { key: 'netSalary', label: t('payroll.colNet') },
    { key: 'companyCost', label: '会社負担' },
    { key: 'status', label: t('payroll.colStatus') },
  ];

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('payroll_visible_columns');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return {
      name: true, salaryType: true, baseSalary: true, overtimePay: true,
      allowances: true, bonus: true, deductions: true, netSalary: true,
      companyCost: true, status: true,
    };
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('payroll_visible_columns', JSON.stringify(updated));
      return updated;
    });
  };

  const activeColumns = allPayrollColumns.filter(c => visibleColumns[c.key]);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('payroll_column_widths');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return {
      name: 140,
      salaryType: 90,
      baseSalary: 100,
      overtimePay: 90,
      allowances: 95,
      bonus: 90,
      deductions: 95,
      netSalary: 105,
      companyCost: 95,
      status: 85,
    };
  });

  const [payrollLayoutView, setPayrollLayoutView] = useState<'table' | 'card'>('table');
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  const handleResizeMouseDown = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[colKey] || 100;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(50, startWidth + deltaX);
      setColumnWidths(prev => {
        const updated = { ...prev, [colKey]: newWidth };
        localStorage.setItem('payroll_column_widths', JSON.stringify(updated));
        return updated;
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const totalTableWidth = activeColumns.reduce((sum, col) => sum + (columnWidths[col.key] || 100), 0) + 110;

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [selectedAttendanceCheck, setSelectedAttendanceCheck] = useState<{ employeeId: string; month: string; employeeName: string } | null>(null);

  const handleUpdateStatus = async (recordId: string, status: string) => {
    try {
      const res = await fetch('/api/payroll', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId, status })
      });
      if (!res.ok) {
        throw new Error('Failed to update status');
      }
      const updatedRes = await res.json();
      const updated = updatedRes.data || updatedRes;
      
      setRecords(prev => prev.map(r => r.id === recordId ? { 
        ...r, 
        status: updated.status, 
        paymentDate: updated.paymentDate 
      } : r));
    } catch (e: any) {
      alert('Error updating status: ' + e.message);
    }
  };

  const handleBatchUpdateStatus = async (status: string) => {
    const targets = monthRecords.filter(r => {
      if (status === 'APPROVED') {
        return r.status === 'PENDING' || r.status === 'CALCULATED';
      }
      if (status === 'PAID') {
        return r.status === 'APPROVED';
      }
      return false;
    });

    if (targets.length === 0) {
      alert('対象となるデータがありません。');
      return;
    }

    const confirmMsg = status === 'APPROVED' 
      ? `選択された月内の ${targets.length} 件の給与明細を一括で「承認」しますか？`
      : `選択された月内の ${targets.length} 件の給与明細を一括で「支払い済み」にしますか？`;

    if (!confirm(confirmMsg)) return;

    try {
      const ids = targets.map(t => t.id);
      const res = await fetch('/api/payroll', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status })
      });
      if (!res.ok) {
        throw new Error('Failed to update batch status');
      }
      
      const today = new Date();
      setRecords(prev => prev.map(r => ids.includes(r.id) ? { 
        ...r, 
        status, 
        paymentDate: status === 'PAID' ? today.toISOString() : r.paymentDate 
      } : r));
      
      alert(status === 'APPROVED' ? '一括承認が完了しました。' : '一括支払処理が完了しました。');
    } catch (e: any) {
      alert('Error batch updating status: ' + e.message);
    }
  };

  const handleColumnFilter = (key: string, values: string[]) => {
    setColumnFilters(prev => ({ ...prev, [key]: values }));
    setCurrentPage(1);
  };

  // Auto-calculate payroll
  const handleCalculate = async () => {
    setCalculating(true);
    try {
      // Fetch actual attendance records for the selected workingMonthStr
      const res = await fetch(`/api/attendance?month=${workingMonthStr}`);
      if (!res.ok) {
        throw new Error('Failed to fetch attendance data');
      }
      const attendanceData = await res.json();
      const attendanceList = attendanceData.data || attendanceData || [];

      const newRecordsData = employees
        .filter(e => e.salary > 0 || e.hourlyRate > 0 || e.dailyRate > 0)
        .map(emp => {
          // Filter attendance for this specific employee
          const empAttendance = Array.isArray(attendanceList)
            ? attendanceList.filter((a: any) => a.employeeId === emp.id)
            : [];

          // Compute actual work days (PRESENT or LATE)
          const workDays = empAttendance.length > 0
            ? empAttendance.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length
            : 22; // default fallback if no attendance recorded

          const absentDays = empAttendance.length > 0
            ? empAttendance.filter((a: any) => a.status === 'ABSENT').length
            : 0;

          // Compute actual overtime hours
          const rawOvertimeHours = empAttendance.length > 0
            ? empAttendance.reduce((sum: number, a: any) => sum + (a.overtimeHours || 0), 0)
            : 0;
          const overtimeHours = Math.round(rawOvertimeHours * 10) / 10;

          const payrollDetails = calculatePayrollDetails({
            baseSalary: emp.salary || 0,
            salaryType: emp.salaryType || '月給',
            workDays,
            hourlyRate: emp.hourlyRate || 0,
            dailyRate: emp.dailyRate || 0,
            overtimeHours,
            benefits: emp.benefits,
            birthDate: emp.birthDate,
            month: endMonth,
            dependents: emp.dependents,
            companyRate: companyInfo?.healthInsuranceRate,
            positionAllowance: emp.positionAllowance || 0,
          });

          return {
            employeeId: emp.id,
            month: endMonth,
            baseSalary: payrollDetails.baseSalary,
            overtimePay: payrollDetails.overtimePay,
            allowances: payrollDetails.allowances, // maps to bonus on save
            deductions: 0,
            tax: payrollDetails.incomeTax + payrollDetails.residentTax,
            insurance: payrollDetails.healthInsurance + payrollDetails.pension + payrollDetails.employmentInsurance,
            netSalary: payrollDetails.netSalary,
            paymentDate: `${endMonth}-25`,
            status: 'APPROVED' as const, // Automatically approve calculations when calculated and saved
            // Extra client-only fields to match state type:
            healthInsurance: payrollDetails.healthInsurance,
            pension: payrollDetails.pension,
            employmentInsurance: payrollDetails.employmentInsurance,
            workersComp: payrollDetails.workersComp,
            incomeTax: payrollDetails.incomeTax,
            residentTax: payrollDetails.residentTax,
            totalGross: payrollDetails.totalGross,
            totalDeductions: payrollDetails.totalDeductions,
            salaryType: emp.salaryType,
            workDays,
            workHours: payrollDetails.workHours,
            overtimeHours,
            absentDays,
          };
        });

      // Batch save calculated records to database
      const saveRes = await fetch('/api/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRecordsData),
      });

      if (!saveRes.ok) {
        throw new Error('Failed to save payroll calculations to database');
      }

      const savedData = await saveRes.json();
      const savedList = Array.isArray(savedData.data || savedData) ? (savedData.data || savedData) : [];

      // Construct final records mapping for UI state using the saved database IDs
      const finalRecords: PayrollRecord[] = newRecordsData.map(record => {
        const matchingDb = savedList.find((s: any) => s.employeeId === record.employeeId && s.month === record.month);
        return {
          ...record,
          id: matchingDb?.id || `payroll-${record.employeeId}-${record.month}`,
          status: matchingDb?.status || record.status,
          ...(matchingDb || {}),
          allowances: (matchingDb && matchingDb.bonus !== undefined && matchingDb.bonus !== null) ? matchingDb.bonus : record.allowances,
          healthInsurance: matchingDb ? (matchingDb.healthInsuranceEmployee + (matchingDb.nursingCareInsurance || 0)) : record.healthInsurance,
          pension: matchingDb ? matchingDb.pensionEmployee : record.pension,
          employmentInsurance: matchingDb ? matchingDb.employmentInsuranceEmployee : record.employmentInsurance,
          workersComp: 0,
          incomeTax: matchingDb ? matchingDb.incomeTax : record.incomeTax,
          residentTax: matchingDb ? matchingDb.residentTax : record.residentTax,
        };
      });

      setRecords(prev => {
        const filtered = prev.filter(r => r.month !== endMonth);
        return [...finalRecords, ...filtered];
      });
    } catch (err: any) {
      console.error(err);
      alert('Error calculating payroll: ' + (err.message || String(err)));
    } finally {
      setCalculating(false);
    }
  };

  const monthRecords = useMemo(() => {
    if (isEmployeeMode) {
      return records.filter(r => r.month >= startMonth && r.month <= endMonth);
    }
    if (viewType === 'employee') {
      return records.filter(r => r.employeeId === selectedEmployeeId && r.month >= startMonth && r.month <= endMonth);
    }
    return records.filter(r => r.month >= startMonth && r.month <= endMonth);
  }, [records, startMonth, endMonth, isEmployeeMode, viewType, selectedEmployeeId]);

  const filtered = useMemo(() => {
    return monthRecords.filter(r => {
      const emp = employees.find(e => e.id === r.employeeId);
      const name = emp ? `${emp.lastName} ${emp.firstName}` : '';
      const matchSearch = viewType === 'employee' || search === '' || name.includes(search);
      const cf = columnFilters;
      const matchName = viewType === 'employee' || !cf.name?.length || cf.name.includes(name);
      const matchStatus = !cf.status?.length || cf.status.includes(r.status);
      const matchType = !cf.salaryType?.length || cf.salaryType.includes(r.salaryType);
      return matchSearch && matchName && matchStatus && matchType;
    });
  }, [monthRecords, employees, search, columnFilters, viewType]);

  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const totalGross = monthRecords.reduce((s, r) => s + r.totalGross, 0);
    const totalDeductions = monthRecords.reduce((s, r) => s + r.totalDeductions, 0);
    const totalNet = monthRecords.reduce((s, r) => s + r.netSalary, 0);
    const totalOT = Math.round(monthRecords.reduce((s, r) => s + r.overtimeHours, 0) * 10) / 10;
    const totalOTPay = monthRecords.reduce((s, r) => s + r.overtimePay, 0);
    const byType = { '月給': 0, '日給': 0, '時給': 0 };
    monthRecords.forEach(r => { byType[r.salaryType as keyof typeof byType] = (byType[r.salaryType as keyof typeof byType] || 0) + 1; });
    return { totalGross, totalDeductions, totalNet, totalOT, totalOTPay, count: monthRecords.length, byType };
  }, [monthRecords]);

  const nameOptions = useMemo(() => {
    return employees.map(e => ({ value: `${e.lastName} ${e.firstName}`, label: `${e.lastName} ${e.firstName}` }));
  }, [employees]);

  const activeFilterCount = Object.values(columnFilters).filter(v => v.length > 0).length;

  return (
    <>
      {/* View Type Selection & Filters */}
      {!isEmployeeMode && (
        <div className="space-y-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700 shadow-inner w-fit">
            <button 
              onClick={() => { setViewType('month'); setCurrentPage(1); }} 
              className={`px-5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${viewType === 'month' ? 'bg-white dark:bg-slate-700 shadow text-blue-650 dark:text-blue-400 font-black' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {t('payroll.viewByMonth')}
            </button>
            <button 
              onClick={() => { setViewType('employee'); setCurrentPage(1); }} 
              className={`px-5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${viewType === 'employee' ? 'bg-white dark:bg-slate-700 shadow text-blue-650 dark:text-blue-400 font-black' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {t('payroll.viewByEmployee')}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 shadow-sm rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <select 
                  value={selectedYear} 
                  onChange={e => { setSelectedYear(parseInt(e.target.value)); setCurrentPage(1); }} 
                  className="px-3.5 py-2 border border-slate-200 bg-white dark:bg-slate-850 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer text-slate-800"
                >
                  {years.map(y => <option key={y} value={y}>{locale === 'ja' || locale === 'zh' ? `${y}年` : `Year ${y}`}</option>)}
                </select>
                
                {/* Tabbed Capsule for months */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-850 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 max-w-full overflow-x-auto text-slate-850">
                  <button 
                    onClick={() => { setSelectedMonth(prev => prev === 1 ? 12 : prev - 1); setCurrentPage(1); }} 
                    className="px-2 py-1.5 text-slate-450 hover:text-slate-800 dark:hover:text-slate-200 font-bold"
                  >
                    &lt;
                  </button>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <button 
                      key={m} 
                      onClick={() => { setSelectedMonth(m); setCurrentPage(1); }} 
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${selectedMonth === m ? 'bg-white dark:bg-slate-800 text-blue-650 dark:text-blue-455 shadow-sm font-black' : 'text-slate-600 hover:text-slate-950 dark:hover:text-white'}`}
                    >
                      {locale === 'ja' || locale === 'zh' ? `${m}月` : `Month ${m}`}
                    </button>
                  ))}
                  <button 
                    onClick={() => { setSelectedMonth(prev => prev === 12 ? 1 : prev + 1); setCurrentPage(1); }} 
                    className="px-2 py-1.5 text-slate-450 hover:text-slate-800 dark:hover:text-slate-200 font-bold"
                  >
                    &gt;
                  </button>
                </div>
              </div>

              {viewType === 'month' && (
                <div className="flex gap-2 flex-wrap items-center">
                  <button onClick={handleCalculate} disabled={calculating}
                    className="px-4 py-2 bg-blue-650 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-sm">
                    {calculating ? t('payroll.calculating') : t('payroll.calculateBtn')}
                  </button>
                  <button onClick={() => handleBatchUpdateStatus('APPROVED')}
                    className="px-4 py-2 bg-yellow-550 text-white rounded-lg hover:bg-yellow-600 transition-colors text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    全承認 (Approve All)
                  </button>
                  <button onClick={() => handleBatchUpdateStatus('PAID')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    全支払 (Pay All)
                  </button>
                </div>
              )}
            </div>

            {viewType === 'employee' && (
              <div className="flex flex-wrap gap-4 items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex gap-3 items-center">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">{t('payroll.employeeCode')}:</label>
                    <input 
                      type="text" 
                      placeholder="例: NV001" 
                      value={empCodeInput} 
                      onChange={e => {
                        const val = e.target.value;
                        setEmpCodeInput(val);
                        const matched = employees.find(emp => emp.employeeCode.toLowerCase() === val.trim().toLowerCase());
                        if (matched) {
                           setSelectedEmployeeId(matched.id);
                           setCurrentPage(1);
                        }
                      }}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-32 font-mono font-bold uppercase"
                    />
                  </div>
                  <div className="flex gap-3 items-center">
                    <label className="text-sm font-medium text-slate-650 dark:text-slate-400 shrink-0">{t('payroll.orSelectName')}:</label>
                    <select 
                      value={selectedEmployeeId} 
                      onChange={e => {
                        const id = e.target.value;
                        setSelectedEmployeeId(id);
                        const emp = employees.find(emp => emp.id === id);
                        if (emp) {
                          setEmpCodeInput(emp.employeeCode);
                        }
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer min-w-[180px] text-slate-850"
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.lastName} {emp.firstName} ({emp.employeeCode})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Employee Profile Card (View by Employee Mode & Employee Personal Mode) */}
      {(isEmployeeMode || viewType === 'employee') && selectedEmployee && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 animate-fadeIn">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-650 dark:text-blue-400 rounded-full flex items-center justify-center text-xl font-bold border border-blue-200 dark:border-blue-800 shrink-0 shadow-inner">
            {selectedEmployee.lastName.charAt(0)}
          </div>
          
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">{t('payroll.employeeName')}</span>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 text-base">
                {selectedEmployee.lastName} {selectedEmployee.firstName}
              </p>
              <p className="text-xs text-slate-400 font-medium">
                {selectedEmployee.lastNameKana} {selectedEmployee.firstNameKana}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">{t('payroll.deptPos')}</span>
              <p className="font-bold text-slate-700 dark:text-slate-350">
                {selectedEmployee.department}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {selectedEmployee.position}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">{t('payroll.contractSalaryType')}</span>
              <p className="font-bold text-slate-700 dark:text-slate-350">
                {selectedEmployee.contractType} <span className="text-xs font-normal">({selectedEmployee.salaryType})</span>
              </p>
              <p className="text-xs text-slate-500 font-mono font-medium">
                {t('payroll.baseSalaryLabel')}: {formatCurrency(selectedEmployee.salary)} / {locale === 'ja' ? '月' : locale === 'vi' ? 'tháng' : locale === 'en' ? 'mo' : locale === 'zh' ? '月' : 'เดือน'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">{t('payroll.employeeCode')}</span>
              <p className="font-mono font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg w-fit text-sm border border-slate-200/40 dark:border-slate-750">
                {selectedEmployee.employeeCode}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Schedule */}
      {payrollSettings && <PayrollSchedule cutoffDay={payrollSettings.cutoffDay} payday={payrollSettings.payday} year={selectedYear} month={selectedMonth} />}

      {/* Stats */}
      {!isEmployeeMode && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: t('payroll.totalPayout'), value: formatCurrency(stats.totalGross), color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: t('payroll.taxDeduction'), value: formatCurrency(stats.totalDeductions), color: 'text-red-600', bg: 'bg-red-50' },
            { label: t('payroll.netPayout'), value: formatCurrency(stats.totalNet), color: 'text-green-600', bg: 'bg-green-50' },
            { label: t('payroll.overtimeHours'), value: `${stats.totalOT}${t('payroll.hoursUnit')}`, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: t('payroll.overtimeSubject'), value: formatCurrency(stats.totalOTPay), color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: t('payroll.totalEmployees'), value: `${stats.count}${locale === 'ja' ? '名' : locale === 'vi' ? ' người' : locale === 'en' ? ' staff' : locale === 'zh' ? ' 人' : ' คน'}`, color: 'text-slate-600', bg: 'bg-slate-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {isEmployeeMode && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 shadow-sm rounded-2xl p-4 flex items-center gap-3 w-fit mb-4 text-slate-850">
          <select 
            value={selectedYear} 
            onChange={e => { setSelectedYear(parseInt(e.target.value)); setCurrentPage(1); }} 
            className="px-3.5 py-2 border border-slate-200 bg-white dark:bg-slate-850 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            {years.map(y => <option key={y} value={y}>{locale === 'ja' || locale === 'zh' ? `${y}年` : `Year ${y}`}</option>)}
          </select>
          
          {/* Tabbed Capsule for months */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-850 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 max-w-full overflow-x-auto">
            <button 
              onClick={() => { setSelectedMonth(prev => prev === 1 ? 12 : prev - 1); setCurrentPage(1); }} 
              className="px-2 py-1.5 text-slate-450 hover:text-slate-800 dark:hover:text-slate-200 font-bold"
            >
              &lt;
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <button 
                key={m} 
                onClick={() => { setSelectedMonth(m); setCurrentPage(1); }} 
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${selectedMonth === m ? 'bg-white dark:bg-slate-800 text-blue-650 dark:text-blue-455 shadow-sm font-black' : 'text-slate-600 hover:text-slate-950 dark:hover:text-white'}`}
              >
                {locale === 'ja' || locale === 'zh' ? `${m}月` : `Month ${m}`}
              </button>
            ))}
            <button 
              onClick={() => { setSelectedMonth(prev => prev === 12 ? 1 : prev + 1); setCurrentPage(1); }} 
              className="px-2 py-1.5 text-slate-450 hover:text-slate-800 dark:hover:text-slate-200 font-bold"
            >
              &gt;
            </button>
          </div>
        </div>
      )}

      {/* Salary Type Distribution */}
      {!isEmployeeMode && (
        <div className="flex gap-3">
          {Object.entries(stats.byType).map(([type, count]) => {
            const translatedType = type === '月給' ? t('payroll.typeMonthly') : type === '日給' ? t('payroll.typeDaily') : t('payroll.typeHourly');
            return (
              <div key={type} className={`px-4 py-2 rounded-lg ${salaryTypeColor(type)}`}>
                <span className="text-sm font-medium">{translatedType}: {count}{locale === 'ja' ? '名' : locale === 'vi' ? ' người' : locale === 'en' ? ' staff' : locale === 'zh' ? ' 人' : ' คน'}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <Card title={
        isEmployeeMode 
          ? t('payroll.payslipHistory') 
          : viewType === 'employee'
            ? `${employees.find(e => e.id === selectedEmployeeId)?.lastName} ${employees.find(e => e.id === selectedEmployeeId)?.firstName} ${t('payroll.employeePayslipHistory')}`
            : startMonth === endMonth
              ? `${getDisplayMonth(endMonth, locale)} ${t('payroll.monthPayslipList')}`
              : `${getDisplayMonth(startMonth, locale)} 〜 ${getDisplayMonth(endMonth, locale)} ${t('payroll.monthPayslipList')}`
      }>
        {!isEmployeeMode && (
          <div className="flex flex-col sm:flex-row gap-3 mb-5 justify-between items-center">
            {viewType === 'month' ? (
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" placeholder={t('payroll.searchPlaceholder')} value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            ) : <div />}
            {activeFilterCount > 0 && viewType === 'month' && (
              <button onClick={() => { setColumnFilters({}); setCurrentPage(1); }}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200">{t('payroll.filterClear')} ({activeFilterCount})</button>
            )}
            
            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              {/* Column Settings */}
              <div className="relative">
                <button
                  onClick={() => setShowColumnSettings(!showColumnSettings)}
                  className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all cursor-pointer bg-white"
                  title="Cấu hình hiển thị cột"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
                {showColumnSettings && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200/50 rounded-3xl shadow-premium z-30 p-4 min-w-[200px] animate-fadeIn text-slate-800">
                    <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider pb-1.5 border-b">{t('common.selectColumns')}</p>
                    <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                      {allPayrollColumns.map(col => (
                        <label key={col.key} className="flex items-center gap-2.5 py-1.5 px-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                          <input type="checkbox" checked={visibleColumns[col.key]} onChange={() => toggleColumn(col.key)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
                          <span className="text-xs font-semibold text-slate-700">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Layout Mode Toggles */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setPayrollLayoutView('table')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${payrollLayoutView === 'table' ? 'bg-white text-blue-605 shadow-sm font-black' : 'text-slate-500 hover:text-slate-805'}`}
                  title="Dạng bảng"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setPayrollLayoutView('card')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${payrollLayoutView === 'card' ? 'bg-white text-blue-605 shadow-sm font-black' : 'text-slate-500 hover:text-slate-850'}`}
                  title="Dạng thẻ"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                  </svg>
                </button>
              </div>

              <ExportButtons
                data={filtered.map(r => {
                  const emp = employees.find(e => e.id === r.employeeId);
                  const translatedSalaryType = r.salaryType === '月給' ? t('payroll.typeMonthly') : r.salaryType === '日給' ? t('payroll.typeDaily') : t('payroll.typeHourly');
                  const getStatusLabel = (s: string) =>
                    s === 'PAID' ? t('payroll.statusPaid') :
                    s === 'APPROVED' ? t('payroll.statusApproved') :
                    s === 'CALCULATED' ? t('payroll.statusCalculated') :
                    s === 'PENDING' ? t('payroll.statusPending') : s;

                  const transAllow = emp?.benefits?.transportation || 0;
                  const houseAllow = emp?.benefits?.housing || 0;
                  const mealAllow = emp?.benefits?.meal || 0;
                  const fixedAllowances = transAllow + houseAllow + mealAllow;
                  const displayBonus = Math.max(0, r.allowances - fixedAllowances);
                  const displayAllowances = r.allowances - displayBonus;

                  return {
                    name: emp ? `${emp.lastName} ${emp.firstName}` : '',
                    month: getDisplayMonth(r.month, locale),
                    salaryType: translatedSalaryType,
                    baseSalary: formatCurrency(r.baseSalary), 
                    overtimePay: formatCurrency(r.overtimePay),
                    allowances: formatCurrency(displayAllowances),
                    bonus: formatCurrency(displayBonus),
                    totalGross: formatCurrency(r.totalGross),
                    deductions: formatCurrency(r.totalDeductions), 
                    netSalary: formatCurrency(r.netSalary),
                    status: getStatusLabel(r.status),
                  };
                })}
                columns={viewType === 'employee' ? [
                  { header: t('payroll.processMonth'), key: 'month' }, { header: t('payroll.contractSalaryType'), key: 'salaryType' },
                  { header: t('payroll.baseSalarySubject'), key: 'baseSalary' }, { header: t('payroll.overtimeHours'), key: 'overtimePay' },
                  { header: t('payroll.colAllowance'), key: 'allowances' }, { header: '賞与', key: 'bonus' }, { header: t('payroll.totalEarnings'), key: 'totalGross' },
                  { header: t('payroll.deductions'), key: 'deductions' }, { header: t('payroll.colNet'), key: 'netSalary' },
                  { header: t('payroll.colStatus'), key: 'status' },
                ] : [
                  { header: t('payroll.colName'), key: 'name' }, { header: t('payroll.contractSalaryType'), key: 'salaryType' },
                  { header: t('payroll.baseSalarySubject'), key: 'baseSalary' }, { header: t('payroll.overtimeHours'), key: 'overtimePay' },
                  { header: t('payroll.colAllowance'), key: 'allowances' }, { header: '賞与', key: 'bonus' }, { header: t('payroll.totalEarnings'), key: 'totalGross' },
                  { header: t('payroll.deductions'), key: 'deductions' }, { header: t('payroll.colNet'), key: 'netSalary' },
                  { header: t('payroll.colStatus'), key: 'status' },
                ]}
                fileName={viewType === 'employee' ? `${t('payroll.payslipTitle')}_${employees.find(e => e.id === selectedEmployeeId)?.lastName}_${employees.find(e => e.id === selectedEmployeeId)?.firstName}` : (startMonth === endMonth ? `${t('payroll.payslipTitle')}_${endMonth}` : `${t('payroll.payslipTitle')}_${startMonth}_to_${endMonth}`)}
              />
            </div>
          </div>
        )}

        {payrollLayoutView === 'table' && (
          <div className="overflow-x-auto border border-slate-200/65 rounded-2xl shadow-sm mb-5 bg-white">
            <table className="table-fixed border-collapse" style={{ width: '100%', minWidth: `${totalTableWidth}px` }}>
              <colgroup>
                {activeColumns.map(col => (
                  <col key={col.key} style={{ width: `${columnWidths[col.key] || 100}px` }} />
                ))}
                <col style={{ width: !isEmployeeMode ? '210px' : '90px' }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/60 text-slate-500 text-xs">
                  {activeColumns.map((col, idx) => {
                    const isFirst = idx === 0;
                    let stickyStyle: React.CSSProperties = {};
                    let stickyClass = "";
                    if (isFirst) {
                      stickyStyle = { position: 'sticky', left: 0, zIndex: 20 };
                      stickyClass = "sticky left-0 bg-slate-50 z-20 border-r border-slate-250/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]";
                    }

                    const isRightAlign = ['baseSalary', 'overtimePay', 'allowances', 'bonus', 'deductions', 'netSalary', 'companyCost'].includes(col.key);
                    const alignClass = isRightAlign ? 'text-right' : (col.key === 'status' ? 'text-center' : 'text-left');

                    return (
                      <th
                        key={col.key}
                        className={`px-4 py-3.5 text-xs font-bold text-slate-500 uppercase whitespace-nowrap relative group ${stickyClass} ${alignClass}`}
                        style={{ width: `${columnWidths[col.key] || 100}px`, ...stickyStyle }}
                      >
                        {col.key === 'name' && !(isEmployeeMode || viewType === 'employee') ? (
                          <FilterTh label={t('payroll.colName')} filterKey="name" options={nameOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleColumnFilter} onActiveFilterChange={setActiveFilter} />
                        ) : col.label}

                        {/* Resizer Handle */}
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, col.key)}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-slate-350 opacity-0 group-hover:opacity-100 active:opacity-100 hover:w-2 active:bg-blue-500 transition-all select-none z-30"
                        />
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase whitespace-nowrap" style={{ width: !isEmployeeMode ? '210px' : '90px' }}>
                    {!isEmployeeMode ? '操作' : t('payroll.detailBtn')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-150">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={activeColumns.length + 1} className="px-4 py-12 text-center text-slate-400">
                      {isEmployeeMode ? t('payroll.noPayslipRecord') : (viewType === 'employee' ? t('payroll.noEmployeePayslipRecord') : (monthRecords.length === 0 ? t('payroll.clickCalculatePrompt') : t('common.noData')))}
                    </td>
                  </tr>
                ) : paginated.map(record => {
                  const emp = employees.find(e => e.id === record.employeeId);
                  const translatedSalaryType = record.salaryType === '月給' ? t('payroll.typeMonthly') : record.salaryType === '日給' ? t('payroll.typeDaily') : t('payroll.typeHourly');
                  
                  const transAllow = emp?.benefits?.transportation || 0;
                  const houseAllow = emp?.benefits?.housing || 0;
                  const mealAllow = emp?.benefits?.meal || 0;
                  const fixedAllowances = transAllow + houseAllow + mealAllow;
                  const displayBonus = Math.max(0, record.allowances - fixedAllowances);
                  const displayAllowances = record.allowances - displayBonus;

                  return (
                    <tr key={record.id} className="hover:bg-slate-50 group">
                      {/* First Column Sticky */}
                      {visibleColumns.name && (
                        <td 
                          className="px-4 py-3.5 whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 border-r border-slate-250/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]"
                          style={{ position: 'sticky', left: 0 }}
                        >
                          {(isEmployeeMode || viewType === 'employee') ? (
                            <span className="font-bold text-slate-800">{getDisplayMonth(record.month, locale)}</span>
                          ) : (
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs shrink-0 font-bold">{emp?.firstNameKana?.charAt(0).toUpperCase()}</div>
                              <div className="min-w-0">
                                <span className="text-sm font-bold text-slate-800 block truncate">{emp?.lastName} {emp?.firstName}</span>
                                {startMonth !== endMonth && (
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                                    ({getDisplayMonth(record.month, locale)})
                                  </span>
                                )}
                                <p className="text-[10px] text-slate-400 truncate">{emp?.department}</p>
                              </div>
                            </div>
                          )}
                        </td>
                      )}

                      {visibleColumns.salaryType && (
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-xs rounded ${salaryTypeColor(record.salaryType)}`}>
                            {translatedSalaryType}
                          </span>
                        </td>
                      )}

                      {visibleColumns.baseSalary && (
                        <td className="px-4 py-3.5 text-sm text-right text-slate-650 font-mono whitespace-nowrap">
                          <div className="inline-flex flex-col items-end justify-center">
                            <span className="font-semibold">{formatCurrency(record.baseSalary)}</span>
                            {emp && record.baseSalary !== emp.salary && (
                              <span className="text-[10px] text-amber-605 font-sans font-bold mt-0.5 flex items-center gap-0.5" title={`${t('payroll.profileSalary')}: ${formatCurrency(emp.salary)}`}>
                                <span className="text-amber-500">⚠️</span>
                                <span>({formatCurrency(emp.salary)})</span>
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {visibleColumns.overtimePay && (
                        <td className="px-4 py-3.5 text-sm text-right text-slate-650 font-mono whitespace-nowrap">
                          {record.overtimePay > 0 ? formatCurrency(record.overtimePay) : '-'}
                        </td>
                      )}

                      {visibleColumns.allowances && (
                        <td className="px-4 py-3.5 text-sm text-right text-slate-650 font-mono whitespace-nowrap">
                          {displayAllowances > 0 ? formatCurrency(displayAllowances) : '-'}
                        </td>
                      )}

                      {visibleColumns.bonus && (
                        <td className="px-4 py-3.5 text-sm text-right text-slate-650 font-mono whitespace-nowrap">
                          {displayBonus > 0 ? formatCurrency(displayBonus) : '-'}
                        </td>
                      )}

                      {visibleColumns.deductions && (
                        <td className="px-4 py-3.5 text-sm text-right text-rose-600 font-mono whitespace-nowrap">
                          {formatCurrency(record.totalDeductions)}
                        </td>
                      )}

                      {visibleColumns.netSalary && (
                        <td className="px-4 py-3.5 text-sm text-right font-bold text-slate-850 font-mono whitespace-nowrap">
                          {formatCurrency(record.netSalary)}
                        </td>
                      )}

                      {visibleColumns.companyCost && (
                        <td className="px-4 py-3.5 text-sm text-right text-blue-700 font-mono whitespace-nowrap">
                          ¥{record.totalCompanyCost?.toLocaleString() || '-'}
                        </td>
                      )}

                      {visibleColumns.status && (
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-xs rounded ${statusColor(record.status)}`}>
                            {getStatusLabel(record.status)}
                          </span>
                        </td>
                      )}

                      {/* Action cell */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex gap-1.5 justify-center items-center">
                          {emp && (
                            <button onClick={() => setSelectedPayslip(record)}
                              className="px-2.5 py-1 text-xs bg-blue-50 text-blue-650 rounded hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap font-medium"
                              title={t('payroll.detailBtn')}
                            >
                              明細
                            </button>
                          )}
                          {!isEmployeeMode && emp && (
                            <>
                              <button 
                                onClick={() => setSelectedAttendanceCheck({ 
                                  employeeId: record.employeeId, 
                                  month: record.month, 
                                  employeeName: `${emp.lastName} ${emp.firstName}` 
                                })}
                                className="px-2 py-1 text-xs bg-slate-100 text-slate-650 hover:bg-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap font-medium"
                                title="勤怠実績確認"
                              >
                                勤怠
                              </button>
                              {(record.status === 'PENDING' || record.status === 'CALCULATED') && (
                                <button 
                                  onClick={() => handleUpdateStatus(record.id, 'APPROVED')}
                                  className="px-2 py-1 text-xs bg-yellow-50 text-yellow-750 hover:bg-yellow-105 rounded transition-colors cursor-pointer whitespace-nowrap font-medium"
                                >
                                  承認
                                </button>
                              )}
                              {record.status === 'APPROVED' && (
                                <button 
                                  onClick={() => handleUpdateStatus(record.id, 'PAID')}
                                  className="px-2 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-105 rounded transition-colors cursor-pointer whitespace-nowrap font-medium"
                                >
                                  支払
                                </button>
                              )}
                              {(record.status === 'APPROVED' || record.status === 'PAID') && (
                                <button 
                                  onClick={() => {
                                    if (confirm('この給与明細を未確定に戻しますか？勤怠や明細の修正が可能になります。(Bạn có muốn hủy chốt bảng lương này không? Sẽ có thể sửa lại chấm công và chi tiết lương.)')) {
                                      handleUpdateStatus(record.id, 'CALCULATED');
                                    }
                                  }}
                                  className="px-2 py-1 text-xs bg-red-50 text-red-750 hover:bg-red-105 rounded transition-colors cursor-pointer whitespace-nowrap font-medium"
                                >
                                  未確定
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 font-bold border-t border-slate-200">
                  <td colSpan={activeColumns.length} className="px-4 py-3 text-right text-xs text-slate-500 uppercase">会社負担 合計</td>
                  <td className="px-4 py-3 text-right text-sm text-blue-700 font-mono">¥{filtered.reduce((sum, r) => sum + ((r as any).totalCompanyCost || 0), 0).toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {payrollLayoutView === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {paginated.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed">
                {isEmployeeMode ? t('payroll.noPayslipRecord') : (viewType === 'employee' ? t('payroll.noEmployeePayslipRecord') : (monthRecords.length === 0 ? t('payroll.clickCalculatePrompt') : t('common.noData')))}
              </div>
            ) : paginated.map(record => {
              const emp = employees.find(e => e.id === record.employeeId);
              const translatedSalaryType = record.salaryType === '月給' ? t('payroll.typeMonthly') : record.salaryType === '日給' ? t('payroll.typeDaily') : t('payroll.typeHourly');
              
              const transAllow = emp?.benefits?.transportation || 0;
              const houseAllow = emp?.benefits?.housing || 0;
              const mealAllow = emp?.benefits?.meal || 0;
              const fixedAllowances = transAllow + houseAllow + mealAllow;
              const displayBonus = Math.max(0, record.allowances - fixedAllowances);
              const displayAllowances = record.allowances - displayBonus;

              return (
                <div key={record.id} className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-premium hover:shadow-premium-hover transition-all duration-200 relative group animate-fadeIn">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-tr from-slate-100 to-slate-250 rounded-full flex items-center justify-center text-sm font-bold text-slate-700 shrink-0">
                        {emp?.firstNameKana?.charAt(0).toUpperCase() || record.month.split('-')[1]}
                      </div>
                      <div className="min-w-0">
                        {(isEmployeeMode || viewType === 'employee') ? (
                          <span className="text-sm font-black text-slate-800 block">{getDisplayMonth(record.month, locale)}</span>
                        ) : (
                          <>
                            <span className="text-sm font-black text-slate-800 block truncate">{emp?.lastName} {emp?.firstName}</span>
                            <span className="text-[11px] font-bold text-slate-400 block truncate">{emp?.department || '-'}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {visibleColumns.status && (
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${statusColor(record.status)}`}>
                        {getStatusLabel(record.status)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 border-t border-slate-100 pt-4 text-xs">
                    {visibleColumns.salaryType && (
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">給与種別 (Loại lương)</span>
                        <span className="font-semibold text-slate-800">{translatedSalaryType}</span>
                      </div>
                    )}
                    {visibleColumns.baseSalary && (
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">基本給 (Lương cơ bản)</span>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 font-mono">{formatCurrency(record.baseSalary)}</span>
                          {emp && record.baseSalary !== emp.salary && (
                            <span className="text-[10px] text-amber-655 font-sans font-bold flex items-center gap-0.5 mt-0.5" title={`${t('payroll.profileSalary')}: ${formatCurrency(emp.salary)}`}>
                              ⚠️ {t('payroll.profileSalary')}: {formatCurrency(emp.salary)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {visibleColumns.overtimePay && (
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">残業手当 (Tăng ca)</span>
                        <span className="font-semibold text-slate-850 font-mono">{formatCurrency(record.overtimePay)} ({Math.round((record.overtimeHours || 0) * 10) / 10}h)</span>
                      </div>
                    )}
                    {visibleColumns.allowances && (
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">手当 (Phụ cấp)</span>
                        <span className="font-semibold text-slate-850 font-mono">{formatCurrency(displayAllowances)}</span>
                      </div>
                    )}
                    {visibleColumns.bonus && displayBonus > 0 && (
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">賞与 (Thưởng)</span>
                        <span className="font-black text-emerald-600 font-mono">{formatCurrency(displayBonus)}</span>
                      </div>
                    )}
                    {visibleColumns.deductions && (
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5 font-sans">控除 (Khấu trừ)</span>
                        <span className="font-semibold text-rose-600 font-mono">{formatCurrency(record.totalDeductions)}</span>
                      </div>
                    )}
                    {visibleColumns.companyCost && (
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">会社負担 (Công ty trả)</span>
                        <span className="font-semibold text-blue-650 font-mono">¥{record.totalCompanyCost?.toLocaleString() || '-'}</span>
                      </div>
                    )}
                    
                    {visibleColumns.netSalary && (
                      <div className="col-span-2 bg-slate-50/70 border border-slate-100 rounded-2xl p-3 flex justify-between items-center mt-1">
                        <span className="text-slate-500 font-extrabold text-xs">差引支給額 (Thực nhận Net)</span>
                        <span className="text-base font-black text-blue-600 font-mono">{formatCurrency(record.netSalary)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 mt-4 pt-3.5 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedPayslip(record)}
                      className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      {t('payroll.detailBtn')}
                    </button>
                    {!isEmployeeMode && emp && (
                      <>
                        <button 
                          onClick={() => setSelectedAttendanceCheck({ 
                            employeeId: record.employeeId, 
                            month: record.month, 
                            employeeName: `${emp.lastName} ${emp.firstName}` 
                          })}
                          className="px-3.5 py-2 bg-slate-100 text-slate-650 hover:bg-slate-200 rounded-xl transition-all cursor-pointer font-bold text-xs"
                          title="勤怠実績"
                        >
                          勤怠
                        </button>
                        {(record.status === 'PENDING' || record.status === 'CALCULATED') && (
                          <button
                            onClick={() => handleUpdateStatus(record.id, 'APPROVED')}
                            className="px-3.5 py-2 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
                          >
                            承認 (Duyệt)
                          </button>
                        )}
                        {record.status === 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(record.id, 'PAID')}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
                          >
                            支払 (Trả)
                          </button>
                        )}
                        {(record.status === 'APPROVED' || record.status === 'PAID') && (
                          <button
                            onClick={() => {
                              if (confirm('この給与明細を未確定に戻しますか？')) {
                                handleUpdateStatus(record.id, 'CALCULATED');
                              }
                            }}
                            className="px-3.5 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-black transition-all cursor-pointer"
                          >
                            未確定
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              {locale === 'ja' ? `${filtered.length} 件中 ${(currentPage - 1) * PAGE_SIZE + 1}〜${Math.min(currentPage * PAGE_SIZE, filtered.length)} 件を表示` :
               locale === 'vi' ? `Hiển thị ${(currentPage - 1) * PAGE_SIZE + 1}〜${Math.min(currentPage * PAGE_SIZE, filtered.length)} trong số ${filtered.length} bản ghi` :
               locale === 'en' ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1} to ${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length} records` :
               locale === 'zh' ? `显示第 ${(currentPage - 1) * PAGE_SIZE + 1} 至 ${Math.min(currentPage * PAGE_SIZE, filtered.length)} 条，共 ${filtered.length} 条记录` :
               `แสดง ${(currentPage - 1) * PAGE_SIZE + 1} ถึง ${Math.min(currentPage * PAGE_SIZE, filtered.length)} จากทั้งหมด ${filtered.length} รายการ`}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40">{t('client.prev')}</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-slate-300 hover:bg-slate-50'}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40">{t('client.next')}</button>
            </div>
          </div>
        )}
      </Card>

      {/* Payslip Modal */}
      {selectedPayslip && (() => {
        const emp = employees.find(e => e.id === selectedPayslip.employeeId);
        return emp ? (
          <PayslipModal 
            record={selectedPayslip} 
            employee={emp} 
            companyInfo={companyInfo} 
            isAdmin={!isEmployeeMode}
            onSave={(updated) => {
              setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
              setSelectedPayslip(updated);
            }}
            onClose={() => setSelectedPayslip(null)} 
          />
        ) : null;
      })()}

      {/* Attendance Check Modal */}
      {selectedAttendanceCheck && (
        <AttendanceCheckModal
          employeeId={selectedAttendanceCheck.employeeId}
          month={selectedAttendanceCheck.month}
          employeeName={selectedAttendanceCheck.employeeName}
          onClose={() => setSelectedAttendanceCheck(null)}
        />
      )}
    </>
  );
}

function AttendanceCheckModal({ 
  employeeId, 
  month, 
  employeeName, 
  onClose 
}: { 
  employeeId: string; 
  month: string; 
  employeeName: string; 
  onClose: () => void 
}) {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<any[]>([]);
  const { t: _t, locale: _locale } = useI18n();

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/attendance?employeeId=${employeeId}&month=${month}`);
        if (res.ok) {
          const json = await res.json();
          setAttendance(json.data || json || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [employeeId, month]);

  const stats = useMemo(() => {
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
    const leaveDays = attendance.filter(a => a.status === 'LEAVE').length;
    const totalOT = attendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
    return { totalDays, presentDays, absentDays, leaveDays, totalOT };
  }, [attendance]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">出勤</span>;
      case 'LATE':
        return <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded font-medium">遅刻</span>;
      case 'EARLY_LEAVE':
        return <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-850 rounded font-medium">早退</span>;
      case 'ABSENT':
        return <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded font-bold animate-pulse">欠勤</span>;
      case 'LEAVE':
        return <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">休暇</span>;
      default:
        return <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-800 rounded">{status}</span>;
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-';
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return timeStr;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-slate-850">勤怠実績確認 (対照)</h3>
            <p className="text-xs text-slate-500">{employeeName} - {month}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-4 bg-blue-50/50 border-b border-blue-100 grid grid-cols-4 gap-2 text-center text-sm">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">出勤日数</p>
            <p className="text-base font-bold text-slate-850">{stats.presentDays} 日</p>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">欠勤日数</p>
            <p className="text-base font-bold text-red-650">{stats.absentDays} 日</p>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">有給・休暇</p>
            <p className="text-base font-bold text-blue-700">{stats.leaveDays} 日</p>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium">総残業時間</p>
            <p className="text-base font-bold text-orange-600">{stats.totalOT} 時間</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400">読み込み中...</div>
          ) : attendance.length === 0 ? (
            <div className="py-12 text-center text-slate-400">この月の勤怠データはありません。</div>
          ) : (
            <table className="w-full text-sm border-collapse text-slate-700">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-semibold uppercase text-center">
                  <th className="p-2">日付</th>
                  <th className="p-2">出勤</th>
                  <th className="p-2">退勤</th>
                  <th className="p-2">残業 (h)</th>
                  <th className="p-2">区分</th>
                  <th className="p-2 text-left">備考</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50 text-center">
                    <td className="p-2.5 font-medium font-mono">{formatDate(a.date)}</td>
                    <td className="p-2.5 font-mono">{formatTime(a.checkIn)}</td>
                    <td className="p-2.5 font-mono">{formatTime(a.checkOut)}</td>
                    <td className="p-2.5 font-bold text-orange-600">{a.overtimeHours || '-'}</td>
                    <td className="p-2.5">{getStatusBadge(a.status)}</td>
                    <td className="p-2.5 text-left text-xs text-slate-500 max-w-[200px] truncate" title={a.notes}>{a.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function PayrollSchedule({ cutoffDay, payday, year, month }: { cutoffDay: string; payday: string; year: number; month: number }) {
  const { t } = useI18n();
  const info = useMemo(() => {
    const today = new Date();
    const todayDate = today.getDate();
    const currentYear = year;
    const currentMonth = month - 2; // 0-indexed for JS Date

    const cutoff = cutoffDay === '末日' ? new Date(currentYear, currentMonth + 1, 0).getDate() : Number(cutoffDay);
    const pay = Number(payday);

    // Current period
    let periodStart: Date;
    let periodEnd: Date;
    if (cutoffDay === '末日') {
      periodStart = new Date(currentYear, currentMonth, 1);
      periodEnd = new Date(currentYear, currentMonth + 1, 0);
    } else {
      periodStart = new Date(currentYear, currentMonth - 1, cutoff + 1);
      periodEnd = new Date(currentYear, currentMonth, cutoff);
    }

    // Payday for current period
    const payDate = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, pay);

    const daysUntilCutoff = Math.ceil((periodEnd.getTime() - today.getTime()) / 86400000);
    const daysUntilPay = Math.ceil((payDate.getTime() - today.getTime()) / 86400000);
    const isPayday = todayDate === pay;
    const isCutoffDay = todayDate === cutoff;
    const isPayWeek = daysUntilPay >= 0 && daysUntilPay <= 3;

    const fmt = (d: Date) => `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

    return {
      period: `${fmt(periodStart)} ～ ${fmt(periodEnd)}`,
      payDate: fmt(payDate),
      daysUntilCutoff, daysUntilPay,
      isPayday, isCutoffDay, isPayWeek,
    };
  }, [cutoffDay, payday, year, month]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <p className="text-xs text-slate-500 mb-1">{t('payroll.calcPeriod')}</p>
          <p className="text-sm font-medium text-slate-800">{info.period}</p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 mb-1">{t('payroll.cutoffDay')}</p>
          <div className="flex items-center gap-2">
            {info.isCutoffDay && <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
            <p className="text-sm font-medium text-slate-800">
              {info.isCutoffDay ? t('payroll.todayIsCutoff') : t('payroll.daysLeft').replace('{days}', String(info.daysUntilCutoff))}
            </p>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 mb-1">{t('payroll.payday')}</p>
          <div className="flex items-center gap-2">
            {info.isPayday && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
            <p className="text-sm font-medium text-slate-800">
              {info.isPayday ? t('payroll.todayIsPayday') : info.payDate}
            </p>
          </div>
        </div>
      </div>
      {(info.isPayday || info.isPayWeek) && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <span className="text-green-600 text-lg">&#128176;</span>
          <div>
            <p className="text-sm font-medium text-green-800">
              {info.isPayday ? t('payroll.todayIsPaydayAlert') : t('payroll.daysLeftPaydayAlert').replace('{days}', String(info.daysUntilPay))}
            </p>
            <p className="text-xs text-green-600">{t('payroll.paydayAlertDesc')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SalaryAdjustmentModal({ record, employee, onClose, onSave }: {
  record: PayrollRecord;
  employee: Employee;
  onClose: () => void;
  onSave: (updated: PayrollRecord) => void;
}) {
  const [adjustment, setAdjustment] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        id: record.id,
        allowances: (record.allowances || 0) + adjustment,
      };
      const res = await fetch('/api/payroll', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save adjustment');
      const updatedRes = await res.json();
      const updated = updatedRes.data || updatedRes;
      onSave({ ...record, allowances: updated.allowances || updated.bonus });
      onClose();
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">給与調整</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">調整額 (円)</label>
            <input
              type="number"
              value={adjustment}
              onChange={e => setAdjustment(parseInt(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">理由</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="調整理由を入力"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg">キャンセル</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
