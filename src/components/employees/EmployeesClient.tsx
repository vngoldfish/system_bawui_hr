'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Card from '@/components/common/Card';
import ExportButtons from '@/components/common/ExportButtons';
import EmployeeFormModal from './EmployeeFormModal';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import Portal from '@/components/common/Portal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { translateStatus } from '@/lib/export';
import { getExpiryStatus, statusColor, statusOptions } from '@/lib/employee-helpers';
import type { Employee } from '@/types';

const PAGE_SIZE = 8;

function ResidenceAlertBanner({
  employees,
  onUpdate,
}: {
  employees: Employee[];
  onUpdate: (emp: Employee) => void;
}) {
  const alerts = useMemo(() => {
    return employees
      .filter(e => e.nationality && e.nationality !== '日本' && e.residenceExpiry)
      .map(e => ({ employee: e, status: getExpiryStatus(e.residenceExpiry!) }))
      .filter(a => a.status.level === 'expired' || a.status.level === 'expiring')
      .sort((a, b) => a.status.daysLeft - b.status.daysLeft);
  }, [employees]);

  if (alerts.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-rose-50/80 to-amber-50/80 border border-rose-200/60 rounded-2xl p-5 mb-6 shadow-[0_4px_24px_rgba(244,63,94,0.05)] backdrop-blur-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-200/10 rounded-full blur-2xl -mr-10 -mt-10" />
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4 pb-3 border-b border-rose-100/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-500/10 border border-rose-200 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-rose-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">在留カード期限アラート ({alerts.length}件)</h3>
            <p className="text-xs text-rose-550 font-bold mt-0.5">有効期限が切れているか、間もなく切れる対象者がいます</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {alerts.map(({ employee: emp, status }) => (
          <div
            key={emp.id}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all hover:shadow-sm ${
              status.level === 'expired'
                ? 'bg-white border-red-200 shadow-[0_2px_8px_rgba(239,68,68,0.03)]'
                : 'bg-white border-amber-200 shadow-[0_2px_8px_rgba(245,158,11,0.03)]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {emp.avatar ? (
                <img src={emp.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
              ) : (
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-200">
                  {emp.firstNameKana?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {emp.lastName} {emp.firstName}
                  </p>
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                    {emp.nationality}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {emp.residenceStatus} | 期限: <span className="font-semibold text-slate-700">{formatDate(emp.residenceExpiry!)}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                status.level === 'expired'
                  ? 'bg-rose-50 text-rose-600 border border-rose-100'
                  : 'bg-amber-50 text-amber-600 border border-amber-100'
              }`}>
                {status.level === 'expired' ? `期限切れ (${Math.abs(status.daysLeft)}日)` : status.label}
              </span>
              <button
                onClick={() => onUpdate(emp)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg text-white shadow-sm hover:scale-[1.02] active:scale-95 transition-all ${
                  status.level === 'expired'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                }`}
              >
                更新
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeeDetailModal({ employee, onClose, onEdit }: { employee: Employee; onClose: () => void; onEdit: () => void }) {
  const [activeTab, setActiveTab] = useState<'basic' | 'contract' | 'visa' | 'background' | 'dependents'>('basic');
  const expiry = employee.residenceExpiry ? getExpiryStatus(employee.residenceExpiry) : null;
  const isForeigner = employee.nationality && employee.nationality !== '日本';

  // Fallback to basic tab if visa tab is selected for Japanese employees
  useEffect(() => {
    if (activeTab === 'visa' && !isForeigner) {
      setActiveTab('basic');
    }
  }, [employee, isForeigner, activeTab]);

  const handleExportPDF = async () => {
    const content = document.getElementById('employee-detail-pdf-print');
    if (!content) return;

    // Show the printable layout momentarily for canvas capture
    content.style.position = 'static';
    content.style.left = 'auto';

    const html2canvas = (await import('html2canvas-pro')).default;
    const { jsPDF } = await import('jspdf');

    const companyName = '株式会社ロング';
    const companyAddress = '〒100-0001 東京都千代田区千代田1-1-1 ロングビル3F';
    const scale = 2;

    const footerEl = document.createElement('div');
    footerEl.style.cssText = 'position:fixed;left:-9999px;top:0;background:white;padding:0 24px;font-family:sans-serif;width:' + content.offsetWidth + 'px;';
    footerEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b;">
        <span>${companyName}</span>
        <span>${companyAddress}</span>
        <span>1 / 1</span>
      </div>`;
    document.body.appendChild(footerEl);
    const footerCanvas = await html2canvas(footerEl, { scale, useCORS: true });
    document.body.removeChild(footerEl);

    const contentCanvas = await html2canvas(content, { scale, useCORS: true });

    // Put printable layout back off-screen
    content.style.position = 'fixed';
    content.style.left = '-9999px';

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgW = pdfW - margin * 2;
    const contentImgH = (contentCanvas.height * imgW) / contentCanvas.width;
    const footerImgH = (footerCanvas.height * imgW) / footerCanvas.width;
    const pageContentH = pdfH - margin * 2 - footerImgH;

    const combineWithFooter = (srcCanvas: HTMLCanvasElement, srcY: number, srcH: number) => {
      const totalH = srcH + footerCanvas.height;
      const combined = document.createElement('canvas');
      combined.width = srcCanvas.width;
      combined.height = totalH;
      const ctx = combined.getContext('2d')!;
      ctx.drawImage(srcCanvas, 0, srcY, srcCanvas.width, srcH, 0, 0, srcCanvas.width, srcH);
      ctx.drawImage(footerCanvas, 0, srcH, footerCanvas.width, footerCanvas.height);
      return combined;
    };

    if (contentImgH <= pageContentH) {
      const combined = combineWithFooter(contentCanvas, 0, contentCanvas.height);
      const combinedH = (combined.height * imgW) / combined.width;
      pdf.addImage(combined.toDataURL('image/png'), 'PNG', margin, margin, imgW, combinedH);
    } else {
      const totalPages = Math.ceil(contentImgH / pageContentH);
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        const srcY = Math.round((page * pageContentH / contentImgH) * contentCanvas.height);
        const srcH = Math.min(Math.round((pageContentH / contentImgH) * contentCanvas.height), contentCanvas.height - srcY);
        const combined = combineWithFooter(contentCanvas, srcY, srcH);
        const combinedH = (combined.height * imgW) / combined.width;
        pdf.addImage(combined.toDataURL('image/png'), 'PNG', margin, margin, imgW, combinedH);
      }
    }

    pdf.save(`${employee.lastName}_${employee.firstName}_info.pdf`);
  };

  const tabs = [
    { id: 'basic', label: '基本情報', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ) },
    { id: 'contract', label: '契約・給与', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ) },
    ...(isForeigner ? [{ id: 'visa', label: '在留資格', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2a2.5 2.5 0 002.5-2.5V10a2 2 0 00-2-2h-1a2 2 0 00-2-2V5a2 2 0 00-2-2h-1a2.5 2.5 0 00-2.5 2.5v.4M12 2a10 10 0 1010 10A10 10 0 0012 2z" />
      </svg>
    ) }] : []),
    { id: 'background', label: '学歴・資格', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
      </svg>
    ) },
    { id: 'dependents', label: '扶養家族', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ) },
  ];

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 animate-fadeIn" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex-shrink-0 flex items-center justify-between bg-slate-50/50 rounded-t-3xl relative">
          <div className="flex items-center gap-4">
            <div className="relative">
              {employee.avatar ? (
                <img src={employee.avatar} alt="" className="w-16 h-16 rounded-full object-cover ring-4 ring-blue-50 shadow-md" />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md ring-4 ring-blue-50">
                  {employee.firstNameKana?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">{employee.employeeCode}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  employee.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                  employee.status === 'ON_LEAVE' ? 'bg-blue-50 text-blue-700 border-blue-200/60' :
                  'bg-slate-50 text-slate-400 border-slate-200/60'
                }`}>
                  {employee.status === 'ACTIVE' ? '在籍中' : employee.status === 'ON_LEAVE' ? '休職中' : '退職'}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 mt-1">{employee.lastName} {employee.firstName}</h2>
              <p className="text-xs text-slate-450 font-semibold">{employee.lastNameKana} {employee.firstNameKana}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportPDF} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-95 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              PDF出力
            </button>
            <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-bold shadow-sm hover:scale-[1.02] active:scale-95 transition-all">編集</button>
            <button onClick={onClose} className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-655 flex items-center justify-center text-lg leading-none hover:bg-slate-50 transition-colors">&times;</button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl mx-6 my-4 border border-slate-200/50 flex-shrink-0 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/10'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents - Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          
          {/* TAB 1: Basic Info */}
          {activeTab === 'basic' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.333 0 4 .833 4 2.5V17H1" />
                  </svg>
                  所属・管理情報
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: '部署', value: employee.department?.name || '-' },
                    { label: '役職', value: employee.position?.name || '-' },
                    { label: '入社日', value: formatDate(employee.hireDate) },
                    { label: '生年月日', value: employee.birthDate ? formatDate(employee.birthDate) : '-' },
                    { label: '国籍', value: employee.nationality || '日本' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
                      <span className="text-xs text-slate-500 font-bold">{item.label}</span>
                      <span className="text-sm font-semibold text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  連絡先情報
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: 'メールアドレス', value: employee.email || '-', mono: true },
                    { label: '電話番号', value: employee.phone || '-', mono: true },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
                      <span className="text-xs text-slate-500 font-bold">{item.label}</span>
                      <span className={`text-sm font-semibold text-slate-800 ${item.mono ? 'font-mono' : ''}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Contract & Payroll */}
          {activeTab === 'contract' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  雇用契約・給与条件
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: '雇用形態', value: employee.contractType?.name || '正社員' },
                    { label: '契約開始日', value: employee.contractStartDate ? formatDate(employee.contractStartDate) : '-' },
                    { label: '契約終了区分', value: employee.contractEndDateType === 'fixed' ? '有期限' : '無期限' },
                    ...(employee.contractEndDateType === 'fixed' ? [{ label: '契約終了日', value: employee.contractEndDate ? formatDate(employee.contractEndDate) : '-' }] : []),
                    { label: '給与形態', value: employee.salaryType || '月給' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
                      <span className="text-xs text-slate-500 font-bold">{item.label}</span>
                      <span className="text-sm font-semibold text-slate-800">{item.value}</span>
                    </div>
                  ))}
                  <div className="col-span-full py-4 px-4 bg-emerald-50/30 border border-emerald-100/50 rounded-xl mt-2 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                        {employee.salaryType === '月給' ? '基本給 (月額)' : employee.salaryType === '時給' ? '時給単価' : '日給単価'}
                      </p>
                      <p className="text-2xl font-extrabold text-emerald-600 tracking-tight mt-1">
                        {employee.salaryType === '月給' ? formatCurrency(employee.salary) :
                         employee.salaryType === '時給' ? `${formatCurrency(employee.hourlyRate)}` :
                         `${formatCurrency(employee.dailyRate)}`}
                        <span className="text-xs font-bold text-slate-500 ml-1">
                          {employee.salaryType === '時給' ? '/ 時間' : employee.salaryType === '日給' ? '/ 日' : ''}
                        </span>
                      </p>
                    </div>
                    <svg className="w-8 h-8 text-emerald-500/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  社会保険・各種手当
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: '健康保険', enrolled: employee.benefits?.healthInsurance },
                    { label: '厚生年金', enrolled: employee.benefits?.pension },
                    { label: '雇用保険', enrolled: employee.benefits?.employmentInsurance },
                    { label: '労災保険', enrolled: employee.benefits?.workersComp },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 md:last:border-b">
                      <span className="text-xs text-slate-500 font-bold">{item.label}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                        item.enrolled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-250/60'
                          : 'bg-slate-50/50 text-slate-400 border-slate-200/60'
                      }`}>
                        {item.enrolled ? (
                          <>
                            <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            加入済み
                          </>
                        ) : '未加入'}
                      </span>
                    </div>
                  ))}
                  <div className="col-span-full grid grid-cols-2 gap-4 mt-2">
                    <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                      <p className="text-[10px] text-slate-450 font-bold">通勤手当 (月額)</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1 font-mono">{formatCurrency(employee.benefits?.transportation || 0)}</p>
                    </div>
                    <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                      <p className="text-[10px] text-slate-455 font-bold">住宅手当 (月額)</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-1 font-mono">{formatCurrency(employee.benefits?.housing || 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Residence / Visa */}
          {activeTab === 'visa' && isForeigner && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2a2.5 2.5 0 002.5-2.5V10a2 2 0 00-2-2h-1a2 2 0 00-2-2V5a2 2 0 00-2-2h-1a2.5 2.5 0 00-2.5 2.5v.4M12 2a10 10 0 1010 10A10 10 0 0012 2z" />
                  </svg>
                  在留資格・就労制限
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: '国籍', value: employee.nationality },
                    { label: '在留資格', value: employee.residenceStatus || '-' },
                    { label: '在留カード番号', value: employee.residenceCardNumber || '-', mono: true },
                    { label: '交付日', value: employee.residenceCardIssueDate ? formatDate(employee.residenceCardIssueDate) : '-' },
                    { label: '在留期限', value: employee.residenceExpiry ? formatDate(employee.residenceExpiry) : '-' },
                    { label: '就労制限', value: employee.workRestriction || '制限なし' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
                      <span className="text-xs text-slate-500 font-bold">{item.label}</span>
                      <span className={`text-sm font-semibold text-slate-805 ${item.mono ? 'font-mono' : ''}`}>{item.value}</span>
                    </div>
                  ))}
                  {expiry && (
                    <div className="col-span-full mt-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${expiry.colorClasses}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${expiry.level === 'expired' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        ステータス: {expiry.level === 'expired' ? `期限切れ (${Math.abs(expiry.daysLeft)}日超過)` : expiry.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {employee.residenceCardHistory && employee.residenceCardHistory.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    在留カード更新履歴
                  </h4>
                  <div className="relative border-l border-blue-100 ml-3 pl-5 space-y-4 py-2">
                    {employee.residenceCardHistory.map((h, i) => (
                      <div key={h.id} className="relative">
                        <span className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        </span>
                        <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 shadow-xs max-w-lg transition-colors">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              履歴 #{employee.residenceCardHistory!.length - i}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold font-mono">
                              更新日: {formatDate(h.updatedAt)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600 mt-2">
                            <p>在留資格: <strong className="text-slate-800">{h.residenceStatus || '-'}</strong></p>
                            <p>カード番号: <strong className="text-slate-800 font-mono">{h.residenceCardNumber || '-'}</strong></p>
                            <p className="col-span-2">在留期限: <strong className="text-slate-800 font-mono">{h.residenceExpiry ? formatDate(h.residenceExpiry) : '-'}</strong></p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Education & Certs */}
          {activeTab === 'background' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Education */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                  学歴
                </h3>
                {employee.education && employee.education.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {employee.education.map((ed, i) => (
                      <div key={i} className="p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors rounded-2xl border border-slate-200/60 flex justify-between items-center shadow-xs">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800">{ed.school}</p>
                          <p className="text-xs text-slate-500">{ed.degree || '-'} • {ed.major || '-'}</p>
                        </div>
                        <span className="text-xs font-bold bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-xl text-slate-655 shadow-xs font-mono">{ed.graduationYear}年卒</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                    <p className="text-xs text-slate-400">学歴情報が登録されていません</p>
                  </div>
                )}
              </div>

              {/* Certifications */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  取得資格・免許 ({employee.certifications?.length ?? 0}件)
                </h3>
                {employee.certifications && employee.certifications.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {employee.certifications.map((cert, i) => (
                      <div key={i} className="p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors rounded-2xl border border-slate-200/60 flex justify-between items-center shadow-xs">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800">{cert.name}</p>
                          <p className="text-xs text-slate-500">{cert.issuer || '-'} | 取得: {cert.acquiredDate ? formatDate(cert.acquiredDate) : '-'}</p>
                        </div>
                        {cert.expiryDate && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-lg">
                            期限: {formatDate(cert.expiryDate)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                    <p className="text-xs text-slate-400">資格情報が登録されていません</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Dependents */}
          {activeTab === 'dependents' && (
            <div className="space-y-3 animate-fadeIn">
              <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                扶養家族一覧 ({employee.dependents?.length ?? 0}名)
              </h3>
              {employee.dependents && employee.dependents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employee.dependents.map((d, i) => (
                    <div key={i} className="p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors rounded-2xl border border-slate-200/60 flex justify-between items-center shadow-xs">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">{d.name}</p>
                        <p className="text-xs text-slate-500">{d.relationship} • {d.gender || '-'} • {d.cohabitation}</p>
                      </div>
                      {d.birthDate && (
                        <span className="text-xs font-bold bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-xl text-slate-655 shadow-xs font-mono">
                          {formatDate(d.birthDate)} 生
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                  <p className="text-xs text-slate-400">扶養家族はいません</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Hidden complete sheet for PDF Printing */}
        <div id="employee-detail-pdf-print" className="p-8 bg-white text-slate-800 flex flex-col gap-6" style={{ position: 'fixed', left: '-9999px', top: 0, width: '800px' }}>
          <div className="flex items-center gap-6 border-b pb-6">
            <div className="w-20 h-20 bg-blue-100 border rounded-full flex items-center justify-center text-3xl font-bold text-blue-600 shadow-sm">
              {employee.firstNameKana?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 inline-block">{employee.employeeCode}</p>
              <h2 className="text-2xl font-bold text-slate-800 mt-1">{employee.lastName} {employee.firstName}</h2>
              <p className="text-xs text-slate-400 font-bold">{employee.lastNameKana} {employee.firstNameKana} | 入社日: {formatDate(employee.hireDate)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-1">👤 基本所属・連絡先</h3>
              <p className="text-xs text-slate-600">部署: <strong>{employee.department?.name || '-'}</strong> | 役職: <strong>{employee.position?.name || '-'}</strong></p>
              <p className="text-xs text-slate-600">メール: {employee.email} | 電話: {employee.phone}</p>
              <p className="text-xs text-slate-600">雇用形態: {employee.contractType?.name} | 給与: {formatCurrency(employee.salary)}</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 border-b pb-1">🛂 在留資格・就労制限</h3>
              <p className="text-xs text-slate-600">国籍: {employee.nationality} | 在留資格: {employee.residenceStatus || '-'}</p>
              <p className="text-xs text-slate-600">在留カード番号: {employee.residenceCardNumber || '-'}</p>
              <p className="text-xs text-slate-600">在留期限: {employee.residenceExpiry ? formatDate(employee.residenceExpiry) : '-'}</p>
            </div>
            {employee.dependents && employee.dependents.length > 0 && (
              <div className="col-span-2 space-y-2">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-1">👥 扶養家族</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {employee.dependents.map((d, i) => (
                    <p key={i} className="bg-slate-50 p-2 border rounded">{d.name} ({d.relationship} • {d.cohabitation})</p>
                  ))}
                </div>
              </div>
            )}
            {employee.education && employee.education.length > 0 && (
              <div className="col-span-2 space-y-2">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-1">🎓 学歴</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {employee.education.map((e, i) => (
                    <p key={i} className="bg-slate-50 p-2 border rounded">{e.school} — {e.graduationYear}年卒</p>
                  ))}
                </div>
              </div>
            )}
            {employee.certifications && employee.certifications.length > 0 && (
              <div className="col-span-2 space-y-2">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-1">📜 免許・資格</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {employee.certifications.map((c, i) => (
                    <p key={i} className="bg-slate-50 p-2 border rounded">{c.name} ({c.issuer})</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
    </Portal>
  );
}

export default function EmployeesClient({ initialEmployees }: { initialEmployees: Employee[] }) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchField, setSearchField] = useState<string>('all');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    no: true, code: true, name: true, department: true, position: true,
    birthDate: true, nationality: true, visa: true, hireDate: true, card: true, expiry: true,
  });

  const allColumns = [
    { key: 'no', label: 'No.' },
    { key: 'code', label: 'コード' },
    { key: 'name', label: '氏名' },
    { key: 'department', label: '部署' },
    { key: 'position', label: '役職' },
    { key: 'birthDate', label: '生年月日' },
    { key: 'nationality', label: '国籍' },
    { key: 'visa', label: 'ビザ種類' },
    { key: 'hireDate', label: '入社日' },
    { key: 'card', label: '在留カード' },
    { key: 'expiry', label: '期限' },
  ];

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeColumns = allColumns.filter(c => visibleColumns[c.key]);

  const columnWidths: Record<string, number> = {
    no: 50,
    code: 100,
    name: 185,
    department: 140,
    position: 120,
    birthDate: 120,
    nationality: 100,
    visa: 155,
    hireDate: 120,
    card: 150,
    expiry: 120,
  };

  const totalTableWidth = activeColumns.reduce((sum, col) => sum + (columnWidths[col.key] || 100), 0) + 100;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const departments = useMemo(() => {
    const unique = [...new Set(employees.map(e => e.department?.name).filter(Boolean))];
    return unique.map(d => ({ value: d, label: d }));
  }, [employees]);

  const handleColumnFilter = (key: string, values: string[]) => {
    setColumnFilters(prev => ({ ...prev, [key]: values }));
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = employees.filter(emp => {
      let matchSearch = true;
      if (q) {
        switch (searchField) {
          case 'all':
            matchSearch =
              `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(q) ||
              `${emp.lastNameKana} ${emp.firstNameKana}`.toLowerCase().includes(q) ||
              emp.employeeCode?.toLowerCase().includes(q) ||
              emp.email?.toLowerCase().includes(q) ||
              emp.phone?.includes(q) ||
              emp.nationality?.toLowerCase().includes(q) ||
              emp.position?.name?.toLowerCase().includes(q) ||
              emp.contractType?.name?.toLowerCase().includes(q) ||
              emp.department?.name?.toLowerCase().includes(q) ||
              (emp.birthDate && emp.birthDate.includes(q)) ||
              (emp.residenceStatus && emp.residenceStatus.toLowerCase().includes(q)) ||
              emp.education?.some(ed =>
                ed.school?.toLowerCase().includes(q) ||
                ed.degree?.toLowerCase().includes(q) ||
                ed.major?.toLowerCase().includes(q) ||
                ed.graduationYear?.includes(q)
              ) ||
              emp.certifications?.some(c =>
                c.name?.toLowerCase().includes(q) ||
                c.issuer?.toLowerCase().includes(q)
              ) ||
              emp.dependents?.some(d =>
                d.name?.toLowerCase().includes(q) ||
                d.relationship?.toLowerCase().includes(q)
              );
            break;
          case 'name':
            matchSearch =
              `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(q) ||
              `${emp.lastNameKana} ${emp.firstNameKana}`.toLowerCase().includes(q);
            break;
          case 'code':
            matchSearch = emp.employeeCode?.toLowerCase().includes(q) ?? false;
            break;
          case 'email':
            matchSearch = emp.email?.toLowerCase().includes(q) ?? false;
            break;
          case 'phone':
            matchSearch = emp.phone?.includes(q) ?? false;
            break;
          case 'nationality':
            matchSearch = emp.nationality?.toLowerCase().includes(q) ?? false;
            break;
          case 'birthDate':
            matchSearch = emp.birthDate?.includes(q) ?? false;
            break;
          case 'position':
            matchSearch = emp.position?.name?.toLowerCase().includes(q) ?? false;
            break;
          case 'contract':
            matchSearch = emp.contractType?.name?.toLowerCase().includes(q) ?? false;
            break;
          case 'visa':
            matchSearch = emp.residenceStatus?.toLowerCase().includes(q) ?? false;
            break;
          case 'education':
            matchSearch = emp.education?.some(ed =>
              ed.school?.toLowerCase().includes(q) ||
              ed.degree?.toLowerCase().includes(q) ||
              ed.major?.toLowerCase().includes(q) ||
              ed.graduationYear?.includes(q)
            ) ?? false;
            break;
          case 'certification':
            matchSearch = emp.certifications?.some(c =>
              c.name?.toLowerCase().includes(q) ||
              c.issuer?.toLowerCase().includes(q)
            ) ?? false;
            break;
          case 'dependent':
            matchSearch = emp.dependents?.some(d =>
              d.name?.toLowerCase().includes(q) ||
              d.relationship?.toLowerCase().includes(q)
            ) ?? false;
            break;
          default:
            matchSearch = true;
        }
      }

      const cf = columnFilters;
      const matchDept = !cf.department?.length || cf.department.includes(emp.department?.name || '');
      const matchStatus = !cf.status?.length || cf.status.includes(emp.status);

      return matchSearch && matchDept && matchStatus;
    });

    if (sortField) {
      result.sort((a, b) => {
        let va = '';
        let vb = '';
        switch (sortField) {
          case 'code': va = a.employeeCode || ''; vb = b.employeeCode || ''; break;
          case 'name': va = `${a.lastName} ${a.firstName}`; vb = `${b.lastName} ${b.firstName}`; break;
          case 'department': va = a.department?.name || ''; vb = b.department?.name || ''; break;
          case 'position': va = a.position?.name || ''; vb = b.position?.name || ''; break;
          case 'birthDate': va = a.birthDate || ''; vb = b.birthDate || ''; break;
          case 'nationality': va = a.nationality || ''; vb = b.nationality || ''; break;
          case 'visa': va = a.residenceStatus || ''; vb = b.residenceStatus || ''; break;
          case 'hireDate': va = a.hireDate || ''; vb = b.hireDate || ''; break;
          case 'card': va = a.residenceCardNumber || ''; vb = b.residenceCardNumber || ''; break;
          case 'expiry': va = a.residenceExpiry || ''; vb = b.residenceExpiry || ''; break;
          case 'createdAt': va = a.createdAt || ''; vb = b.createdAt || ''; break;
          default: return 0;
        }
        const cmp = va.localeCompare(vb, 'ja');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [employees, search, columnFilters, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const refetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees?limit=100');
      const result = await res.json();
      if (result.data) {
        setEmployees(result.data);
      }
    } catch (err) {
      console.error('Failed to refetch employees:', err);
    }
  };

  const handleSave = async (data: Omit<Employee, 'id'>, id?: string) => {
    setLoading(true);
    try {
      if (id) {
        // Update
        const res = await fetch(`/api/employees/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.details || err.error || '更新に失敗しました');
        }
      } else {
        // Create
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.details || err.error || '作成に失敗しました');
        }
      }
      await refetchEmployees();
    } catch (err: any) {
      console.error('Save failed:', err);
      alert(err.message || '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await refetchEmployees();
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setModalOpen(true);
    setViewingEmployee(null);
  };

  const openCreate = () => {
    setEditingEmployee(null);
    setModalOpen(true);
  };

  const statusCounts = useMemo(() => ({
    all: employees.length,
    active: employees.filter(e => e.status === 'ACTIVE').length,
    onLeave: employees.filter(e => e.status === 'ON_LEAVE').length,
    inactive: employees.filter(e => e.status === 'INACTIVE').length,
  }), [employees]);

  return (
    <>
      {/* Residence Card Alert Banner */}
      <ResidenceAlertBanner employees={employees} onUpdate={openEdit} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {[
          {
            label: '総従業員数',
            value: statusCounts.all,
            color: 'text-slate-900',
            borderColor: 'border-slate-200/80',
            bg: 'bg-white',
            accent: 'bg-slate-500',
            icon: (
              <svg className="w-5 h-5 text-slate-505" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            )
          },
          {
            label: '在籍中',
            value: statusCounts.active,
            color: 'text-emerald-600',
            borderColor: 'border-emerald-200/80',
            bg: 'bg-emerald-50/20',
            accent: 'bg-emerald-500',
            icon: (
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            pulse: true
          },
          {
            label: '休職中',
            value: statusCounts.onLeave,
            color: 'text-sky-600',
            borderColor: 'border-sky-200/80',
            bg: 'bg-sky-50/20',
            accent: 'bg-sky-500',
            icon: (
              <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          },
          {
            label: '退職',
            value: statusCounts.inactive,
            color: 'text-slate-400',
            borderColor: 'border-slate-200/80',
            bg: 'bg-slate-50/30',
            accent: 'bg-slate-300',
            icon: (
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )
          },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.borderColor} rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all hover:translate-y-[-2px] hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.06)] flex justify-between items-start relative overflow-hidden group`}>
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-transparent to-transparent group-hover:from-blue-500 group-hover:to-indigo-600 transition-all duration-300" />
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-extrabold ${s.color} tracking-tight`}>{s.value}</span>
                <span className="text-xs text-slate-400 font-bold">名</span>
              </div>
            </div>
            <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center justify-center relative">
              {s.pulse && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Employee List */}
      <Card
        title="従業員一覧"
        action={
          <button onClick={openCreate} disabled={loading} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            従業員を追加
          </button>
        }
      >
        {/* Search & Export */}
        <div className="flex flex-col lg:flex-row gap-3 mb-6 bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
            <div className="relative">
              <select
                value={searchField}
                onChange={e => { setSearchField(e.target.value); setCurrentPage(1); }}
                className="pl-3 pr-8 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl text-xs font-bold bg-white cursor-pointer select-none appearance-none shadow-xs w-full sm:w-[140px]"
              >
                <option value="all">🔍 全項目</option>
                <option value="name">氏名</option>
                <option value="code">従業員コード</option>
                <option value="email">メール</option>
                <option value="phone">電話番号</option>
                <option value="nationality">国籍</option>
                <option value="birthDate">生年月日</option>
                <option value="position">役職</option>
                <option value="contract">雇用形態</option>
                <option value="visa">在留資格</option>
                <option value="education">学歴</option>
                <option value="certification">資格</option>
                <option value="dependent">扶養家族</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={searchField === 'all' ? '従業員名、コード、学歴、資格、扶養家族などから検索...' : `選択した項目から検索...`}
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl text-xs shadow-xs"
              />
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-center">
            <select value={columnFilters.department?.[0] || ''} onChange={e => handleColumnFilter('department', e.target.value ? [e.target.value] : [])}
              className="px-3 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl text-xs font-bold bg-white cursor-pointer shadow-xs">
              <option value="">🏢 全部署</option>
              {departments.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <select value={columnFilters.status?.[0] || ''} onChange={e => handleColumnFilter('status', e.target.value ? [e.target.value] : [])}
              className="px-3 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl text-xs font-bold bg-white cursor-pointer shadow-xs">
              <option value="">🟢 全ての状態</option>
              {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <div className="relative">
              <button onClick={() => setShowColumnSettings(!showColumnSettings)} className="px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 shadow-xs bg-white">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                表示項目
              </button>
              {showColumnSettings && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-20 p-4 min-w-[200px] animate-fadeIn">
                  <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider pb-1.5 border-b">表示する列を選択</p>
                  <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                    {allColumns.map(col => (
                      <label key={col.key} className="flex items-center gap-2.5 py-1.5 px-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                        <input type="checkbox" checked={visibleColumns[col.key]} onChange={() => toggleColumn(col.key)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
                        <span className="text-xs font-semibold text-slate-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <ExportButtons
              data={filtered.map(e => ({
                code: e.employeeCode || '-',
                name: `${e.lastName} ${e.firstName}`,
                department: e.department?.name || '-',
                position: e.position?.name || '-',
                birthDate: e.birthDate ? formatDate(e.birthDate) : '-',
                nationality: e.nationality || '-',
                visaType: e.nationality && e.nationality !== '日本' ? e.residenceStatus || '-' : '-',
                hireDate: formatDate(e.hireDate),
                cardNumber: e.nationality && e.nationality !== '日本' ? e.residenceCardNumber || '-' : '-',
                expiry: e.nationality && e.nationality !== '日本' && e.residenceExpiry ? formatDate(e.residenceExpiry) : '-',
              }))}
              columns={[
                { header: 'コード', key: 'code' },
                { header: '名前', key: 'name' },
                { header: '部署', key: 'department' },
                { header: '役職', key: 'position' },
                { header: '生年月日', key: 'birthDate' },
                { header: '国籍', key: 'nationality' },
                { header: 'ビザ種類', key: 'visaType' },
                { header: '入社日', key: 'hireDate' },
                { header: '在留カード番号', key: 'cardNumber' },
                { header: '期限', key: 'expiry' },
              ]}
              fileName="従業員一覧"
              rowsPerPage={PAGE_SIZE}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200/70 rounded-2xl shadow-xs mb-5 bg-white">
          <table className="table-fixed border-collapse" style={{ width: '100%', minWidth: `${totalTableWidth}px` }}>
            <colgroup>
              {activeColumns.map(col => (
                <col key={col.key} style={{ width: `${columnWidths[col.key]}px` }} />
              ))}
              <col style={{ width: '100px' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200">
                {activeColumns.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider ${col.key === 'no' ? 'text-center' : 'cursor-pointer select-none hover:bg-slate-100 transition-colors'}`}
                    style={{ width: `${columnWidths[col.key]}px` }}
                    onClick={col.key === 'no' ? undefined : () => handleSort(col.key)}
                  >
                    {col.key === 'no' ? col.label : (
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortField === col.key ? (
                          sortDir === 'asc' ? (
                            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                          ) : (
                            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                          )
                        ) : (
                          <svg className="w-3 h-3 text-slate-355" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                        )}
                      </span>
                    )}
                  </th>
                ))}
                <th className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[100px]" style={{ width: '100px' }}>操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-150">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + 1} className="px-4 py-16 text-center text-slate-400 font-semibold">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        読み込み中...
                      </span>
                    ) : '該当する従業員が見つかりません'}
                  </td>
                </tr>
              ) : (
                paginated.map((employee, idx) => (
                  <tr key={employee.id} className="hover:bg-slate-50/80 cursor-pointer transition-colors" onClick={() => setViewingEmployee(employee)}>
                    {visibleColumns.no && <td className="px-4 py-3.5 text-xs text-slate-450 font-bold font-mono text-center">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>}
                    {visibleColumns.code && <td className="px-4 py-3.5"><span className="text-xs font-mono font-bold text-blue-600 bg-blue-50/50 px-2 py-1 rounded border border-blue-100 truncate block max-w-full text-center">{employee.employeeCode}</span></td>}
                    {visibleColumns.name && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative flex-shrink-0">
                            {employee.avatar ? (
                              <img src={employee.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-tr from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-650 border border-slate-200">
                                {employee.firstNameKana?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              employee.status === 'ACTIVE' ? 'bg-emerald-500' :
                              employee.status === 'ON_LEAVE' ? 'bg-blue-500' : 'bg-slate-300'
                            }`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{employee.lastName} {employee.firstName}</p>
                            <p className="text-[10px] text-slate-400 font-semibold truncate">{employee.lastNameKana} {employee.firstNameKana}</p>
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.department && <td className="px-4 py-3.5 text-xs font-bold text-slate-700 truncate">{employee.department?.name || <span className="text-slate-300">-</span>}</td>}
                    {visibleColumns.position && <td className="px-4 py-3.5 text-xs font-semibold text-slate-650 truncate">{employee.position?.name || <span className="text-slate-300">-</span>}</td>}
                    {visibleColumns.birthDate && <td className="px-4 py-3.5 text-xs font-medium text-slate-650 font-mono truncate">{employee.birthDate ? formatDate(employee.birthDate) : <span className="text-slate-300">-</span>}</td>}
                    {visibleColumns.nationality && <td className="px-4 py-3.5 text-xs font-bold text-slate-700 truncate">{employee.nationality || <span className="text-slate-300">-</span>}</td>}
                    {visibleColumns.visa && (
                      <td className="px-4 py-3.5 text-xs">
                        {employee.nationality && employee.nationality !== '日本' ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100 truncate block max-w-full text-center">{employee.residenceStatus || '-'}</span>
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                    )}
                    {visibleColumns.hireDate && <td className="px-4 py-3.5 text-xs font-medium text-slate-650 font-mono truncate">{formatDate(employee.hireDate)}</td>}
                    {visibleColumns.card && (
                      <td className="px-4 py-3.5 text-xs font-mono font-semibold text-slate-650 truncate">
                        {employee.nationality && employee.nationality !== '日本' ? employee.residenceCardNumber || '-' : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                    )}
                    {visibleColumns.expiry && (
                      <td className="px-4 py-3.5 text-xs">
                        {employee.nationality && employee.nationality !== '日本' && employee.residenceExpiry ? (
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${getExpiryStatus(employee.residenceExpiry).colorClasses} truncate block max-w-full text-center`}>
                            {formatDate(employee.residenceExpiry)}
                          </span>
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5 justify-center">
                        <button onClick={() => openEdit(employee)} className="p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all hover:scale-105 active:scale-95" title="編集">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeleteTarget(employee)} className="p-2 text-red-655 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all hover:scale-105 active:scale-95" title="削除">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 font-bold">
            {filtered.length} 件中 {(currentPage - 1) * PAGE_SIZE + 1}〜{Math.min(currentPage * PAGE_SIZE, filtered.length)} 件を表示
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-2 text-xs font-bold border border-slate-200/80 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white shadow-xs"
            >
              前へ
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                  page === currentPage
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3.5 py-2 text-xs font-bold border border-slate-200/80 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white shadow-xs"
            >
              次へ
            </button>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <EmployeeFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        employee={editingEmployee}
      />
      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        employeeName={deleteTarget ? `${deleteTarget.lastName} ${deleteTarget.firstName}` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      {viewingEmployee && (
        <EmployeeDetailModal
          employee={viewingEmployee}
          onClose={() => setViewingEmployee(null)}
          onEdit={() => openEdit(viewingEmployee)}
        />
      )}
    </>
  );
}
