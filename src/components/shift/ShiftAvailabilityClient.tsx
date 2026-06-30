'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';
import { dateOnlyJst } from '@/lib/utils';
import { getAttendanceText, weekDayLabelsMap } from '@/lib/translations/attendance';
import { getMonthDays, getNextMonthStr } from '@/lib/shift-availability-helpers';
import type { ShiftPreference } from '@/lib/shift-availability-helpers';
import { SHIFT_TYPE_OPTIONS, parseEnabledShiftTypes } from '@/lib/shift-company-settings';
import type { ShiftType } from '@/lib/shift-helpers';

interface Holiday {
  id: string;
  date: string;
  name: string;
  isActive: boolean;
}

interface ShiftAvailabilityClientProps {
  employeeName: string;
  targetMonth: string;
  employeeId?: string;
  isAdminMode?: boolean;
  holidays?: Holiday[];
  enabledShiftTypes?: ShiftType[];
  registrationRequired?: boolean;
}

function getHolidayForDate(holidays: Holiday[], dateStr: string): Holiday | null {
  return holidays.find(h => h.isActive && dateOnlyJst(h.date) === dateStr) || null;
}

function getRegistrationDayColor(
  pref: ShiftPreference | undefined,
  active: boolean,
  holiday: Holiday | null,
  dateStr: string,
): string {
  const dObj = new Date(`${dateStr}T00:00:00`);
  const isSunday = dObj.getDay() === 0;
  const isSaturday = dObj.getDay() === 6;

  if (active && pref === 'off') {
    return 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 ring-2 ring-rose-400/60 hover:ring-rose-500/30 hover:scale-[1.01]';
  }
  if (active) {
    return 'bg-violet-50 dark:bg-violet-950/20 border-violet-300 dark:border-violet-800 ring-2 ring-violet-400/60 hover:ring-blue-500/20 hover:scale-[1.01]';
  }
  if (holiday || isSunday) {
    return 'bg-rose-50/70 dark:bg-rose-950/10 border-rose-250 dark:border-rose-900/60 hover:bg-rose-100/70 hover:ring-2 hover:ring-blue-500/20 hover:scale-[1.01]';
  }
  if (isSaturday) {
    return 'bg-sky-50/70 dark:bg-sky-950/10 border-sky-250 dark:border-sky-900/60 hover:bg-sky-100/70 hover:ring-2 hover:ring-blue-500/20 hover:scale-[1.01]';
  }
  return 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 hover:border-slate-350 hover:bg-slate-100/50 hover:ring-2 hover:ring-blue-500/20 hover:scale-[1.01]';
}

