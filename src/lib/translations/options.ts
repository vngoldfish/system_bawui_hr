export const countryOptions = [
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

export const getCountryLabel = (c: string, locale: string) => {
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
    'マレーシア': { en: 'Malaysia', vi: 'Malaysia', zh: '马来西亚', th: 'มาเลเซีย' },
    'シンガポール': { en: 'Singapore', vi: 'Singapore', zh: '新加坡', th: 'สิงคโปร์' },
    'インドネシア': { en: 'Indonesia', vi: 'Indonesia', zh: '印度尼西亚', th: 'อินโดนีเซีย' },
    'フィリピン': { en: 'Philippines', vi: 'Philippines', zh: '菲律宾', th: 'ฟิลิปปินส์' },
    'インド': { en: 'India', vi: 'Ấn Độ', zh: '印度', th: 'อินเดีย' },
    'ネパール': { en: 'Nepal', vi: 'Nepal', zh: '尼泊尔', th: 'เนปาล' },
    'アメリカ': { en: 'USA', vi: 'Mỹ', zh: '美国', th: 'สหรัฐอเมริกา' },
    'カナダ': { en: 'Canada', vi: 'Canada', zh: '加拿大', th: 'แคนาดา' },
    'オーストラリア': { en: 'Australia', vi: 'Úc', zh: '澳大利亚', th: 'ออสเตรเลีย' },
    'イギリス': { en: 'UK', vi: 'Anh', zh: '英国', th: 'สหราชอาณาจักร' },
    'フランス': { en: 'France', vi: 'Pháp', zh: '法国', th: 'ฝรั่งเศส' },
    'ドイツ': { en: 'Germany', vi: 'Đức', zh: '德国', th: 'เยอรมนี' },
    'その他': { en: 'Other', vi: 'Khác', zh: '其他', th: 'อื่นๆ' },
  };
  return mapping[c]?.[locale] || c;
};

export const getVisaStatusLabel = (v: string, locale: string) => {
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
    '研修': { en: 'Trainee', vi: 'Tu nghiệp sinh', zh: '研修', th: 'การฝึกอบรม' },
    '永住者': { en: 'Permanent Resident', vi: 'Vĩnh trú', zh: '永住者', th: 'ผู้พำนักถาวร' },
    '定住者': { en: 'Long-term Resident', vi: 'Định cư', zh: '定住者', th: 'ผู้ตั้งถิ่นฐาน' },
    '日本人の配偶者等': { en: 'Spouse of Japanese National', vi: 'Vợ/chồng người Nhật', zh: '日本配偶者', th: 'คู่สมรส củaคนญี่ปุ่น' }
  };
  return mapping[v]?.[locale] || v;
};

export const visaOptions = [
  '技術・人文知識・国際業務',
  '技能',
  '高度専門職',
  '経営・管理',
  '技術',
  '教授',
  '芸術',
  '宗教',
  '報道',
  '法律・会計業務',
  '医療',
  '研究',
  '教育',
  '企業内転勤',
  '興行',
  '技能実習',
  '特定技能',
  '介護',
  '短期滞在',
  '留学',
  '研修',
  '家族滞在',
  '特定活動'
];
