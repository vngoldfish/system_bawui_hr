'use client';

import { useMemo, useState } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';
import { SHIFT_TYPE_PRESETS, type ShiftType } from '@/lib/shift-helpers';

export interface WorkRegistrant {
  employeeId: string;
  employeeCode?: string;
  firstName: string;
  lastName: string;
  department: string;
  shiftPreference: string;
  suggestedType: ShiftType;
  assignedType?: ShiftType;
  hasRegistration?: boolean;
  adminOverride?: boolean;
}

type AssignFilter = 'pending' | 'registered' | 'all' | 'assigned';

interface ShiftDailyAssignPanelProps {
  assignDate: string;
  todayStr: string;
  registrationMonth: string;
  hint?: string;
  enabledShiftTypes?: ShiftType[];
  workCountByDate?: Record<string, number>;
  refreshing?: boolean;
  onRefresh?: () => void;
  onDateChange: (date: string) => void;
  onGoToday: () => void;
  onGoRegistrationMonth: () => void;
  registrants: WorkRegistrant[];
  isReadOnly: boolean;
  assigning: boolean;
  onAssign: (employeeId: string, type: ShiftType) => void;
  onViewMonthInTable?: (month: string) => void;
  onBulkAssign: () => void;
  onBulkAssignSelected?: (employeeIds: string[]) => void;
  onEditRegistration?: () => void;
  departments?: string[];
  adminShowAll?: boolean;
  onAdminShowAllChange?: (value: boolean) => void;
}

const PREF_LABELS: Record<string, string> = {
  any: 'どれでも',
  day: '日勤',
  early: '早番',
  late: '遅番',
  night: '夜勤',
};

