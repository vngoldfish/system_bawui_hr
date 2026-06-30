'use client';

import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useI18n } from '@/lib/i18n';

const SettingsClient = dynamic(() => import('@/components/settings/SettingsClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[240px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
    </div>
  ),
});

export default function SettingsPage() {
  const { t } = useI18n();

  return (
    <DashboardLayout title={t('settings.pageTitle')} subtitle={t('settings.pageSubtitle')}>
      <SettingsClient />
    </DashboardLayout>
  );
}