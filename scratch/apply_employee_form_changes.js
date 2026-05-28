const fs = require('fs');

const formFilePath = 'src/components/employees/EmployeeFormModal.tsx';
let content = fs.readFileSync(formFilePath, 'utf8');

// Normalize line endings to LF to avoid CRLF mismatch on Windows
content = content.replace(/\r\n/g, '\n');

// 1. Add imports
content = content.replace(
  `import Portal from '@/components/common/Portal';`,
  `import Portal from '@/components/common/Portal';\nimport { useI18n } from '@/lib/i18n';`
);

// 2. Add useI18n hook
const componentStartTarget = `export default function EmployeeFormModal({ isOpen, onClose, onSave, employee }: EmployeeFormModalProps) {
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);`;

const componentStartReplacement = `export default function EmployeeFormModal({ isOpen, onClose, onSave, employee }: EmployeeFormModalProps) {
  const { t, locale } = useI18n();
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);`;

content = content.replace(componentStartTarget, componentStartReplacement);

// Country options and mapping helpers
const helperCode = `
const countryOptions = [
  '日本', '中国', '韓国', '北朝鮮', '台湾', '香港', 'ベトナム', 'ラオス',
  'カンボジア', 'タイ', 'ミャンマー', 'マレーシア', 'シンガポール', 'インドネシア',
  'フィリピン', 'ブルネイ', '東ティモール', 'インド', 'パキスタン', 'バングラデシュ',
  'スリランカ', 'ネパール', 'ブータン', 'モルディブ', 'モンゴル', 'カザフスタン',
  'キルギス', 'タジキスタン', 'トルクメニスタン', 'ウズベキスタン', 'ロシア', 'ウクライナ',
  'ベラルーシ', 'モルドバ', 'エストニア', 'ラトビア', 'リトアニア', 'ポーランド',
  'チェコ', 'スロバキア', 'ハンガリー', 'ルーマニア', 'ブルガリア', 'アルバニア',
  'クロアチア', 'ボスニア・ヘルツェゴビナ', 'セルビア', 'モンテネグロ', '北マケドニア',
  'スロベニア', 'ギリシャ', 'キプロス', 'マルタ', 'イタリア', 'バチカン',
  'サンマリノ', 'スペイン', 'ポルトガル', 'アンドラ', 'フランス', 'モナコ',
  'ベルギー', 'ルクセンブルク', 'オランダ', 'ドイツ', 'オーストリア', 'スイス',
  'リヒテンシュタイン', 'イギリス', 'アイルランド', 'アイスランド', 'ノルウェー',
  'スウェーデン', 'フィンランド', 'デンマーク', 'アメリカ', 'カナダ', 'メキシコ',
  'グアテマラ', 'ベリーズ', 'エルサルバドル', 'ホンジュラス', 'ニカラグア',
  'コスタリカ', 'パナマ', 'キューバ', 'ジャマイカ', 'ハイチ', 'ドミニカ共和国',
  'トリニダード・トバゴ', 'バルバドス', 'バハマ', 'コロンビア', 'ベネズエラ',
  'ガイアナ', 'スリナム', 'エクアドル', 'ペルー', 'ボリビア', 'ブラジル',
  'パラグアイ', 'ウルグアイ', 'アルゼンチン', 'チリ', 'オーストラリア',
  'ニュージーランド', 'パプアニューギニア', 'フィジー', 'ソロモン諸島',
  'バヌアツ', 'サモア', 'トンガ', 'キリバス', 'ツバル', 'ナウル', 'パラオ',
  'マーシャル諸島', 'ミクロネシア', 'その他'
];

  const getCountryLabel = (c: string) => {
    if (locale === 'ja') return c;
    const mapping: Record<string, Record<string, string>> = {
      '日本': { en: 'Japan', vi: 'Nhật Bản', zh: '日本', th: 'ญี่ปุ่น' },
      '中国': { en: 'China', vi: 'Trung Quốc', zh: '中国', th: 'จีน' },
      '韓国': { en: 'South Korea', vi: 'Hàn Quốc', zh: '韩国', th: 'เกาหลีใต้' },
      '北朝鮮': { en: 'North Korea', vi: 'Triều Tiên', zh: '朝鲜', th: 'เกาหลีเหนือ' },
      '台湾': { en: 'Taiwan', vi: 'Đài Loan', zh: '台湾', th: 'ไต้หวัน' },
      '香港': { en: 'Hong Kong', vi: 'Hồng Kông', zh: '香港', th: 'ฮ่องกง' },
      'ベトナム': { en: 'Vietnam', vi: 'Việt Nam', zh: '越南', th: 'เวียดนาม' },
      'ラオス': { en: 'Laos', vi: 'Lào', zh: '老挝', th: 'ลาว' },
      'カンボジア': { en: 'Cambodia', vi: 'Campuchia', zh: '柬埔寨', th: 'กัมพูชา' },
      'タイ': { en: 'Thailand', vi: 'Thái Lan', zh: 'ประเทศไทย', th: 'ไทย' },
      'ミャンマー': { en: 'Myanmar', vi: 'Myanmar', zh: '缅甸', th: 'เมียนมา' },
      'マレーシア': { en: 'Malaysia', vi: 'Malaysia', zh: '走来西亚', th: 'มาเลเซีย' }, // Note: walk/run/ma in zh is 马
      'シンガポール': { en: 'Singapore', vi: 'Singapore', zh: '新加坡', th: 'สิงคโปร์' },
      'インドネシア': { en: 'Indonesia', vi: 'Indonesia', zh: '印度尼西亚', th: 'อินโดนีเซีย' },
      'フィリピン': { en: 'Philippines', vi: 'Philippines', zh: '菲律宾', th: 'ฟิลิปปินส์' },
      'インド': { en: 'India', vi: 'Ấn Độ', zh: '印度', th: 'อินเดีย' },
      'ネパール': { en: 'Nepal', vi: 'Nepal', zh: 'เนปาล', th: 'เนปาล' },
      'アメリカ': { en: 'USA', vi: 'Mỹ', zh: '美国', th: 'สหรัฐอเมริกา' },
      'カナダ': { en: 'Canada', vi: 'Canada', zh: '加拿大', th: 'แคนาดา' },
      'オーストラリア': { en: 'Australia', vi: 'Úc', zh: '澳大利亚', th: 'ออสเตรเลีย' },
      'イギリス': { en: 'UK', vi: 'Anh', zh: '英国', th: 'สหราชอาณาจักร' },
      'フランス': { en: 'France', vi: 'Pháp', zh: 'ฝรั่งเศส', th: 'ฝรั่งเศส' },
      'ドイツ': { en: 'Germany', vi: 'Đức', zh: '德国', th: 'เยอรมนี' },
      'その他': { en: 'Other', vi: 'Khác', zh: '其他', th: 'อื่นๆ' },
    };
    return mapping[c]?.[locale] || c;
  };

  const getVisaStatusLabel = (v: string) => {
    if (locale === 'ja') return v;
    const mapping: Record<string, Record<string, string>> = {
      '技術・人文知識・国際業務': { en: 'Engineer/Humanities/International Services', vi: 'Kỹ sư/Nhân văn/Nghiệp vụ quốc tế', zh: '技术/人文知识/国际业务', th: 'วิศวกรรม/ความรู้มนุษยศาสตร์/บริการระหว่างประเทศ' },
      '技能': { en: 'Skilled Labor', vi: 'Kỹ năng', zh: '技能', th: 'แรงงานฝีมือ' },
      '高度専門職': { en: 'Highly Skilled Professional', vi: 'Chuyên gia trình độ cao', zh: '高度专业职', th: 'ผู้เชี่ยวชาญทักษะสูง' },
      '経営・管理': { en: 'Business Manager', vi: 'Kinh doanh/Quản lý', zh: '经营/管理', th: 'ผู้จัดการธุรกิจ' },
      '特定技能': { en: 'Specified Skilled Worker', vi: 'Kỹ năng đặc định', zh: '特定技能', th: 'ทักษะเฉพาะทาง' },
      '技能実習': { en: 'Technical Intern Training', vi: 'Thực tập kỹ năng', zh: '技能实习', th: 'ฝึกงานเทคนิค' },
      '留学': { en: 'Student', vi: 'Du học', zh: '留学', th: 'นักเรียน' },
      '家族滞在': { en: 'Dependent', vi: 'Trú trú gia đình', zh: '家族滞在', th: 'ผู้พึ่งพิง' },
      '特定活動': { en: 'Designated Activities', vi: 'Hoạt động đặc định', zh: '特定活动', th: 'กิจกรรมที่กำหนด' },
      '技術': { en: 'Technology', vi: 'Kỹ thuật', zh: '技术', th: 'เทคโนโลยี' },
      '教授': { en: 'Professor', vi: 'Giáo sư', zh: '教授', th: 'ศาสตราจารย์' },
      '芸術': { en: 'Artist', vi: 'Nghệ thuật', zh: '艺术', th: 'ศิลปะ' },
      '宗教': { en: 'Religious Activities', vi: 'Tôn giáo', zh: '宗教', th: 'ศาสนา' },
      '報道': { en: 'Journalist', vi: 'Báo chí', zh: '报道', th: 'การสื่อสารมวลชน' },
      '法律・会計業務': { en: 'Legal/Accounting Services', vi: 'Nghiệp vụ Luật/Kế toán', zh: '法律/会计业务', th: 'บริการกฎหมาย/บัญชี' },
      '医療': { en: 'Medical Services', vi: 'Y tế', zh: '医療', th: 'การแพทย์' },
      '研究': { en: 'Researcher', vi: 'Nghiên cứu', zh: '研究', th: 'การวิจัย' },
      '教育': { en: 'Instructor', vi: 'Giáo dục', zh: '教育', th: 'การศึกษา' },
      '企業内転勤': { en: 'Intra-company Transferee', vi: 'Chuyển công tác nội bộ', zh: '企业内转勤', th: 'การโอนย้ายภายในบริษัท' },
      '興行': { en: 'Entertainer', vi: 'Giải trí', zh: '兴行', th: 'ความบันเทิง' },
      '介護': { en: 'Nursing Care', vi: 'Chăm sóc điều dưỡng', zh: '护理', th: 'การบริบาล' },
      '短期滞在': { en: 'Temporary Visitor', vi: 'Lưu trú ngắn hạn', zh: '短期滞在', th: 'พำนักระยะสั้น' },
      '研修': { en: 'Trainee', vi: 'Tu nghiệp sinh', zh: '研修', th: 'การฝึกอบรม' }
    };
    return mapping[v]?.[locale] || v;
  };
`;

