'use client';

import { useI18n } from '@/lib/i18n';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Card from '@/components/common/Card';
import ExportButtons from '@/components/common/ExportButtons';
import { getJstDateString } from '@/lib/utils';
import {
  isWorkRegistration,
  preferenceToShiftType,
  SHIFT_TYPE_PRESETS,
  type ShiftType,
} from '@/lib/shift-helpers';
import {
  DEFAULT_SHIFT_REGISTRATION_POLICY,
  resolveEmployeeWorkEligibility,
  type ShiftRegistrationPolicy,
} from '@/lib/shift-registration-policy';
import ShiftDailyAssignPanel, { type WorkRegistrant } from '@/components/shift/ShiftDailyAssignPanel';
import ShiftWorkflowGuide from '@/components/shift/ShiftWorkflowGuide';
import {
  findBestWorkRegistrationDate,
  getNextMonthStr,
  mapDayToMonth,
} from '@/lib/shift-availability-helpers';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  firstNameKana: string;
  department: string;
  position: string;
  contractCategory?: string;
  contractTypeName?: string;
}

interface AvailabilityEntry {
  employeeId: string;
  employeeCode?: string;
  firstName: string;
  lastName: string;
  department: string;
  shiftPreference: string;
}

interface Shift {
  id: string;
  employeeId: string;
  date: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
}

