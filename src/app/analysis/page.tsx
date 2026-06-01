'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AnalysisPage() {
  return (
    <DashboardLayout title="分析" subtitle="データ分析とレポート">
      <div className="p-8">
        <div className="bg-white rounded-lg border p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-700 mb-4">分析機能</h2>
          <p className="text-slate-500">この機能は現在開発中です。</p>
          <p className="text-slate-400 text-sm mt-2">Coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
