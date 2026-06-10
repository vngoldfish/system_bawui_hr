'use client';

import { RefObject, useState } from 'react';
import { useI18n } from '@/lib/i18n';

interface ExportButtonsProps {
  data: Record<string, unknown>[];
  columns: { header: string; key: string; show?: boolean }[];
  fileName: string;
  tableRef?: RefObject<HTMLTableElement | null>;
  rowsPerPage?: number;
}

export default function ExportButtons({ data, columns, fileName, tableRef, rowsPerPage: rowsPerPageProp }: ExportButtonsProps) {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pageCount, setPageCount] = useState(0);

  const activeCols = columns.filter(c => c.show !== false);

  const getRowsPerPage = () => rowsPerPageProp ?? 10;
  const getTotalPages = () => Math.max(1, Math.ceil(data.length / getRowsPerPage()));

  const openPdfModal = () => {
    const total = getTotalPages();
    setPageCount(total);
    setSelectedPages(Array.from({ length: total }, (_, i) => i + 1));
    setShowModal(true);
  };

  const togglePage = (page: number) => {
    setSelectedPages(prev =>
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page].sort((a, b) => a - b)
    );
  };

  const toggleAll = () => {
    setSelectedPages(prev =>
      prev.length === pageCount ? [] : Array.from({ length: pageCount }, (_, i) => i + 1)
    );
  };

  const exportToExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = data.map(row =>
      activeCols.reduce((acc, col) => {
        acc[col.header] = row[col.key] ?? '';
        return acc;
      }, {} as Record<string, unknown>)
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const exportToJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `${fileName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportToPdf = async (pages: number[]) => {
    if (pages.length === 0) return;

    const html2canvas = (await import('html2canvas-pro')).default;
    const { jsPDF } = await import('jspdf');

    const pdf = new jsPDF('l', 'mm', 'a4');
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgW = pdfW - margin * 2;

    let companyName = t('common.companyName');
    let companyAddress = t('common.companyAddress');
    if (typeof window !== 'undefined') {
      const savedInfo = localStorage.getItem('company_info');
      if (savedInfo) {
        try {
          const parsed = JSON.parse(savedInfo);
          if (parsed.name) companyName = parsed.name;
          if (parsed.address) companyAddress = parsed.address;
        } catch (e) {
          // ignore
        }
      }
    }

    const headerHtml = `<tr style="background:#334155;color:white;">${activeCols.map(c => `<th style="padding:8px 12px;text-align:left;border:1px solid #475569;">${c.header}</th>`).join('')}</tr>`;
    const rowHtml = (row: Record<string, unknown>, i: number) =>
      `<tr style="background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">${activeCols.map(c => `<td style="padding:6px 12px;border:1px solid #e2e8f0;">${row[c.key] ?? ''}</td>`).join('')}</tr>`;

    const rpp = getRowsPerPage();
    const total = pages.length;

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();

      const pageNum = pages[i];
      const start = (pageNum - 1) * rpp;
      const pageRows = data.slice(start, start + rpp);

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;background:white;padding:20px;font-family:sans-serif;width:1000px;';
      wrapper.innerHTML = `
        <h2 style="font-size:18px;margin-bottom:12px;color:#1e293b;">${fileName}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>${headerHtml}</thead>
          <tbody>${pageRows.map((row, idx) => rowHtml(row, idx)).join('')}</tbody>
        </table>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid #e2e8f0;margin-top:12px;font-size:10px;color:#64748b;">
          <span>${companyName}</span>
          <span>${companyAddress}</span>
          <span>${i + 1} / ${total}</span>
        </div>`;
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true });
      document.body.removeChild(wrapper);

      const imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, imgH);
    }

    pdf.save(`${fileName}.pdf`);
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={exportToExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Excel
        </button>
        <button
          onClick={exportToJson}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          JSON
        </button>
        <button
          onClick={openPdfModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          PDF
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">{t('common.exportPdfTitle')}</h3>

            <div className="space-y-2 mb-4">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map(page => {
                const rpp = getRowsPerPage();
                const start = (page - 1) * rpp + 1;
                const end = Math.min(page * rpp, data.length);
                return (
                  <label key={page} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPages.includes(page)}
                      onChange={() => togglePage(page)}
                      className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-sm text-slate-700">
                      {t('common.exportPageLabel').replace('{page}', String(page)).replace('{start}', String(start)).replace('{end}', String(end))}
                    </span>
                  </label>
                );
              })}
            </div>

            <button
              onClick={toggleAll}
              className="text-sm text-blue-600 hover:text-blue-800 mb-4"
            >
              {selectedPages.length === pageCount ? t('common.uncheckAll') : t('common.checkAll')}
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => { setShowModal(false); exportToPdf(selectedPages); }}
                disabled={selectedPages.length === 0}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.exportBtn').replace('{pages}', String(selectedPages.length))}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
