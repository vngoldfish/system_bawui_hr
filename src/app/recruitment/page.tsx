import DashboardLayout from '@/components/layout/DashboardLayout';
import RecruitmentClient from '@/components/recruitment/RecruitmentClient';

export default function RecruitmentPage() {
  return (
    <DashboardLayout title="採用管理" subtitle="求人・応募者・選考管理">
      <div className="space-y-6">
        <RecruitmentClient />
      </div>
    </DashboardLayout>
  );
}
