import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EvaluationClient from '@/components/evaluation/EvaluationClient';

export const dynamic = 'force-dynamic';

const employees = [
  { id: '1', firstName: '太郎', lastName: '山田', firstNameKana: 'タロウ', department: '営業部', position: '部長' },
  { id: '2', firstName: '花子', lastName: '佐藤', firstNameKana: 'ハナコ', department: '開発部', position: '主任' },
  { id: '3', firstName: '一郎', lastName: '鈴木', firstNameKana: 'イチロウ', department: '営業部', position: '係長' },
  { id: '4', firstName: '美咲', lastName: '田中', firstNameKana: 'ミサキ', department: '人事部', position: '課長' },
  { id: '5', firstName: '健二', lastName: '高橋', firstNameKana: 'ケンジ', department: '開発部', position: '一般' },
  { id: '6', firstName: '由美', lastName: '渡辺', firstNameKana: 'ユミ', department: '経理部', position: '主任' },
  { id: '7', firstName: '大輔', lastName: '伊藤', firstNameKana: 'ダイスケ', department: '開発部', position: '一般' },
  { id: '8', firstName: 'さくら', lastName: '山本', firstNameKana: 'サクラ', department: '営業部', position: '一般' },
  { id: '9', firstName: '隆', lastName: '中村', firstNameKana: 'タカシ', department: '開発部', position: '部長' },
  { id: '10', firstName: '愛', lastName: '小林', firstNameKana: 'アイ', department: '人事部', position: '一般' },
  { id: '11', firstName: 'ミン', lastName: 'グエン', firstNameKana: 'ミン', department: '開発部', position: '一般' },
  { id: '12', firstName: 'ウェイ', lastName: 'リー', firstNameKana: 'ウェイ', department: '営業部', position: '一般' },
  { id: '13', firstName: 'ラビ', lastName: 'シャルマ', firstNameKana: 'ラビ', department: '開発部', position: '主任' },
  { id: '14', firstName: '恵子', lastName: '加藤', firstNameKana: 'ケイコ', department: '経理部', position: '課長' },
];

export default async function EvaluationPage() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  
  if (!sessionUserCookie) {
    redirect('/login');
  }
  
  let user;
  try {
    user = JSON.parse(decodeURIComponent(sessionUserCookie.value));
  } catch (_e) {
    redirect('/login');
  }

  const dbUser = await prisma.employee.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    redirect('/login');
  }

  // Get role permissions for user's role
  const rpMappings = await prisma.rolePermission.findMany({
    where: { role: dbUser.role },
    select: { permission: true },
  });
  
  const userPermissions = rpMappings.map(rp => rp.permission);
  
  // If the user is not SUPER_ADMIN and does not have the 'employees:view' permission, block access.
  if (dbUser.role !== 'SUPER_ADMIN' && !userPermissions.includes('employees:view')) {
    redirect('/dashboard?error=forbidden');
  }

  return (
    <DashboardLayout title="評価管理" subtitle="従業員の人事評価・目標管理">
      <div className="space-y-6">
        <EvaluationClient employees={employees} />
      </div>
    </DashboardLayout>
  );
}
