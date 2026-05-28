const fs = require('fs');

const formFilePath = 'src/components/employees/EmployeeFormModal.tsx';
let formContent = fs.readFileSync(formFilePath, 'utf8');

// Find select name="nationality"
const selectStart = formContent.indexOf('<select name="nationality"');
if (selectStart === -1) {
  console.error('Could not find select nationality');
  process.exit(1);
}

// Find next </select>
const selectEnd = formContent.indexOf('</select>', selectStart);
if (selectEnd === -1) {
  console.error('Could not find closing select nationality');
  process.exit(1);
}

// Extract the original select tag header
const selectTagClose = formContent.indexOf('>', selectStart) + 1;
const selectHeader = formContent.slice(selectStart, selectTagClose);

// Replace select contents
const newSelectHtml = `${selectHeader}\n                  {countryOptions.map(c => <option key={c} value={c}>{getCountryLabel(c)}</option>)}\n                `;

formContent = formContent.slice(0, selectStart) + newSelectHtml + formContent.slice(selectEnd);

fs.writeFileSync(formFilePath, formContent, 'utf8');
console.log('EmployeeFormModal.tsx countries list updated robustly!');
