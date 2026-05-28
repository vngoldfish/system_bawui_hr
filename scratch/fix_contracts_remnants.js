const fs = require('fs');

const file = 'src/components/contracts/ContractsClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace excel headers
content = content.replace("header: '名前'", "header: t('client.colName')");
content = content.replace("header: 'フリガナ'", "header: t('form.lastNameKana')");
content = content.replace("header: '部署'", "header: t('client.colDept')");
content = content.replace("header: '役職'", "header: t('client.colPos')");
content = content.replace("header: '状態'", "header: t('common.status')");
content = content.replace("header: '雇用形態'", "header: t('form.contractType')");
content = content.replace("header: '契約開始'", "header: t('form.contractStart')");
content = content.replace("header: '契約終了'", "header: t('form.contractPeriod')");
content = content.replace("header: '給与'", "header: t('form.salaryTitle')");

// Replace schedule label (line 447 & 448)
content = content.replace(
  '（休憩 ${schedule.defaultBreakStart}～${schedule.defaultBreakEnd}）',
  '（${t(\'contracts.breakLabel\')} ${schedule.defaultBreakStart}～${schedule.defaultBreakEnd}）'
);
content = content.replace(
  ": '08:00～17:00（休憩 12:00～13:00）'",
  ": `08:00～17:00（${t('contracts.breakLabel')} 12:00～13:00）`"
);

fs.writeFileSync(file, content, 'utf8');
console.log('ContractsClient.tsx remnants cleaned!');
