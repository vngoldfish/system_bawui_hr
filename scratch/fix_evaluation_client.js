const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/evaluation/EvaluationClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Escape all Chinese characters and remaining Japanese Kanji in the period/dept mapping
content = content.replace(/\$\{year\}年上半年/g, "${year}\\u5e74\\u4e0a\\u534a\\u5e74");
content = content.replace(/\$\{year\}年下半年/g, "${year}\\u5e74\\u4e0b\\u534a\\u5e74");
content = content.replace(/'研发部'/g, "'\\u7814\\u53d1\\u90e8'");
content = content.replace(/'销售部'/g, "'\\u9500\\u552e\\u90e8'");
content = content.replace(/'财务部'/g, "'\\u8d22\\u52a1\\u90e8'");
content = content.replace(/'人事部'/g, "'\\u4eba\\u4e8b\\u90e8'");
content = content.replace(/'\\u55b6業\\u90e8'/g, "'\\u55b6\\u696d\\u90e8'");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully escaped EvaluationClient.tsx fully!');
