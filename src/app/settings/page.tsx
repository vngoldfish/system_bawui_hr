'use client';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function SettingsPage() {
  return (
    <DashboardLayout title="設定" subtitle="システム設定と環境設定">
      <div className="p-8">
        <div className="bg-white rounded-lg border p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-700 mb-4">システム設定</h2>
          <p className="text-slate-500">この機能は現在開発中です。</p>
          <p className="text-slate-400 text-sm mt-2">Coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
