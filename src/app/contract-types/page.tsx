import DashboardLayout from '@/components/layout/DashboardLayout';
import ContractTypesClient from '@/components/contract-types/ContractTypesClient';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const unstable_instant = {
  prefetch: 'static',
  samples: [
    {
      cookies: [{ name: 'session_user', value: null }],
    },
  ],
};

function parseWorkDays(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number).filter(n => Number.isFinite(n));
  }
  return [1, 2, 3, 4, 5];
}

async function ContractTypesLoader() {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get('session_user');
  if (!sessionUserCookie) {
    redirect('/login');
  }

  const contractTypes = await prisma.contractType.findMany({
    include: {
      _count: { select: { employees: true } },
    },
    orderBy: { name: 'asc' },
  });

  const serialized = contractTypes.map(ct => ({
    id: ct.id,
    name: ct.name,
    nameKana: ct.nameKana,
    description: ct.description,
    category: ct.category,
    payrollMode: ct.payrollMode,
    overtimeMultiplier: ct.overtimeMultiplier,
    socialInsuranceDefault: ct.socialInsuranceDefault,
    employmentInsuranceDefault: ct.employmentInsuranceDefault,
    workersCompDefault: ct.workersCompDefault,
    maxWeeklyHours: ct.maxWeeklyHours,
    contractTemplateNotes: ct.contractTemplateNotes,
    defaultEndDateType: ct.defaultEndDateType,
    defaultSalaryType: ct.defaultSalaryType,
    defaultWorkDays: parseWorkDays(ct.defaultWorkDays),
    defaultStandardHoursPerDay: ct.defaultStandardHoursPerDay,
    defaultCheckIn: ct.defaultCheckIn,
    defaultCheckOut: ct.defaultCheckOut,
    defaultBreakStart: ct.defaultBreakStart,
    defaultBreakEnd: ct.defaultBreakEnd,
    defaultHolidayWorkCountsAsOvertime: ct.defaultHolidayWorkCountsAsOvertime,
    _count: ct._count,
  }));

  return <ContractTypesClient initialItems={serialized} />;
}

export default function ContractTypesPage() {
  return (
    <DashboardLayout title="雇用形態管理" subtitle="雇用形態の登録と給与・勤務条件の管理">
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
          </div>
        }
      >
        <ContractTypesLoader />
      </Suspense>
    </DashboardLayout>
  );
}