export default function ShiftClient({
  employees,
  isReadOnly = false,
  shiftRegistrationRequired = true,
  shiftRegistrationPolicy = DEFAULT_SHIFT_REGISTRATION_POLICY,
  enabledShiftTypes = ['day', 'early', 'late', 'night'],
}: {
  employees: Employee[];
  isReadOnly?: boolean;
  shiftRegistrationRequired?: boolean;
  shiftRegistrationPolicy?: ShiftRegistrationPolicy;
  enabledShiftTypes?: ShiftType[];
}) {
  const { t, locale } = useI18n();
  const allShiftTypes = [
    { key: 'day' as const, label: t('shift.dayShift'), color: 'bg-blue-100 text-blue-700', time: '09:00-18:00', icon: '☀️' },
    { key: 'night' as const, label: t('shift.nightShift'), color: 'bg-indigo-100 text-indigo-700', time: '22:00-07:00', icon: '🌙' },
    { key: 'early' as const, label: t('shift.earlyShift'), color: 'bg-orange-100 text-orange-700', time: '06:00-15:00', icon: '🌅' },
    { key: 'late' as const, label: t('shift.lateShift'), color: 'bg-purple-100 text-purple-700', time: '13:00-22:00', icon: '🌆' },
    { key: 'off' as const, label: t('shift.daysOff'), color: 'bg-slate-100 text-slate-500', time: '-', icon: '🔴' },
  ];
  const shiftTypes = allShiftTypes.filter(
    st => st.key === 'off' || enabledShiftTypes.includes(st.key)
  );

  const registrationMonth = useMemo(() => getNextMonthStr(), []);
  const todayStr = useMemo(() => getJstDateString(), []);

  const [currentMonth, setCurrentMonth] = useState(registrationMonth);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingCell, setEditingCell] = useState<{ empId: string; date: string } | null>(null);
  const [selectedDept, setSelectedDept] = useState('');
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, AvailabilityEntry[]>>({});
  const [assignDate, setAssignDate] = useState(todayStr);
  const [activeView, setActiveView] = useState<'assign' | 'monthly'>('assign');
  const [showRegisteredOnly, setShowRegisteredOnly] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [availabilityHint, setAvailabilityHint] = useState('');
  const [refreshingAvail, setRefreshingAvail] = useState(false);
  const [adminShowAll, setAdminShowAll] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const loadedAvailMonths = useRef(new Set<string>());
  const loadedShiftMonths = useRef(new Set<string>());

  const departments = useMemo(
    () => [...new Set(employees.map(e => e.department).filter(Boolean))].sort(),
    [employees]
  );

  const [year, month] = currentMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const fetchShiftsForMonth = useCallback(async (month: string, force = false) => {
    if (!force && loadedShiftMonths.current.has(month)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts?month=${month}`);
      const payload = await res.json();
      const data = payload.data || payload;
      const list = (data.shifts || []) as Array<{
        id: string;
        employeeId: string;
        date: string;
        shiftType: string;
        startTime: string;
        endTime: string;
      }>;
      const mapped = list.map(s => ({
        id: s.id,
        employeeId: s.employeeId,
        date: s.date,
        type: (s.shiftType || 'day') as ShiftType,
        startTime: s.startTime,
        endTime: s.endTime,
      }));
      setShifts(prev => {
        const others = prev.filter(s => !s.date.startsWith(`${month}-`));
        return [...others, ...mapped];
      });
      loadedShiftMonths.current.add(month);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const mapAvailabilityRows = (raw: Record<string, unknown[]>): Record<string, AvailabilityEntry[]> => {
    const mapped: Record<string, AvailabilityEntry[]> = {};
    for (const [date, rows] of Object.entries(raw)) {
      mapped[date] = (rows as Array<{
        employeeId: string;
        shiftPreference: string;
        employee: {
          employeeCode?: string;
          firstName: string;
          lastName: string;
          department?: { name: string };
        };
      }>).map(r => ({
        employeeId: r.employeeId,
        employeeCode: r.employee.employeeCode,
        firstName: r.employee.firstName,
        lastName: r.employee.lastName,
        department: r.employee.department?.name || '',
        shiftPreference: r.shiftPreference,
      }));
    }
    return mapped;
  };

  const fetchAvailabilityForMonth = useCallback(async (month: string, force = false) => {
    if (!force && loadedAvailMonths.current.has(month)) return;
    try {
      const res = await fetch(
        `/api/shift-availability?month=${month}&byDate=1${force ? `&_t=${Date.now()}` : ''}`,
        force ? { cache: 'no-store' } : undefined
      );
      const payload = await res.json();
      if (!res.ok) return;
      const data = payload.data || payload;
      const mapped = mapAvailabilityRows(data.byDate || {});
      setAvailabilityByDate(prev => {
        const next: Record<string, AvailabilityEntry[]> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (!k.startsWith(`${month}-`)) next[k] = v;
        }
        return { ...next, ...mapped };
      });
      loadedAvailMonths.current.add(month);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const refreshAvailability = useCallback(async () => {
    setRefreshingAvail(true);
    try {
      const months = new Set([
        currentMonth,
        assignDate.slice(0, 7),
        todayStr.slice(0, 7),
        registrationMonth,
      ]);
      for (const m of months) loadedAvailMonths.current.delete(m);
      for (const m of months) loadedShiftMonths.current.delete(m);
      await Promise.all([...months].map(m => fetchAvailabilityForMonth(m, true)));
      await Promise.all([...months].map(m => fetchShiftsForMonth(m, true)));
    } finally {
      setRefreshingAvail(false);
    }
  }, [
    currentMonth,
    assignDate,
    todayStr,
    registrationMonth,
    fetchAvailabilityForMonth,
    fetchShiftsForMonth,
  ]);

  useEffect(() => {
    if (activeView === 'assign') {
      const months = new Set([
        assignDate.slice(0, 7),
        registrationMonth,
        todayStr.slice(0, 7),
      ]);
      months.forEach(m => fetchAvailabilityForMonth(m));
      fetchShiftsForMonth(assignDate.slice(0, 7));
    } else {
      fetchAvailabilityForMonth(currentMonth);
      fetchShiftsForMonth(currentMonth);
    }
  }, [
    activeView,
    assignDate,
    currentMonth,
    registrationMonth,
    todayStr,
    fetchAvailabilityForMonth,
    fetchShiftsForMonth,
  ]);

  useEffect(() => {
    if (Object.keys(availabilityByDate).length === 0) return;

    const hasWorkToday = (availabilityByDate[todayStr] || []).some(r =>
      isWorkRegistration(r.shiftPreference)
    );
    const hasWorkOnAssignDate = (availabilityByDate[assignDate] || []).some(r =>
      isWorkRegistration(r.shiftPreference)
    );

    if (assignDate === todayStr && !hasWorkToday) {
      const bestInRegMonth = findBestWorkRegistrationDate(
        availabilityByDate,
        registrationMonth,
        mapDayToMonth(todayStr, registrationMonth)
      );
      setAvailabilityHint(
        bestInRegMonth
          ? (t('shift.noRegistrationTodayHint') ||
              '本日（{today}）の勤務登録はありません。「登録月 {month}」またはカレンダーで日付を選んでください。'
            )
              .replace('{today}', todayStr)
              .replace('{month}', registrationMonth)
          : (t('shift.noRegistrationData') ||
              '本日（{today}）の勤務登録はありません。従業員に翌月（{month}）の登録を依頼してください。'
            )
              .replace('{today}', todayStr)
              .replace('{month}', registrationMonth)
      );
    } else if (!hasWorkOnAssignDate && assignDate !== todayStr) {
      setAvailabilityHint(
        t('shift.noWorkOnSelectedDate') || '選択した日に勤務登録した従業員はいません。'
      );
    } else {
      setAvailabilityHint('');
    }
  }, [availabilityByDate, assignDate, todayStr, registrationMonth, t]);

  const registrationByKey = useMemo(() => {
    const m = new Map<string, AvailabilityEntry>();
    for (const [date, rows] of Object.entries(availabilityByDate)) {
      for (const r of rows) m.set(`${r.employeeId}|${date}`, r);
    }
    return m;
  }, [availabilityByDate]);

  const shiftByKey = useMemo(() => {
    const m = new Map<string, Shift>();
    for (const s of shifts) m.set(`${s.employeeId}|${s.date}`, s);
    return m;
  }, [shifts]);

  const getRegistration = (empId: string, date: string) =>
    registrationByKey.get(`${empId}|${date}`);

  const getShift = (empId: string, date: string) =>
    shiftByKey.get(`${empId}|${date}`);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => selectedDept === '' || e.department === selectedDept);
  }, [employees, selectedDept]);

  const handleAssignDateChange = (date: string) => {
    setAssignDate(date);
  };

  const handleShiftTableMonthChange = (month: string) => {
    setCurrentMonth(month);
  };

  const handleTableDayClick = (date: string) => {
    setAssignDate(date);
    setActiveView('assign');
  };

  const handleViewMonthInTable = (month: string) => {
    setCurrentMonth(month);
    setActiveView('monthly');
  };

  const workCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [date, rows] of Object.entries(availabilityByDate)) {
      const count = rows.filter(r => isWorkRegistration(r.shiftPreference)).length;
      if (count > 0) map[date] = count;
    }
    return map;
  }, [availabilityByDate]);

  const availabilityForAssignDate = useMemo(
    () => availabilityByDate[assignDate] || [],
    [availabilityByDate, assignDate]
  );

  const workRegistrants = useMemo((): WorkRegistrant[] => {
    const regByEmp = new Map(availabilityForAssignDate.map(r => [r.employeeId, r]));
    const result: WorkRegistrant[] = [];

    for (const emp of filteredEmployees) {
      const reg = regByEmp.get(emp.id);
      const shift = shiftByKey.get(`${emp.id}|${assignDate}`);
      let eligibility = resolveEmployeeWorkEligibility({
        shiftRegistrationRequired,
        policy: shiftRegistrationPolicy,
        contractCategory: emp.contractCategory,
        assignDate,
        registrationPreference: reg?.shiftPreference,
        todayStr,
        adminOverride: !isReadOnly && adminShowAll,
      });

      if (!eligibility.eligible && !isReadOnly && (reg || shift)) {
        eligibility = {
          eligible: true,
          preference: reg?.shiftPreference && reg.shiftPreference !== 'off' ? reg.shiftPreference : 'any',
          source: reg ? 'registered' : 'optional_mode',
        };
      }

      if (!eligibility.eligible) continue;

      result.push({
        employeeId: emp.id,
        employeeCode: reg?.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        department: emp.department,
        shiftPreference: eligibility.preference,
        suggestedType: preferenceToShiftType(eligibility.preference),
        assignedType: shift?.type,
        hasRegistration: !!reg,
        adminOverride: !isReadOnly && adminShowAll && !reg,
      });
    }

    return result.sort((a, b) => {
      const aPending = !a.assignedType || a.assignedType === 'off' ? 0 : 1;
      const bPending = !b.assignedType || b.assignedType === 'off' ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      if (a.hasRegistration !== b.hasRegistration) return a.hasRegistration ? -1 : 1;
      return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'ja');
    });
  }, [
    availabilityForAssignDate,
    assignDate,
    shiftByKey,
    shiftRegistrationRequired,
    shiftRegistrationPolicy,
    filteredEmployees,
    todayStr,
    isReadOnly,
    adminShowAll,
  ]);

  const tableEmployees = useMemo(() => {
    if (!showRegisteredOnly) return filteredEmployees;
    const ids = new Set(workRegistrants.map(r => r.employeeId));
    return filteredEmployees.filter(e => ids.has(e.id));
  }, [filteredEmployees, showRegisteredOnly, workRegistrants]);

  const persistShift = async (empId: string, date: string, type: ShiftType) => {
    const preset = SHIFT_TYPE_PRESETS[type];
    const res = await fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shifts: [{
          employeeId: empId,
          date,
          shiftType: type,
          startTime: preset.startTime,
          endTime: preset.endTime,
        }],
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Save failed');
    }
    const payload = await res.json();
    const saved = (payload.data?.shifts || payload.shifts || [])[0];
    if (saved) {
      setShifts(prev => {
        const others = prev.filter(s => !(s.employeeId === empId && s.date === date));
        return [...others, {
          id: saved.id,
          employeeId: empId,
          date,
          type,
          startTime: saved.startTime,
          endTime: saved.endTime,
        }];
      });
    } else {
      await fetchShiftsForMonth(date.slice(0, 7), true);
    }
  };

  const handleShiftChange = async (empId: string, date: string, type: ShiftType) => {
    const st = shiftTypes.find(s => s.key === type)!;
    setShifts(prev => {
      const existing = prev.find(s => s.employeeId === empId && s.date === date);
      if (existing) {
        return prev.map(s =>
          s.id === existing.id
            ? { ...s, type, startTime: st.time.split('-')[0] || '', endTime: st.time.split('-')[1] || '' }
            : s
        );
      }
      return [
        ...prev,
        {
          id: `temp-${empId}-${date}`,
          employeeId: empId,
          date,
          type,
          startTime: st.time.split('-')[0] || '',
          endTime: st.time.split('-')[1] || '',
        },
      ];
    });
    setEditingCell(null);
    if (!isReadOnly) {
      try {
        await persistShift(empId, date, type);
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : 'Error');
        await fetchShiftsForMonth(assignDate.slice(0, 7), true);
      }
    }
  };

  const handleBulkAssignSelected = async (employeeIds: string[]) => {
    const idSet = new Set(employeeIds);
    const targets = workRegistrants.filter(r => idSet.has(r.employeeId));
    if (targets.length === 0) return;
    setAssigning(true);
    try {
      const payload = targets.map(r => {
        const type = preferenceToShiftType(r.shiftPreference);
        const preset = SHIFT_TYPE_PRESETS[type];
        return {
          employeeId: r.employeeId,
          date: assignDate,
          shiftType: type,
          startTime: preset.startTime,
          endTime: preset.endTime,
        };
      });
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shifts: payload }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Assign failed');
      }
      await fetchShiftsForMonth(assignDate.slice(0, 7), true);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setAssigning(false);
    }
  };

  const handleBulkAssignFromReg = async () => {
    if (workRegistrants.length === 0) {
      alert(t('shift.noWorkRegistered') || 'この日に勤務登録した従業員はいません。');
      return;
    }
    setAssigning(true);
    try {
      const payload = workRegistrants.map(r => {
        const type = preferenceToShiftType(r.shiftPreference);
        const preset = SHIFT_TYPE_PRESETS[type];
        return {
          employeeId: r.employeeId,
          date: assignDate,
          shiftType: type,
          startTime: preset.startTime,
          endTime: preset.endTime,
        };
      });
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shifts: payload }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Assign failed');
      }
      await fetchShiftsForMonth(assignDate.slice(0, 7), true);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignFromPanel = async (employeeId: string, type: ShiftType) => {
    setAssigning(true);
    try {
      await persistShift(employeeId, assignDate, type);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setAssigning(false);
    }
  };

  const handleSyncAttendance = async () => {
    const overwrite = confirm(
      t('shift.syncConfirm') ||
        'シフト予定を勤怠に反映します。既存の勤怠がある日はスキップします。上書きしますか？\n\nOK=上書き / Cancel=スキップのみ'
    );
    setSyncing(true);
    try {
      const res = await fetch('/api/shifts/sync-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: currentMonth, overwriteExisting: overwrite }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      const result = data.data || data;
      alert(
        `${t('shift.syncDone') || '同期完了'}\n` +
          `作成: ${result.created} / 更新: ${result.updated} / スキップ: ${result.skipped}`
      );
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setSyncing(false);
    }
  };

  const localeMap: Record<string, string> = {
    ja: 'ja-JP', en: 'en-US', vi: 'vi-VN', zh: 'zh-CN', th: 'th-TH',
  };

  const getDayOfWeek = (day: number) => {
    const d = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat(localeMap[locale] || 'ja-JP', { weekday: 'short' }).format(d);
  };

  const exportData = useMemo(() => {
    const prefix = `${currentMonth}-`;
    return filteredEmployees.map(emp => {
      const empShifts = shifts.filter(s => s.employeeId === emp.id && s.date.startsWith(prefix));
      const counts = shiftTypes.reduce((acc, st) => {
        acc[st.key] = empShifts.filter(s => s.type === st.key).length;
        return acc;
      }, {} as Record<string, number>);
      return {
        name: `${emp.lastName} ${emp.firstName}`,
        day: counts.day || 0,
        night: counts.night || 0,
        early: counts.early || 0,
        late: counts.late || 0,
        off: counts.off || 0,
        total: empShifts.filter(s => s.type !== 'off').length,
      };
    });
  }, [filteredEmployees, shifts, currentMonth, shiftTypes]);

  return (
    <>
      <div className="space-y-4 mb-4">
        <ShiftWorkflowGuide activeStep={activeView === 'assign' ? 2 : 3} />
      </div>
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveView('assign')}
          className={`flex-1 min-w-[200px] px-4 py-3 rounded-lg text-left cursor-pointer transition-all ${
            activeView === 'assign'
              ? 'bg-white dark:bg-slate-900 shadow-sm ring-2 ring-blue-500/30'
              : 'hover:bg-white/60 dark:hover:bg-slate-900/60'
          }`}
        >
          <p className="text-xs font-black text-slate-800 dark:text-slate-100">
            {t('shift.tabAssign') || '日次割当'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {t('shift.assignTabDesc') || '1日単位で誰が働くか決める'}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setActiveView('monthly')}
          className={`flex-1 min-w-[200px] px-4 py-3 rounded-lg text-left cursor-pointer transition-all ${
            activeView === 'monthly'
              ? 'bg-white dark:bg-slate-900 shadow-sm ring-2 ring-blue-500/30'
              : 'hover:bg-white/60 dark:hover:bg-slate-900/60'
          }`}
        >
          <p className="text-xs font-black text-slate-800 dark:text-slate-100">
            {t('shift.tabMonthly') || '月間シフト表'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {t('shift.monthlyTabDesc') || '月全体を見る・修正・集計'}
          </p>
        </button>
      </div>

      {activeView === 'assign' && (
        <ShiftDailyAssignPanel
          assignDate={assignDate}
          todayStr={todayStr}
          registrationMonth={registrationMonth}
          hint={availabilityHint}
          enabledShiftTypes={enabledShiftTypes}
          workCountByDate={workCountByDate}
          refreshing={refreshingAvail}
          onRefresh={refreshAvailability}
          onDateChange={handleAssignDateChange}
          onGoToday={() => handleAssignDateChange(todayStr)}
          onGoRegistrationMonth={() => {
            const preferred = mapDayToMonth(todayStr, registrationMonth);
            const best = findBestWorkRegistrationDate(availabilityByDate, registrationMonth, preferred);
            handleAssignDateChange(best || `${registrationMonth}-01`);
          }}
          registrants={workRegistrants}
          isReadOnly={isReadOnly}
          assigning={assigning}
          onAssign={handleAssignFromPanel}
          onBulkAssign={handleBulkAssignFromReg}
          onBulkAssignSelected={handleBulkAssignSelected}
          onViewMonthInTable={handleViewMonthInTable}
          onEditRegistration={!isReadOnly ? () => window.open('/shift-register', '_blank') : undefined}
          departments={departments}
          adminShowAll={adminShowAll}
          onAdminShowAllChange={setAdminShowAll}
        />
      )}

      {activeView === 'monthly' && (
      <Card
        title={t('shift.tableTitle')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={currentMonth}
              onChange={e => handleShiftTableMonthChange(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold"
            />
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold"
            >
              <option value="">{t('common.allDepts')}</option>
              {[...new Set(employees.map(e => e.department))].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showRegisteredOnly}
                onChange={() => setShowRegisteredOnly(v => !v)}
                className="rounded border-slate-300 text-blue-600 cursor-pointer"
              />
              {t('shift.filterRegisteredOnly') || '登録者のみ'}
            </label>
            {loading && <span className="text-xs text-slate-400">...</span>}
            {!isReadOnly && (
              <button
                onClick={handleSyncAttendance}
                disabled={syncing}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {syncing ? '...' : t('shift.syncAttendance') || '📋 勤怠に反映'}
              </button>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px]">
          {shiftTypes.map(st => (
            <span key={st.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold ${st.color}`}>
              {st.icon} {st.label}
            </span>
          ))}
          <span className="text-slate-400 ml-1">
            · ✓{t('shift.workRegistered') || '勤務登録'} · 🔴{t('shiftRegister.offWish') || '休み'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-fixed border-collapse" style={{ width: `${140 + days.length * 45}px` }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase sticky left-0 bg-slate-50 z-10 w-[140px] min-w-[140px]">
                  {t('shift.employee')}
                </th>
                {days.map(d => {
                  const dObj = new Date(year, month - 1, d);
                  const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;
                  const date = `${currentMonth}-${String(d).padStart(2, '0')}`;
                  const dayRegs = availabilityByDate[date] || [];
                  const workRegCount = dayRegs.filter(r => isWorkRegistration(r.shiftPreference)).length;
                  const isAssignDay = date === assignDate;
                  return (
                    <th
                      key={d}
                      className={`px-1 py-2 text-center text-xs font-medium w-[45px] min-w-[45px] cursor-pointer ${
                        isAssignDay ? 'bg-blue-50 ring-2 ring-blue-300 rounded-t-lg' : ''
                      } ${isWeekend ? 'text-red-400' : 'text-slate-500'}`}
                      onClick={() => handleTableDayClick(date)}
                      title={t('shift.clickSetAssignDate') || 'クリックで割当対象日に設定（表の月は変わりません）'}
                    >
                      <div>{d}</div>
                      <div className="text-[10px]">{getDayOfWeek(d)}</div>
                      {workRegCount > 0 && (
                        <div className="text-[8px] font-black text-violet-600 bg-violet-50 rounded px-0.5 mt-0.5" title={t('shift.workRegistered') || '勤務登録'}>
                          {workRegCount}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10 w-[140px] min-w-[140px] truncate">
                    <p className="text-xs font-medium text-slate-800 truncate">{emp.lastName} {emp.firstName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{emp.department}</p>
                  </td>
                  {days.map(d => {
                    const date = `${currentMonth}-${String(d).padStart(2, '0')}`;
                    const shift = getShift(emp.id, date);
                    const st = shift ? shiftTypes.find(s => s.key === shift.type) : null;
                    const isEditing = !isReadOnly && editingCell?.empId === emp.id && editingCell?.date === date;
                    const registration = getRegistration(emp.id, date);
                    const registered = !!registration;
                    const isOffRequest = registration?.shiftPreference === 'off';
                    const dayRegs = availabilityByDate[date] || [];
                    return (
                      <td key={d} className="px-0.5 py-1 text-center w-[45px] min-w-[45px] relative">
                        {isReadOnly ? (
                          <div className={`w-full px-1 py-1 rounded text-[10px] font-medium ${st?.color || (isOffRequest ? 'bg-rose-50 text-rose-700' : registered ? 'bg-violet-50 text-violet-700' : 'bg-white')} ${registered ? (isOffRequest ? 'ring-2 ring-rose-300' : 'ring-2 ring-violet-300') : ''}`}>
                            {st?.icon || (isOffRequest ? '🔴' : registered ? '✓' : '-')}
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingCell(isEditing ? null : { empId: emp.id, date })}
                            className={`w-full px-1 py-1 rounded text-[10px] font-medium ${st?.color || (isOffRequest ? 'bg-rose-50 text-rose-700' : registered ? 'bg-violet-50 text-violet-700' : 'bg-white')} hover:opacity-80 transition-opacity cursor-pointer ${registered ? (isOffRequest ? 'ring-2 ring-rose-300' : 'ring-2 ring-violet-300') : ''}`}
                          >
                            {st?.icon || (isOffRequest ? '🔴' : registered ? '✓' : '-')}
                          </button>
                        )}
                        {isEditing && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 z-30 bg-white border border-slate-200 rounded-lg shadow-xl p-2 min-w-[180px]">
                            {dayRegs.length > 0 && (
                              <div className="mb-2 pb-2 border-b border-slate-100 text-left max-h-24 overflow-y-auto">
                                <p className="text-[9px] font-black text-violet-700 mb-1">
                                  {t('shift.registeredForDay') || 'この日の希望登録'} ({dayRegs.length})
                                </p>
                                {dayRegs.map(r => (
                                  <p key={r.employeeId} className={`text-[9px] font-semibold ${r.employeeId === emp.id ? 'text-violet-800' : 'text-slate-600'}`}>
                                    {r.lastName} {r.firstName}
                                    {r.shiftPreference === 'off' ? ' · 休み希望' : r.shiftPreference !== 'any' ? ` · ${r.shiftPreference}` : ' · 勤務希望'}
                                  </p>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-0.5 justify-center flex-wrap">
                              {shiftTypes.map(s => (
                                <button
                                  key={s.key}
                                  onClick={() => handleShiftChange(emp.id, date, s.key)}
                                  className={`px-1.5 py-1 rounded text-[10px] hover:opacity-80 cursor-pointer ${s.color}`}
                                  title={s.label}
                                >
                                  {s.icon}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      {activeView === 'monthly' && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 overflow-hidden">
          <button
            type="button"
            onClick={() => setSummaryOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
          >
            <span className="text-sm font-black text-slate-800 dark:text-slate-100">
              {t('shift.summary')} ({currentMonth})
            </span>
            <span className="text-xs text-slate-500">{summaryOpen ? '▲' : '▼'}</span>
          </button>
          {summaryOpen && (
            <div className="px-5 pb-5 border-t border-slate-100">
              <div className="flex justify-end mb-3 pt-3">
                <ExportButtons
                  data={exportData}
                  columns={[
                    { header: t('shift.employee') || 'Employee', key: 'name' },
                    { header: t('shift.dayShift') || 'Day', key: 'day' },
                    { header: t('shift.nightShift') || 'Night', key: 'night' },
                    { header: t('shift.earlyShift') || 'Early', key: 'early' },
                    { header: t('shift.lateShift') || 'Late', key: 'late' },
                    { header: t('shift.daysOff') || 'Off', key: 'off' },
                    { header: t('shift.totalShifts') || 'Total', key: 'total' },
                  ]}
                  fileName={`shift_summary_${currentMonth}`}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse" style={{ minWidth: '800px' }}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase w-[180px]">{t('shift.employee')}</th>
                      {shiftTypes.map(st => (
                        <th key={st.key} className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase w-[90px]">{st.label}</th>
                      ))}
                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase w-[90px]">{t('shift.totalShifts')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map(emp => {
                      const prefix = `${currentMonth}-`;
                      const empShifts = shifts.filter(s => s.employeeId === emp.id && s.date.startsWith(prefix));
                      const counts = shiftTypes.map(st => ({
                        ...st,
                        count: empShifts.filter(s => s.type === st.key).length,
                      }));
                      const workDays = empShifts.filter(s => s.type !== 'off').length;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm font-medium text-slate-800 truncate">{emp.lastName} {emp.firstName}</td>
                          {counts.map(c => (
                            <td key={c.key} className="px-4 py-2 text-center text-sm text-slate-600">{c.count}</td>
                          ))}
                          <td className="px-4 py-2 text-center text-sm font-bold text-blue-600">{workDays}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}