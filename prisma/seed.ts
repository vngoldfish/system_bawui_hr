import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.residenceCardHistory.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.education.deleteMany();
  await prisma.dependent.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.overtimeRequest.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.position.deleteMany();
  await prisma.contractType.deleteMany();

  // Create departments
  const eigyo = await prisma.department.create({ data: { name: '営業部', nameKana: 'えいぎょうぶ', description: '営業・販売を担当' } });
  const kaihatsu = await prisma.department.create({ data: { name: '開発部', nameKana: 'かいはつぶ', description: 'システム開発を担当' } });
  const jinji = await prisma.department.create({ data: { name: '人事部', nameKana: 'じんじぶ', description: '人事・労務を担当' } });
  const keiri = await prisma.department.create({ data: { name: '経理部', nameKana: 'けいりぶ', description: '経理・財務を担当' } });

  console.log('Created 4 departments');

  // Create positions
  const posBucho = await prisma.position.create({ data: { name: '部長', nameKana: 'ぶちょう', description: '部門の最高責任者' } });
  const posKacho = await prisma.position.create({ data: { name: '課長', nameKana: 'かちょう', description: '課の責任者' } });
  const posKakaricho = await prisma.position.create({ data: { name: '係長', nameKana: 'かかりちょう', description: '係の責任者' } });
  const posShunin = await prisma.position.create({ data: { name: '主任', nameKana: 'しゅにん', description: '中堅社員' } });
  const posLeadEng = await prisma.position.create({ data: { name: 'リードエンジニア', nameKana: 'リードエンジニア', description: '開発チームリーダー' } });
  const posSeniorEng = await prisma.position.create({ data: { name: 'シニアエンジニア', nameKana: 'シニアエンジニア', description: '上級エンジニア' } });
  const posEng = await prisma.position.create({ data: { name: 'エンジニア', nameKana: 'エンジニア', description: 'エンジニア' } });
  const posAssistant = await prisma.position.create({ data: { name: 'アシスタント', nameKana: 'アシスタント', description: 'アシスタント' } });
  const posManager = await prisma.position.create({ data: { name: 'マネージャー', nameKana: 'マネージャー', description: 'プロジェクトマネージャー' } });
  const posKeiri = await prisma.position.create({ data: { name: '経理担当', nameKana: 'けいりたんとう', description: '経理業務担当' } });

  console.log('Created 10 positions');

  // Create contract types
  const ctSeishain = await prisma.contractType.create({ data: { name: '正社員', nameKana: 'せいしゃいん', description: '正規雇用', defaultEndDateType: 'none', defaultSalaryType: '月給' } });
  const ctKeiyaku = await prisma.contractType.create({ data: { name: '契約社員', nameKana: 'けいやくしゃいん', description: '期間限定雇用', defaultEndDateType: 'fixed', defaultSalaryType: '月給' } });
  const ctPart = await prisma.contractType.create({ data: { name: 'パート', nameKana: 'パート', description: 'パートタイム', defaultEndDateType: 'fixed', defaultSalaryType: '日給' } });
  const ctArubaito = await prisma.contractType.create({ data: { name: 'アルバイト', nameKana: 'アルバイト', description: 'アルバイト', defaultEndDateType: 'fixed', defaultSalaryType: '時給' } });
  const ctHaken = await prisma.contractType.create({ data: { name: '派遣社員', nameKana: 'はけんしゃいん', description: '派遣労働', defaultEndDateType: 'fixed', defaultSalaryType: '月給' } });
  const ctShokutaku = await prisma.contractType.create({ data: { name: '嘱託社員', nameKana: 'しょくたくしゃいん', description: '嘱託雇用', defaultEndDateType: 'fixed', defaultSalaryType: '月給' } });

  console.log('Created 6 contract types');

  // Employee data
  const employees = [
    {
      employeeCode: 'NV001', firstName: '太郎', lastName: '山田', firstNameKana: 'たろう', lastNameKana: 'やまだ',
      email: 'taro.yamada@company.jp', phone: '090-1234-5678',
      birthDate: '1992-03-15', departmentId: eigyo.id, positionId: posShunin.id,
      hireDate: '2020-04-01', salary: 450000, status: 'ACTIVE' as const,
      nationality: '日本', contractTypeId: ctSeishain.id, contractStartDate: '2020-04-01',
      salaryType: '月給', benefits: { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 15000, housing: 30000, meal: 10000 },
      dependents: [
        { name: '山田 花子', relationship: '配偶者', birthDate: '1992-05-15', gender: '女性', cohabitation: '同居' },
        { name: '山田 太一', relationship: '子', birthDate: '2022-03-10', gender: '男性', cohabitation: '同居' },
      ],
      education: [{ school: '早稲田大学', degree: '学士', major: '商学部', graduationYear: '2018' }],
      certifications: [
        { name: '営業士検定1級', issuer: '全国販売士教育振興会', acquiredDate: '2019-11-15' },
        { name: '普通自動車第一種運転免許', issuer: '警視庁', acquiredDate: '2016-03-20', expiryDate: '2026-03-20' },
      ],
    },
    {
      employeeCode: 'NV002', firstName: '花子', lastName: '佐藤', firstNameKana: 'はなこ', lastNameKana: 'さとう',
      email: 'hanako.sato@company.jp', phone: '090-2345-6789',
      birthDate: '1990-06-20', departmentId: kaihatsu.id, positionId: posLeadEng.id,
      hireDate: '2019-07-01', salary: 550000, status: 'ACTIVE' as const,
      nationality: '日本', contractTypeId: ctSeishain.id, contractStartDate: '2019-07-01',
      salaryType: '月給', benefits: { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 15000, housing: 30000, meal: 10000 },
      dependents: [
        { name: '佐藤 一郎', relationship: '配偶者', birthDate: '1990-11-20', gender: '男性', cohabitation: '同居' },
      ],
      education: [
        { school: '東京大学', degree: '修士', major: '情報理工学系', graduationYear: '2017' },
        { school: '東京大学', degree: '学士', major: 'コンピュータ科学', graduationYear: '2015' },
      ],
      certifications: [
        { name: '基本情報技術者', issuer: 'IPA', acquiredDate: '2016-04-20' },
        { name: '応用情報技術者', issuer: 'IPA', acquiredDate: '2018-04-15' },
        { name: 'AWS Solutions Architect Associate', issuer: 'Amazon', acquiredDate: '2022-06-10', expiryDate: '2025-06-10' },
      ],
    },
    {
      employeeCode: 'NV003', firstName: '健太', lastName: '高橋', firstNameKana: 'けんた', lastNameKana: 'たかはし',
      email: 'kenta.takahashi@company.jp', phone: '090-3456-7890',
      birthDate: '1988-11-05', departmentId: jinji.id, positionId: posKakaricho.id,
      hireDate: '2018-10-01', salary: 500000, status: 'ACTIVE' as const,
      nationality: '日本', contractTypeId: ctSeishain.id, contractStartDate: '2018-10-01',
      salaryType: '月給', benefits: { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 15000, housing: 30000, meal: 10000 },
      dependents: [
        { name: '高橋 真理', relationship: '配偶者', birthDate: '1991-08-22', gender: '女性', cohabitation: '同居' },
        { name: '高橋 悠', relationship: '子', birthDate: '2019-12-05', gender: '男性', cohabitation: '同居' },
        { name: '高橋 さくら', relationship: '子', birthDate: '2021-07-18', gender: '女性', cohabitation: '同居' },
      ],
      education: [{ school: '慶應義塾大学', degree: '学士', major: '文学部', graduationYear: '2016' }],
      certifications: [
        { name: '社会保険労務士', issuer: '厚生労働省', acquiredDate: '2019-10-15' },
        { name: 'キャリアコンサルタント', issuer: '労働政策研究・研修機構', acquiredDate: '2020-03-20' },
        { name: '簿記検定2級', issuer: '日本商工会議所', acquiredDate: '2015-06-15' },
      ],
    },
    {
      employeeCode: 'NV004', firstName: '美咲', lastName: '伊藤', firstNameKana: 'みさき', lastNameKana: 'いとう',
      email: 'misaki.ito@company.jp', phone: '090-4567-8901',
      birthDate: '1993-09-12', departmentId: keiri.id, positionId: posShunin.id,
      hireDate: '2021-01-01', salary: 420000, status: 'ACTIVE' as const,
      nationality: '日本', contractTypeId: ctSeishain.id, contractStartDate: '2021-01-01',
      salaryType: '月給', benefits: { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 15000, housing: 30000, meal: 10000 },
      dependents: [],
      education: [{ school: '一橋大学', degree: '学士', major: '経済学部', graduationYear: '2019' }],
      certifications: [
        { name: '日商簿記検定1級', issuer: '日本商工会議所', acquiredDate: '2020-02-15' },
        { name: '税理士', issuer: '国税庁', acquiredDate: '2022-11-20' },
        { name: 'FASS検定（経理）', issuer: '経済産業省', acquiredDate: '2021-06-10' },
      ],
    },
    {
      employeeCode: 'NV005', firstName: '大輔', lastName: '田中', firstNameKana: 'だいすけ', lastNameKana: 'たなか',
      email: 'daisuke.tanaka@company.jp', phone: '090-5678-9012',
      birthDate: '1995-02-28', departmentId: kaihatsu.id, positionId: posEng.id,
      hireDate: '2022-04-01', salary: 380000, status: 'ACTIVE' as const,
      nationality: '日本', contractTypeId: ctKeiyaku.id, contractStartDate: '2022-04-01', contractEndDate: '2026-03-31',
      salaryType: '月給', benefits: { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 15000, housing: 0, meal: 10000 },
      dependents: [],
      education: [{ school: '筑波大学', degree: '学士', major: '情報学類', graduationYear: '2020' }],
      certifications: [
        { name: '基本情報技術者', issuer: 'IPA', acquiredDate: '2019-04-15' },
        { name: 'LPIC Level 1', issuer: 'LPI', acquiredDate: '2021-08-20' },
      ],
    },
    {
      employeeCode: 'NV006', firstName: 'さくら', lastName: '鈴木', firstNameKana: 'さくら', lastNameKana: 'すずき',
      email: 'sakura.suzuki@company.jp', phone: '090-6789-0123',
      birthDate: '1998-04-15', departmentId: eigyo.id, positionId: posAssistant.id,
      hireDate: '2023-04-01', salary: 300000, status: 'ON_LEAVE' as const,
      nationality: '日本', contractTypeId: ctArubaito.id, contractStartDate: '2023-04-01', contractEndDate: '2026-03-31',
      salaryType: '時給', hourlyRate: 1200, benefits: { healthInsurance: false, pension: false, employmentInsurance: true, workersComp: true, transportation: 10000, housing: 0, meal: 0 },
      dependents: [],
      education: [{ school: '日本大学', degree: '学士', major: '経営学部', graduationYear: '2022' }],
      certifications: [
        { name: 'TOEIC 750点', issuer: 'ETS', acquiredDate: '2022-03-15' },
        { name: '秘書技能検定2級', issuer: '実務技能検定協会', acquiredDate: '2021-06-20' },
      ],
    },
    {
      employeeCode: 'NV007', firstName: '翔太', lastName: '渡辺', firstNameKana: 'しょうた', lastNameKana: 'わたなべ',
      email: 'shota.watanabe@company.jp', phone: '090-7890-1234',
      birthDate: '1989-02-14', departmentId: kaihatsu.id, positionId: posSeniorEng.id,
      hireDate: '2017-06-01', salary: 620000, status: 'ACTIVE' as const,
      nationality: '日本', contractTypeId: ctSeishain.id, contractStartDate: '2017-06-01',
      salaryType: '月給', benefits: { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 15000, housing: 30000, meal: 10000 },
      dependents: [
        { name: '渡辺 恵子', relationship: '配偶者', birthDate: '1989-02-14', gender: '女性', cohabitation: '同居' },
        { name: '渡辺 遼', relationship: '子', birthDate: '2017-09-30', gender: '男性', cohabitation: '同居' },
        { name: '渡辺 結菜', relationship: '子', birthDate: '2020-01-25', gender: '女性', cohabitation: '同居' },
        { name: '渡辺 正雄', relationship: '父', birthDate: '1960-04-08', gender: '男性', cohabitation: '別居' },
      ],
      education: [
        { school: '京都大学', degree: '修士', major: '情報学研究科', graduationYear: '2015' },
        { school: '京都大学', degree: '学士', major: '工学部情報学科', graduationYear: '2013' },
      ],
      certifications: [
        { name: '応用情報技術者', issuer: 'IPA', acquiredDate: '2016-04-15' },
        { name: '情報処理安全確保支援士', issuer: 'IPA', acquiredDate: '2019-04-20' },
        { name: 'AWS Solutions Architect Professional', issuer: 'Amazon', acquiredDate: '2023-01-10', expiryDate: '2026-01-10' },
        { name: 'TOEIC 850点', issuer: 'ETS', acquiredDate: '2020-09-15' },
      ],
    },
    {
      employeeCode: 'NV008', firstName: '由美', lastName: '小林', firstNameKana: 'ゆみ', lastNameKana: 'こばやし',
      email: 'yumi.kobayashi@company.jp', phone: '090-8901-2345',
      birthDate: '1985-06-12', departmentId: jinji.id, positionId: posBucho.id,
      hireDate: '2015-04-01', salary: 700000, status: 'ACTIVE' as const,
      nationality: '日本', contractTypeId: ctSeishain.id, contractStartDate: '2015-04-01',
      salaryType: '月給', benefits: { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 15000, housing: 30000, meal: 10000 },
      dependents: [
        { name: '小林 誠', relationship: '配偶者', birthDate: '1985-06-12', gender: '男性', cohabitation: '同居' },
        { name: '小林 陽菜', relationship: '子', birthDate: '2018-11-03', gender: '女性', cohabitation: '同居' },
      ],
      education: [{ school: '上智大学', degree: '学士', major: '外国語学部', graduationYear: '2012' }],
      certifications: [
        { name: '社会保険労務士', issuer: '厚生労働省', acquiredDate: '2016-10-15' },
        { name: 'キャリアコンサルタント', issuer: '労働政策研究・研修機構', acquiredDate: '2017-03-20' },
        { name: 'TOEIC 900点', issuer: 'ETS', acquiredDate: '2019-03-15' },
        { name: '人事検定1級', issuer: '日本人事検定機構', acquiredDate: '2020-06-10' },
      ],
    },
    {
      employeeCode: 'NV009', firstName: '隆', lastName: '加藤', firstNameKana: 'たかし', lastNameKana: 'かとう',
      email: 'takashi.kato@company.jp', phone: '090-9012-3456',
      birthDate: '1988-03-20', departmentId: eigyo.id, positionId: posKacho.id,
      hireDate: '2016-08-01', salary: 600000, status: 'INACTIVE' as const,
      nationality: '日本', contractTypeId: ctSeishain.id, contractStartDate: '2016-08-01',
      salaryType: '月給', benefits: { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 15000, housing: 30000, meal: 10000 },
      dependents: [
        { name: '加藤 美和', relationship: '配偶者', birthDate: '1988-03-20', gender: '女性', cohabitation: '同居' },
        { name: '加藤 健一', relationship: '子', birthDate: '2016-05-14', gender: '男性', cohabitation: '同居' },
        { name: '加藤 千尋', relationship: '子', birthDate: '2019-08-22', gender: '女性', cohabitation: '同居' },
      ],
      education: [{ school: '明治大学', degree: '学士', major: '商学部', graduationYear: '2014' }],
      certifications: [
        { name: '営業士検定1級', issuer: '全国販売士教育振興会', acquiredDate: '2018-11-15' },
        { name: '中小企業診断士', issuer: '中小企業庁', acquiredDate: '2020-04-20' },
      ],
    },
    {
      employeeCode: 'NV010', firstName: '愛', lastName: '吉田', firstNameKana: 'あい', lastNameKana: 'よしだ',
      email: 'ai.yoshida@company.jp', phone: '090-0123-4567',
      birthDate: '1993-07-07', departmentId: keiri.id, positionId: posKeiri.id,
      hireDate: '2022-10-01', salary: 350000, status: 'ACTIVE' as const,
      nationality: '日本', contractTypeId: ctPart.id, contractStartDate: '2022-10-01', contractEndDate: '2026-09-30',
      salaryType: '日給', dailyRate: 10000, benefits: { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 10000, housing: 0, meal: 0 },
      dependents: [
        { name: '吉田 伸介', relationship: '配偶者', birthDate: '1993-07-07', gender: '男性', cohabitation: '同居' },
      ],
      education: [{ school: '立教大学', degree: '学士', major: '経済学部', graduationYear: '2021' }],
      certifications: [
        { name: '日商簿記検定2級', issuer: '日本商工会議所', acquiredDate: '2020-06-15' },
        { name: '給与計算実務能力検定', issuer: '全国経理教育協会', acquiredDate: '2022-09-20' },
      ],
    },
    // Foreign employees
    {
      employeeCode: 'NV011', firstName: 'ミン', lastName: 'グエン', firstNameKana: 'ミン', lastNameKana: 'グエン',
      email: 'minh.nguyen@company.jp', phone: '090-1122-3344',
      birthDate: '1994-05-22', departmentId: kaihatsu.id, positionId: posEng.id,
      hireDate: '2023-06-01', salary: 380000, status: 'ACTIVE' as const,
      nationality: 'ベトナム', residenceStatus: '技術・人文知識・国際業務', residenceCardNumber: 'YT20230601',
      residenceCardIssueDate: '2023-05-20', residenceExpiry: '2026-06-15', workRestriction: '就労可',
      contractTypeId: ctKeiyaku.id, contractStartDate: '2023-06-01', contractEndDate: '2026-05-31',
      salaryType: '月給', benefits: { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 15000, housing: 20000, meal: 10000 },
      dependents: [],
      education: [{ school: 'ベトナム国家大学ハノイ', degree: '学士', major: 'コンピュータ工学', graduationYear: '2020' }],
      certifications: [
        { name: 'JLPT N2', issuer: '日本国際教育支援協会', acquiredDate: '2022-12-15' },
        { name: '基本情報技術者', issuer: 'IPA', acquiredDate: '2023-04-20' },
        { name: 'Oracle Certified Java Programmer Silver', issuer: 'Oracle', acquiredDate: '2022-08-10' },
      ],
    },
    {
      employeeCode: 'NV012', firstName: 'ウェイ', lastName: 'リー', firstNameKana: 'ウェイ', lastNameKana: 'リー',
      email: 'wei.li@company.jp', phone: '090-2233-4455',
      birthDate: '1990-01-30', departmentId: kaihatsu.id, positionId: posSeniorEng.id,
      hireDate: '2021-09-01', salary: 580000, status: 'ACTIVE' as const,
      nationality: '中国', residenceStatus: '高度専門職', residenceCardNumber: 'CH20210901',
      residenceCardIssueDate: '2021-08-15', residenceExpiry: '2027-03-20', workRestriction: '就労可',
      contractTypeId: ctSeishain.id, contractStartDate: '2021-09-01',
      salaryType: '月給', benefits: { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 15000, housing: 30000, meal: 10000 },
      dependents: [
        { name: 'リー 梅', relationship: '配偶者', birthDate: '1994-01-30', gender: '女性', cohabitation: '同居' },
      ],
      education: [
        { school: '清華大学', degree: '修士', major: '計算機科学', graduationYear: '2018' },
        { school: '浙江大学', degree: '学士', major: 'ソフトウェア工学', graduationYear: '2016' },
      ],
      certifications: [
        { name: 'JLPT N1', issuer: '日本国際教育支援協会', acquiredDate: '2020-07-15' },
        { name: '応用情報技術者', issuer: 'IPA', acquiredDate: '2021-04-20' },
        { name: 'AWS Solutions Architect Professional', issuer: 'Amazon', acquiredDate: '2023-03-10', expiryDate: '2026-03-10' },
        { name: 'Google Cloud Professional Architect', issuer: 'Google', acquiredDate: '2022-11-15', expiryDate: '2024-11-15' },
      ],
    },
    {
      employeeCode: 'NV013', firstName: 'ラビ', lastName: 'シャルマ', firstNameKana: 'ラビ', lastNameKana: 'シャルマ',
      email: 'ravi.sharma@company.jp', phone: '090-3344-5566',
      birthDate: '1989-03-30', departmentId: eigyo.id, positionId: posManager.id,
      hireDate: '2020-11-01', salary: 650000, status: 'ACTIVE' as const,
      nationality: 'インド', residenceStatus: '経営・管理', residenceCardNumber: 'IN20201101',
      residenceCardIssueDate: '2020-10-20', residenceExpiry: '2025-12-31', workRestriction: '就労可',
      contractTypeId: ctSeishain.id, contractStartDate: '2020-11-01',
      salaryType: '月給', benefits: { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 15000, housing: 30000, meal: 10000 },
      dependents: [
        { name: 'シャルマ プリヤ', relationship: '配偶者', birthDate: '1992-09-15', gender: '女性', cohabitation: '同居' },
        { name: 'シャルマ アルジュン', relationship: '子', birthDate: '2021-04-20', gender: '男性', cohabitation: '同居' },
      ],
      education: [
        { school: 'Indian Institute of Technology Delhi', degree: 'MBA', major: '経営学', graduationYear: '2016' },
        { school: 'University of Delhi', degree: '学士', major: '商学', graduationYear: '2013' },
      ],
      certifications: [
        { name: 'JLPT N2', issuer: '日本国際教育支援協会', acquiredDate: '2019-07-15' },
        { name: 'PMP (Project Management Professional)', issuer: 'PMI', acquiredDate: '2019-03-20', expiryDate: '2025-03-20' },
        { name: 'TOEIC 920点', issuer: 'ETS', acquiredDate: '2020-09-15' },
      ],
    },
    {
      employeeCode: 'NV014', firstName: '麻衣', lastName: '松本', firstNameKana: 'まい', lastNameKana: 'まつもと',
      email: 'mai.matsumoto@company.jp', phone: '090-4455-6677',
      birthDate: '1991-07-08', departmentId: eigyo.id, positionId: posShunin.id,
      hireDate: '2019-04-01', salary: 440000, status: 'ON_LEAVE' as const,
      nationality: '日本', contractTypeId: ctKeiyaku.id, contractStartDate: '2019-04-01', contractEndDate: '2026-03-31',
      salaryType: '月給', benefits: { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 15000, housing: 0, meal: 10000 },
      dependents: [],
      education: [{ school: '青山学院大学', degree: '学士', major: '国際政治経済学部', graduationYear: '2017' }],
      certifications: [
        { name: 'TOEIC 800点', issuer: 'ETS', acquiredDate: '2018-03-15' },
        { name: '販売士検定1級', issuer: '全国販売士教育振興会', acquiredDate: '2020-11-20' },
        { name: '普通自動車第一種運転免許', issuer: '警視庁', acquiredDate: '2015-08-10', expiryDate: '2025-08-10' },
      ],
    },
  ];

  for (const emp of employees) {
    const { dependents, education, certifications, ...data } = emp;

    const defaultPassword = emp.employeeCode + (emp.birthDate ? emp.birthDate.replace(/-/g, '') : '123456');
    const role = emp.employeeCode === 'NV008' ? 'SUPER_ADMIN' : emp.employeeCode === 'NV003' ? 'HR_MANAGER' : 'EMPLOYEE';

    const employee = await prisma.employee.create({
      data: {
        ...data,
        password: hashPassword(defaultPassword),
        role,
        hireDate: new Date(data.hireDate),
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        residenceCardIssueDate: data.residenceCardIssueDate ? new Date(data.residenceCardIssueDate) : null,
        residenceExpiry: data.residenceExpiry ? new Date(data.residenceExpiry) : null,
        contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : null,
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
        benefits: data.benefits ?? undefined,
        dependents: {
          create: dependents.map(d => ({
            ...d,
            birthDate: d.birthDate ? new Date(d.birthDate) : null,
          })),
        },
        education: { create: education },
        certifications: {
          create: certifications.map((c: { name: string; issuer: string; acquiredDate?: string; expiryDate?: string }) => ({
            name: c.name,
            issuer: c.issuer,
            acquiredDate: c.acquiredDate ? new Date(c.acquiredDate) : null,
            expiryDate: c.expiryDate ? new Date(c.expiryDate) : null,
          })),
        },
      },
    });

    console.log(`Created employee: ${employee.lastName} ${employee.firstName}`);
  }

  // Seed leave requests, attendance, overtime requests and payroll records
  console.log('Seeding leave requests...');
  
  const allEmployees = await prisma.employee.findMany();
  const now = new Date();
  const hrManager = allEmployees.find(e => e.role === 'HR_MANAGER') || allEmployees[0];
  
  // Define leave types
  const leaveTypes = ['ANNUAL', 'SICK', 'PERSONAL', 'OTHER'] as const;
  
  // Track approved leave dates for each employee to prevent attendance generation on those days
  const employeeLeavesMap = new Map<string, Set<string>>();
  
  for (const emp of allEmployees) {
    employeeLeavesMap.set(emp.id, new Set<string>());
    
    // Generate 3-5 leave requests
    const numRequests = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numRequests; i++) {
      // Pick a random date in the last 6 months
      const randomMonthOffset = Math.floor(Math.random() * 6);
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() - randomMonthOffset);
      targetDate.setDate(1 + Math.floor(Math.random() * 25)); // random day 1-25
      
      const duration = 1 + Math.floor(Math.random() * 3); // 1-3 days
      const endDate = new Date(targetDate);
      endDate.setDate(targetDate.getDate() + duration - 1);
      
      const type = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
      
      // If the request is in the future, it can be PENDING. If in the past, it should be APPROVED (80%) or REJECTED (20%).
      const isPast = targetDate < now;
      let status: 'APPROVED' | 'REJECTED' | 'PENDING' = 'APPROVED';
      if (isPast) {
        status = Math.random() > 0.2 ? 'APPROVED' : 'REJECTED';
      } else {
        status = Math.random() > 0.5 ? 'PENDING' : 'APPROVED';
      }
      
      await prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          startDate: targetDate,
          endDate,
          type,
          reason: type === 'ANNUAL' ? '私用のため' : type === 'SICK' ? '体調不良のため' : '家事都合のため',
          status,
          approvedBy: status === 'APPROVED' ? hrManager.id : null,
        }
      });
      
      // If approved, mark the dates in the map
      if (status === 'APPROVED') {
        const dateSet = employeeLeavesMap.get(emp.id)!;
        const current = new Date(targetDate);
        while (current <= endDate) {
          const dateStr = current.toISOString().split('T')[0];
          dateSet.add(dateStr);
          current.setDate(current.getDate() + 1);
        }
      }
    }
  }
  
  console.log('Seeded leave requests');

  console.log('Seeding attendance records & overtime requests...');

  // Helper to generate list of past months in chronological order
  const getPastMonths = (count: number) => {
    const list: { year: number; month: number }[] = [];
    const d = new Date();
    for (let i = 0; i < count; i++) {
      list.push({
        year: d.getFullYear(),
        month: d.getMonth(), // 0-indexed
      });
      d.setMonth(d.getMonth() - 1);
    }
    return list.reverse();
  };

  const generateWorkdays = (year: number, month: number): Date[] => {
    const days: Date[] = [];
    // month is 0-indexed. month + 1 represents next month. Day 0 represents last day of target month.
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
        days.push(date);
      }
    }
    return days;
  };

  const pastMonths = getPastMonths(7); // Seed for 7 months (including current month)

  for (const emp of allEmployees) {
    const leaveDates = employeeLeavesMap.get(emp.id) || new Set<string>();
    
    for (const { year, month } of pastMonths) {
      const workdays = generateWorkdays(year, month);
      
      for (const date of workdays) {
        // If the date is today or in the future, don't generate attendance record to allow punch testing today
        const todayStr = now.toISOString().split('T')[0];
        const dateStr = date.toISOString().split('T')[0];
        if (dateStr === todayStr || date > now) continue;
        
        // 1. Check if the employee is on an approved leave
        if (leaveDates.has(dateStr)) {
          await prisma.attendanceRecord.create({
            data: {
              employeeId: emp.id,
              date,
              checkIn: null,
              checkOut: null,
              breakStart: null,
              breakEnd: null,
              status: 'HOLIDAY',
              overtimeHours: 0,
              notes: '有給休暇',
            }
          });
          continue;
        }
        
        // 2. Otherwise, randomize attendance status
        const rand = Math.random();
        let status: 'PRESENT' | 'LATE' | 'ABSENT' = 'PRESENT';
        if (rand > 0.97) {
          status = 'ABSENT';
        } else if (rand > 0.90) {
          status = 'LATE';
        }
        
        if (status === 'ABSENT') {
          await prisma.attendanceRecord.create({
            data: {
              employeeId: emp.id,
              date,
              checkIn: null,
              checkOut: null,
              breakStart: null,
              breakEnd: null,
              status: 'ABSENT',
              overtimeHours: 0,
              notes: '欠勤',
            }
          });
          continue;
        }
        
        // PRESENT or LATE
        let checkInTime = new Date(date);
        if (status === 'PRESENT') {
          const min = 30 + Math.floor(Math.random() * 30);
          checkInTime.setHours(8, min, 0, 0);
        } else {
          if (Math.random() > 0.5) {
            const min = 5 + Math.floor(Math.random() * 55);
            checkInTime.setHours(9, min, 0, 0);
          } else {
            const min = Math.floor(Math.random() * 30);
            checkInTime.setHours(10, min, 0, 0);
          }
        }
        
        let checkOutTime = new Date(date);
        const isOvertime = Math.random() > 0.7;
        let overtimeHours = 0;
        
        if (isOvertime) {
          const hour = 18 + Math.floor(Math.random() * 3);
          const min = Math.floor(Math.random() * 60);
          checkOutTime.setHours(hour, min, 0, 0);
          
          overtimeHours = (checkOutTime.getTime() - new Date(date).setHours(18, 0, 0, 0)) / 3600000;
          overtimeHours = Math.round(overtimeHours * 10) / 10;
        } else {
          const min = Math.floor(Math.random() * 30);
          checkOutTime.setHours(18, min, 0, 0);
        }
        
        const breakStartTime = new Date(date);
        breakStartTime.setHours(12, 0, 0, 0);
        const breakEndTime = new Date(date);
        breakEndTime.setHours(13, 0, 0, 0);
        
        await prisma.attendanceRecord.create({
          data: {
            employeeId: emp.id,
            date,
            checkIn: checkInTime,
            checkOut: checkOutTime,
            breakStart: breakStartTime,
            breakEnd: breakEndTime,
            status,
            overtimeHours,
            notes: status === 'LATE' ? '電車遅延のため' : '',
          }
        });
        
        // If overtime was worked, generate a matching OvertimeRequest
        if (overtimeHours > 0) {
          const pad = (n: number) => n.toString().padStart(2, '0');
          const startTimeStr = '18:00';
          const endTimeStr = `${pad(checkOutTime.getHours())}:${pad(checkOutTime.getMinutes())}`;
          
          await prisma.overtimeRequest.create({
            data: {
              employeeId: emp.id,
              date,
              startTime: startTimeStr,
              endTime: endTimeStr,
              reason: '期末決算および業務過多のため',
              status: 'APPROVED',
              approvedBy: hrManager.id,
            }
          });
        }
      }
    }
  }
  
  console.log('Created attendance records and approved overtime requests');

  // Generate some random pending/rejected overtime requests
  console.log('Seeding pending/rejected overtime requests...');
  for (const emp of allEmployees) {
    const numReqs = Math.floor(Math.random() * 3);
    for (let i = 0; i < numReqs; i++) {
      const daysOffset = -5 + Math.floor(Math.random() * 15); // from 5 days ago to 10 days in the future
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysOffset);
      
      const dayOfWeek = targetDate.getDay();
      if (dayOfWeek === 0) targetDate.setDate(targetDate.getDate() + 1);
      else if (dayOfWeek === 6) targetDate.setDate(targetDate.getDate() - 1);
      
      const status: 'PENDING' | 'REJECTED' = Math.random() > 0.5 ? 'PENDING' : 'REJECTED';
      const isPast = targetDate < now;
      const finalStatus = isPast ? 'REJECTED' : status;
      
      const existingOvertime = await prisma.overtimeRequest.findFirst({
        where: { employeeId: emp.id, date: { equals: new Date(targetDate.setHours(0,0,0,0)) } }
      });
      if (existingOvertime) continue;
      
      await prisma.overtimeRequest.create({
        data: {
          employeeId: emp.id,
          date: targetDate,
          startTime: '18:00',
          endTime: '20:00',
          reason: '急ぎの案件対応のため',
          status: finalStatus,
          approvedBy: finalStatus === 'REJECTED' ? hrManager.id : null,
        }
      });
    }
  }

  console.log('Seeding payroll records...');
  const payrollMonths = getPastMonths(7); // includes current month
  
  for (const emp of allEmployees) {
    for (const { year, month } of payrollMonths) {
      const monthStr = `${year}-${(month + 1).toString().padStart(2, '0')}`;
      
      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
      const status: 'PAID' | 'PENDING' = isCurrentMonth ? 'PENDING' : 'PAID';
      
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      
      const attendance = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: emp.id,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          }
        }
      });
      
      const presentDays = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
      const totalOvertimeHours = attendance.reduce((sum, a) => sum + a.overtimeHours, 0);
      
      let hourlyRate = emp.hourlyRate > 0 ? emp.hourlyRate : (emp.salary / 160);
      let dailyRate = emp.dailyRate > 0 ? emp.dailyRate : (emp.salary / 20);
      
      let baseSalary = emp.salary;
      if (emp.salaryType === '日給') {
        baseSalary = emp.dailyRate * presentDays;
      } else if (emp.salaryType === '時給') {
        baseSalary = emp.hourlyRate * 8 * presentDays;
      }
      
      const overtimePay = Math.round(totalOvertimeHours * hourlyRate * 1.25);
      
      let bonus = 0;
      if (month === 11) { // December
        bonus = Math.round(baseSalary * (1.0 + Math.random() * 0.5));
      }
      
      const deductions = Math.round(absentDays * dailyRate);
      const grossEarnings = baseSalary + overtimePay + bonus;
      const insurance = Math.round(grossEarnings * 0.15);
      const taxableIncome = Math.max(0, grossEarnings - insurance);
      const tax = Math.round(taxableIncome * 0.10);
      const netSalary = baseSalary + overtimePay + bonus - deductions - tax - insurance;
      
      const paymentDate = new Date(year, month, 25);
      
      await prisma.payrollRecord.create({
        data: {
          employeeId: emp.id,
          month: monthStr,
          baseSalary,
          overtimePay,
          bonus,
          deductions,
          tax,
          insurance,
          netSalary,
          paymentDate,
          status,
        }
      });
    }
  }

  console.log('Created comprehensive attendance, leave, overtime and payroll records');

  console.log('Seeding role permissions...');
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();

  const allPermissions = [
    { key: 'employees:view', category: '従業員管理 (Employee)', name: '従業員閲覧', description: '従業員の基本情報を閲覧する権限' },
    { key: 'employees:edit', category: '従業員管理 (Employee)', name: '従業員編集', description: '従業員の基本情報を追加・編集する権限' },
    { key: 'employees:delete', category: '従業員管理 (Employee)', name: '従業員削除', description: '従業員をシステムから削除する権限' },
    { key: 'attendance:view', category: '勤怠管理 (Attendance)', name: '勤怠閲覧', description: '勤怠記録および打刻ログを閲覧する権限' },
    { key: 'attendance:view_all_departments', category: '勤怠管理 (Attendance)', name: '全部署のシフト閲覧', description: '自部署以外の他の全部署のシフト表・スケジュールを閲覧する権限' },
    { key: 'attendance:edit', category: '勤怠管理 (Attendance)', name: '勤怠編集', description: '勤務・休憩時間の修正や打刻申請を管理する権限' },
    { key: 'leave:view', category: '休暇管理 (Leave)', name: '休暇申請閲覧', description: '有給休暇や特別休暇の申請一覧を閲覧する権限' },
    { key: 'leave:create', category: '休暇管理 (Leave)', name: '休暇申請作成', description: '休暇申請の申請登録を自律的に行う権限' },
    { key: 'leave:approve', category: '休暇管理 (Leave)', name: '休暇承認', description: '休暇申請に対して承認または却下を行う権限' },
    { key: 'payroll:view', category: '給与計算 (Payroll)', name: '給与閲覧', description: '給与明細や支払金額の概要を閲覧する権限' },
    { key: 'payroll:edit', category: '給与計算 (Payroll)', name: '給与計算・編集', description: '給与自動計算の実行、手当・控除の編集権限' },
    { key: 'residence_card:view', category: '外国人管理 (Visa)', name: '在留カード閲覧', description: '在留資格・カード番号・期限の閲覧権限' },
    { key: 'residence_card:edit', category: '外国人管理 (Visa)', name: '在留カード編集', description: '外国人管理情報の追加・更新権限' },
    { key: 'departments:view', category: '部署管理 (Department)', name: '部署閲覧', description: '部署の所属一覧や基本情報を閲覧する権限' },
    { key: 'departments:edit', category: '部署管理 (Department)', name: '部署編集', description: '部署の追加・名称変更・管理者の設定権限' },
    { key: 'reports:view', category: 'レポート (Reports)', name: 'レポート閲覧', description: '人件費推移・役職別給与などのグラフ分析権限' },
    { key: 'settings:view', category: 'システム設定 (Settings)', name: '設定閲覧', description: 'システム一般設定や初期値を閲覧する権限' },
    { key: 'settings:edit', category: 'システム設定 (Settings)', name: '設定編集', description: '会社情報や休暇設定の編集権限' },
  ];

  for (const perm of allPermissions) {
    await prisma.permission.create({
      data: perm,
    });
  }
  console.log('Seeded permission keys');

  const rolePermissions = {
    SUPER_ADMIN: [
      'employees:view', 'employees:edit', 'employees:delete',
      'payroll:view', 'payroll:edit',
      'attendance:view', 'attendance:view_all_departments', 'attendance:edit',
      'leave:view', 'leave:create', 'leave:approve',
      'reports:view',
      'residence_card:view', 'residence_card:edit',
      'departments:view', 'departments:edit',
      'settings:view', 'settings:edit'
    ],
    HR_MANAGER: [
      'employees:view', 'employees:edit', 'employees:delete',
      'payroll:view', 'payroll:edit',
      'attendance:view', 'attendance:view_all_departments', 'attendance:edit',
      'leave:view', 'leave:create', 'leave:approve',
      'reports:view',
      'residence_card:view', 'residence_card:edit',
      'departments:view', 'departments:edit'
    ],
    DEPARTMENT_MANAGER: [
      'employees:view', 'attendance:view', 'attendance:view_all_departments',
      'leave:view', 'leave:create', 'leave:approve',
      'reports:view', 'departments:view'
    ],
    EMPLOYEE: [
      'attendance:view',
      'leave:view', 'leave:create'
    ],
    VIEWER: [
      'employees:view', 'payroll:view', 'attendance:view', 'attendance:view_all_departments',
      'leave:view', 'reports:view',
      'residence_card:view', 'departments:view'
    ]
  };

  for (const [role, permissions] of Object.entries(rolePermissions)) {
    for (const permission of permissions) {
      await prisma.rolePermission.create({
        data: { role, permission }
      });
    }
  }
  console.log('Seeded role permissions');

  console.log('Seeding announcements...');
  await prisma.announcement.deleteMany();
  
  const superAdmin = await prisma.employee.findFirst({
    where: { role: 'SUPER_ADMIN' }
  });
  
  if (superAdmin) {
    const devDept = await prisma.department.findFirst({
      where: { name: '開発部' }
    });
    
    const shuninPos = await prisma.position.findFirst({
      where: { name: '主任' }
    });

    const taroYamada = await prisma.employee.findFirst({
      where: { employeeCode: 'NV001' }
    });

    await prisma.announcement.createMany({
      data: [
        {
          title: '📋 2026年夏季ボーナス評価シートの提出について',
          content: '評価シートの提出期限は【6月15日(月) 18:00】です。期限を厳守の上、各自評価シートをダウンロードして各部署責任者へ提出してください。',
          type: 'warning',
          targetType: 'ALL',
          senderId: superAdmin.id,
        },
        {
          title: '🛂 外国人従業員の方へ：在留期限の更新サポート',
          content: '在留カードの満了日が近づいている方は、会社が申請書類作成や取次ぎ手続きをサポートいたします。人事担当まで速やかにご連絡ください。',
          type: 'info',
          targetType: 'ALL',
          senderId: superAdmin.id,
        },
        {
          title: '💻 開発部ミーティングのお知らせ',
          content: '開発部の皆さん、毎週月曜日10:00より定例ミーティングを行います。遅れずに参加してください。',
          type: 'info',
          targetType: 'DEPARTMENT',
          targetId: devDept?.id || null,
          senderId: superAdmin.id,
        },
        {
          title: '🔑 主任研修のお知らせ',
          content: '主任役職の皆さんを対象に、来週水曜日14:00からリーダーシップ研修を実施します。',
          type: 'urgent',
          targetType: 'POSITION',
          targetId: shuninPos?.id || null,
          senderId: superAdmin.id,
        },
        {
          title: '🎁 山田さん個人へのお知らせ',
          content: '山田太郎さん、提出書類の再確認をお願いします。人事部までお越しください。',
          type: 'urgent',
          targetType: 'EMPLOYEE',
          targetId: taroYamada?.id || null,
          senderId: superAdmin.id,
        }
      ]
    });
    console.log('Seeded announcements');
  }
  
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
