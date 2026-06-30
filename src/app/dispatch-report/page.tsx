import { Suspense } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DispatchReportClient from '@/components/dispatch-report/DispatchReportClient';

export default function DispatchReportPage() {
  return (
    <DashboardLayout title="派遣勤務時間" subtitle="派遣社員の勤務時間集計レポート">
      <div className="space-y-6">
        <Suspense fallback={<div className="text-center py-4">読み込み中...</div>}>
          <DispatchReportClient />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