function clampDayToMonth(day: number, year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  const d = Math.min(Math.max(day, 1), lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function shiftDate(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(y, m - 1, d + delta);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

export default function ShiftDailyAssignPanel({
  assignDate,
  todayStr,
  registrationMonth,
  hint,
  enabledShiftTypes = ['day', 'early', 'late', 'night'],
  workCountByDate = {},
  refreshing = false,
  onRefresh,
  onDateChange,
  onGoToday,
  onGoRegistrationMonth,
  registrants,
  isReadOnly,
  assigning,
  onAssign,
  onBulkAssign,
  onBulkAssignSelected,
  onViewMonthInTable,
  onEditRegistration,
  departments = [],
  adminShowAll = false,
  onAdminShowAllChange,
}: ShiftDailyAssignPanelProps) {
  const { t, locale } = useI18n();
  const [assignFilter, setAssignFilter] = useState<AssignFilter>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const [year, monthNum] = assignDate.split('-').map(Number);
  const selectedDay = Number(assignDate.split('-')[2]);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const workShiftTypes = useMemo(
    () => (['day', 'early', 'late', 'night'] as ShiftType[]).filter(ty => enabledShiftTypes.includes(ty)),
    [enabledShiftTypes]
  );

  const assignedCount = registrants.filter(r => r.assignedType && r.assignedType !== 'off').length;
  const pendingCount = registrants.length - assignedCount;

  const regDaysInMonth = useMemo(() => {
    const prefix = `${year}-${String(monthNum).padStart(2, '0')}-`;
    return Object.entries(workCountByDate)
      .filter(([date, count]) => date.startsWith(prefix) && count > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [workCountByDate, year, monthNum]);

  const filteredRegistrants = useMemo(() => {
    let list = registrants;
    if (assignFilter === 'pending') {
      list = list.filter(r => !r.assignedType || r.assignedType === 'off');
    } else if (assignFilter === 'registered') {
      list = list.filter(r => r.hasRegistration);
    } else if (assignFilter === 'assigned') {
      list = list.filter(r => r.assignedType && r.assignedType !== 'off');
    }
    if (deptFilter) list = list.filter(r => r.department === deptFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        r =>
          `${r.lastName} ${r.firstName}`.toLowerCase().includes(q) ||
          (r.employeeCode || '').toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q)
      );
    }
    return list;
  }, [registrants, assignFilter, deptFilter, searchQuery]);

  const handleYearChange = (newYear: number) => onDateChange(clampDayToMonth(selectedDay, newYear, monthNum));
  const handleMonthChange = (newMonth: number) => onDateChange(clampDayToMonth(selectedDay, year, newMonth));
  const handleDayChange = (newDay: number) => onDateChange(clampDayToMonth(newDay, year, monthNum));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    const pending = registrants.filter(r => !r.assignedType || r.assignedType === 'off');
    setSelectedIds(new Set(pending.map(r => r.employeeId)));
  };

  const handleBulkSelected = () => {
    if (!onBulkAssignSelected || selectedIds.size === 0) return;
    onBulkAssignSelected([...selectedIds]);
    setSelectedIds(new Set());
  };

  const yearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => cur - 1 + i);
  }, []);

  const dateLabel = useMemo(() => {
    const d = new Date(`${assignDate}T00:00:00`);
    const weekday = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : locale === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'short',
    }).format(d);
    return locale === 'ja' ? `${year}年${monthNum}月${selectedDay}日（${weekday}）` : `${assignDate} (${weekday})`;
  }, [assignDate, year, monthNum, selectedDay, locale]);

  return (
    <Card className="bg-white dark:bg-slate-900 border border-blue-200/60 shadow-sm rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
            {t('shift.dailyAssignTitle') || '勤務シフトの割当'}
            <span className="ml-2 text-[11px] font-bold text-slate-500">
              {dateLabel}
            </span>
          </h3>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              {t('shift.pendingAssign') || '未割当'} {pendingCount}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              {t('shift.assigned') || '割当済'} {assignedCount}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {registrants.length}{t('common.personUnit') || '名'}
            </span>
          </div>
        </div>

        {/* Compact date picker — no calendar grid */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 shrink-0">
            {t('shift.assignDate') || '対象日'}:
          </span>
          <button
            type="button"
            onClick={() => onDateChange(shiftDate(assignDate, -1))}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer font-bold text-slate-600"
          >
            ‹
          </button>
          <select
            value={year}
            onChange={e => handleYearChange(Number(e.target.value))}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold bg-white"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}{locale === 'ja' ? '年' : ''}</option>
            ))}
          </select>
          <select
            value={monthNum}
            onChange={e => handleMonthChange(Number(e.target.value))}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold bg-white"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m}{locale === 'ja' ? '月' : ''}</option>
            ))}
          </select>
          <select
            value={selectedDay}
            onChange={e => handleDayChange(Number(e.target.value))}
            className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold bg-white"
          >
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}{locale === 'ja' ? '日' : ''}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onDateChange(shiftDate(assignDate, 1))}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer font-bold text-slate-600"
          >
            ›
          </button>
          <div className="flex gap-1.5 ml-auto flex-wrap">
            <button
              type="button"
              onClick={onGoToday}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                assignDate === todayStr
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t('shift.goToday') || '今日'}
            </button>
            <button
              type="button"
              onClick={onGoRegistrationMonth}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                assignDate.startsWith(registrationMonth)
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {(t('shift.goRegistrationMonth') || '登録月 {month}').replace('{month}', registrationMonth)}
            </button>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                {refreshing ? '...' : t('shift.refreshReg') || '更新'}
              </button>
            )}
          </div>
        </div>

        {regDaysInMonth.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] font-bold text-slate-400 shrink-0">
              {t('shift.daysWithRegistration') || '登録あり'}:
            </span>
            {regDaysInMonth.map(([date, count]) => {
              const day = Number(date.split('-')[2]);
              const active = date === assignDate;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onDateChange(date)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 cursor-pointer ${
                    active
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
                  }`}
                >
                  {day}日({count})
                </button>
              );
            })}
          </div>
        )}

        {hint && (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
            {hint}
          </p>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('shift.searchEmployee') || '名前・コードで検索'}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold min-w-[160px] flex-1 max-w-xs"
          />
          {departments.length > 1 && (
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold"
            >
              <option value="">{t('common.allDepts') || '全部署'}</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['pending', 'registered', 'assigned', 'all'] as AssignFilter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setAssignFilter(f)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                assignFilter === f
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f === 'all'
                ? t('shift.filterAll') || '全員'
                : f === 'pending'
                  ? t('shift.pendingAssign') || '未割当'
                  : f === 'registered'
                    ? t('shift.filterRegistered') || '登録あり'
                    : t('shift.assigned') || '割当済'}
            </button>
          ))}
          {!isReadOnly && onAdminShowAllChange && (
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={adminShowAll}
                onChange={e => onAdminShowAllChange(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 cursor-pointer"
              />
              {t('shift.adminShowAll') || '全従業員を表示'}
            </label>
          )}
          <div className="flex flex-wrap gap-1.5">
            {onEditRegistration && (
              <button
                type="button"
                onClick={onEditRegistration}
                className="px-3 py-1 rounded-lg text-[11px] font-bold border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 cursor-pointer"
              >
                {t('shift.editRegistration') || '登録を編集（管理者）'}
              </button>
            )}
            {onViewMonthInTable && (
              <button
                type="button"
                onClick={() => onViewMonthInTable(assignDate.slice(0, 7))}
                className="px-3 py-1 rounded-lg text-[11px] font-bold border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer"
              >
                {t('shift.viewMonthInTable') || 'シフト表でこの月を見る →'}
              </button>
            )}
          </div>
        </div>

        {!isReadOnly && registrants.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAllPending}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
            >
              {t('shift.selectAllPending') || '未割当を全選択'}
            </button>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleBulkSelected}
                disabled={assigning}
                className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-violet-600 text-white hover:bg-violet-700 cursor-pointer disabled:opacity-50"
              >
                {(t('shift.bulkAssignSelected') || '選択 {n} 名を割当').replace('{n}', String(selectedIds.size))}
              </button>
            )}
            <button
              type="button"
              onClick={onBulkAssign}
              disabled={assigning}
              className="ml-auto px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-black hover:bg-blue-700 cursor-pointer disabled:opacity-50"
            >
              {assigning ? '...' : t('shift.bulkAssignFromReg') || '一括割当'}
            </button>
          </div>
        )}

        {filteredRegistrants.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8 border border-dashed border-slate-200 rounded-xl">
            {t('shift.noWorkRegistered') || 'この日に勤務登録した従業員はいません。'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  {!isReadOnly && <th className="px-2 py-2 w-8" />}
                  <th className="px-3 py-2">{t('shift.employee') || '従業員'}</th>
                  <th className="px-3 py-2">{t('shift.regPreference') || '登録希望'}</th>
                  <th className="px-3 py-2">{t('shift.currentAssign') || '割当'}</th>
                  {!isReadOnly && <th className="px-3 py-2">{t('shift.assignAction') || '操作'}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRegistrants.map(r => {
                  const suggested = SHIFT_TYPE_PRESETS[r.suggestedType];
                  const assigned = r.assignedType ? SHIFT_TYPE_PRESETS[r.assignedType] : null;
                  const isPending = !r.assignedType || r.assignedType === 'off';

                  return (
                    <tr key={r.employeeId} className={isPending ? 'bg-amber-50/40' : ''}>
                      {!isReadOnly && (
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.employeeId)}
                            onChange={() => toggleSelect(r.employeeId)}
                            className="rounded border-slate-300 text-violet-600 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <p className="text-xs font-bold text-slate-800">{r.lastName} {r.firstName}</p>
                        <p className="text-[10px] text-slate-400">{r.employeeCode} {r.department}</p>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[11px] font-bold text-violet-700">
                          {suggested.icon} {PREF_LABELS[r.shiftPreference] || r.shiftPreference}
                        </span>
                        {r.adminOverride && !r.hasRegistration && (
                          <span className="ml-1 text-[10px] font-bold text-blue-600">
                            ({t('shift.unregisteredAdmin') || '未登録・管理者'})
                          </span>
                        )}
                        {r.hasRegistration && r.shiftPreference === 'off' && (
                          <span className="ml-1 text-[10px] font-bold text-rose-600">
                            ({t('shiftRegister.offWish') || '休み希望'})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {assigned && r.assignedType !== 'off' ? (
                          <span className="text-[11px] font-bold text-emerald-700">
                            {assigned.icon} {assigned.label}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-600">
                            {t('shift.pendingAssign') || '未割当'}
                          </span>
                        )}
                      </td>
                      {!isReadOnly && (
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => onAssign(r.employeeId, r.suggestedType)}
                              disabled={assigning}
                              className="px-2 py-1 rounded-md bg-blue-600 text-white text-[10px] font-black hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                            >
                              {t('shift.applySuggestion') || '希望どおり'}
                            </button>
                            {workShiftTypes.map(type => {
                              if (type === r.suggestedType) return null;
                              const preset = SHIFT_TYPE_PRESETS[type];
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => onAssign(r.employeeId, type)}
                                  disabled={assigning}
                                  className="px-1.5 py-1 rounded-md border border-slate-200 text-[10px] hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                                  title={preset.label}
                                >
                                  {preset.icon}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}