const subtitles = {
  '人事管理システムの概要': 'navSubtitle.dashboard',
  '従業員の出退勤・残業管理': 'navSubtitle.attendance',
  '休暇申請の管理と承認': 'navSubtitle.leave',
  'シフト作成・管理・集計': 'navSubtitle.shift',
  '従業員情報の管理': 'navSubtitle.employees',
  '新規従業員の登録': 'navSubtitle.employeesNew',
  '従業員情報の編集': 'navSubtitle.employeesEdit',
  '雇用契約の管理': 'navSubtitle.contracts',
  '在留カード・ビザ管理': 'navSubtitle.residenceCards',
  '部署の情報と人員管理': 'navSubtitle.departments',
  '従業員のログイン情報とシステム権限の設定': 'navSubtitle.roles',
  '給与の自動計算と明細管理': 'navSubtitle.payroll',
  '社会保険・税金・手当の設定': 'navSubtitle.salaryTable',
  '給与の支給方法・銀行振込・現金支給の管理': 'navSubtitle.paymentMethods',
  '経費申請・承認・集計': 'navSubtitle.expenses',
  '社会保険・手当・福利厚生の管理': 'navSubtitle.benefits',
  '求人・応募者・選考管理': 'navSubtitle.recruitment',
  '研修プログラム・受講管理・修了証': 'navSubtitle.training',
  '各種証明書・書類の発行管理': 'navSubtitle.documents',
  '人事データの分析・レポート出力': 'navSubtitle.reports',
  'システム通知・リマインダー管理': 'navSubtitle.notifications',
  '自動通知および自動リマインダーの文章編集': 'navSubtitle.templates',
  'プロファイル管理・言語設定': 'navSubtitle.profile',
  '従業員の人事評価・目標管理': 'navSubtitle.evaluation'
};

function toUnicode(str) {
  return str.split('').map(char => {
    const code = char.charCodeAt(0);
    if (code > 127) {
      return '\\u' + code.toString(16).padStart(4, '0');
    }
    return char;
  }).join('');
}

const escaped = {};
for (const [key, val] of Object.entries(subtitles)) {
  escaped[toUnicode(key)] = val;
}

console.log('const subtitleMap: Record<string, string> = {');
for (const [key, val] of Object.entries(escaped)) {
  console.log(`  '${key}': '${val}',`);
}
console.log('};');
