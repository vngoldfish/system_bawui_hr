'use client';

import { useMemo, useState } from 'react';
import Card from '@/components/common/Card';
import ShiftAvailabilityClient from '@/components/shift/ShiftAvailabilityClient';
import { getNextMonthStr } from '@/lib/shift-availability-helpers';
import { useI18n } from '@/lib/i18n';
import { getAttendanceText } from '@/lib/translations/attendance';
import type { ShiftType } from '@/lib/shift-helpers';

interface Holiday {
  id: string;
  date: string;
  name: string;
  isActive: boolean;
}

interface EligibleEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  contractTypeName: string;
}

export default function ShiftRegisterAdminClient({
  employees,
  holidays = [],
  enabledShiftTypes = ['day', 'early', 'late', 'night'] as ShiftType[],
  registrationRequired = true,
}: {
  employees: EligibleEmployee[];
  holidays?: Holiday[];
  enabledShiftTypes?: ShiftType[];
  registrationRequired?: boolean;
}) {
  const { t, locale } = useI18n();
  const [selectedId, setSelectedId] = useState(employees[0]?.id || '');

  const defaultMonth = getNextMonthStr();
  const [selectedYear, setSelectedYear] = useState(() => Number(defaultMonth.split('-')[0]));
  const [selectedMonth, setSelectedMonth] = useState(() => Number(defaultMonth.split('-')[1]));

  const targetMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const selected = useMemo(
    () => employees.find(e => e.id === selectedId) || employees[0],
    [employees, selectedId]
  );

  if (employees.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm font-bold text-slate-600">
          {t('shiftRegister.noEligible') || '登録対象の従業員がいません。'}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 shadow-sm rounded-2xl p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="text-xs font-bold text-slate-500 block mb-1">
              {t('shiftRegister.selectEmployee') || '従業員'}
            </label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 bg-white dark:bg-slate-850 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeCode} — {emp.lastName} {emp.firstName} ({emp.contractTypeName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3.5 py-2 border border-slate-200 bg-white dark:bg-slate-850 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y}>
                  {locale === 'ja' || locale === 'zh'
                    ? `${y}${getAttendanceText('yearUnit', locale)}`
                    : `${getAttendanceText('yearUnit', locale)}${y}`}
                </option>
              ))}
            </select>

            <div className="flex items-center bg-slate-100 dark:bg-slate-850 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedMonth(selectedMonth === 1 ? 12 : selectedMonth - 1)}
                className="px-2 py-1.5 text-slate-450 hover:text-slate-800 font-bold cursor-pointer"
              >
                &lt;
              </button>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonth(m)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedMonth === m
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-black'
                      : 'text-slate-650 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {locale === 'ja' || locale === 'zh'
                    ? `${m}${getAttendanceText('monthUnit', locale)}`
                    : `${getAttendanceText('monthUnit', locale)}${m}`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedMonth(selectedMonth === 12 ? 1 : selectedMonth + 1)}
                className="px-2 py-1.5 text-slate-450 hover:text-slate-800 font-bold cursor-pointer"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </Card>

      {selected && (
        <ShiftAvailabilityClient
          key={`${selected.id}-${targetMonth}`}
          employeeName={`${selected.lastName} ${selected.firstName}`}
          targetMonth={targetMonth}
          employeeId={selected.id}
          isAdminMode
          holidays={holidays}
          enabledShiftTypes={enabledShiftTypes}
          registrationRequired={registrationRequired}
        />
      )}
    </div>
  );
}