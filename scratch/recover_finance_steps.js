const fs = require('fs');
const path = require('path');

const logPath = 'C:/Users/TUSAN/.gemini/antigravity/brain/8060e77c-bae6-48a9-8e12-743a1505355c/.system_generated/logs/transcript.jsonl';
if (!fs.existsSync(logPath)) {
  console.error('Log file not found');
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
console.log(`Scanning ${lines.length} lines from transcript.jsonl...`);

let stepIndex = 0;
lines.forEach((line) => {
  if (!line.trim()) return;
  try {
    const obj = JSON.parse(line);
    // Check if this step is a write_to_file tool call or view_file call for finance.ts
    const toolCalls = obj.tool_calls || [];
    let isFinance = false;
    toolCalls.forEach(tc => {
      if (tc.name === 'write_to_file' && tc.args.TargetFile && tc.args.TargetFile.includes('finance.ts')) {
        console.log(`Step ${obj.step_index}: write_to_file for finance.ts. Code length: ${tc.args.CodeContent.length}`);
        fs.writeFileSync(`scratch/finance_backup_step_${obj.step_index}.ts`, tc.args.CodeContent, 'utf8');
      }
      if (tc.name === 'view_file' && tc.args.AbsolutePath && tc.args.AbsolutePath.includes('finance.ts')) {
        console.log(`Step ${obj.step_index}: view_file for finance.ts.`);
      }
    });
    
    // Also check responses or content for matching keys
    if (obj.content && obj.content.includes('financeTranslations = {') && obj.content.length > 5000) {
      console.log(`Step ${obj.step_index} has financeTranslations content with length: ${obj.content.length}`);
    }
  } catch (e) {
    // Ignore parse errors
  }
});
console.log('Scan complete.');
