import DashboardLayout from '@/components/layout/DashboardLayout';
import CompanyClient from '@/components/company/CompanyClient';

export default function CompanyPage() {
  return (
    <DashboardLayout title="会社情報" subtitle="会社情報の確認と編集">
      <div className="space-y-6">
        <CompanyClient />
      </div>
    </DashboardLayout>
  );
}
