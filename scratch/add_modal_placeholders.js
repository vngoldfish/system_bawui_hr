const fs = require('fs');
const filePath = 'src/lib/i18n.tsx';

let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\r\n/g, '\n');

// Inject into common in each locale
// 1. JA
content = content.replace(
  "    common: {\n      todayDate: '今日の日付',",
  "    common: {\n      placeholderName: '部長',\n      placeholderKana: 'ぶちょう',\n      placeholderDesc: '部門の最高責任者',\n      todayDate: '今日の日付',"
);

// 2. EN
content = content.replace(
  "    common: {\n      todayDate: \"Today's Date\",",
  "    common: {\n      placeholderName: 'Manager',\n      placeholderKana: 'manager',\n      placeholderDesc: 'Department head responsible for operations',\n      todayDate: \"Today's Date\","
);

// 3. VI
content = content.replace(
  "    common: {\n      todayDate: 'Ngày hôm nay',",
  "    common: {\n      placeholderName: 'Trưởng phòng',\n      placeholderKana: 'truong phong',\n      placeholderDesc: 'Người chịu trách nhiệm cao nhất của bộ phận',\n      todayDate: 'Ngày hôm nay',"
);

// 4. ZH
content = content.replace(
  "    common: {\n      todayDate: '今日日期',",
  "    common: {\n      placeholderName: '部门经理',\n      placeholderKana: 'bumujingli',\n      placeholderDesc: '负责部门运营的最高负责人',\n      todayDate: '今日日期',"
);

// 5. TH
content = content.replace(
  "    common: {\n      todayDate: 'วันที่วันนี้',",
  "    common: {\n      placeholderName: 'ผู้จัดการแผนก',\n      placeholderKana: 'phu-jad-kan',\n      placeholderDesc: 'หัวหน้าแผนกผู้รับผิดชอบการดำเนินงาน',\n      todayDate: 'วันที่วันนี้',"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Management modal placeholder translations added successfully to i18n.tsx!');
