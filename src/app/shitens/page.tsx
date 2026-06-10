import DashboardLayout from '@/components/layout/DashboardLayout';
import ShitensClient from '@/components/shitens/ShitensClient';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ShitensPage() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  if (!sessionUserCookie) {
    redirect('/login');
  }

  const shitens = await prisma.shiten.findMany({
    include: {
      _count: {
        select: { employees: true },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const serialized = shitens.map(s => ({
    id: s.id,
    name: s.name,
    nameKana: s.nameKana || null,
    address: s.address || null,
    phone: s.phone || null,
    _count: s._count,
  }));

  return (
    <DashboardLayout title="支店管理" subtitle="支店情報の管理と従業員配属">
      <div className="space-y-6">
        <ShitensClient initialShitens={serialized} />
      </div>
    </DashboardLayout>
  );
}
