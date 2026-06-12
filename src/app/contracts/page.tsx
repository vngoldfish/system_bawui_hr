import DashboardLayout from '@/components/layout/DashboardLayout';
import ContractsClient from '@/components/contracts/ContractsClient';
import { employeeService } from '@/services/employeeService';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  const serialized = await employeeService.getAllSortedByContractExpiry();
  
  const contractTypes = await prisma.contractType.findMany({
    orderBy: { name: 'asc' },
  });

  const serializedContractTypes = contractTypes.map(ct => ({
    ...ct,
    createdAt: ct.createdAt.toISOString(),
    updatedAt: ct.updatedAt.toISOString(),
  }));

  return (
    <DashboardLayout title="契約管理" subtitle="雇用契約の管理">
      <ContractsClient 
        initialEmployees={serialized} 
        initialContractTypes={serializedContractTypes as any} 
      />
    </DashboardLayout>
  );
}
