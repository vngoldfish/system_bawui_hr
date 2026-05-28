const fs = require('fs');

const staffFilePath = 'src/lib/translations/staff.ts';
const contractsClientPath = 'src/components/contracts/ContractsClient.tsx';

// 1. Add translation keys to staff.ts under contracts
let staffContent = fs.readFileSync(staffFilePath, 'utf8');

const jaTarget = `    contracts: {
      alertTitle: '雇用契約期限アラート ({count}件)',`;
const jaReplacement = `    contracts: {
      alertTitle: '雇用契約期限アラート ({count}件)',
      doubleClickFilter: 'ダブルクリックでフィルター',
      workContract: '勤務契約',
      nameAndKana: '名前・フリガナ',
      breakLabel: '休憩',`;
staffContent = staffContent.replace(jaTarget, jaReplacement);

const enTarget = `    contracts: {
      alertTitle: 'Residence Card Expiry Alert ({count})',`; // Note: in staff.ts it had "alertTitle: 'Residence Card Expiry Alert ({count})'" for en, wait, let's verify.
// Let's just find the first match of alertTitle inside each language block or alertTitle:
// Actually, let's search specifically for alertTitle in each language:
staffContent = staffContent.replace("      alertTitle: 'Residence Card Expiry Alert ({count})',", "      alertTitle: 'Residence Card Expiry Alert ({count})',\n      doubleClickFilter: 'Double-click to filter',\n      workContract: 'Work Contract',\n      nameAndKana: 'Name / Kana',\n      breakLabel: 'Break',");
staffContent = staffContent.replace("      alertTitle: 'Cảnh báo hạn hợp đồng lao động ({count} mục)',", "      alertTitle: 'Cảnh báo hạn hợp đồng lao động ({count} mục)',\n      doubleClickFilter: 'Nhấp đúp để lọc',\n      workContract: 'Hợp đồng lao động',\n      nameAndKana: 'Họ tên / Kana',\n      breakLabel: 'Nghỉ',");

const zhIndex = staffContent.indexOf('  zh: {');
if (zhIndex !== -1) {
  const postZh = staffContent.slice(zhIndex);
  const updatedPostZh = postZh.replace("      alertTitle: '雇佣合同期限警报 ({count}件)',", "      alertTitle: '雇佣合同期限警报 ({count}件)',\n      doubleClickFilter: '双击过滤',\n      workContract: '劳动合同',\n      nameAndKana: '姓名 / 假名',\n      breakLabel: '休息',");
  staffContent = staffContent.slice(0, zhIndex) + updatedPostZh;
}

const thIndex = staffContent.indexOf('  th: {');
if (thIndex !== -1) {
  const postTh = staffContent.slice(thIndex);
  const updatedPostTh = postTh.replace("      alertTitle: 'การแจ้งเตือนวันหมดอายุสัญญาจ้าง ({count} รายการ)',", "      alertTitle: 'การแจ้งเตือนวันหมดอายุสัญญาจ้าง ({count} รายการ)',\n      doubleClickFilter: 'ดับเบิลคลิกเพื่อกรอง',\n      workContract: 'สัญญาจ้างงาน',\n      nameAndKana: 'ชื่อ / คานะ',\n      breakLabel: 'พัก',");
  staffContent = staffContent.slice(0, thIndex) + updatedPostTh;
}

fs.writeFileSync(staffFilePath, staffContent, 'utf8');
console.log('staff.ts contract keys updated!');

// 2. Refactor ContractsClient.tsx
let content = fs.readFileSync(contractsClientPath, 'utf8');

// Title tooltip
content = content.replace('title="ダブルクリックでフィルター"', 'title={t(\'contracts.doubleClickFilter\')}');

// Work contract name
content = content.replace('name: `${emp.lastName} ${emp.firstName} 勤務契約`', 'name: `${emp.lastName} ${emp.firstName} ${t(\'contracts.workContract\')}`');

// Person unit
content = content.replace(
  `<span className="text-xs text-slate-400 font-bold">{locale === 'ja' ? '名' : locale === 'en' ? ' staff' : locale === 'vi' ? ' người' : locale === 'zh' ? ' 人' : ' คน'}</span>`,
  `<span className="text-xs text-slate-400 font-bold">{t('common.personUnit')}</span>`
);

// Excel export map status values
content = content.replace(
  `status: e.status === 'ACTIVE' ? '在籍中' : e.status === 'ON_LEAVE' ? '休職中' : '退職',`,
  `status: e.status === 'ACTIVE' ? t('client.statusActive') : e.status === 'ON_LEAVE' ? t('client.statusLeave') : t('client.statusInactive'),`
);

// Excel export indefinite value
content = content.replace(
  `contractEnd: e.contractEndDate ? formatDate(e.contractEndDate) : '無期',`,
  `contractEnd: e.contractEndDate ? formatDate(e.contractEndDate) : t('contracts.indefiniteLabel'),`
);

// Excel export headers
content = content.replace(
  `{ header: '名前', key: 'name' }, { header: 'フリガナ', key: 'kana' },
    { header: '部署', key: 'department' }, { header: '役職', key: 'position' },
    { header: '状態', key: 'status' }, { header: '雇用形態', key: 'contractType' },
    { header: '契約開始', key: 'contractStart' }, { header: '契約終了', key: 'contractEnd' },
    { header: '給与', key: 'salary' },`,
  `{ header: t('client.colName'), key: 'name' }, { header: t('form.lastNameKana'), key: 'kana' },
    { header: t('client.colDept'), key: 'department' }, { header: t('client.colPos'), key: 'position' },
    { header: t('common.status'), key: 'status' }, { header: t('form.contractType'), key: 'contractType' },
    { header: t('form.contractStart'), key: 'contractStart' }, { header: t('form.contractPeriod'), key: 'contractEnd' },
    { header: t('form.salaryTitle'), key: 'salary' },`
);

// Excel file name
content = content.replace('fileName="契約一覧"', 'fileName={t(\'contracts.cardTitle\')}');

// Table names header
content = content.replace('<span>名前・フリガナ</span>', '<span>{t(\'contracts.nameAndKana\')}</span>');

// Table break time label
content = content.replace(
  `休憩 {schedule?.defaultBreakStart || '12:00'}〜{schedule?.defaultBreakEnd || '13:00'}`,
  `{t('contracts.breakLabel')} {schedule?.defaultBreakStart || '12:00'}〜{schedule?.defaultBreakEnd || '13:00'}`
);

fs.writeFileSync(contractsClientPath, content, 'utf8');
console.log('ContractsClient.tsx fully updated!');