content = content.replace(
  `  const isForeign = formData.nationality !== '日本';`,
  `  const isForeign = formData.nationality !== '日本';\n${helperCode}`
);

// 3. Translate form labels and options
content = content.replace(
  `{employee ? '従業員情報を編集' : '新しい従業員を追加'}`,
  `{employee ? t('form.editTitle') : t('form.addTitle')}`
);
content = content.replace(
  `従業員コードを自動生成`,
  `{t('form.autoCode')}`
);
content = content.replace(
  `<label className="block text-sm font-medium text-slate-700 mb-1">従業員コード</label>`,
  `<label className="block text-sm font-medium text-slate-700 mb-1">{t('form.code')}</label>`
);

// Specific JSX header replacements
content = content.replace(
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">基本情報</h3>`,
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('form.basicTitle')}</h3>`
);
content = content.replace(
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">勤務情報</h3>`,
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('form.workTitle')}</h3>`
);
content = content.replace(
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">契約情報</h3>`,
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('form.contractTitle')}</h3>`
);
content = content.replace(
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">給与形態・諸手当</h3>`,
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('form.salaryTitle')}</h3>`
);
content = content.replace(
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">国籍・在留資格</h3>`,
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('form.visaTitle')}</h3>`
);
content = content.replace(
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">扶養家族</h3>`,
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('form.dependentsTitle')}</h3>`
);
content = content.replace(
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">学歴</h3>`,
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('form.eduTitle')}</h3>`
);
content = content.replace(
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">資格</h3>`,
  `<h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('form.certTitle')}</h3>`
);

