const fs = require('fs');

const staffFilePath = 'src/lib/translations/staff.ts';
const content = fs.readFileSync(staffFilePath, 'utf8');
const lines = content.split('\n');

const cleanedLines = [];
const keyScopes = [];

lines.forEach((line) => {
  const trimmed = line.trim();
  
  // Detect brace opening
  if (trimmed.endsWith('{') || trimmed.endsWith('{,')) {
    cleanedLines.push(line);
    keyScopes.push(new Set());
    return;
  }
  
  // Detect brace closing
  if (trimmed.startsWith('}') || trimmed.startsWith('},')) {
    cleanedLines.push(line);
    keyScopes.pop();
    return;
  }
  
  // Match key definition
  const match = trimmed.match(/^([a-zA-Z0-9_]+)\s*:/);
  if (match && keyScopes.length > 0) {
    const key = match[1];
    const currentScope = keyScopes[keyScopes.length - 1];
    if (currentScope.has(key)) {
      // Skip duplicate key in this scope
      return;
    }
    currentScope.add(key);
  }
  
  cleanedLines.push(line);
});

fs.writeFileSync(staffFilePath, cleanedLines.join('\n'), 'utf8');
console.log('staff.ts deduplicated successfully!');
