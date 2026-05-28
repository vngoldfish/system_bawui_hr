const fs = require('fs');
const path = require('path');

const projectRoot = 'c:/Users/TUSAN/Desktop/CONG TY LONG/bawuiweb';
const componentsDir = path.join(projectRoot, 'src/components');
const jpRegex = /[\u3040-\u30ff\u4e00-\u9faf]/;

function scanDir(dir, results = {}) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath, results);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const jpLines = [];
      lines.forEach((line, idx) => {
        if (jpRegex.test(line)) {
          const trimmed = line.trim();
          // Exclude different comment styles
          if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
          if (trimmed.startsWith('{/*') && trimmed.endsWith('*/}')) return;
          
          jpLines.push({ lineNum: idx + 1, content: trimmed });
        }
      });
      if (jpLines.length > 0) {
        const relPath = path.relative(componentsDir, filePath);
        results[relPath] = jpLines;
      }
    }
  });
  return results;
}

const results = scanDir(componentsDir);
let summary = '';
let totalLines = 0;
for (const [file, lines] of Object.entries(results)) {
  summary += `${file}: ${lines.length} lines\n`;
  totalLines += lines.length;
}
summary += `Total: ${totalLines} lines across ${Object.keys(results).length} files.`;
console.log(summary);
fs.writeFileSync(path.join(projectRoot, 'scan_summary.txt'), summary, 'utf8');
// Write details to scan_results.txt
let output = '';
for (const [file, lines] of Object.entries(results)) {
  output += `=== File: ${file} (${lines.length} lines) ===\n`;
  lines.forEach(l => {
    output += `${l.lineNum}: ${l.content}\n`;
  });
  output += '\n';
}
fs.writeFileSync(path.join(projectRoot, 'scan_results.txt'), output, 'utf8');
