const fs = require('fs');

const file = 'src/components/contracts/ContractsClient.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '${formatWorkDays(schedule.workDays)}',
  '${formatWorkDaysLocal(schedule.workDays)}'
);

fs.writeFileSync(file, content, 'utf8');
console.log('ContractsClient.tsx formatWorkDays updated to formatWorkDaysLocal!');
