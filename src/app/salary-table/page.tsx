import DashboardLayout from '@/components/layout/DashboardLayout';
import SalaryTableClient from '@/components/salary-table/SalaryTableClient';

export default function SalaryTablePage() {
  return (
    <DashboardLayout title="給与テーブル管理" subtitle="社会保険・税金・手当の設定">
      <div className="space-y-6">
        <SalaryTableClient />
      </div>
    </DashboardLayout>
  );
}
