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

const btnTranslations: Record<string, { tablePdf: string; pagePdf: string; screenshot: string }> = {
  vi: {
    tablePdf: 'PDF (Bảng)',
    pagePdf: 'PDF (Trang)',
    screenshot: 'Chụp ảnh',
  },
  ja: {
    tablePdf: 'PDF (テーブル)',
    pagePdf: 'PDF (全体ページ)',
    screenshot: '画面キャプチャ',
  },
  en: {
    tablePdf: 'PDF (Table)',
    pagePdf: 'PDF (Page)',
    screenshot: 'Screenshot',
  },
  zh: {
    tablePdf: 'PDF (表格)',
    pagePdf: 'PDF (页面)',
    screenshot: '屏幕截图',
  },
  th: {
    tablePdf: 'PDF (ตาราง)',
    pagePdf: 'PDF (หน้าเว็บ)',
    screenshot: 'จับภาพหน้าจอ',
  },
};

const dropdownLabel: Record<string, string> = {
  vi: 'Xuất & Chụp ảnh',
  ja: 'エクスポート & キャプチャ',
  en: 'Export & Capture',
  zh: '导出与截图',
  th: 'ส่งออกและจับภาพ',
};

const sectionExportLabel: Record<string, string> = {
  vi: 'Xuất dữ liệu',
  ja: 'データ出力',
  en: 'Export Data',
  zh: '导出数据',
  th: 'ส่งออกข้อมูล',
};

const sectionCaptureLabel: Record<string, string> = {
  vi: 'Chụp & PDF trang',
  ja: '画面保存',
  en: 'Page Capture',
  zh: '页面截图',
  th: 'จับภาพหน้าเว็บ',
};

