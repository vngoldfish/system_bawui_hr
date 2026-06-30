'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';
import { SHIFT_TYPE_PRESETS } from '@/lib/shift-helpers';

interface Department {
  id: string;
  name: string;
}

interface DayCell {
  date: string;
  holiday: { name: string; type: string } | null;
  isContractWorkDay: boolean;
  shift: { shiftType: string } | null;
  attendance: { status: string } | null;
  cellState: string;
}

interface OverviewRow {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  days: DayCell[];
}

const CELL_STYLES: Record<string, string> = {
  holiday: 'bg-rose-100 text-rose-800 border-rose-200',
  attended: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  planned: 'bg-blue-100 text-blue-800 border-blue-200',
  off: 'bg-slate-200 text-slate-500 border-slate-300',
  contract: 'bg-amber-50 text-amber-700 border-amber-200',
  none: 'bg-white text-slate-300 border-slate-100',
};

const CELL_ICONS: Record<string, string> = {
  holiday: '祝',
  attended: '実',
  planned: '予',
  off: '休',
  contract: '契',
  none: '·',
};

export default function WorkCalendarClient({ departments }: { departments: Department[] }) {
  const { t, locale } = useI18n();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [departmentId, setDepartmentId] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [holidays, setHolidays] = useState<Array<{ date: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  const localeMap: Record<string, string> = {
    ja: 'ja-JP', en: 'en-US', vi: 'vi-VN', zh: 'zh-CN', th: 'th-TH',
  };

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (departmentId) params.set('departmentId', departmentId);
      const res = await fetch(`/api/schedule-overview?${params}`);
      const payload = await res.json();
      const data = payload.data || payload;
      setDates(data.dates || []);
      setRows(data.rows || []);
      setHolidays((data.holidays || []).map((h: { date: string; name: string }) => ({ date: h.date, name: h.name })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [month, departmentId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const [year, monthNum] = month.split('-').map(Number);

  const getDow = (dateStr: string) => {
    const [, , d] = dateStr.split('-').map(Number);
    const dt = new Date(year, monthNum - 1, d);
    return new Intl.DateTimeFormat(localeMap[locale] || 'ja-JP', { weekday: 'narrow' }).format(dt);
  };

  const holidayRow = useMemo(() => {
    const map = new Map(holidays.map(h => [h.date, h.name]));
    return dates.map(d => map.get(d) || '');
  }, [dates, holidays]);

  const legend = [
    { key: 'holiday', label: t('workCalendar.legendHoliday') || '会社休日' },
    { key: 'contract', label: t('workCalendar.legendContract') || '契約勤務日' },
    { key: 'planned', label: t('workCalendar.legendPlanned') || 'シフト予定' },
    { key: 'attended', label: t('workCalendar.legendAttended') || '実績' },
    { key: 'off', label: t('workCalendar.legendOff') || '休み' },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm font-bold text-slate-600">{t('workCalendar.month') || '月'}:</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">{t('common.allDepts') || '全部署'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchOverview} disabled={loading} className="px-3 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl cursor-pointer disabled:opacity-50">
            {loading ? '...' : t('workCalendar.refresh') || '更新'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {legend.map(l => (
            <span key={l.key} className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${CELL_STYLES[l.key]}`}>
              {CELL_ICONS[l.key]} {l.label}
            </span>
          ))}
        </div>
      </Card>

      <Card title={t('workCalendar.title') || '勤務カレンダー統合ビュー'}>
        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: `${160 + dates.length * 36}px` }}>
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="sticky left-0 z-10 bg-slate-50 px-2 py-2 text-left text-[10px] font-bold text-slate-500 w-[160px] min-w-[160px]">
                  {t('workCalendar.employee') || '従業員'}
                </th>
                {dates.map(d => {
                  const day = Number(d.split('-')[2]);
                  const isWeekend = [0, 6].includes(new Date(year, monthNum - 1, day).getDay());
                  return (
                    <th key={d} className={`px-0.5 py-1 text-center text-[9px] w-[36px] min-w-[36px] ${isWeekend ? 'text-rose-400' : 'text-slate-500'}`}>
                      <div>{day}</div>
                      <div>{getDow(d)}</div>
                    </th>
                  );
                })}
              </tr>
              <tr className="bg-rose-50/50 border-b">
                <th className="sticky left-0 z-10 bg-rose-50/80 px-2 py-1 text-[9px] font-bold text-rose-700 text-left">
                  {t('workCalendar.companyRow') || '会社休日'}
                </th>
                {dates.map((d, i) => (
                  <th key={d} className="px-0.5 py-1 text-[8px] text-rose-700 w-[36px] max-w-[36px] truncate" title={holidayRow[i]}>
                    {holidayRow[i] ? '祝' : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.employeeId} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="sticky left-0 z-10 bg-white px-2 py-1.5 w-[160px] min-w-[160px]">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{row.lastName} {row.firstName}</p>
                    <p className="text-[9px] text-slate-400 truncate">{row.department}</p>
                  </td>
                  {row.days.map(day => {
                    const title = [
                      day.holiday?.name,
                      day.shift ? `${SHIFT_TYPE_PRESETS[day.shift.shiftType as keyof typeof SHIFT_TYPE_PRESETS]?.icon || ''} ${day.shift.shiftType}` : null,
                      day.attendance?.status,
                    ].filter(Boolean).join(' / ');
                    return (
                      <td key={day.date} className="px-0.5 py-0.5 text-center w-[36px]">
                        <div
                          title={title}
                          className={`w-full h-7 flex items-center justify-center text-[9px] font-black rounded border ${CELL_STYLES[day.cellState] || CELL_STYLES.none}`}
                        >
                          {CELL_ICONS[day.cellState] || '·'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={dates.length + 1} className="py-8 text-center text-sm text-slate-400">
                    {t('common.noData') || 'データがありません'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}