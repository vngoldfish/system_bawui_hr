'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Card from '@/components/common/Card';
import ExportButtons from '@/components/common/ExportButtons';
import { formatCurrency } from '@/lib/utils';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

interface Employee {
  id: string; employeeCode: string; firstName: string; lastName: string; firstNameKana: string; lastNameKana: string;
  department: string; position: string; salary: number; salaryType: string; hourlyRate: number; dailyRate: number;
  contractType: string; benefits: {
    healthInsurance: boolean; pension: boolean; employmentInsurance: boolean; workersComp: boolean;
    transportation: number; housing: number; meal: number;
  };
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
}

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
    <th className={`px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer select-none relative ${widthClass || ''}`}
      onDoubleClick={() => onActiveFilterChange(isActive ? null : filterKey)} title="ダブルクリックでフィルター">
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {hasFilter && <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>}
      </div>
      {isActive && <FilterDropdown options={options} selected={columnFilters[filterKey] || []} onSelect={vals => onFilterChange(filterKey, vals)} onClose={() => onActiveFilterChange(null)} />}
    </th>
  );
}

function PayslipModal({ record, employee, onClose }: { record: PayrollRecord; employee: Employee; onClose: () => void }) {
  const [emailing, setEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');

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
      pdf.save(`給与明細書_${employee.lastName}_${employee.firstName}_${record.month}.pdf`);
    } catch (e) {
      console.error(e);
      alert('PDFダウンロードに失敗しました。');
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

  // Convert month to Japanese display e.g. 2026年05月
  const [yearStr, monthStr] = record.month.split('-');
  const displayMonth = `${yearStr}年${monthStr}月`;

  // Format date to local date string
  const formatPayday = (dateStrOrObj: any) => {
    if (!dateStrOrObj) return '-';
    const date = new Date(dateStrOrObj);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  // Extract benefits
  const transAllow = employee.benefits?.transportation || 0;
  const houseAllow = employee.benefits?.housing || 0;
  const mealAllow = employee.benefits?.meal || 0;
  const otherAllow = Math.max(0, record.allowances - transAllow - houseAllow - mealAllow);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:static" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:w-full print:p-0" onClick={e => e.stopPropagation()}>
        
        {/* Action Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between print:hidden bg-slate-50 rounded-t-2xl">
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              印刷
            </button>
            <button onClick={handleDownloadPDF} className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              PDFダウンロード
            </button>
            <button onClick={handleSendEmail} disabled={emailing} className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer">
              {emailing ? (
                <span>送信中...</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  メール送信
                </>
              )}
            </button>
            {emailStatus === 'success' && <span className="text-green-600 text-xs flex items-center gap-1 font-semibold">✅ 送信完了</span>}
            {emailStatus === 'error' && <span className="text-red-600 text-xs flex items-center gap-1 font-semibold">❌ 送信失敗</span>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Payslip Print Sheet */}
        <div id="payslip-print-area" className="p-8 bg-white print:p-0 print:w-full print:text-black">
          
          {/* Header Block */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold border-b-2 border-slate-800 pb-2 inline-block px-12 tracking-widest text-slate-800 print:text-black print:border-black">給与明細書</h2>
            <p className="text-lg font-semibold mt-2 text-slate-700 print:text-black">{displayMonth}度</p>
          </div>

          {/* Employee & Company Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 border border-slate-300 p-4 rounded-xl print:rounded-none print:border-black">
            <div className="space-y-2 text-sm text-slate-700 print:text-black">
              <div className="flex"><span className="w-28 font-medium text-slate-500 print:text-black">従業員番号:</span><span className="font-bold">{employee.employeeCode}</span></div>
              <div className="flex"><span className="w-28 font-medium text-slate-500 print:text-black">氏名:</span><span className="text-base font-bold">{employee.lastName} {employee.firstName} 殿</span></div>
              <div className="flex"><span className="w-28 font-medium text-slate-500 print:text-black">所属/役職:</span><span>{employee.department} / {employee.position}</span></div>
            </div>
            <div className="space-y-2 text-sm text-slate-700 print:text-black md:text-right md:border-l md:border-slate-200 md:pl-6 print:border-black">
              <div className="font-bold text-base">株式会社　BAWUI</div>
              <div>〒100-0005 東京都千代田区丸の内1-1-1</div>
              <div className="flex md:justify-end"><span className="w-28 font-medium text-slate-500 print:text-black text-left md:text-right mr-2">支給日:</span><span className="font-semibold">{record.paymentDate ? formatPayday(record.paymentDate) : '2026/05/25'}</span></div>
            </div>
          </div>

          {/* Attendance Section (勤怠) */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1.5 mb-2 rounded border-l-4 border-slate-700 print:bg-slate-200 print:text-black print:border-black">【勤怠】</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-300 print:border-black">
                <thead>
                  <tr className="bg-slate-50 print:bg-slate-100">
                    <th className="border border-slate-300 p-2 text-center font-medium print:border-black">出勤日数</th>
                    <th className="border border-slate-300 p-2 text-center font-medium print:border-black">欠勤日数</th>
                    <th className="border border-slate-300 p-2 text-center font-medium print:border-black">有給取得日数</th>
                    <th className="border border-slate-300 p-2 text-center font-medium print:border-black">所定労働時間</th>
                    <th className="border border-slate-300 p-2 text-center font-medium print:border-black">実労働時間</th>
                    <th className="border border-slate-300 p-2 text-center font-medium print:border-black">残業時間</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-center font-bold text-sm print:border-black">{record.workDays} 日</td>
                    <td className="border border-slate-300 p-2.5 text-center font-bold text-sm text-red-600 print:text-black print:border-black">{record.absentDays || 0} 日</td>
                    <td className="border border-slate-300 p-2.5 text-center font-bold text-sm print:border-black">{22 - record.workDays - (record.absentDays || 0) > 0 ? 22 - record.workDays - (record.absentDays || 0) : 0} 日</td>
                    <td className="border border-slate-300 p-2.5 text-center print:border-black">{record.workHours} h</td>
                    <td className="border border-slate-300 p-2.5 text-center print:border-black">{record.workDays * 8} h</td>
                    <td className="border border-slate-300 p-2.5 text-center font-bold text-orange-600 print:text-black print:border-black">{record.overtimeHours} h</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Earnings & Deductions Tables Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            
            {/* Earnings (支給) */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1.5 mb-2 rounded border-l-4 border-slate-700 print:bg-slate-200 print:text-black print:border-black">【支給】</h3>
              <table className="w-full text-xs border-collapse border border-slate-300 print:border-black">
                <thead>
                  <tr className="bg-slate-50 print:bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left font-medium print:border-black">支給科目</th>
                    <th className="border border-slate-300 p-2 text-right font-medium print:border-black">金額</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 print:divide-black">
                  <tr><td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">基本給</td><td className="border border-slate-300 p-2.5 text-right font-semibold print:border-black">{formatCurrency(record.baseSalary)}</td></tr>
                  <tr><td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">時間外手当 (残業手当)</td><td className="border border-slate-300 p-2.5 text-right font-semibold text-green-600 print:text-black print:border-black">+{formatCurrency(record.overtimePay)}</td></tr>
                  <tr><td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">通勤手当</td><td className="border border-slate-300 p-2.5 text-right print:border-black">+{formatCurrency(transAllow)}</td></tr>
                  <tr><td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">住宅手当</td><td className="border border-slate-300 p-2.5 text-right print:border-black">+{formatCurrency(houseAllow)}</td></tr>
                  <tr><td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">食事手当</td><td className="border border-slate-300 p-2.5 text-right print:border-black">+{formatCurrency(mealAllow)}</td></tr>
                  {otherAllow > 0 && <tr><td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">その他手当 (賞与等)</td><td className="border border-slate-300 p-2.5 text-right print:border-black">+{formatCurrency(otherAllow)}</td></tr>}
                  <tr className="bg-blue-50/50 font-bold print:bg-slate-100"><td className="border border-slate-300 p-3 text-slate-800 print:text-black print:border-black">支給合計額</td><td className="border border-slate-300 p-3 text-right text-blue-700 print:text-black print:border-black">{formatCurrency(record.totalGross)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* Deductions (控除) */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1.5 mb-2 rounded border-l-4 border-slate-700 print:bg-slate-200 print:text-black print:border-black">【控除】</h3>
              <table className="w-full text-xs border-collapse border border-slate-300 print:border-black">
                <thead>
                  <tr className="bg-slate-50 print:bg-slate-100">
                    <th className="border border-slate-300 p-2 text-left font-medium print:border-black">控除科目</th>
                    <th className="border border-slate-300 p-2 text-right font-medium print:border-black">金額</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 print:divide-black">
                  <tr><td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">健康保険料</td><td className="border border-slate-300 p-2.5 text-right font-semibold text-red-500 print:text-black print:border-black">-{formatCurrency(record.healthInsurance)}</td></tr>
                  <tr><td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">厚生年金保険料</td><td className="border border-slate-300 p-2.5 text-right font-semibold text-red-500 print:text-black print:border-black">-{formatCurrency(record.pension)}</td></tr>
                  <tr><td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">雇用保険料</td><td className="border border-slate-300 p-2.5 text-right font-semibold text-red-500 print:text-black print:border-black">-{formatCurrency(record.employmentInsurance)}</td></tr>
                  <tr><td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">労災保険料</td><td className="border border-slate-300 p-2.5 text-right font-semibold text-red-500 print:text-black print:border-black">-{formatCurrency(record.workersComp)}</td></tr>
                  <tr><td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">欠勤控除</td><td className="border border-slate-300 p-2.5 text-right font-semibold text-red-500 print:text-black print:border-black">-{formatCurrency(record.totalDeductions - record.healthInsurance - record.pension - record.employmentInsurance - record.workersComp - record.incomeTax - record.residentTax > 0 ? record.totalDeductions - record.healthInsurance - record.pension - record.employmentInsurance - record.workersComp - record.incomeTax - record.residentTax : 0)}</td></tr>
                  <tr><td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">所得税</td><td className="border border-slate-300 p-2.5 text-right font-semibold text-red-500 print:text-black print:border-black">-{formatCurrency(record.incomeTax)}</td></tr>
                  <tr><td className="border border-slate-300 p-2.5 text-slate-600 print:text-black print:border-black">住民税</td><td className="border border-slate-300 p-2.5 text-right font-semibold text-red-500 print:text-black print:border-black">-{formatCurrency(record.residentTax)}</td></tr>
                  <tr className="bg-red-50/50 font-bold print:bg-slate-100"><td className="border border-slate-300 p-3 text-slate-800 print:text-black print:border-black">控除合計額</td><td className="border border-slate-300 p-3 text-right text-red-700 print:text-black print:border-black">-{formatCurrency(record.totalDeductions)}</td></tr>
                </tbody>
              </table>
            </div>

          </div>

          {/* Net pay summary box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:bg-white print:border-black print:rounded-none">
            <div>
              <p className="text-xs text-slate-500 print:text-black font-bold uppercase tracking-wider">差引支給額 (銀行振込額)</p>
              <p className="text-xs text-slate-400 print:text-black">Gross Pay minus Deductions</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-blue-600 print:text-black tracking-wide">{formatCurrency(record.netSalary)}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}


interface PayrollSettings {
  cutoffDay: string;
  payday: string;
}

export default function PayrollClient({ employees, initialRecords, payrollSettings, isEmployeeMode = false }: {
  employees: Employee[]; initialRecords: PayrollRecord[]; payrollSettings?: PayrollSettings; isEmployeeMode?: boolean;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [viewType, setViewType] = useState<'month' | 'employee'>('month');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(() => employees[0]?.id || '');
  const [empCodeInput, setEmpCodeInput] = useState(() => employees[0]?.employeeCode || '');
  const [startMonth, setStartMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [endMonth, setEndMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
  const [calculating, setCalculating] = useState(false);

  const handleColumnFilter = (key: string, values: string[]) => {
    setColumnFilters(prev => ({ ...prev, [key]: values }));
    setCurrentPage(1);
  };

  // Auto-calculate payroll
  const handleCalculate = () => {
    setCalculating(true);
    const newRecords: PayrollRecord[] = employees
      .filter(e => e.salary > 0 || e.hourlyRate > 0 || e.dailyRate > 0)
      .map(emp => {
        const workDays = 22;
        const dailyHours = 8;
        const overtimeHours = Math.floor(Math.random() * 20);

        let baseSalary = 0;
        let workHours = 0;

        if (emp.salaryType === '月給') {
          baseSalary = emp.salary;
          workHours = workDays * dailyHours;
        } else if (emp.salaryType === '日給') {
          baseSalary = emp.dailyRate * workDays;
          workHours = workDays * dailyHours;
        } else if (emp.salaryType === '時給') {
          const hoursPerDay = 6;
          baseSalary = emp.hourlyRate * hoursPerDay * workDays;
          workHours = hoursPerDay * workDays;
        }

        const hourlyEquiv = emp.salaryType === '時給' ? emp.hourlyRate : baseSalary / workHours;
        const overtimePay = Math.round(hourlyEquiv * 1.25 * overtimeHours);

        const allowances = emp.benefits.transportation + emp.benefits.housing + emp.benefits.meal;
        const totalGross = baseSalary + overtimePay + allowances;

        const healthInsurance = emp.benefits.healthInsurance ? Math.round(totalGross * 0.05) : 0;
        const pension = emp.benefits.pension ? Math.round(totalGross * 0.09) : 0;
        const employmentInsurance = emp.benefits.employmentInsurance ? Math.round(totalGross * 0.006) : 0;
        const workersComp = emp.benefits.workersComp ? Math.round(totalGross * 0.003) : 0;
        const incomeTax = Math.round(totalGross * 0.05);
        const residentTax = Math.round(totalGross * 0.1);

        const totalDeductions = healthInsurance + pension + employmentInsurance + workersComp + incomeTax + residentTax;
        const netSalary = totalGross - totalDeductions;

        return {
          id: `payroll-${emp.id}-${endMonth}`,
          employeeId: emp.id,
          month: endMonth,
          baseSalary, overtimePay, allowances,
          healthInsurance, pension, employmentInsurance, workersComp,
          incomeTax, residentTax,
          totalGross, totalDeductions, netSalary,
          salaryType: emp.salaryType,
          workDays, workHours, overtimeHours,
          absentDays: 0,
          status: 'CALCULATED',
        };
      });

    setRecords(prev => {
      const filtered = prev.filter(r => r.month !== endMonth);
      return [...newRecords, ...filtered];
    });
    setCalculating(false);
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
    const totalOT = monthRecords.reduce((s, r) => s + r.overtimeHours, 0);
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
              月別で表示
            </button>
            <button 
              onClick={() => { setViewType('employee'); setCurrentPage(1); }} 
              className={`px-5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${viewType === 'employee' ? 'bg-white dark:bg-slate-700 shadow text-blue-650 dark:text-blue-400 font-black' : 'text-slate-500 hover:text-slate-800'}`}
            >
              従業員別で表示
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm">
            {viewType === 'month' ? (
              <>
                <div className="flex gap-3 items-center">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">期間:</label>
                  <input type="month" value={startMonth} onChange={e => { setStartMonth(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 cursor-pointer" />
                  <span className="text-slate-400">〜</span>
                  <input type="month" value={endMonth} onChange={e => { setEndMonth(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 cursor-pointer" />
                </div>
                <button onClick={handleCalculate} disabled={calculating}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer">
                  {calculating ? '計算中...' : '給与自動計算'}
                </button>
              </>
            ) : (
              <div className="flex flex-wrap gap-4 items-center w-full justify-between">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex gap-3 items-center">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">従業員コード:</label>
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
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">または氏名選択:</label>
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
                      className="px-3 py-2 border border-slate-300 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer min-w-[180px]"
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.lastName} {emp.firstName} ({emp.employeeCode})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400">期間:</label>
                  <input type="month" value={startMonth} onChange={e => { setStartMonth(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 cursor-pointer" />
                  <span className="text-slate-400">〜</span>
                  <input type="month" value={endMonth} onChange={e => { setEndMonth(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 cursor-pointer" />
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
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">従業員氏名</span>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 text-base">
                {selectedEmployee.lastName} {selectedEmployee.firstName}
              </p>
              <p className="text-xs text-slate-400 font-medium">
                {selectedEmployee.lastNameKana} {selectedEmployee.firstNameKana}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">所属 / 役職</span>
              <p className="font-bold text-slate-700 dark:text-slate-350">
                {selectedEmployee.department}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {selectedEmployee.position}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">契約形態 / 給与形態</span>
              <p className="font-bold text-slate-700 dark:text-slate-350">
                {selectedEmployee.contractType} <span className="text-xs font-normal">({selectedEmployee.salaryType})</span>
              </p>
              <p className="text-xs text-slate-500 font-mono font-medium">
                基本給: {formatCurrency(selectedEmployee.salary)} / 月
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">従業員コード</span>
              <p className="font-mono font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg w-fit text-sm border border-slate-200/40 dark:border-slate-750">
                {selectedEmployee.employeeCode}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Schedule */}
      {payrollSettings && <PayrollSchedule cutoffDay={payrollSettings.cutoffDay} payday={payrollSettings.payday} />}

      {/* Stats */}
      {!isEmployeeMode && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: '総支給額', value: formatCurrency(stats.totalGross), color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: '総控除額', value: formatCurrency(stats.totalDeductions), color: 'text-red-600', bg: 'bg-red-50' },
            { label: '差引支給', value: formatCurrency(stats.totalNet), color: 'text-green-600', bg: 'bg-green-50' },
            { label: '残業合計', value: `${stats.totalOT}h`, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: '残業代合計', value: formatCurrency(stats.totalOTPay), color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: '人数', value: `${stats.count}名`, color: 'text-slate-600', bg: 'bg-slate-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {isEmployeeMode && (
        <div className="flex gap-3 items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm w-fit mb-4">
          <label className="text-sm font-medium text-slate-650 dark:text-slate-400">表示期間:</label>
          <input type="month" value={startMonth} onChange={e => { setStartMonth(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-slate-300 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 cursor-pointer" />
          <span className="text-slate-400">〜</span>
          <input type="month" value={endMonth} onChange={e => { setEndMonth(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-slate-300 dark:border-slate-750 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 cursor-pointer" />
        </div>
      )}

      {/* Salary Type Distribution */}
      {!isEmployeeMode && (
        <div className="flex gap-3">
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className={`px-4 py-2 rounded-lg ${salaryTypeColor(type)}`}>
              <span className="text-sm font-medium">{type}: {count}名</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <Card title={
        isEmployeeMode 
          ? '給与明細書履歴' 
          : viewType === 'employee'
            ? `${employees.find(e => e.id === selectedEmployeeId)?.lastName} ${employees.find(e => e.id === selectedEmployeeId)?.firstName} さんの給与明細履歴`
            : startMonth === endMonth
              ? `${endMonth.replace('-', '年')}月 給与明細一覧`
              : `${startMonth.replace('-', '年')}月 〜 ${endMonth.replace('-', '年')}月 給与明細一覧`
      }>
        {!isEmployeeMode && (
          <div className="flex flex-col sm:flex-row gap-3 mb-5 justify-between items-center">
            {viewType === 'month' ? (
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" placeholder="名前で検索..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            ) : <div />}
            {activeFilterCount > 0 && viewType === 'month' && (
              <button onClick={() => { setColumnFilters({}); setCurrentPage(1); }}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200">フィルタークリア ({activeFilterCount})</button>
            )}
            <ExportButtons
              data={filtered.map(r => {
                const emp = employees.find(e => e.id === r.employeeId);
                return {
                  name: emp ? `${emp.lastName} ${emp.firstName}` : '',
                  month: `${r.month.replace('-', '年')}月`,
                  salaryType: r.salaryType,
                  baseSalary: formatCurrency(r.baseSalary), overtimePay: formatCurrency(r.overtimePay),
                  allowances: formatCurrency(r.allowances), totalGross: formatCurrency(r.totalGross),
                  deductions: formatCurrency(r.totalDeductions), netSalary: formatCurrency(r.netSalary),
                  status: statusLabel(r.status),
                };
              })}
              columns={viewType === 'employee' ? [
                { header: '対象月', key: 'month' }, { header: '給与形態', key: 'salaryType' },
                { header: '基本給', key: 'baseSalary' }, { header: '残業手当', key: 'overtimePay' },
                { header: '諸手当', key: 'allowances' }, { header: '総支給', key: 'totalGross' },
                { header: '控除', key: 'deductions' }, { header: '差引支給', key: 'netSalary' },
                { header: '状態', key: 'status' },
              ] : [
                { header: '氏名', key: 'name' }, { header: '給与形態', key: 'salaryType' },
                { header: '基本給', key: 'baseSalary' }, { header: '残業手当', key: 'overtimePay' },
                { header: '諸手当', key: 'allowances' }, { header: '総支給', key: 'totalGross' },
                { header: '控除', key: 'deductions' }, { header: '差引支給', key: 'netSalary' },
                { header: '状態', key: 'status' },
              ]}
              fileName={viewType === 'employee' ? `給与明細_${employees.find(e => e.id === selectedEmployeeId)?.lastName}_${employees.find(e => e.id === selectedEmployeeId)?.firstName}` : (startMonth === endMonth ? `給与明細_${endMonth}` : `給与明細_${startMonth}_to_${endMonth}`)}
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: '950px' }}>
            <colgroup>
              <col style={{ width: '180px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '80px' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {(isEmployeeMode || viewType === 'employee') ? (
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">対象月</th>
                ) : (
                  <FilterTh label="氏名" filterKey="name" options={nameOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleColumnFilter} onActiveFilterChange={setActiveFilter} />
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">形態</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">基本給</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">残業</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">手当</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">控除</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">差引支給</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">状態</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">明細</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {paginated.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  {isEmployeeMode ? '給与明細の記録がありません' : (viewType === 'employee' ? 'この従業員の給与明細記録がありません' : (monthRecords.length === 0 ? '「給与自動計算」ボタンを押して給与を計算してください' : '該当する記録が見つかりません'))}
                </td></tr>
              ) : paginated.map(record => {
                const emp = employees.find(e => e.id === record.employeeId);
                return (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {(isEmployeeMode || viewType === 'employee') ? (
                        <span className="font-bold text-slate-800">{record.month.replace('-', '年')}月</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs">{emp?.firstNameKana?.charAt(0).toUpperCase()}</div>
                          <div>
                            <span className="text-sm font-medium text-slate-800">{emp?.lastName} {emp?.firstName}</span>
                            {startMonth !== endMonth && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-bold ml-1.5">
                                ({record.month.replace('-', '年')}月)
                              </span>
                            )}
                            <p className="text-xs text-slate-400">{emp?.department}</p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded ${salaryTypeColor(record.salaryType)}`}>{record.salaryType}</span></td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(record.baseSalary)}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{record.overtimePay > 0 ? formatCurrency(record.overtimePay) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{record.allowances > 0 ? formatCurrency(record.allowances) : '-'}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(record.totalDeductions)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">{formatCurrency(record.netSalary)}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 text-xs rounded ${statusColor(record.status)}`}>{statusLabel(record.status)}</span></td>
                    <td className="px-4 py-3 text-center">
                      {emp && <button onClick={() => setSelectedPayslip(record)}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">明細</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">{filtered.length} 件中 {(currentPage - 1) * PAGE_SIZE + 1}〜{Math.min(currentPage * PAGE_SIZE, filtered.length)} 件を表示</p>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40">前へ</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-slate-300 hover:bg-slate-50'}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40">次へ</button>
            </div>
          </div>
        )}
      </Card>

      {/* Payslip Modal */}
      {selectedPayslip && (() => {
        const emp = employees.find(e => e.id === selectedPayslip.employeeId);
        return emp ? <PayslipModal record={selectedPayslip} employee={emp} onClose={() => setSelectedPayslip(null)} /> : null;
      })()}
    </>
  );
}

function PayrollSchedule({ cutoffDay, payday }: { cutoffDay: string; payday: string }) {
  const info = useMemo(() => {
    const today = new Date();
    const todayDate = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const cutoff = cutoffDay === '末日' ? new Date(currentYear, currentMonth + 1, 0).getDate() : Number(cutoffDay);
    const pay = Number(payday);

    // Current period
    let periodStart: Date;
    let periodEnd: Date;
    if (todayDate <= cutoff) {
      periodStart = new Date(currentYear, currentMonth - 1, cutoff + 1);
      periodEnd = new Date(currentYear, currentMonth, cutoff);
    } else {
      periodStart = new Date(currentYear, currentMonth, cutoff + 1);
      periodEnd = new Date(currentYear, currentMonth + 1, cutoff);
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
  }, [cutoffDay, payday]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <p className="text-xs text-slate-500 mb-1">計算期間</p>
          <p className="text-sm font-medium text-slate-800">{info.period}</p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 mb-1">締め日</p>
          <div className="flex items-center gap-2">
            {info.isCutoffDay && <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
            <p className="text-sm font-medium text-slate-800">
              {info.isCutoffDay ? '本日が締め日です' : `あと${info.daysUntilCutoff}日`}
            </p>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 mb-1">支払日</p>
          <div className="flex items-center gap-2">
            {info.isPayday && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
            <p className="text-sm font-medium text-slate-800">
              {info.isPayday ? '本日が支払日です' : info.payDate}
            </p>
          </div>
        </div>
      </div>
      {(info.isPayday || info.isPayWeek) && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <span className="text-green-600 text-lg">&#128176;</span>
          <div>
            <p className="text-sm font-medium text-green-800">
              {info.isPayday ? '本日は給与支払日です' : `給与支払日まであと${info.daysUntilPay}日です`}
            </p>
            <p className="text-xs text-green-600">「給与自動計算」ボタンで当月分の給与を計算してください</p>
          </div>
        </div>
      )}
    </div>
  );
}
