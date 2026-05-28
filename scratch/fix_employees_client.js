const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/employees/EmployeesClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace Japanese string constants
content = content.replace(/'日本'/g, "'\\u65e5\\u672c'");
content = content.replace(/'月給'/g, "'\\u6708\\u7d66'");
content = content.replace(/'時給'/g, "'\\u6642\\u7d66'");
content = content.replace(/'日給'/g, "'\\u65e5\\u7d66'");

// Remove or rewrite comments that contain Japanese characters
content = content.replace(/\/\/ Wait, in ja nationality: '日本'\. But nationality is dynamic\. Let's just use nationality or '-'/g, "// Nationality lookup");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully escaped EmployeesClient.tsx!');
