'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';

interface SystemSettings {
  attendanceAutoScheduleEnabled: boolean;
  attendanceGrossEstimateEnabled: boolean;
}

const defaultSettings: SystemSettings = {
  attendanceAutoScheduleEnabled: true,
  attendanceGrossEstimateEnabled: true,
};

export default function SettingsClient() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [draft, setDraft] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const loaded: SystemSettings = {
            attendanceAutoScheduleEnabled: data.attendanceAutoScheduleEnabled ?? true,
            attendanceGrossEstimateEnabled: data.attendanceGrossEstimateEnabled ?? true,
          };
          setSettings(loaded);
          setDraft(loaded);
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggle = (field: keyof SystemSettings, value: boolean) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setDirty(true);
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t('settings.saveError'));
      }
      const data = await res.json();
      const updated: SystemSettings = {
        attendanceAutoScheduleEnabled: data.attendanceAutoScheduleEnabled ?? draft.attendanceAutoScheduleEnabled,
        attendanceGrossEstimateEnabled: data.attendanceGrossEstimateEnabled ?? draft.attendanceGrossEstimateEnabled,
      };
      setSettings(updated);
      setDraft(updated);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(settings);
    setDirty(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[240px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
      </div>
    );
  }

  const toggles: Array<{
    field: keyof SystemSettings;
    label: string;
    desc: string;
  }> = [
    {
      field: 'attendanceAutoScheduleEnabled',
      label: t('settings.autoScheduleLabel'),
      desc: t('settings.autoScheduleDesc'),
    },
    {
      field: 'attendanceGrossEstimateEnabled',
      label: t('settings.grossEstimateLabel'),
      desc: t('settings.grossEstimateDesc'),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn max-w-3xl">
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-emerald-600 font-bold">✓</span>
          <span className="text-sm font-bold text-emerald-800">{t('settings.successSave')}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-800">
          <span className="font-bold">⚠</span>
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      <Card title={t('settings.cardAttendance')} className="bg-white dark:bg-slate-900 border border-slate-200/50 rounded-2xl">
        <p className="text-sm text-slate-500 mb-5">{t('settings.cardAttendanceDesc')}</p>

        <div className="space-y-3">
          {toggles.map(item => (
            <label
              key={item.field}
              className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40 cursor-pointer hover:border-violet-200 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.label}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={draft[item.field]}
                onChange={e => handleToggle(item.field, e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500/30 cursor-pointer"
              />
            </label>
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-4">{t('settings.featureToggleHint')}</p>
      </Card>

      <div className="flex justify-end gap-3">
        {dirty && (
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            {t('settings.cancelBtn')}
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-colors ${
            !dirty || saving
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm'
          }`}
        >
          {saving ? '...' : t('settings.saveBtn')}
        </button>
      </div>
    </div>
  );
}