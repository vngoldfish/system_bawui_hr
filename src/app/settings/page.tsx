'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import SettingsClient from '@/components/settings/SettingsClient';
import { useI18n } from '@/lib/i18n';

export default function SettingsPage() {
  const { t } = useI18n();

  return (
    <DashboardLayout title={t('settings.pageTitle')} subtitle={t('settings.pageSubtitle')}>
      <SettingsClient />
    </DashboardLayout>
  );
}