export default function ShiftAvailabilityClient({
  employeeName,
  targetMonth,
  employeeId,
  isAdminMode = false,
  holidays = [],
  enabledShiftTypes = ['day', 'early', 'late', 'night'],
  registrationRequired = true,
}: ShiftAvailabilityClientProps) {
  const { t, locale } = useI18n();

  const [activeShiftTypes, setActiveShiftTypes] = useState<ShiftType[]>(enabledShiftTypes);
  const [selected, setSelected] = useState<Record<string, ShiftPreference>>({});
  const [defaultPref, setDefaultPref] = useState<ShiftPreference>('any');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/company')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data) return;
        setActiveShiftTypes(parseEnabledShiftTypes(data.enabledShiftTypes));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const prefOptions = useMemo(() => {
    const opts: { value: ShiftPreference; label: string; icon: string }[] = [];
    if (activeShiftTypes.length >= 2) {
      opts.push({ value: 'any', label: t('shiftRegister.prefAny') || 'どれでも', icon: '✓' });
    }
    for (const st of SHIFT_TYPE_OPTIONS) {
      if (activeShiftTypes.includes(st.key)) {
        opts.push({ value: st.key, label: st.label, icon: st.icon });
      }
    }
    opts.push({ value: 'off', label: t('shiftRegister.prefOff') || '休み', icon: '🔴' });
    return opts;
  }, [activeShiftTypes, t]);

  useEffect(() => {
    if (!prefOptions.some(opt => opt.value === defaultPref)) {
      setDefaultPref(prefOptions[0]?.value ?? 'off');
    }
  }, [prefOptions, defaultPref]);

  const [year, monthNum] = targetMonth.split('-').map(Number);
  const days = useMemo(() => getMonthDays(targetMonth), [targetMonth]);
  const nextMonth = getNextMonthStr();

  const firstDayOfWeek = useMemo(() => {
    const d = new Date(year, monthNum - 1, 1).getDay();
    return d === 0 ? 6 : d - 1;
  }, [year, monthNum]);

  const calendarDays = useMemo(
    () =>
      days.map(dateStr => ({
        day: Number(dateStr.split('-')[2]),
        date: dateStr,
        pref: selected[dateStr],
        active: !!selected[dateStr],
      })),
    [days, selected]
  );

  const fetchMine = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: targetMonth });
      if (isAdminMode && employeeId) params.set('employeeId', employeeId);
      const res = await fetch(`/api/shift-availability?${params}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed');
      const data = payload.data || payload;
      const map: Record<string, ShiftPreference> = {};
      for (const d of data.days || []) {
        map[d.date] = d.shiftPreference || 'any';
      }
      setSelected(map);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [targetMonth, employeeId, isAdminMode]);

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  const toggleDay = (date: string) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[date]) delete next[date];
      else next[date] = defaultPref;
      return next;
    });
    setSavedAt(null);
  };

  const handleDeleteMonth = async () => {
    if (!isAdminMode || !employeeId) return;
    if (
      !confirm(
        t('shiftRegister.adminDeleteMonthConfirm') ||
          'この従業員の対象月の登録をすべて削除します。よろしいですか？'
      )
    ) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      const params = new URLSearchParams({ month: targetMonth, employeeId });
      const res = await fetch(`/api/shift-availability?${params}`, { method: 'DELETE' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Delete failed');
      setSelected({});
      setSavedAt(null);
      await fetchMine();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (isAdminMode && employeeId && Object.keys(selected).length > 0) {
      if (
        !confirm(
          t('shiftRegister.adminClearConfirm') ||
            '選択をクリアして保存すると、登録データが削除されます。続行しますか？'
        )
      ) {
        return;
      }
      setSelected({});
      setSaving(true);
      try {
        const res = await fetch('/api/shift-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetMonth,
            days: [],
            replaceMonth: true,
            employeeId,
          }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Clear failed');
        setSavedAt(new Date().toLocaleString());
        await fetchMine();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error');
        await fetchMine();
      } finally {
        setSaving(false);
      }
      return;
    }
    setSelected({});
    setSavedAt(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const daysPayload = Object.entries(selected).map(([date, shiftPreference]) => ({
        date,
        shiftPreference,
      }));
      const res = await fetch('/api/shift-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetMonth,
          days: daysPayload,
          replaceMonth: true,
          ...(isAdminMode && employeeId ? { employeeId } : {}),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || payload.details || 'Save failed');
      setSavedAt(new Date().toLocaleString());
      await fetchMine();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const workCount = Object.values(selected).filter(p => p !== 'off').length;
  const offCount = Object.values(selected).filter(p => p === 'off').length;

  const bulkWorkPref = (): ShiftPreference => {
    if (defaultPref !== 'off') return defaultPref;
    return activeShiftTypes[0] || 'any';
  };

  const selectAllWork = () => {
    const pref = bulkWorkPref();
    const map: Record<string, ShiftPreference> = {};
    for (const d of days) map[d] = pref;
    setSelected(map);
    setSavedAt(null);
  };

  const selectAllOff = () => {
    const map: Record<string, ShiftPreference> = {};
    for (const d of days) map[d] = 'off';
    setSelected(map);
    setSavedAt(null);
  };

  const selectWeekdaysWork = () => {
    const pref = bulkWorkPref();
    const map: Record<string, ShiftPreference> = {};
    for (const d of days) {
      const dow = new Date(`${d}T00:00:00`).getDay();
      if (dow !== 0 && dow !== 6) map[d] = pref;
    }
    setSelected(map);
    setSavedAt(null);
  };

  const monthTitle =
    locale === 'ja' || locale === 'zh'
      ? `${year}${getAttendanceText('yearUnit', locale)}${monthNum}${getAttendanceText('monthUnit', locale)}`
      : `${getAttendanceText('monthUnit', locale)}${monthNum} ${getAttendanceText('yearUnit', locale)}${year}`;

  return (
    <div className="space-y-6">
      {/* Controller — same shell as attendance calendar card */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 shadow-sm rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
              {t('shiftRegister.title') || '勤務・休み希望の登録'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">
              {(t('shiftRegister.subtitle') || '{name} さん — 対象月: {month}')
                .replace('{name}', employeeName)
                .replace('{month}', targetMonth)}
            </p>
          </div>
          <div className="text-xs font-bold text-slate-700 flex gap-3">
            <span>{t('shiftRegister.workCount') || '勤務'}: {workCount}{t('common.dayUnit') || '日'}</span>
            <span className="text-rose-600">{t('shiftRegister.offCount') || '休み'}: {offCount}{t('common.dayUnit') || '日'}</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-3">
          {t('shiftRegister.hint') ||
            '勤務したい日・休みたい日を選択して保存してください。管理者がシフト作成時に参照します。'}
        </p>
        {!registrationRequired && (
          <p className="text-[11px] font-bold text-emerald-800 mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {t('shiftRegister.optionalRegistrationBanner') ||
              '登録は任意です。未登録の日も勤務可能として扱われます。'}
          </p>
        )}
        {isAdminMode && (
          <p className="text-[11px] font-bold text-blue-800 mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            {t('shiftRegister.adminOverrideHint') ||
              '管理者：任意の月・従業員の登録を追加・変更・削除できます（締切・必須ルールは適用されません）。'}
          </p>
        )}
        {!isAdminMode && targetMonth !== nextMonth && (
          <p className="text-[11px] font-bold text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {(t('shiftRegister.nextMonthOnly') || '従業員は通常 {month} のみ登録できます').replace('{month}', nextMonth)}
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <span className="text-xs font-bold text-slate-600 shrink-0">
              {t('shiftRegister.quickBulk') || '一括登録'}:
            </span>
            <button type="button" onClick={selectAllWork} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-violet-600 text-white hover:bg-violet-700 cursor-pointer">
              {t('shiftRegister.bulkAllWork') || '全月・勤務可能'}
            </button>
            <button type="button" onClick={selectAllOff} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer">
              {t('shiftRegister.bulkAllOff') || '全月・休み'}
            </button>
            <button type="button" onClick={selectWeekdaysWork} className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-violet-200 text-violet-800 hover:bg-violet-50 cursor-pointer">
              {t('shiftRegister.bulkWeekdays') || '平日のみ勤務'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-center mb-3">
            <span className="text-xs font-bold text-slate-600">
              {t('shiftRegister.defaultPref') || 'デフォルト希望'}:
            </span>
            {prefOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDefaultPref(opt.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                  defaultPref === opt.value
                    ? opt.value === 'off'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {isAdminMode && employeeId && (
              <button
                type="button"
                onClick={handleDeleteMonth}
                disabled={saving || loading}
                className="px-4 py-2 text-xs font-bold border border-rose-200 text-rose-700 rounded-xl cursor-pointer hover:bg-rose-50 disabled:opacity-50"
              >
                {t('shiftRegister.adminDeleteMonth') || '月の登録を削除'}
              </button>
            )}
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50"
            >
              {t('shiftRegister.clear') || 'クリア'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2 text-xs font-black bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {saving ? '...' : t('shiftRegister.save') || '希望日を保存'}
            </button>
          </div>
        </div>
      </Card>

      {/* Calendar — matches attendance box view */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 shadow-sm rounded-2xl p-5">
        <h3 className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-4">
          {monthTitle} {t('shiftRegister.calendarLog') || '希望登録'} ({days.length}{getAttendanceText('daysUnit', locale)})
          {loading && <span className="ml-2 normal-case tracking-normal text-slate-400">...</span>}
        </h3>

        <div className="space-y-5">
          <div className="grid grid-cols-7 gap-1.5">
            {(weekDayLabelsMap[locale] || weekDayLabelsMap.ja).map(w => (
              <div key={w} className="text-center text-[10px] font-bold text-slate-400 py-1">
                {w}
              </div>
            ))}

            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square p-2 border border-transparent" />
            ))}

            {calendarDays.map(({ day, date, pref, active }) => {
              const holiday = getHolidayForDate(holidays, date);
              const dObj = new Date(`${date}T00:00:00`);
              const isSunday = dObj.getDay() === 0;
              const isSaturday = dObj.getDay() === 6;
              const isOff = pref === 'off';
              const prefOpt = prefOptions.find(p => p.value === pref);

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => toggleDay(date)}
                  className={`aspect-square p-2 rounded-xl border transition-all duration-200 flex flex-col items-center justify-between cursor-pointer ${getRegistrationDayColor(pref, active, holiday, date)}`}
                >
                  <div className="w-full flex items-start justify-between gap-1">
                    <div
                      className={`text-[11px] md:text-xs font-black self-start ${
                        holiday || isSunday
                          ? 'text-rose-600 dark:text-rose-400'
                          : isSaturday
                            ? 'text-sky-600 dark:text-sky-400'
                            : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {day}
                    </div>
                    {holiday && (
                      <span
                        className="px-1 py-0.5 rounded text-[7px] font-black border truncate max-w-[54px] bg-rose-100 text-rose-700 border-rose-200"
                        title={holiday.name}
                      >
                        {getAttendanceText('workDayHoliday', locale)}
                      </span>
                    )}
                  </div>

                  {active ? (
                    <div className="w-full text-center space-y-1">
                      <div className="text-base md:text-lg leading-none">{prefOpt?.icon || '✓'}</div>
                      <span
                        className={`inline-block px-1 rounded text-[8px] md:text-[9px] font-black border ${
                          isOff
                            ? 'bg-rose-100 text-rose-700 border-rose-200'
                            : 'bg-violet-100 text-violet-700 border-violet-200'
                        }`}
                      >
                        {isOff
                          ? t('shiftRegister.offWish') || '休み希望'
                          : prefOpt?.label || t('shiftRegister.workWish') || '勤務希望'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-black mb-1">
                      {t('shiftRegister.notRegistered') || getAttendanceText('legendUnrecorded', locale)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend — same pattern as attendance */}
          <div className="flex flex-wrap gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-slate-50 border border-slate-200 rounded" />
              <span className="text-slate-550 dark:text-slate-400">
                {t('shiftRegister.notRegistered') || getAttendanceText('legendUnrecorded', locale)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-violet-100 border border-violet-300 rounded" />
              <span className="text-violet-700 dark:text-violet-400">
                {t('shiftRegister.legendWork') || '勤務希望'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-rose-100 border border-rose-300 rounded" />
              <span className="text-rose-650 dark:text-rose-400">
                {t('shiftRegister.legendOff') || '休み希望'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-rose-100 border border-rose-300 rounded" />
              <span className="text-rose-650 dark:text-rose-400">
                {getAttendanceText('legendHoliday', locale)}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-xs font-bold text-rose-600 mt-4 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {savedAt && (
          <p className="text-xs font-bold text-emerald-700 mt-3">
            {t('shiftRegister.saved') || '保存しました'} ({savedAt})
          </p>
        )}
      </Card>
    </div>
  );
}