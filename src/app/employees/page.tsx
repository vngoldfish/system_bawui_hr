import DashboardLayout from '@/components/layout/DashboardLayout';
import EmployeesClient from '@/components/employees/EmployeesClient';
import { employeeService } from '@/services/employeeService';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  const serialized = await employeeService.getAll();

  return (
    <DashboardLayout title="従業員管理" subtitle="従業員情報の管理">
      <div className="space-y-6">
        <EmployeesClient initialEmployees={serialized} />
      </div>
    </DashboardLayout>
  );
}
