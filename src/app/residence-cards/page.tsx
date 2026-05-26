import DashboardLayout from '@/components/layout/DashboardLayout';
import ResidenceCardsClient from '@/components/residence-cards/ResidenceCardsClient';
import { employeeService } from '@/services/employeeService';

export const dynamic = 'force-dynamic';

export default async function ResidenceCardsPage() {
  const serialized = await employeeService.getForeignEmployees();

  return (
    <DashboardLayout title="外国人管理" subtitle="在留カード・ビザ管理">
      <ResidenceCardsClient initialEmployees={serialized} />
    </DashboardLayout>
  );
}