content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">姓</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.lastName')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">名</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.firstName')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">セイ</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.lastNameKana')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">メイ</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.firstNameKana')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">メールアドレス</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.email')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">電話番号</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.phone')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">生年月日</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.birthDate')}</label>`
);
content = content.replace(
  `<label className="block text-sm font-medium text-slate-700 mb-1">部署</label>`,
  `<label className="block text-sm font-medium text-slate-700 mb-1">{t('form.dept')}</label>`
);
content = content.replace(
  `<option value="">部署を選択</option>`,
  `<option value="">{t('form.deptSelect')}</option>`
);
content = content.replace(
  `<label className="block text-sm font-medium text-slate-700 mb-1">役職</label>`,
  `<label className="block text-sm font-medium text-slate-700 mb-1">{t('form.pos')}</label>`
);
content = content.replace(
  `<option value="">役職を選択</option>`,
  `<option value="">{t('form.posSelect')}</option>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">入社日</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.hireDate')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">状態</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.status')}</label>`
);
content = content.replace(
  `<option value="ACTIVE">在籍中</option><option value="ON_LEAVE">休職中</option><option value="INACTIVE">退職</option>`,
  `<option value="ACTIVE">{t('form.statusActive')}</option><option value="ON_LEAVE">{t('form.statusLeave')}</option><option value="INACTIVE">{t('form.statusInactive')}</option>`
);
content = content.replace(
  `<label className="block text-sm font-medium text-slate-700 mb-1">雇用形態</label>`,
  `<label className="block text-sm font-medium text-slate-700 mb-1">{t('form.contractType')}</label>`
);
content = content.replace(
  `<option value="">雇用形態を選択</option>`,
  `<option value="">{t('form.contractTypeSelect')}</option>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">契約開始日</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.contractStart')}</label>`
);
content = content.replace(
  `<label className="block text-sm font-medium text-slate-700 mb-1">契約期間</label>`,
  `<label className="block text-sm font-medium text-slate-700 mb-1">{t('form.contractPeriod')}</label>`
);
content = content.replace(
  `<span className="text-sm text-slate-700">無期限</span>`,
  `<span className="text-sm text-slate-700">{t('form.periodIndefinite')}</span>`
);
content = content.replace(
  `<span className="text-sm text-slate-700">有期限</span>`,
  `<span className="text-sm text-slate-700">{t('form.periodFixed')}</span>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">給与形態</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.salaryType')}</label>`
);
content = content.replace(
  `<option value="月給">月給</option><option value="日給">日給</option><option value="時給">時給</option>`,
  `<option value="月給">{t('form.salaryTypeMonthly')}</option><option value="日給">{t('form.salaryTypeDaily')}</option><option value="時給">{t('form.salaryTypeHourly')}</option>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">基本給（円）</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.baseSalary')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">日給単価（円）</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.dailyRate')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">時給単価（円）</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.hourlyRate')}</label>`
);
content = content.replace(
  `<h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">社会保険</h4>`,
  `<h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('form.socialInsurance')}</h4>`
);
content = content.replace(
  `<span className="text-sm text-slate-700">健康保険</span>`,
  `<span className="text-sm text-slate-700">{t('form.healthIns')}</span>`
);
content = content.replace(
  `<span className="text-sm text-slate-700">厚生年金</span>`,
  `<span className="text-sm text-slate-700">{t('form.pension')}</span>`
);
content = content.replace(
  `<span className="text-sm text-slate-700">雇用保険</span>`,
  `<span className="text-sm text-slate-700">{t('form.empIns')}</span>`
);
content = content.replace(
  `<span className="text-sm text-slate-700">労災保険</span>`,
  `<span className="text-sm text-slate-700">{t('form.workersComp')}</span>`
);
content = content.replace(
  `<h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">諸手当（月額）</h4>`,
  `<h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('form.benefitsTitle')}</h4>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">通勤手当</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.transport')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">住宅手当</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.housing')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">食事手当</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.meal')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">国籍</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.nationality')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">在留資格</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.visaType')}</label>`
);
content = content.replace(
  `<option value="">選択してください</option>`,
  `<option value="">{t('common.select')}</option>`
);
content = content.replace(
  `{residenceStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}`,
  `{residenceStatusOptions.map(s => <option key={s} value={s}>{getVisaStatusLabel(s)}</option>)}`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">在留カード番号</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.visaNo')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">交付日</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.issueDate')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">有効期限</label>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.expiryDate')}</label>`
);
content = content.replace(
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">就労制限</label><input type="text" name="workRestriction" value={formData.workRestriction} onChange={handleChange} placeholder="就労制限なし" className={inputCls} /></div>`,
  `<div><label className="block text-sm font-medium text-slate-700 mb-1">{t('form.restriction')}</label><input type="text" name="workRestriction" value={formData.workRestriction} onChange={handleChange} placeholder={t('client.restrictionNone')} className={inputCls} /></div>`
);
content = content.replace(
  `{formData.dependentList.length === 0 && <p className="text-sm text-slate-400">扶養家族はいません</p>}`,
  `{formData.dependentList.length === 0 && <p className="text-sm text-slate-400">{t('form.dependentsNone')}</p>}`
);
content = content.replace(
  `<input type="text" placeholder="氏名" value={dep.name}`,
  `<input type="text" placeholder={t('form.depName')} value={dep.name}`
);
content = content.replace(
  `<input type="text" placeholder="続柄" value={dep.relationship}`,
  `<input type="text" placeholder={t('form.depRel')} value={dep.relationship}`
);
content = content.replace(
  `<option value="">性別</option><option value="男性">男性</option><option value="女性">女性</option>`,
  `<option value="">{t('form.gender')}</option><option value="男性">{t('form.genderMale')}</option><option value="女性">{t('form.genderFemale')}</option>`
);
content = content.replace(
  `<option value="同居">同居</option><option value="別居">別居</option>`,
  `<option value="同居">{t('form.cohabitYes')}</option><option value="別居">{t('form.cohabitNo')}</option>`
);
content = content.replace(
  `{formData.education.length === 0 && <p className="text-sm text-slate-400">学歴はありません</p>}`,
  `{formData.education.length === 0 && <p className="text-sm text-slate-400">{t('form.eduNone')}</p>}`
);
content = content.replace(
  `<input type="text" placeholder="学校名" value={edu.school}`,
  `<input type="text" placeholder={t('form.school')} value={edu.school}`
);
content = content.replace(
  `<input type="text" placeholder="学位" value={edu.degree}`,
  `<input type="text" placeholder={t('form.degree')} value={edu.degree}`
);
content = content.replace(
  `<input type="text" placeholder="専攻" value={edu.major}`,
  `<input type="text" placeholder={t('form.major')} value={edu.major}`
);
content = content.replace(
  `<input type="text" placeholder="卒業年" value={edu.graduationYear}`,
  `<input type="text" placeholder={t('form.gradYear')} value={edu.graduationYear}`
);
content = content.replace(
  `{formData.certifications.length === 0 && <p className="text-sm text-slate-400">資格はありません</p>}`,
  `{formData.certifications.length === 0 && <p className="text-sm text-slate-400">{t('form.certNone')}</p>}`
);
content = content.replace(
  `<input type="text" placeholder="資格名" value={cert.name}`,
  `<input type="text" placeholder={t('form.certName')} value={cert.name}`
);
content = content.replace(
  `<input type="text" placeholder="発行元" value={cert.issuer}`,
  `<input type="text" placeholder={t('form.issuer')} value={cert.issuer}`
);
content = content.replace(
  `<button type="button" onClick={onClose} className="px-6 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">キャンセル</button>`,
  `<button type="button" onClick={onClose} className="px-6 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">{t('form.cancel')}</button>`
);
content = content.replace(
  `<button type="submit" className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{employee ? '更新' : '作成'}</button>`,
  `<button type="submit" className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">{employee ? t('form.update') : t('form.create')}</button>`
);

