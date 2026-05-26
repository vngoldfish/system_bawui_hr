import DashboardLayout from '@/components/layout/DashboardLayout';
import ContractsClient from '@/components/contracts/ContractsClient';
import { employeeService } from '@/services/employeeService';

export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  const serialized = await employeeService.getAllSortedByContractExpiry();

  return (
    <DashboardLayout title="契約管理" subtitle="雇用契約の管理">
      <ContractsClient initialEmployees={serialized} />
    </DashboardLayout>
  );
}
