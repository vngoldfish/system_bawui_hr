import DashboardLayout from '@/components/layout/DashboardLayout';
import ContractsClient from '@/components/contracts/ContractsClient';
import { employeeService } from '@/services/employeeService';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';

async function ContractsLoader() {
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
    <ContractsClient 
      initialEmployees={serialized} 
      initialContractTypes={serializedContractTypes as any} 
    />
  );
}

export default function ContractsPage() {
  return (
    <DashboardLayout title="契約管理" subtitle="雇用契約の管理">
      <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div></div>}>
        <ContractsLoader />
      </Suspense>
    </DashboardLayout>
  );
}
