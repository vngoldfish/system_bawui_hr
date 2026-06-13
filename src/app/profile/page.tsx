import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProfileClient from '@/components/profile/ProfileClient';
import { Suspense } from 'react';

async function ProfileLoader({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const initialTab = resolvedSearchParams.tab || 'basic';
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  
  if (!sessionUserCookie) {
    redirect('/login');
  }
  
  let user;
  try {
    user = JSON.parse(decodeURIComponent(sessionUserCookie.value));
  } catch (e) {
    redirect('/login');
  }

  // Fetch full employee details from DB
  const dbUser = await prisma.employee.findUnique({
    where: { id: user.id },
    include: {
      department: true,
      position: true,
    },
  });

  if (!dbUser) {
    redirect('/login');
  }

  // Map to format required by ProfileClient
  const mappedUser = {
    id: dbUser.id,
    employeeCode: dbUser.employeeCode,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    firstNameKana: dbUser.firstNameKana,
    lastNameKana: dbUser.lastNameKana,
    email: dbUser.email,
    phone: dbUser.phone,
    address: dbUser.address || '',
    avatar: dbUser.avatar || '',
    nationality: dbUser.nationality,
    residenceStatus: dbUser.residenceStatus || '',
    residenceCardNumber: dbUser.residenceCardNumber || '',
    residenceExpiry: dbUser.residenceExpiry ? dbUser.residenceExpiry.toISOString().split('T')[0] : '',
    language: dbUser.language || 'ja',
    department: dbUser.department?.name || '無所属',
    position: dbUser.position?.name || '役職なし',
    hireDate: dbUser.hireDate.toISOString().split('T')[0],
  };

  return <ProfileClient user={mappedUser} initialTab={initialTab as any} />;
}

export default function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <DashboardLayout title="マイアカウント" subtitle="プロファイル管理・言語設定">
      <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
        <ProfileLoader searchParams={searchParams} />
      </Suspense>
    </DashboardLayout>
  );
}
