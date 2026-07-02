'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';
import {
  CONTRACT_CATEGORIES,
  DEFAULT_SHIFT_REGISTRATION_POLICY,
  parseShiftRegistrationPolicy,
  type ShiftRegistrationCategoryRule,
  type ShiftRegistrationPolicy,
  type UnregisteredDefault,
} from '@/lib/shift-registration-policy';

interface SystemSettings {
  attendanceAutoScheduleEnabled: boolean;
  attendanceGrossEstimateEnabled: boolean;
  shiftRegistrationRequired: boolean;
  shiftRegistrationDeadlineDay: number;
  shiftRegistrationPolicy: ShiftRegistrationPolicy;
  incomeTaxThreshold: number;
}

const defaultSettings: SystemSettings = {
  attendanceAutoScheduleEnabled: true,
  attendanceGrossEstimateEnabled: true,
  shiftRegistrationRequired: true,
  shiftRegistrationDeadlineDay: 25,
  shiftRegistrationPolicy: DEFAULT_SHIFT_REGISTRATION_POLICY,
  incomeTaxThreshold: 88000,
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
  
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(/session_user=([^;]+)/);
      if (match) {
        try {
          const user = JSON.parse(decodeURIComponent(match[1]));
          setIsSuperAdmin(user.role === 'SUPER_ADMIN');
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const payload = data.data || data;
          const deadlineDay = Number(payload.shiftRegistrationDeadlineDay ?? 25) || 25;
          const loaded: SystemSettings = {
            attendanceAutoScheduleEnabled: payload.attendanceAutoScheduleEnabled ?? true,
            attendanceGrossEstimateEnabled: payload.attendanceGrossEstimateEnabled ?? true,
            shiftRegistrationRequired: payload.shiftRegistrationRequired ?? true,
            shiftRegistrationDeadlineDay: deadlineDay,
            shiftRegistrationPolicy: parseShiftRegistrationPolicy(
              payload.shiftRegistrationPolicy,
              deadlineDay
            ),
            incomeTaxThreshold: Number(payload.incomeTaxThreshold ?? 88000) || 88000,
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

  const markDirty = () => {
    setDirty(true);
    setSaved(false);
    setError(null);
  };

  const handleToggle = (field: 'attendanceAutoScheduleEnabled' | 'attendanceGrossEstimateEnabled' | 'shiftRegistrationRequired', value: boolean) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    markDirty();
  };

  const handleDeadlineDay = (value: number) => {
    const day = Math.min(31, Math.max(1, value || 1));
    setDraft(prev => ({
      ...prev,
      shiftRegistrationDeadlineDay: day,
      shiftRegistrationPolicy: { ...prev.shiftRegistrationPolicy, deadlineDay: day },
    }));
    markDirty();
  };

  const handleGlobalDefault = (value: UnregisteredDefault) => {
    setDraft(prev => ({
      ...prev,
      shiftRegistrationPolicy: { ...prev.shiftRegistrationPolicy, globalUnregisteredDefault: value },
    }));
    markDirty();
  };

  const updateCategoryRule = (
    category: ShiftRegistrationCategoryRule['category'],
    patch: Partial<ShiftRegistrationCategoryRule>
  ) => {
    setDraft(prev => ({
      ...prev,
      shiftRegistrationPolicy: {
        ...prev.shiftRegistrationPolicy,
        categoryRules: prev.shiftRegistrationPolicy.categoryRules.map(r =>
          r.category === category ? { ...r, ...patch } : r
        ),
      },
    }));
    markDirty();
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceAutoScheduleEnabled: draft.attendanceAutoScheduleEnabled,
          attendanceGrossEstimateEnabled: draft.attendanceGrossEstimateEnabled,
          shiftRegistrationRequired: draft.shiftRegistrationRequired,
          shiftRegistrationDeadlineDay: draft.shiftRegistrationDeadlineDay,
          shiftRegistrationPolicy: draft.shiftRegistrationPolicy,
          incomeTaxThreshold: draft.incomeTaxThreshold,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = [err.error, err.details].filter(Boolean).join(' — ');
        throw new Error(msg || t('settings.saveError'));
      }
      const data = await res.json();
      const payload = data.data || data;
      const deadlineDay = Number(payload.shiftRegistrationDeadlineDay ?? draft.shiftRegistrationDeadlineDay) || 25;
      const updated: SystemSettings = {
        attendanceAutoScheduleEnabled: payload.attendanceAutoScheduleEnabled ?? draft.attendanceAutoScheduleEnabled,
        attendanceGrossEstimateEnabled: payload.attendanceGrossEstimateEnabled ?? draft.attendanceGrossEstimateEnabled,
        shiftRegistrationRequired: payload.shiftRegistrationRequired ?? draft.shiftRegistrationRequired,
        shiftRegistrationDeadlineDay: deadlineDay,
        shiftRegistrationPolicy: parseShiftRegistrationPolicy(
          payload.shiftRegistrationPolicy,
          deadlineDay
        ),
        incomeTaxThreshold: Number(payload.incomeTaxThreshold ?? draft.incomeTaxThreshold) || 88000,
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

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/backup');
      if (!res.ok) {
        throw new Error('Export failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bawui_hr_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export backup');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmText = t('settings.importConfirm') || 'Bạn có chắc chắn muốn phục hồi dữ liệu từ file JSON này?';
    if (!window.confirm(confirmText)) {
      e.target.value = '';
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      let backupObj;
      try {
        backupObj = JSON.parse(text);
      } catch (err) {
        throw new Error('File is not a valid JSON');
      }

      if (!backupObj || typeof backupObj !== 'object') {
        throw new Error('Invalid JSON structure');
      }

      const res = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupObj),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t('settings.importError') || 'Phục hồi dữ liệu thất bại');
      }

      alert(t('settings.importSuccess') || 'Đã phục hồi dữ liệu thành công! Hệ thống đang tải lại...');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.importError') || 'Phục hồi dữ liệu thất bại');
      e.target.value = '';
    } finally {
      setImporting(false);
    }
  };

  const categoryLabel = (cat: string) => t(`settings.contractCategory.${cat}`) || cat;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[240px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
      </div>
    );
  }

  const attendanceToggles: Array<{
    field: 'attendanceAutoScheduleEnabled' | 'attendanceGrossEstimateEnabled';
    label: string;
    desc: string;
    hint?: string;
  }> = [
    {
      field: 'attendanceAutoScheduleEnabled',
      label: t('settings.autoScheduleLabel'),
      desc: t('settings.autoScheduleDesc'),
      hint: t('settings.autoSchedulePatternHint'),
    },
    {
      field: 'attendanceGrossEstimateEnabled',
      label: t('settings.grossEstimateLabel'),
      desc: t('settings.grossEstimateDesc'),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
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
          {attendanceToggles.map(item => (
            <label
              key={item.field}
              className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40 cursor-pointer hover:border-violet-200 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.label}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                {item.hint && draft[item.field] && (
                  <p className="text-xs text-violet-700/80 font-medium mt-2">{item.hint}</p>
                )}
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

      <Card title={t('settings.cardShiftRegister')} className="bg-white dark:bg-slate-900 border border-slate-200/50 rounded-2xl">
        <p className="text-sm text-slate-500 mb-5">{t('settings.cardShiftRegisterDesc')}</p>

        <label className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:border-violet-200 transition-colors mb-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">{t('settings.shiftRegistrationRequiredLabel')}</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t('settings.shiftRegistrationRequiredDesc')}</p>
            {!draft.shiftRegistrationRequired && (
              <p className="text-xs text-emerald-700 font-medium mt-2">{t('settings.shiftRegistrationOptionalHint')}</p>
            )}
          </div>
          <input
            type="checkbox"
            checked={draft.shiftRegistrationRequired}
            onChange={e => handleToggle('shiftRegistrationRequired', e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500/30 cursor-pointer"
          />
        </label>

        {draft.shiftRegistrationRequired && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <label className="text-xs font-bold text-slate-600 block mb-2">
                  {t('settings.shiftDeadlineDayLabel')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={draft.shiftRegistrationDeadlineDay}
                    onChange={e => handleDeadlineDay(Number(e.target.value))}
                    className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                  />
                  <span className="text-xs text-slate-500">{t('settings.shiftDeadlineDayUnit')}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  {t('settings.shiftDeadlineDayDesc')}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <label className="text-xs font-bold text-slate-600 block mb-2">
                  {t('settings.shiftGlobalDefaultLabel')}
                </label>
                <select
                  value={draft.shiftRegistrationPolicy.globalUnregisteredDefault}
                  onChange={e => handleGlobalDefault(e.target.value as UnregisteredDefault)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold"
                >
                  <option value="unavailable">{t('settings.unregisteredUnavailable')}</option>
                  <option value="available">{t('settings.unregisteredAvailable')}</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  {t('settings.shiftGlobalDefaultDesc')}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-black text-slate-700 mb-2">{t('settings.shiftCategoryRulesTitle')}</p>
              <p className="text-[11px] text-slate-500 mb-3">{t('settings.shiftCategoryRulesDesc')}</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                      <th className="px-3 py-2">{t('settings.shiftRuleCategory')}</th>
                      <th className="px-3 py-2">{t('settings.shiftRuleRequired')}</th>
                      <th className="px-3 py-2">{t('settings.shiftRuleBeforeDeadline')}</th>
                      <th className="px-3 py-2">{t('settings.shiftRuleAfterDeadline')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {CONTRACT_CATEGORIES.map(cat => {
                      const rule = draft.shiftRegistrationPolicy.categoryRules.find(r => r.category === cat)!;
                      return (
                        <tr key={cat} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-bold text-slate-800">{categoryLabel(cat)}</td>
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={rule.registrationRequired}
                              onChange={e =>
                                updateCategoryRule(cat, { registrationRequired: e.target.checked })
                              }
                              className="rounded border-slate-300 text-violet-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={rule.beforeDeadlineUnregistered}
                              disabled={!rule.registrationRequired}
                              onChange={e =>
                                updateCategoryRule(cat, {
                                  beforeDeadlineUnregistered: e.target.value as UnregisteredDefault,
                                })
                              }
                              className="px-2 py-1 border border-slate-200 rounded-lg text-[11px] font-semibold disabled:opacity-50"
                            >
                              <option value="available">{t('settings.unregisteredAvailable')}</option>
                              <option value="unavailable">{t('settings.unregisteredUnavailable')}</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={rule.afterDeadlineUnregistered}
                              disabled={!rule.registrationRequired}
                              onChange={e =>
                                updateCategoryRule(cat, {
                                  afterDeadlineUnregistered: e.target.value as UnregisteredDefault,
                                })
                              }
                              className="px-2 py-1 border border-slate-200 rounded-lg text-[11px] font-semibold disabled:opacity-50"
                            >
                              <option value="available">{t('settings.unregisteredAvailable')}</option>
                              <option value="unavailable">{t('settings.unregisteredUnavailable')}</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title={t('settings.cardPayroll') || '給与・所得税設定'} className="bg-white dark:bg-slate-900 border border-slate-200/50 rounded-2xl">
        <p className="text-sm text-slate-500 mb-5">{t('settings.cardPayrollDesc') || '給与計算のパラメータおよび所得税の適用しきい値を設定します。'}</p>
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 max-w-md">
          <label className="text-xs font-bold text-slate-600 block mb-2">
            {t('settings.incomeTaxThresholdLabel') || '所得税適用しきい値（円）'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={1000}
              value={draft.incomeTaxThreshold}
              onChange={e => {
                setDraft(prev => ({ ...prev, incomeTaxThreshold: Number(e.target.value) || 0 }));
                markDirty();
              }}
              className="w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white"
            />
            <span className="text-xs text-slate-500">{t('options.currencyUnit') || '円'}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            {t('settings.incomeTaxThresholdDesc') || '総支給額がこの金額未満の場合、所得税は自動的に0円として計算されます。日本の税法上のデフォルトは88,000円です。'}
          </p>
        </div>
      </Card>

      {isSuperAdmin && (
        <Card title={t('settings.cardBackup') || 'データ＆バックアップ'} className="bg-white dark:bg-slate-900 border border-slate-200/50 rounded-2xl shadow-sm">
          <p className="text-sm text-slate-500 mb-5">{t('settings.cardBackupDesc') || '全データベースのエクスポートおよびインポートによるデータ復旧。'}</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Export block */}
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {exporting ? (
                <div className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-white border-t-transparent" />
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              )}
              {t('settings.exportBtn') || 'Xuất dữ liệu (Export JSON)'}
            </button>

            {/* Import block */}
            <label className="flex items-center justify-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-750 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 border border-transparent">
              {importing ? (
                <div className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-white border-t-transparent" />
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              )}
              <span>{t('settings.importBtn') || 'Nhập dữ liệu (Import JSON)'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>

          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold leading-relaxed flex gap-2 shadow-sm">
            <span className="shrink-0 text-sm">⚠</span>
            <span>{t('settings.backupWarning') || 'WARNING: Importing data will completely erase all current system data and replace it with the file contents!'}</span>
          </div>
        </Card>
      )}

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