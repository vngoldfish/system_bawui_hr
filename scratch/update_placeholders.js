const fs = require('fs');

const staffFilePath = 'src/lib/translations/staff.ts';
const formFilePath = 'src/components/employees/EmployeeFormModal.tsx';

// 1. Update staff.ts
let staffContent = fs.readFileSync(staffFilePath, 'utf8');

// Replace for ja (first occurrence of lastName: '姓')
staffContent = staffContent.replace("      lastName: '姓',", "      lastName: '姓',\n      lastNamePlaceholder: '山田',\n      firstNamePlaceholder: '太郎',\n      lastNameKanaPlaceholder: 'ヤマダ',\n      firstNameKanaPlaceholder: 'タロウ',");

// Replace for en
staffContent = staffContent.replace("      lastName: 'Last Name',", "      lastName: 'Last Name',\n      lastNamePlaceholder: 'Yamada',\n      firstNamePlaceholder: 'John',\n      lastNameKanaPlaceholder: 'Yamada',\n      firstNameKanaPlaceholder: 'John',");

// Replace for vi
staffContent = staffContent.replace("      lastName: 'Họ',", "      lastName: 'Họ',\n      lastNamePlaceholder: 'Nguyễn',\n      firstNamePlaceholder: 'Văn Anh',\n      lastNameKanaPlaceholder: 'Nguyen',\n      firstNameKanaPlaceholder: 'Van Anh',");

// Replace for zh (second occurrence of lastName: '姓', we find it after 'zh: {')
const zhIndex = staffContent.indexOf('  zh: {');
if (zhIndex !== -1) {
  const postZh = staffContent.slice(zhIndex);
  const updatedPostZh = postZh.replace("      lastName: '姓',", "      lastName: '姓',\n      lastNamePlaceholder: '张',\n      firstNamePlaceholder: '三',\n      lastNameKanaPlaceholder: 'Zhang',\n      firstNameKanaPlaceholder: 'San',");
  staffContent = staffContent.slice(0, zhIndex) + updatedPostZh;
}

// Replace for th
staffContent = staffContent.replace("      lastName: 'นามสกุล',", "      lastName: 'นามสกุล',\n      lastNamePlaceholder: 'ใจดี',\n      firstNamePlaceholder: 'สมศักดิ์',\n      lastNameKanaPlaceholder: 'Jaidee',\n      firstNameKanaPlaceholder: 'Somsak',");

fs.writeFileSync(staffFilePath, staffContent, 'utf8');
console.log('staff.ts placeholders added!');

// 2. Update EmployeeFormModal.tsx
let formContent = fs.readFileSync(formFilePath, 'utf8');

formContent = formContent.replace('placeholder="山田"', 'placeholder={t(\'form.lastNamePlaceholder\')}');
formContent = formContent.replace('placeholder="太郎"', 'placeholder={t(\'form.firstNamePlaceholder\')}');
formContent = formContent.replace('placeholder="ヤマダ"', 'placeholder={t(\'form.lastNameKanaPlaceholder\')}');
formContent = formContent.replace('placeholder="タロウ"', 'placeholder={t(\'form.firstNameKanaPlaceholder\')}');

fs.writeFileSync(formFilePath, formContent, 'utf8');
console.log('EmployeeFormModal.tsx placeholders updated!');
