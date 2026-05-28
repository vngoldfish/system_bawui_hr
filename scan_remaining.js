const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/TUSAN/Desktop/CONG TY LONG/bawuiweb/src';
const jpRegex = /[\u3040-\u30ff\u4e00-\u9faf]/;

function isCommentOrTranslation(line, filePath) {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return true;
  }
  // Exclude translations folder and i18n file itself
  if (filePath.includes('src\\lib\\translations') || filePath.includes('src/lib/translations') || filePath.includes('i18n.tsx')) {
    return true;
  }
  return false;
}

const results = [];

function scan(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        scan(fullPath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      const fileMatches = [];
      lines.forEach((line, idx) => {
        if (jpRegex.test(line) && !isCommentOrTranslation(line, fullPath)) {
          fileMatches.push({ lineNum: idx + 1, text: line.trim() });
        }
      });
      if (fileMatches.length > 0) {
        results.push({ file: path.relative(srcDir, fullPath), matches: fileMatches });
      }
    }
  });
}

scan(srcDir);

console.log(JSON.stringify(results, null, 2));
