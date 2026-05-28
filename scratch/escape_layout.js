const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/layout/DashboardLayout.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/'([^']+)':/g, (match, p1) => {
  if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(p1)) {
    const escaped = p1.split('').map(c => {
      const code = c.charCodeAt(0);
      return '\\u' + code.toString(16).padStart(4, '0');
    }).join('');
    return `'${escaped}':`;
  }
  return match;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully escaped DashboardLayout.tsx!');
