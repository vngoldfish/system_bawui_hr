import jsPDF from 'jspdf';
import { formatDate } from './utils';

interface ContractData {
  employeeName: string;
  employeeNameKana: string;
  department: string;
  position: string;
  contractType: string;
  category?: string;
  contractTemplateNotes?: string;
  contractStartDate: string;
  contractEndDate: string;
  salary: number;
  salaryType: string;
  hourlyRate: number;
  dailyRate: number;
  benefits: {
    healthInsurance: boolean;
    pension: boolean;
    employmentInsurance: boolean;
    workersComp: boolean;
    transportation: number;
    housing: number;
    meal: number;
  };
  workLocation: string;
  workingHours: string;
}

interface ResignationData {
  employeeName: string;
  employeeNameKana: string;
  department: string;
  position: string;
  hireDate: string;
  resignationDate: string;
  reason: string;
}

function escapeHtml(value: unknown): string {
  return toPdfText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toPdfText(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-';
  if (typeof value === 'string') return value.trim() || '-';
  return String(value);
}

function addJapaneseText(doc: jsPDF, text: string, x: number, y: number, options?: { fontSize?: number; align?: 'left' | 'center' | 'right'; maxWidth?: number }) {
  const fontSize = options?.fontSize || 10;
  doc.setFontSize(fontSize);
  const align = options?.align || 'left';
  const maxWidth = options?.maxWidth;
  if (maxWidth) {
    doc.text(text, x, y, { align, maxWidth });
  } else {
    doc.text(text, x, y, { align });
  }
}

export function generateContractPDF(data: ContractData): void {
  const isHaken = data.category === 'HAKKEN';

  let salaryText = '';
  if (!isHaken) {
    if (data.salaryType === '時給') {
      salaryText = `時給 ${Number(data.hourlyRate || 0).toLocaleString()} 円`;
    } else if (data.salaryType === '日給') {
      salaryText = `日給 ${Number(data.dailyRate || 0).toLocaleString()} 円`;
    } else {
      salaryText = `月給 ${Number(data.salary || 0).toLocaleString()} 円`;
    }
  }

  const benefitList: string[] = [];
  if (!isHaken) {
    if (data.benefits.healthInsurance) benefitList.push('健康保険');
    if (data.benefits.pension) benefitList.push('厚生年金');
    if (data.benefits.employmentInsurance) benefitList.push('雇用保険');
    if (data.benefits.workersComp) benefitList.push('労災保険');
  }

  const allowanceList: string[] = [];
  if (!isHaken) {
    if (data.benefits.transportation > 0) allowanceList.push(`通勤手当: ${data.benefits.transportation.toLocaleString()}円`);
    if (data.benefits.housing > 0) allowanceList.push(`住宅手当: ${data.benefits.housing.toLocaleString()}円`);
    if (data.benefits.meal > 0) allowanceList.push(`食事手当: ${data.benefits.meal.toLocaleString()}円`);
  }

  const rows = [
    ['雇用形態', data.contractType],
    ...(isHaken ? [] : [['給与形態', data.salaryType] as [string, string]]),
    ['契約期間', `${formatDate(data.contractStartDate)} ～ ${data.contractEndDate ? formatDate(data.contractEndDate) : '無期'}`],
    ['所属部署', data.department],
    ['役職', data.position],
    ['就業場所', data.workLocation],
    ['就業時間', data.workingHours],
    ...(isHaken
      ? [['報告区分', '勤務時間報告対象'] as [string, string]]
      : [['賃金', salaryText] as [string, string]]),
  ];

  const contractTitle = isHaken ? '派遣就業契約書' : '雇用契約書';
  const templateNotes = (data.contractTemplateNotes || '').trim();

  const printWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!printWindow) {
    alert('ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。');
    return;
  }

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(contractTitle)}_${escapeHtml(data.employeeName)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111827;
      background: white;
      font-family: "Yu Gothic", "YuGothic", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
      font-size: 12px;
      line-height: 1.65;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { width: 100%; }
    h1 { text-align: center; font-size: 24px; letter-spacing: 0.18em; margin: 0 0 18px; }
    .date { text-align: right; margin-bottom: 16px; }
    .employee { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
    .kana { font-size: 11px; color: #475569; margin-bottom: 18px; }
    .intro { margin: 16px 0 18px; }
    table { width: 100%; border-collapse: collapse; margin: 0 0 18px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: top; }
    th { width: 28%; background: #f1f5f9; text-align: left; font-weight: 800; }
    .section-title { font-weight: 800; font-size: 13px; margin: 16px 0 8px; }
    .notes { margin-top: 18px; color: #334155; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-top: 34px; }
    .signature-box { min-height: 96px; border-top: 1px solid #94a3b8; padding-top: 10px; }
    .signature-title { text-align: center; font-weight: 800; margin-bottom: 12px; }
    .line { margin-top: 10px; }
    .footer { text-align: center; color: #64748b; font-size: 10px; margin-top: 28px; }
    .no-print { margin: 0 0 18px; padding: 12px 14px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; border-radius: 10px; font-weight: 700; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="no-print">印刷画面で「PDFとして保存」を選択してください。日本語フォント崩れを防ぐためブラウザ印刷を使用しています。</div>
    <h1>${escapeHtml(contractTitle)}</h1>
    <div class="date">${escapeHtml(formatDate(data.contractStartDate))}</div>
    <div class="employee">${escapeHtml(data.employeeName)} 様</div>
    <div class="kana">(${escapeHtml(data.employeeNameKana)})</div>
    <p class="intro">${isHaken ? '下記の通り派遣就業契約を締結します。' : '下記の通り雇用契約を締結します。'}</p>
    <table>
      <tbody>
        ${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}
      </tbody>
    </table>
    ${(benefitList.length || allowanceList.length) ? `
      <div class="section-title">社会保険・諸手当</div>
      ${benefitList.length ? `<div>社会保険: ${escapeHtml(benefitList.join('、'))}</div>` : ''}
      ${allowanceList.length ? `<div>諸手当: ${escapeHtml(allowanceList.join('、'))}</div>` : ''}
    ` : ''}
    ${templateNotes ? `
      <div class="section-title">特記事項</div>
      <div class="notes">${escapeHtml(templateNotes).replace(/\n/g, '<br />')}</div>
    ` : ''}
    <div class="notes">
      <div>※ 本契約書は2部作成し、甲乙それぞれ1部ずつ保管するものとします。</div>
      <div>※ 就業規則・賃金規程等の諸規程は別途定めるものとし、その内容を確認の上署名捺印してください。</div>
    </div>
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-title">（甲）使用者</div>
        <div class="line">会社名: ______________________________</div>
        <div class="line">代表者印: ____________________________</div>
      </div>
      <div class="signature-box">
        <div class="signature-title">（乙）労働者</div>
        <div class="line">氏名: ________________________________</div>
        <div class="line">署名: ________________________________</div>
      </div>
    </div>
    <div class="footer">この契約書は法的要件に基づいて作成されたものです。</div>
  </div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 300);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function generateResignationPDF(data: ResignationData): void {
  const printWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!printWindow) {
    alert('ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。');
    return;
  }

  const certNo = `第 ${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')} 号`;
  const todayStr = formatDate(new Date().toISOString().split('T')[0]);

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>退職証明書_${escapeHtml(data.employeeName)}</title>
  <style>
    @page { size: A4; margin: 25mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111827;
      background: white;
      font-family: "Yu Gothic", "YuGothic", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
      font-size: 14px;
      line-height: 2.0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { width: 100%; max-width: 800px; margin: 0 auto; }
    h1 { text-align: center; font-size: 28px; font-weight: 800; letter-spacing: 0.3em; margin: 40px 0 50px; }
    .cert-no { text-align: right; font-size: 12px; color: #4b5563; margin-bottom: 40px; }
    .intro { font-size: 16px; margin-bottom: 30px; font-weight: 600; }
    .content-box {
      border: 1px solid #cbd5e1;
      padding: 30px 40px;
      border-radius: 12px;
      background: #f8fafc;
      margin-bottom: 40px;
    }
    .content-line { margin-bottom: 12px; }
    .reason-box {
      margin-top: 20px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 15px;
    }
    .date { text-align: right; margin-bottom: 50px; font-weight: 600; }
    .company-info {
      float: right;
      width: 280px;
      border-top: 1.5px solid #111827;
      padding-top: 15px;
      margin-bottom: 60px;
    }
    .company-title { font-weight: 850; font-size: 15px; margin-bottom: 12px; text-align: center; }
    .company-line { margin-top: 8px; font-size: 13px; }
    .clearfix { clear: both; }
    .footer {
      color: #6b7280;
      font-size: 11px;
      margin-top: 60px;
      line-height: 1.6;
      border-top: 1px solid #e5e7eb;
      padding-top: 15px;
    }
    .no-print {
      margin: 0 0 20px;
      padding: 12px 14px;
      border: 1px solid #bfdbfe;
      background: #eff6ff;
      color: #1d4ed8;
      border-radius: 10px;
      font-weight: 700;
      font-size: 12px;
      line-height: 1.5;
    }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="no-print">印刷画面で「PDFとして保存」を選択してください。日本語フォント崩れを防ぐためブラウザ印刷を使用しています。</div>
    <h1>退職証明書</h1>
    <div class="cert-no">${escapeHtml(certNo)}</div>
    
    <div class="intro">下記の者が退職したことを証明いたします。</div>
    
    <div class="content-box">
      <div class="content-line"><strong>氏名:</strong> ${escapeHtml(data.employeeName)}（${escapeHtml(data.employeeNameKana)}）</div>
      <div class="content-line"><strong>所属部署・役職:</strong> ${escapeHtml(data.department)} ${escapeHtml(data.position)}</div>
      <div class="content-line"><strong>採用年月日:</strong> ${escapeHtml(formatDate(data.hireDate))}</div>
      <div class="content-line"><strong>退職年月日:</strong> ${escapeHtml(formatDate(data.resignationDate))}</div>
      
      ${data.reason ? `
        <div class="reason-box">
          <strong>退職事由:</strong> ${escapeHtml(data.reason)}
        </div>
      ` : ''}
    </div>
    
    <p>なお、在職期間中の業務はすべて完了し、引き継ぎを完了しております。</p>
    
    <div class="date">発行日: ${escapeHtml(todayStr)}</div>
    
    <div class="company-info">
      <div class="company-title">証明者（使用者）</div>
      <div class="company-line">会社名: ___________________________</div>
      <div class="company-line">所在地: ___________________________</div>
      <div class="company-line">代表者名: _________________________</div>
      <div class="company-line" style="margin-top: 15px;">代表者印: </div>
    </div>
    
    <div class="clearfix"></div>
    
    <div class="footer">
      <div>※ 本証明書は退職者本人の請求に基づき発行するものです。</div>
      <div>※ 労働基準法第22条に基づく退職証明書として有効です。</div>
    </div>
  </div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 300);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function generateAllResignationDocuments(data: ResignationData): void {
  generateResignationPDF(data);
}
