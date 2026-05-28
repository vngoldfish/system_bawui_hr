const fs = require('fs');
const path = require('path');

const srcPath = 'scratch/extracted_from_next_src_lib_0kjb6w0._.js.txt';
const destPath = 'src/lib/translations/finance.ts';

if (!fs.existsSync(srcPath)) {
  console.error('Source file not found');
  process.exit(1);
}

const content = fs.readFileSync(srcPath, 'utf8');

// Find start of financeTranslations object
const startIdx = content.indexOf('const financeTranslations = {');
if (startIdx === -1) {
  console.error('Could not find const financeTranslations = {');
  process.exit(1);
}

// Find matching closing brace for the financeTranslations object.
// We count opening and closing braces.
let braceCount = 0;
let endIdx = -1;
for (let i = startIdx; i < content.length; i++) {
  const char = content[i];
  if (char === '{') {
    braceCount++;
  } else if (char === '}') {
    braceCount--;
    if (braceCount === 0) {
      endIdx = i + 1;
      break;
    }
  }
}

if (endIdx === -1) {
  console.error('Could not find closing brace for financeTranslations');
  process.exit(1);
}

const objectStr = content.slice(startIdx, endIdx);
const outputContent = 'export ' + objectStr + ';\n';

fs.writeFileSync(destPath, outputContent, 'utf8');
console.log('finance.ts successfully reconstructed and written to target path!');
