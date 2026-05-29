import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/crypto';

export async function seedReal(prisma: PrismaClient) {
  console.log('Clearing existing data and initializing real data structure...');

  // 1. Clean existing data completely
  await prisma.residenceCardHistory.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.education.deleteMany();
  await prisma.dependent.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.overtimeRequest.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.position.deleteMany();
  await prisma.contractType.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();

  console.log('Cleaned all existing tables.');

  // 2. Create basic departments
  const kanri = await prisma.department.create({ data: { name: '管理部', nameKana: 'かんりぶ', description: '管理業務全般' } });
  const eigyo = await prisma.department.create({ data: { name: '営業部', nameKana: 'えいぎょうぶ', description: '営業・販売業務' } });
  const kaihatsu = await prisma.department.create({ data: { name: '開発部', nameKana: 'かいはつぶ', description: 'システム開発業務' } });
  const jinji = await prisma.department.create({ data: { name: '人事部', nameKana: 'じんじぶ', description: '人事・労務管理' } });
  const keiri = await prisma.department.create({ data: { name: '経理部', nameKana: 'けいりぶ', description: '経理・財務業務' } });

  console.log('Created 5 core departments.');

  // 3. Create basic positions
  const posBucho = await prisma.position.create({ data: { name: '部長', nameKana: 'ぶちょう', description: '部門責任者' } });
  const posKacho = await prisma.position.create({ data: { name: '課長', nameKana: 'かちょう', description: '課責任者' } });
  const posKakaricho = await prisma.position.create({ data: { name: '係長', nameKana: 'かかりちょう', description: '係責任者' } });
  const posShunin = await prisma.position.create({ data: { name: '主任', nameKana: 'しゅにん', description: '中堅社員' } });
  const posStaff = await prisma.position.create({ data: { name: '一般社員', nameKana: 'いっぱんしゃいん', description: '一般社員' } });

  console.log('Created 5 core positions.');

  // 4. Create basic contract types
  const ctSeishain = await prisma.contractType.create({ data: { name: '正社員', nameKana: 'せいしゃいん', description: '正規雇用', defaultEndDateType: 'none', defaultSalaryType: '月給' } });
  const ctKeiyaku = await prisma.contractType.create({ data: { name: '契約社員', nameKana: 'けいやくしゃいん', description: '期間限定雇用', defaultEndDateType: 'fixed', defaultSalaryType: '月給' } });
  const ctPart = await prisma.contractType.create({ data: { name: 'パート', nameKana: 'パート', description: 'パートタイム', defaultEndDateType: 'fixed', defaultSalaryType: '日給' } });
  const ctArubaito = await prisma.contractType.create({ data: { name: 'アルバイト', nameKana: 'アルバイト', description: 'アルバイト', defaultEndDateType: 'fixed', defaultSalaryType: '時給' } });

  console.log('Created 4 core contract types.');

  // 5. Initialize Permissions
  const allPermissions = [
    { key: 'employees:view', category: '従業員管理 (Employee)', name: '従業員閲覧', description: '従業員の基本情報を閲覧する権限' },
    { key: 'employees:edit', category: '従業員管理 (Employee)', name: '従業員編集', description: '従業員の基本情報を追加・編集する権限' },
    { key: 'employees:delete', category: '従業員管理 (Employee)', name: '従業員削除', description: '従業員をシステムから削除する権限' },
    { key: 'attendance:view', category: '勤怠管理 (Attendance)', name: '勤怠閲覧', description: '勤怠記録および打刻ログを閲覧する権限' },
    { key: 'attendance:view_all_departments', category: '勤怠管理 (Attendance)', name: '全部署のシフト閲覧', description: '自部署以外の他の全部署 of シフト表・スケジュールを閲覧する権限' },
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
  console.log('Seeded permission keys.');

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
  console.log('Seeded role permissions.');

  // 6. Create Initial Super Admin User
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@bawui.com';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || '1234@abcd';
  
  await prisma.employee.create({
    data: {
      employeeCode: 'ADMIN001',
      firstName: '管理者',
      lastName: 'システム',
      firstNameKana: 'かんりしゃ',
      lastNameKana: 'システム',
      email: adminEmail,
      phone: '090-0000-0000',
      birthDate: new Date('1990-01-01'),
      hireDate: new Date('2026-05-30'),
      salary: 0,
      status: 'ACTIVE',
      role: 'SUPER_ADMIN',
      password: hashPassword(adminPassword),
      nationality: '日本',
      departmentId: kanri.id,
      positionId: posBucho.id,
      contractTypeId: ctSeishain.id,
      benefits: {},
    }
  });

  console.log(`Created Super Admin user successfully.`);
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log('Real database initialization completed successfully!');
}
