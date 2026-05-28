const fs = require('fs');
const path = require('path');

const srcDir = 'src/components';
const jpRegex = /[\u3040-\u30ff\u4e00-\u9faf]/;

function isCommentOrTranslation(line, filePath) {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return true;
  }
  return false;
}

const fileSummary = {};

function scan(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scan(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      const matches = [];
      lines.forEach((line, idx) => {
        if (jpRegex.test(line) && !isCommentOrTranslation(line, fullPath)) {
          matches.push({ lineNum: idx + 1, text: line.trim() });
        }
      });
      if (matches.length > 0) {
        const relativePath = path.relative(srcDir, fullPath).replace(/\\/g, '/');
        fileSummary[relativePath] = matches;
      }
    }
  });
}

scan(srcDir);

// Log summary of files and match counts
console.log('Files containing Japanese characters under src/components:');
Object.keys(fileSummary).forEach(filePath => {
  console.log(`- ${filePath}: ${fileSummary[filePath].length} lines`);
});

// Also write a detailed JSON to scratch
fs.writeFileSync('scratch/components_japanese_scan.json', JSON.stringify(fileSummary, null, 2), 'utf8');