content = content.replace(`title="部署"`, `title={t('form.dept')}`);
content = content.replace(`title="役職"`, `title={t('form.pos')}`);
content = content.replace(`title="雇用形態"`, `title={t('form.contractType')}`);

content = content.replace(
  `<button type="button" onClick={addDependent} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ 追加</button>`,
  `<button type="button" onClick={addDependent} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ {t('common.add')}</button>`
);
content = content.replace(
  `<button type="button" onClick={addEducation} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ 追加</button>`,
  `<button type="button" onClick={addEducation} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ {t('common.add')}</button>`
);
content = content.replace(
  `<button type="button" onClick={addCertification} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ 追加</button>`,
  `<button type="button" onClick={addCertification} className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ {t('common.add')}</button>`
);
content = content.replace(
  `<button type="button" onClick={() => setManageDeptOpen(true)} className="px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 whitespace-nowrap">管理</button>`,
  `<button type="button" onClick={() => setManageDeptOpen(true)} className="px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 whitespace-nowrap">{t('form.manage')}</button>`
);
content = content.replace(
  `<button type="button" onClick={() => setManagePosOpen(true)} className="px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 whitespace-nowrap">管理</button>`,
  `<button type="button" onClick={() => setManagePosOpen(true)} className="px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 whitespace-nowrap">{t('form.manage')}</button>`
);
content = content.replace(
  `<button type="button" onClick={() => setManageContractOpen(true)} className="px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 whitespace-nowrap">管理</button>`,
  `<button type="button" onClick={() => setManageContractOpen(true)} className="px-3 py-2 text-xs bg-slate-100 border border-slate-300 rounded-lg hover:bg-slate-200 whitespace-nowrap">{t('form.manage')}</button>`
);

content = content.replace('placeholder="山田"', 'placeholder={t(\'form.lastNamePlaceholder\')}');
content = content.replace('placeholder="太郎"', 'placeholder={t(\'form.firstNamePlaceholder\')}');
content = content.replace('placeholder="ヤマダ"', 'placeholder={t(\'form.lastNameKanaPlaceholder\')}');
content = content.replace('placeholder="タロウ"', 'placeholder={t(\'form.firstNameKanaPlaceholder\')}');

// Find select name="nationality" and replace robustly
const selectStart = content.indexOf('<select name="nationality"');
if (selectStart !== -1) {
  const selectEnd = content.indexOf('</select>', selectStart);
  if (selectEnd !== -1) {
    const selectTagClose = content.indexOf('>', selectStart) + 1;
    const selectHeader = content.slice(selectStart, selectTagClose);
    const newSelectHtml = `${selectHeader}\n                  {countryOptions.map(c => <option key={c} value={c}>{getCountryLabel(c)}</option>)}\n                `;
    content = content.slice(0, selectStart) + newSelectHtml + content.slice(selectEnd);
  }
}

fs.writeFileSync(formFilePath, content, 'utf8');
console.log('EmployeeFormModal.tsx fully updated in a single pass!');
