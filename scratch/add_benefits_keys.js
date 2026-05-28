const fs = require('fs');
const filePath = 'src/lib/translations/finance.ts';

let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\r\n/g, '\n');

// Let's add benefits subkeys for each language in finance.ts
// JA
content = content.replace(
  "      overtimeDesc: '残業手当'",
  "      overtimeDesc: '残業手当',\n      unitPerson: '名',\n      unitPeople: '人',\n      unitCurrency: '円',\n      formulaDetail: '報酬月額 × {pct}%',\n      formulaTotal: '報酬月額 × {pct}%'"
);

// EN
content = content.replace(
  "      overtimeDesc: 'Overtime rate'",
  "      overtimeDesc: 'Overtime rate',\n      unitPerson: 'people',\n      unitPeople: 'people',\n      unitCurrency: 'JPY',\n      formulaDetail: 'Monthly salary × {pct}%',\n      formulaTotal: 'Monthly salary × {pct}%'"
);

// VI
content = content.replace(
  "      overtimeDesc: 'Tỷ lệ tăng ca'",
  "      overtimeDesc: 'Tỷ lệ tăng ca',\n      unitPerson: 'người',\n      unitPeople: 'người',\n      unitCurrency: 'JPY',\n      formulaDetail: 'Lương đóng bảo hiểm × {pct}%',\n      formulaTotal: 'Lương đóng bảo hiểm × {pct}%'"
);

// ZH (we look at Chinese benefits translations)
const zhIdx = content.indexOf('benefits: {');
// Let's find overtimeDesc under each language and replace it carefully.
// Chinese
content = content.replace(
  "            overtimeDesc: '加班津贴'",
  "            overtimeDesc: '加班津贴',\n            unitPerson: '名',\n            unitPeople: '人',\n            unitCurrency: '日元',\n            formulaDetail: '标准月报酬 × {pct}%',\n            formulaTotal: '标准月报酬 × {pct}%'"
);

// Thai
content = content.replace(
  "            overtimeDesc: 'อัตราล่วงเวลา'",
  "            overtimeDesc: 'อัตราล่วงเวลา',\n            unitPerson: 'คน',\n            unitPeople: 'คน',\n            unitCurrency: 'เยน',\n            formulaDetail: 'ฐานค่าจ้างมาตรฐาน × {pct}%',\n            formulaTotal: 'ฐานค่าจ้างมาตรฐาน × {pct}%'"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('benefits translation keys successfully added to finance.ts!');