export default function ExportButtons({ data, columns, fileName, tableRef, rowsPerPage: rowsPerPageProp }: ExportButtonsProps) {
  const { t, locale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pageCount, setPageCount] = useState(0);

  const activeCols = columns.filter(c => c.show !== false);
  const currentLocale = (locale as string) || 'ja';
  const trans = btnTranslations[currentLocale] || btnTranslations['ja'];
  const label = dropdownLabel[currentLocale] || dropdownLabel['ja'];

  const getRowsPerPage = () => {
    if (rowsPerPageProp) {
      return Math.min(rowsPerPageProp, 25);
    }
    return 15;
  };
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

    const rpp = getRowsPerPage();
    const total = pages.length;

    const fontSize = rpp <= 15 ? '12px' : '10px';
    const cellPadding = rpp <= 15 ? '6px 12px' : '4px 8px';
    const headerPadding = rpp <= 15 ? '8px 12px' : '6px 8px';

    const headerHtml = `<tr style="background:#334155;color:white;">${activeCols.map(c => `<th style="padding:${headerPadding};text-align:left;border:1px solid #475569;white-space:nowrap;">${c.header}</th>`).join('')}</tr>`;
    const rowHtml = (row: Record<string, unknown>, i: number) =>
      `<tr style="background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">${activeCols.map(c => `<td style="padding:${cellPadding};border:1px solid #e2e8f0;white-space:nowrap;">${row[c.key] ?? ''}</td>`).join('')}</tr>`;

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();

      const pageNum = pages[i];
      const start = (pageNum - 1) * rpp;
      const pageRows = data.slice(start, start + rpp);

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;background:white;padding:20px;font-family:sans-serif;width:1500px;';
      wrapper.innerHTML = `
        <h2 style="font-size:18px;margin-bottom:12px;color:#1e293b;">${fileName}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:${fontSize};">
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

      let finalW = imgW;
      let finalH = (canvas.height * imgW) / canvas.width;
      const maxH = pdfH - margin * 2;
      if (finalH > maxH) {
        finalH = maxH;
        finalW = (canvas.width * finalH) / canvas.height;
      }
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, finalW, finalH);
    }

    pdf.save(`${fileName}.pdf`);
  };

  const expandScrollableElements = (mainEl: HTMLElement) => {
    const affectedElements: { element: HTMLElement; styles: Record<string, string> }[] = [];
    const descendants = mainEl.querySelectorAll('*');
    
    descendants.forEach(el => {
      const htmlEl = el as HTMLElement;
      const computed = window.getComputedStyle(htmlEl);
      const isScrollableY = computed.overflowY === 'auto' || computed.overflowY === 'scroll';
      const isScrollableX = computed.overflowX === 'auto' || computed.overflowX === 'scroll';
      const hasMaxHeight = computed.maxHeight !== 'none';
      
      if (isScrollableY || isScrollableX || hasMaxHeight) {
        affectedElements.push({
          element: htmlEl,
          styles: {
            height: htmlEl.style.height,
            maxHeight: htmlEl.style.maxHeight,
            overflow: htmlEl.style.overflow,
            overflowY: htmlEl.style.overflowY,
            overflowX: htmlEl.style.overflowX,
          }
        });
        
        if (hasMaxHeight) htmlEl.style.maxHeight = 'none';
        if (isScrollableY || isScrollableX) {
          htmlEl.style.overflow = 'visible';
          htmlEl.style.overflowY = 'visible';
          htmlEl.style.overflowX = 'visible';
        }
        if (htmlEl.scrollHeight > htmlEl.clientHeight) {
          htmlEl.style.height = 'auto';
        }
      }
    });
    
    return affectedElements;
  };

  const restoreScrollableElements = (affected: { element: HTMLElement; styles: Record<string, string> }[]) => {
    affected.forEach(item => {
      item.element.style.height = item.styles.height;
      item.element.style.maxHeight = item.styles.maxHeight;
      item.element.style.overflow = item.styles.overflow;
      item.element.style.overflowY = item.styles.overflowY;
      item.element.style.overflowX = item.styles.overflowX;
    });
  };

  const captureFullPage = async () => {
    const html2canvas = (await import('html2canvas-pro')).default;
    const mainEl = document.querySelector('main');
    if (!mainEl) {
      alert('Không tìm thấy vùng nội dung chính để chụp.');
      return;
    }

    const originalMaxHeight = mainEl.style.maxHeight;
    const originalOverflow = mainEl.style.overflow;
    const originalOverflowY = mainEl.style.overflowY;
    
    let affectedElements: { element: HTMLElement; styles: Record<string, string> }[] = [];

    try {
      mainEl.style.maxHeight = 'none';
      mainEl.style.overflow = 'visible';
      mainEl.style.overflowY = 'visible';
      
      affectedElements = expandScrollableElements(mainEl);

      const canvas = await html2canvas(mainEl as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#f8fafc',
        height: mainEl.scrollHeight,
        windowHeight: mainEl.scrollHeight,
        scrollY: 0,
        scrollX: 0,
      });

      restoreScrollableElements(affectedElements);
      mainEl.style.maxHeight = originalMaxHeight;
      mainEl.style.overflow = originalOverflow;
      mainEl.style.overflowY = originalOverflowY;

      const link = document.createElement('a');
      link.download = `${fileName}_screenshot.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      restoreScrollableElements(affectedElements);
      mainEl.style.maxHeight = originalMaxHeight;
      mainEl.style.overflow = originalOverflow;
      mainEl.style.overflowY = originalOverflowY;

      console.error('Failed to capture screenshot:', error);
      alert('Chụp ảnh trang web thất bại. Vui lòng thử lại.');
    }
  };

  const exportFullPageToPdf = async () => {
    const html2canvas = (await import('html2canvas-pro')).default;
    const { jsPDF } = await import('jspdf');
    const mainEl = document.querySelector('main');
    if (!mainEl) {
      alert('Không tìm thấy vùng nội dung chính để xuất PDF.');
      return;
    }

    const originalMaxHeight = mainEl.style.maxHeight;
    const originalOverflow = mainEl.style.overflow;
    const originalOverflowY = mainEl.style.overflowY;

    let affectedElements: { element: HTMLElement; styles: Record<string, string> }[] = [];

    try {
      mainEl.style.maxHeight = 'none';
      mainEl.style.overflow = 'visible';
      mainEl.style.overflowY = 'visible';

      affectedElements = expandScrollableElements(mainEl);

      const canvas = await html2canvas(mainEl as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#f8fafc',
        height: mainEl.scrollHeight,
        windowHeight: mainEl.scrollHeight,
        scrollY: 0,
        scrollX: 0,
      });

      restoreScrollableElements(affectedElements);
      mainEl.style.maxHeight = originalMaxHeight;
      mainEl.style.overflow = originalOverflow;
      mainEl.style.overflowY = originalOverflowY;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgW = pdfW - margin * 2;
      const imgH = pdfH - margin * 2; // Printable page height in mm

      const pxPerPage = (imgH * canvas.width) / imgW;
      
      let yOffset = 0;
      let pageIndex = 0;

      while (yOffset < canvas.height) {
        if (pageIndex > 0) pdf.addPage();

        const chunkH = Math.min(pxPerPage, canvas.height - yOffset);
        
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = canvas.width;
        croppedCanvas.height = chunkH;
        const ctx = croppedCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, yOffset, canvas.width, chunkH, 0, 0, canvas.width, chunkH);
        }

        const chunkPdfH = (chunkH * imgW) / canvas.width;
        pdf.addImage(croppedCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, chunkPdfH);

        yOffset += pxPerPage;
        pageIndex++;
      }

      pdf.save(`${fileName}_page.pdf`);
    } catch (error) {
      restoreScrollableElements(affectedElements);
      mainEl.style.maxHeight = originalMaxHeight;
      mainEl.style.overflow = originalOverflow;
      mainEl.style.overflowY = originalOverflowY;

      console.error('Failed to export full page PDF:', error);
      alert('Xuất PDF trang web thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <>
      <div className="relative inline-block text-left">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>{label}</span>
          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200/50 rounded-2xl shadow-premium z-40 py-2 origin-top-right animate-fadeIn">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {sectionExportLabel[currentLocale] || sectionExportLabel['ja']}
              </div>
              <button
                onClick={() => { setIsOpen(false); exportToExcel(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-bold transition-colors text-left"
              >
                <span className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-[10px]">EX</span>
                Excel
              </button>
              <button
                onClick={() => { setIsOpen(false); exportToJson(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-bold transition-colors text-left"
              >
                <span className="w-5 h-5 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-black text-[10px]">JS</span>
                JSON
              </button>
              <button
                onClick={() => { setIsOpen(false); openPdfModal(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-bold transition-colors text-left"
              >
                <span className="w-5 h-5 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-black text-[10px]">PD</span>
                {trans.tablePdf}
              </button>

              <div className="border-t border-slate-100 my-1.5" />

              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {sectionCaptureLabel[currentLocale] || sectionCaptureLabel['ja']}
              </div>
              <button
                onClick={() => { setIsOpen(false); exportFullPageToPdf(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-bold transition-colors text-left"
              >
                <svg className="w-5 h-5 p-1 rounded-lg bg-violet-50 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {trans.pagePdf}
              </button>
              <button
                onClick={() => { setIsOpen(false); captureFullPage(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-bold transition-colors text-left"
              >
                <svg className="w-5 h-5 p-1 rounded-lg bg-indigo-50 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {trans.screenshot}
              </button>
            </div>
          </>
        )}
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
