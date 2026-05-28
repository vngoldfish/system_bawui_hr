'use client';
import { useI18n } from '@/lib/i18n';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';

interface Employee {
  id: string; firstName: string; lastName: string; firstNameKana: string;
  department: string; position: string;
}

interface Shift {
  id: string;
  employeeId: string;
  date: string;
  type: 'day' | 'night' | 'early' | 'late' | 'off';
  startTime: string;
  endTime: string;
}



export default function ShiftClient({ employees, isReadOnly = false }: { employees: Employee[]; isReadOnly?: boolean }) {
  const { t, locale } = useI18n();
  const shiftTypes = [
    { key: 'day', label: t('shift.dayShift'), color: 'bg-blue-100 text-blue-700', time: '09:00-18:00', icon: '☀️' },
    { key: 'night', label: t('shift.nightShift'), color: 'bg-indigo-100 text-indigo-700', time: '22:00-07:00', icon: '🌙' },
    { key: 'early', label: t('shift.earlyShift'), color: 'bg-orange-100 text-orange-700', time: '06:00-15:00', icon: '🌅' },
    { key: 'late', label: t('shift.lateShift'), color: 'bg-purple-100 text-purple-700', time: '13:00-22:00', icon: '🌆' },
    { key: 'off', label: t('shift.daysOff'), color: 'bg-slate-100 text-slate-500', time: '-', icon: '🔴' },
  ];
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [shifts, setShifts] = useState<Shift[]>(() => {
    const result: Shift[] = [];
    const [year, month] = [2026, 5];
    const daysInMonth = new Date(year, month, 0).getDate();
    employees.forEach(emp => {
      // Create a deterministic hash or number from string ID
      let idNum = 0;
      for (let i = 0; i < emp.id.length; i++) {
        idNum += emp.id.charCodeAt(i);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dow = new Date(year, month - 1, d).getDay();
        if (dow === 0) {
          result.push({ id: `s-${emp.id}-${d}`, employeeId: emp.id, date, type: 'off', startTime: '', endTime: '' });
        } else if (dow === 6) {
          result.push({ id: `s-${emp.id}-${d}`, employeeId: emp.id, date, type: 'day', startTime: '09:00', endTime: '14:00' });
        } else {
          const types: Shift['type'][] = ['day', 'early', 'late'];
          const t = types[idNum % 3];
          const st = shiftTypes.find(st => st.key === t) || shiftTypes[0];
          result.push({ id: `s-${emp.id}-${d}`, employeeId: emp.id, date, type: t, startTime: st.time.split('-')[0] || '', endTime: st.time.split('-')[1] || '' });
        }
      }
    });
    return result;
  });

  const [editingCell, setEditingCell] = useState<{ empId: string; date: string } | null>(null);
  const [selectedDept, setSelectedDept] = useState('');

  const [year, month] = currentMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => selectedDept === '' || e.department === selectedDept);
  }, [employees, selectedDept]);

  const handleShiftChange = (empId: string, date: string, type: Shift['type']) => {
    const st = shiftTypes.find(s => s.key === type)!;
    setShifts(prev => {
      const existing = prev.find(s => s.employeeId === empId && s.date === date);
      if (existing) {
        return prev.map(s => s.id === existing.id ? { ...s, type, startTime: st.time.split('-')[0] || '', endTime: st.time.split('-')[1] || '' } : s);
      }
      return [...prev, { id: `s-${empId}-${date.replace(/-/g, '')}`, employeeId: empId, date, type, startTime: st.time.split('-')[0] || '', endTime: st.time.split('-')[1] || '' }];
    });
    setEditingCell(null);
  };

  const getShift = (empId: string, date: string) => {
    return shifts.find(s => s.employeeId === empId && s.date === date);
  };

  const stats = useMemo(() => {
    const monthShifts = shifts.filter(s => s.date.startsWith(currentMonth));
    const dayCount = monthShifts.filter(s => s.type === 'day').length;
    const nightCount = monthShifts.filter(s => s.type === 'night').length;
    const offCount = monthShifts.filter(s => s.type === 'off').length;
    return { dayCount, nightCount, offCount, total: monthShifts.length };
  }, [shifts, currentMonth]);

  const localeMap: Record<string, string> = {
    ja: 'ja-JP',
    en: 'en-US',
    vi: 'vi-VN',
    zh: 'zh-CN',
    th: 'th-TH'
  };

  const getDayOfWeek = (day: number) => {
    const d = new Date(year, month - 1, day);
    const localeCode = localeMap[locale] || 'ja-JP';
    return new Intl.DateTimeFormat(localeCode, { weekday: 'short' }).format(d);
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('shift.dayShift'), value: `${stats.dayCount}${t('common.timesUnit')}`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('shift.nightShift'), value: `${stats.nightCount}${t('common.timesUnit')}`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: t('shift.daysOff'), value: `${stats.offCount}${t('common.dayUnit')}`, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: t('shift.totalShifts'), value: `${stats.total}${t('common.caseUnit')}`, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Shift Type Legend */}
      <Card title={t('shift.legend')}>
        <div className="flex flex-wrap gap-3">
          {shiftTypes.map(st => (
            <div key={st.key} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${st.color}`}>
              <span>{st.icon}</span>
              <span className="text-sm font-medium">{st.label}</span>
              <span className="text-xs opacity-75">{st.time}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Month & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-center">
          <label className="text-sm font-medium text-slate-600">{t('shift.month')}:</label>
          <input type="month" value={currentMonth} onChange={e => setCurrentMonth(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">{t('common.allDepts')}</option>
            {[...new Set(employees.map(e => e.department))].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Shift Calendar */}
      <Card title={t('shift.tableTitle')}>
        <div className="overflow-x-auto">
          <table className="table-fixed border-collapse" style={{ width: `${140 + days.length * 45}px` }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase sticky left-0 bg-slate-50 z-10 w-[140px] min-w-[140px]">{t('shift.employee')}</th>
                {days.map(d => {
                  const dObj = new Date(year, month - 1, d);
                  const dow = getDayOfWeek(d);
                  const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;
                  return (
                    <th key={d} className={`px-1 py-2 text-center text-xs font-medium w-[45px] min-w-[45px] ${isWeekend ? 'text-red-400' : 'text-slate-500'}`}>
                      <div>{d}</div>
                      <div className="text-[10px]">{dow}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10 w-[140px] min-w-[140px] truncate">
                    <div className="truncate">
                      <p className="text-xs font-medium text-slate-800 truncate">{emp.lastName} {emp.firstName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{emp.department}</p>
                    </div>
                  </td>
                  {days.map(d => {
                    const date = `${currentMonth}-${String(d).padStart(2, '0')}`;
                    const shift = getShift(emp.id, date);
                    const st = shift ? shiftTypes.find(s => s.key === shift.type) : null;
                    const isEditing = !isReadOnly && editingCell?.empId === emp.id && editingCell?.date === date;
                    return (
                      <td key={d} className="px-0.5 py-1 text-center w-[45px] min-w-[45px] relative">
                        {isReadOnly ? (
                          <div className={`w-full px-1 py-1 rounded text-[10px] font-medium ${st?.color || 'bg-white'}`}>
                            {st?.icon || '-'}
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingCell(isEditing ? null : { empId: emp.id, date })}
                            className={`w-full px-1 py-1 rounded text-[10px] font-medium ${st?.color || 'bg-white'} hover:opacity-80 transition-opacity cursor-pointer`}>
                            {st?.icon || '-'}
                          </button>
                        )}
                        {isEditing && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-1 flex gap-0.5">
                            {shiftTypes.map(s => (
                              <button key={s.key} onClick={() => handleShiftChange(emp.id, date, s.key as Shift['type'])}
                                className={`px-1.5 py-1 rounded text-[10px] hover:opacity-80 cursor-pointer ${s.color}`}
                                title={s.label}>
                                {s.icon}
                              </button>
                            ))}
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

      {/* Monthly Summary per Employee */}
      <Card title={t('shift.summary')}>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse" style={{ minWidth: '800px' }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-[180px] min-w-[180px]">{t('shift.employee')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase w-[90px] min-w-[90px]">{t('shift.dayShift')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase w-[90px] min-w-[90px]">{t('shift.nightShift')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase w-[90px] min-w-[90px]">{t('shift.earlyShift')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase w-[90px] min-w-[90px]">{t('shift.lateShift')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase w-[90px] min-w-[90px]">{t('shift.daysOff')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase w-[90px] min-w-[90px]">{t('shift.totalShifts')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => {
                const empShifts = shifts.filter(s => s.employeeId === emp.id && s.date.startsWith(currentMonth));
                const counts = shiftTypes.map(st => ({
                  ...st,
                  count: empShifts.filter(s => s.type === st.key).length,
                }));
                const workDays = empShifts.filter(s => s.type !== 'off').length;
                return (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 w-[180px] min-w-[180px] truncate">{emp.lastName} {emp.firstName}</td>
                    {counts.map(c => (
                      <td key={c.key} className="px-4 py-3 text-center text-sm text-slate-600 w-[90px] min-w-[90px]">{c.count}</td>
                    ))}
                    <td className="px-4 py-3 text-center text-sm font-bold text-blue-600 w-[90px] min-w-[90px]">{workDays}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
