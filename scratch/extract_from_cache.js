const fs = require('fs');
const path = require('path');

const files = [
  '.next/dev/static/chunks/src_lib_0kjb6w0._.js',
  '.next/dev/server/chunks/ssr/[root-of-the-server]__0l121qz._.js'
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`File not found: ${file}`);
    return;
  }
  
  const content = fs.readFileSync(file, 'utf8');
  console.log(`Scanning ${file} (${content.length} chars)...`);
  
  // Search for financeTranslations inside the file
  const searchStr = 'financeTranslations =';
  let idx = content.indexOf(searchStr);
  if (idx === -1) {
    idx = content.indexOf('financeTranslations:');
  }
  
  if (idx !== -1) {
    console.log(`Found match in ${file} at index ${idx}`);
    // Grab around 100000 characters from the index to see if it's there
    const extract = content.slice(idx - 100, idx + 100000);
    fs.writeFileSync(`scratch/extracted_from_next_${path.basename(file)}.txt`, extract, 'utf8');
    console.log(`Wrote extract to scratch/extracted_from_next_${path.basename(file)}.txt`);
  }
});
