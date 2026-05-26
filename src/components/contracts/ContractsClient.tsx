'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Card from '@/components/common/Card';
import ExportButtons from '@/components/common/ExportButtons';
import EmployeeFormModal from '@/components/employees/EmployeeFormModal';
import Portal from '@/components/common/Portal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateContractPDF, generateResignationPDF } from '@/lib/documents';
import type { Employee } from '@/types';

function getContractExpiryStatus(endDate: string | null): { level: 'expired' | 'expiring' | 'valid'; daysLeft: number; label: string; colorClasses: string } {
  if (!endDate) return { level: 'valid', daysLeft: 9999, label: '無期', colorClasses: 'bg-green-50 text-green-700 border-green-200' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { level: 'expired', daysLeft, label: '契約満了', colorClasses: 'bg-red-50 text-red-700 border-red-200' };
  if (daysLeft <= 90) return { level: 'expiring', daysLeft, label: `残${daysLeft}日`, colorClasses: 'bg-orange-50 text-orange-700 border-orange-200' };
  return { level: 'valid', daysLeft, label: '有効', colorClasses: 'bg-green-50 text-green-700 border-green-200' };
}

const weekdayOptions = [
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' },
  { value: 0, label: '日' },
];

function getActiveEmployeeContract(emp: any) {
  return emp.employeeContracts?.find((c: any) => c.isActive) || emp.employeeContracts?.[0] || null;
}

function formatWorkDays(days?: number[]) {
  const values = Array.isArray(days) ? days : [1, 2, 3, 4, 5];
  return weekdayOptions.filter(d => values.includes(d.value)).map(d => d.label).join('・') || '-';
}

function ColumnFilterDropdown({ column, options, selected, onSelect, onClose }: {
  column: string; options?: { value: string; label: string }[]; selected: string[];
  onSelect: (values: string[]) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1.5 z-30 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg p-2.5 min-w-[170px] animate-fadeIn">
      <p className="text-[10px] text-slate-400 font-extrabold px-2 mb-1.5 uppercase tracking-wider">{column}で絞り込み</p>
      <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
        {options?.map(opt => (
          <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
            <input type="checkbox" checked={selected.includes(opt.value)}
              onChange={e => onSelect(e.target.checked ? [...selected, opt.value] : selected.filter(v => v !== opt.value))}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
            <span className="text-xs font-semibold text-slate-750">{opt.label}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <button onClick={() => onSelect([])} className="w-full mt-2 pt-2 px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border-t border-slate-100 font-bold transition-colors cursor-pointer text-center">
          フィルター解除
        </button>
      )}
    </div>
  );
}

function FilterableTh({
  label,
  filterKey,
  activeFilter,
  filterOptions,
  columnFilters,
  onFilterChange,
  onActiveFilterChange,
  sortField,
  sortDir,
  onSort,
  widthClass,
}: {
  label: string;
  filterKey: string;
  activeFilter: string | null;
  filterOptions?: { value: string; label: string }[];
  columnFilters: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void;
  onActiveFilterChange: (key: string | null) => void;
  sortField: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
  widthClass?: string;
}) {
  const hasFilter = (columnFilters[filterKey]?.length ?? 0) > 0;
  const isActive = activeFilter === filterKey;
  const isSorted = sortField === filterKey;

  return (
    <th className={`px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider select-none relative text-left ${widthClass || ''}`}
      onDoubleClick={() => onActiveFilterChange(isActive ? null : filterKey)} title="ダブルクリックでフィルター">
      <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors">
        <span className="cursor-pointer" onClick={() => onSort(filterKey)}>{label}</span>
        {isSorted && (
          sortDir === 'asc' ? (
            <svg className="w-3.5 h-3.5 text-blue-600 cursor-pointer" onClick={() => onSort(filterKey)} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-blue-600 cursor-pointer" onClick={() => onSort(filterKey)} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          )
        )}
        {!isSorted && (
          <svg className="w-3 h-3 text-slate-350 opacity-60 hover:opacity-100 cursor-pointer" onClick={() => onSort(filterKey)} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
        )}
        {hasFilter && (
          <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
        )}
      </div>
      {isActive && <ColumnFilterDropdown column={label} options={filterOptions} selected={columnFilters[filterKey] || []} onSelect={vals => onFilterChange(filterKey, vals)} onClose={() => onActiveFilterChange(null)} />}
    </th>
  );
}

const PAGE_SIZE = 10;

export default function ContractsClient({ initialEmployees }: { initialEmployees: Employee[] }) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [resignTarget, setResignTarget] = useState<Employee | null>(null);
  const [resignReason, setResignReason] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [contractEditTarget, setContractEditTarget] = useState<Employee | null>(null);
  const [contractForm, setContractForm] = useState({
    id: '',
    workDays: [1, 2, 3, 4, 5] as number[],
    standardHoursPerDay: 8,
    defaultCheckIn: '08:00',
    defaultCheckOut: '17:00',
    defaultBreakStart: '12:00',
    defaultBreakEnd: '13:00',
    holidayWorkCountsAsOvertime: true,
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const handleColumnFilter = (key: string, values: string[]) => {
    setColumnFilters(prev => ({ ...prev, [key]: values }));
    setCurrentPage(1);
  };

  const contractTypes = useMemo(() => {
    const unique = [...new Set(employees.map(e => e.contractType?.name).filter(Boolean))];
    return unique.map(t => ({ value: t, label: t }));
  }, [employees]);

  const departments = useMemo(() => {
    const unique = [...new Set(employees.map(e => e.department?.name).filter(Boolean))];
    return unique.map(d => ({ value: d, label: d }));
  }, [employees]);

  const statusOptions = [
    { value: 'ACTIVE', label: '在籍中' },
    { value: 'ON_LEAVE', label: '休職中' },
    { value: 'INACTIVE', label: '退職' },
  ];

  const activeEmployees = useMemo(() => employees.filter(e => e.status !== 'INACTIVE'), [employees]);

  const alerts = useMemo(() => {
    return activeEmployees
      .filter(e => e.contractEndDate)
      .map(e => ({ employee: e, status: getContractExpiryStatus(e.contractEndDate) }))
      .filter(a => a.status.level === 'expired' || a.status.level === 'expiring')
      .sort((a, b) => a.status.daysLeft - b.status.daysLeft);
  }, [activeEmployees]);

  const stats = useMemo(() => {
    const active = activeEmployees;
    let expiring = 0, expired = 0, indefinite = 0;
    active.forEach(e => {
      if (!e.contractEndDate) { indefinite++; return; }
      const s = getContractExpiryStatus(e.contractEndDate);
      if (s.level === 'expired') expired++;
      else if (s.level === 'expiring') expiring++;
    });
    return { total: active.length, expiring, expired, indefinite };
  }, [activeEmployees]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = employees.filter(emp => {
      let matchSearch = true;
      if (q) {
        switch (searchField) {
          case 'all':
            matchSearch =
              `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(q) ||
              `${emp.lastNameKana} ${emp.firstNameKana}`.toLowerCase().includes(q) ||
              emp.email?.toLowerCase().includes(q) ||
              emp.department?.name?.toLowerCase().includes(q) ||
              emp.contractType?.name?.toLowerCase().includes(q);
            break;
          case 'name':
            matchSearch =
              `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(q) ||
              `${emp.lastNameKana} ${emp.firstNameKana}`.toLowerCase().includes(q);
            break;
          case 'email':
            matchSearch = emp.email?.toLowerCase().includes(q) ?? false;
            break;
          case 'department':
            matchSearch = emp.department?.name?.toLowerCase().includes(q) ?? false;
            break;
          case 'position':
            matchSearch = emp.position?.name?.toLowerCase().includes(q) ?? false;
            break;
          case 'contractType':
            matchSearch = emp.contractType?.name?.toLowerCase().includes(q) ?? false;
            break;
          default:
            matchSearch = true;
        }
      }

      const cf = columnFilters;
      const matchDept = !cf.department?.length || cf.department.includes(emp.department?.name || '');
      const matchContractType = !cf.contractType?.length || cf.contractType.includes(emp.contractType?.name || '');
      const matchStatus = !cf.status?.length || cf.status.includes(emp.status);

      return matchSearch && matchDept && matchContractType && matchStatus;
    });

    if (sortField) {
      result.sort((a, b) => {
        let va = '';
        let vb = '';
        switch (sortField) {
          case 'name':
            va = `${a.lastName} ${a.firstName}`;
            vb = `${b.lastName} ${b.firstName}`;
            break;
          case 'department':
            va = typeof a.department === 'string' ? a.department : a.department?.name || '';
            vb = typeof b.department === 'string' ? b.department : b.department?.name || '';
            break;
          case 'position':
            va = typeof a.position === 'string' ? a.position : a.position?.name || '';
            vb = typeof b.position === 'string' ? b.position : b.position?.name || '';
            break;
          case 'contractType':
            va = typeof a.contractType === 'string' ? a.contractType : a.contractType?.name || '';
            vb = typeof b.contractType === 'string' ? b.contractType : b.contractType?.name || '';
            break;
          case 'contractStartDate':
            va = a.contractStartDate || '';
            vb = b.contractStartDate || '';
            break;
          case 'contractEndDate':
            va = a.contractEndDate || '';
            vb = b.contractEndDate || '';
            break;
          case 'createdAt':
            va = a.createdAt || '';
            vb = b.createdAt || '';
            break;
          default:
            return 0;
        }

        // Handle null/empty sorting values (push them to the end)
        if (!va && vb) return 1;
        if (va && !vb) return -1;
        if (!va && !vb) return 0;

        const cmp = va.localeCompare(vb, 'ja');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [employees, search, columnFilters, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const [loading, setLoading] = useState(false);

  const handleSave = async (data: Omit<Employee, 'id'>, id?: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || '保存に失敗しました');
      }
      window.location.reload();
    } catch (err: any) {
      console.error('Save failed:', err);
      alert(err.message || '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setModalOpen(true);
  };

  const openContractScheduleEdit = (emp: Employee) => {
    const schedule = getActiveEmployeeContract(emp);
    setContractEditTarget(emp);
    setContractForm({
      id: schedule?.id || '',
      workDays: schedule?.workDays || [1, 2, 3, 4, 5],
      standardHoursPerDay: schedule?.standardHoursPerDay || 8,
      defaultCheckIn: schedule?.defaultCheckIn || '08:00',
      defaultCheckOut: schedule?.defaultCheckOut || '17:00',
      defaultBreakStart: schedule?.defaultBreakStart || '12:00',
      defaultBreakEnd: schedule?.defaultBreakEnd || '13:00',
      holidayWorkCountsAsOvertime: schedule?.holidayWorkCountsAsOvertime ?? true,
    });
  };

  const handleSaveContractSchedule = async () => {
    if (!contractEditTarget) return;
    const emp: any = contractEditTarget;
    const payload = {
      employeeId: emp.id,
      contractTypeId: emp.contractTypeId,
      name: `${emp.lastName} ${emp.firstName} 勤務契約`,
      startDate: emp.contractStartDate || emp.hireDate,
      endDate: emp.contractEndDate || null,
      ...contractForm,
    };
    const method = contractForm.id ? 'PUT' : 'POST';
    const url = contractForm.id ? `/api/employee-contracts/${contractForm.id}` : '/api/employee-contracts';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert('勤務契約の保存に失敗しました');
      return;
    }
    const saved = await res.json();
    setEmployees(prev => prev.map(e => {
      if (e.id !== emp.id) return e;
      const existing = ((e as any).employeeContracts || []).filter((c: any) => c.id !== saved.id);
      return { ...(e as any), employeeContracts: [saved, ...existing] } as Employee;
    }));
    setContractEditTarget(null);
  };

  const handleGenerateContract = (emp: Employee) => {
    const schedule = getActiveEmployeeContract(emp);
    const departmentName = typeof (emp as any).department === 'string' ? (emp as any).department : emp.department?.name || '';
    const positionName = typeof (emp as any).position === 'string' ? (emp as any).position : emp.position?.name || '';
    const contractTypeName = typeof (emp as any).contractType === 'string' ? (emp as any).contractType : emp.contractType?.name || '';
    generateContractPDF({
      employeeName: `${emp.lastName || ''} ${emp.firstName || ''}`.trim(),
      employeeNameKana: `${emp.lastNameKana || ''} ${emp.firstNameKana || ''}`.trim(),
      department: departmentName,
      position: positionName,
      contractType: contractTypeName,
      contractStartDate: emp.contractStartDate || '',
      contractEndDate: emp.contractEndDate || '',
      salary: emp.salary || 0,
      salaryType: emp.salaryType || '月給',
      hourlyRate: emp.hourlyRate || 0,
      dailyRate: emp.dailyRate || 0,
      benefits: emp.benefits || { healthInsurance: true, pension: true, employmentInsurance: true, workersComp: true, transportation: 0, housing: 0, meal: 0 },
      workLocation: '本社',
      workingHours: schedule
        ? `${formatWorkDays(schedule.workDays)} ${schedule.defaultCheckIn}～${schedule.defaultCheckOut}（休憩 ${schedule.defaultBreakStart}～${schedule.defaultBreakEnd}）`
        : '08:00～17:00（休憩 12:00～13:00）',
    });
  };

  const handleResign = () => {
    if (!resignTarget) return;
    const emp = resignTarget;
    const today = new Date().toISOString().split('T')[0];

    generateResignationPDF({
      employeeName: `${emp.lastName} ${emp.firstName}`,
      employeeNameKana: `${emp.lastNameKana} ${emp.firstNameKana}`,
      department: emp.department?.name || '',
      position: emp.position?.name || '',
      hireDate: emp.contractStartDate || emp.hireDate,
      resignationDate: today,
      reason: resignReason,
    });

    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status: 'INACTIVE' } : e));
    setResignTarget(null);
    setResignReason('');
  };

  const activeFilterCount = Object.values(columnFilters).filter(v => v.length > 0).length;

  const statusColor = (s: string) =>
    s === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
    s === 'INACTIVE' ? 'bg-red-50 text-red-700 border-red-200' :
    'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Alert Banner - Redesigned to look premium */}
      {alerts.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50/80 to-amber-50/80 border border-rose-250/60 rounded-2xl p-5 mb-6 shadow-[0_4px_24px_rgba(244,63,94,0.04)] backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-200/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-rose-100/80">
            <div className="w-9 h-9 bg-rose-500/10 border border-rose-200 rounded-xl flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-rose-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-850">雇用契約期限アラート ({alerts.length}件)</h3>
              <p className="text-xs text-rose-600 font-bold mt-0.5">有期契約の満了日が近くなっている従業員がいます</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {alerts.map(({ employee: emp, status }) => (
              <div key={emp.id} className={`flex items-center justify-between gap-3.5 px-4.5 py-3.5 rounded-2xl border bg-white transition-all hover:shadow-sm ${status.level === 'expired' ? 'border-red-200 shadow-[0_2px_10px_-4px_rgba(239,68,68,0.05)]' : 'border-amber-200 shadow-[0_2px_10px_-4px_rgba(245,158,11,0.05)]'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  {emp.avatar ? (
                    <img src={emp.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-650 border border-slate-200">
                      {emp.firstNameKana?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {emp.lastName} {emp.firstName}
                      <span className="text-xs text-slate-450 font-semibold ml-2">({emp.contractType.name})</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {emp.department?.name || '-'} | 期間: {formatDate(emp.contractStartDate)} ～ {formatDate(emp.contractEndDate)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${status.colorClasses}`}>
                    {status.level === 'expired' ? '契約満了' : status.label}
                  </span>
                  <button onClick={() => openEdit(emp)} className="px-2.5 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer">更新</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats - Redesigned to look premium */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '在籍者数', value: stats.total, color: 'text-slate-800', bg: 'bg-white border-slate-200/60 shadow-sm' },
          { label: '契約満了', value: stats.expired, color: 'text-red-650 font-black', bg: 'bg-red-50/40 border-red-100 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.06)]' },
          { label: '間もなく満了', value: stats.expiring, color: 'text-orange-600 font-black', bg: 'bg-orange-50/40 border-orange-100 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.06)]' },
          { label: '無期契約', value: stats.indefinite, color: 'text-green-600 font-black', bg: 'bg-green-50/40 border-green-100 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.06)]' },
        ].map((s, idx) => (
          <div key={idx} className={`${s.bg} border rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.06)] flex justify-between items-start relative overflow-hidden group`}>
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-transparent to-transparent group-hover:from-blue-500 group-hover:to-indigo-600 transition-all duration-300" />
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-extrabold ${s.color} tracking-tight`}>{s.value}</span>
                <span className="text-xs text-slate-400 font-bold">名</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card title="契約一覧">
        {/* Search & Export */}
        <div className="flex flex-col lg:flex-row gap-3 mb-6 bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-2.5 flex-1">
            <div className="relative">
              <select
                value={searchField}
                onChange={e => { setSearchField(e.target.value); setCurrentPage(1); }}
                className="pl-3 pr-8 py-2.5 border border-slate-250 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl text-xs font-bold bg-white cursor-pointer select-none appearance-none shadow-xs w-full sm:w-[140px]"
              >
                <option value="all">🔍 全項目</option>
                <option value="name">氏名</option>
                <option value="email">メール</option>
                <option value="department">部署</option>
                <option value="position">役職</option>
                <option value="contractType">雇用形態</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={searchField === 'all' ? '氏名、メール、部署、雇用形態などから検索...' : `選択した項目から検索...`}
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-250 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl text-xs shadow-xs bg-white outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-center">
            <select value={columnFilters.department?.[0] || ''} onChange={e => handleColumnFilter('department', e.target.value ? [e.target.value] : [])}
              className="px-3 py-2.5 border border-slate-250 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl text-xs font-bold bg-white cursor-pointer shadow-xs outline-none">
              <option value="">🏢 全部署</option>
              {departments.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <select value={columnFilters.status?.[0] || ''} onChange={e => handleColumnFilter('status', e.target.value ? [e.target.value] : [])}
              className="px-3 py-2.5 border border-slate-250 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl text-xs font-bold bg-white cursor-pointer shadow-xs outline-none">
              <option value="">🟢 全ての状態</option>
              {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={columnFilters.contractType?.[0] || ''} onChange={e => handleColumnFilter('contractType', e.target.value ? [e.target.value] : [])}
              className="px-3 py-2.5 border border-slate-250 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl text-xs font-bold bg-white cursor-pointer shadow-xs outline-none">
              <option value="">📋 全ての雇用形態</option>
              {contractTypes.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <ExportButtons
              data={filtered.map(e => ({
                name: `${e.lastName} ${e.firstName}`,
                kana: `${e.lastNameKana} ${e.firstNameKana}`,
                department: e.department?.name || '',
                position: e.position?.name || '',
                status: e.status === 'ACTIVE' ? '在籍中' : e.status === 'ON_LEAVE' ? '休職中' : '退職',
                contractType: e.contractType?.name || '',
                contractStart: e.contractStartDate ? formatDate(e.contractStartDate) : '-',
                contractEnd: e.contractEndDate ? formatDate(e.contractEndDate) : '無期',
                salary: formatCurrency(e.salary),
              }))}
              columns={[
                { header: '名前', key: 'name' }, { header: 'フリガナ', key: 'kana' },
                { header: '部署', key: 'department' }, { header: '役職', key: 'position' },
                { header: '状態', key: 'status' }, { header: '雇用形態', key: 'contractType' },
                { header: '契約開始', key: 'contractStart' }, { header: '契約終了', key: 'contractEnd' },
                { header: '給与', key: 'salary' },
              ]}
              fileName="契約一覧"
            />
            {activeFilterCount > 0 && (
              <button onClick={() => { setColumnFilters({}); setSearch(''); setCurrentPage(1); }} className="px-3.5 py-2 text-xs text-red-650 hover:bg-red-50 rounded-xl border border-red-200 font-bold transition-all cursor-pointer h-9">
                解除 ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/60">
          <table className="w-full table-fixed text-sm border-collapse" style={{ minWidth: '1325px' }}>
            <colgroup>
              <col style={{ width: '50px' }} />
              <col style={{ width: '180px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '115px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '190px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '140px' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 font-extrabold uppercase tracking-wider">
                <th className="px-4 py-3.5 select-none w-[50px] min-w-[50px] text-center cursor-pointer hover:text-slate-800" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>No.</span>
                    {sortField === 'createdAt' ? (
                      sortDir === 'asc' ? (
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                      ) : (
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      )
                    ) : (
                      <svg className="w-3 h-3 text-slate-350 opacity-60 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                    )}
                  </div>
                </th>
                <th className="px-5 py-3.5 select-none text-left w-[180px] min-w-[180px]">
                  <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer" onClick={() => handleSort('name')}>
                    <span>名前・フリガナ</span>
                    {sortField === 'name' ? (
                      sortDir === 'asc' ? (
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      )
                    ) : (
                      <svg className="w-3 h-3 text-slate-350 opacity-60 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                    )}
                  </div>
                </th>
                <FilterableTh label="部署" filterKey="department" activeFilter={activeFilter} filterOptions={departments} columnFilters={columnFilters} onFilterChange={handleColumnFilter} onActiveFilterChange={setActiveFilter} sortField={sortField} sortDir={sortDir} onSort={handleSort} widthClass="w-[130px] min-w-[130px]" />
                <th className="px-5 py-3.5 select-none text-left w-[110px] min-w-[110px]">
                  <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer" onClick={() => handleSort('position')}>
                    <span>役職</span>
                    {sortField === 'position' ? (
                      sortDir === 'asc' ? (
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      )
                    ) : (
                      <svg className="w-3 h-3 text-slate-350 opacity-60 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                    )}
                  </div>
                </th>
                <FilterableTh label="状態" filterKey="status" activeFilter={activeFilter} filterOptions={statusOptions} columnFilters={columnFilters} onFilterChange={handleColumnFilter} onActiveFilterChange={setActiveFilter} sortField={sortField} sortDir={sortDir} onSort={handleSort} widthClass="w-[90px] min-w-[90px]" />
                <FilterableTh label="雇用形態" filterKey="contractType" activeFilter={activeFilter} filterOptions={contractTypes} columnFilters={columnFilters} onFilterChange={handleColumnFilter} onActiveFilterChange={setActiveFilter} sortField={sortField} sortDir={sortDir} onSort={handleSort} widthClass="w-[115px] min-w-[115px]" />
                <th className="px-5 py-3.5 w-[220px] min-w-[220px]">勤務日・所定時間</th>
                <th className="px-5 py-3.5 select-none text-left w-[190px] min-w-[190px]">
                  <div className="flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer" onClick={() => handleSort('contractEndDate')}>
                    <span>契約期間</span>
                    {sortField === 'contractEndDate' ? (
                      sortDir === 'asc' ? (
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      )
                    ) : (
                      <svg className="w-3 h-3 text-slate-350 opacity-60 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                    )}
                  </div>
                </th>
                <th className="px-5 py-3.5 w-[100px] min-w-[100px]">期限状態</th>
                <th className="px-5 py-3.5 text-right w-[140px] min-w-[140px]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-16 text-center text-slate-400 bg-slate-50/20">該当する従業員が見つかりません</td></tr>
              ) : paginated.map((emp, idx) => {
                const expiry = emp.contractEndDate ? getContractExpiryStatus(emp.contractEndDate) : null;
                const schedule = getActiveEmployeeContract(emp);
                return (
                  <tr key={emp.id} className={`hover:bg-slate-50/40 transition-colors ${emp.status === 'INACTIVE' ? 'opacity-50 bg-slate-50/10' : ''}`}>
                    <td className="px-4 py-3.5 text-xs text-slate-450 font-bold font-mono text-center w-[50px] min-w-[50px]">
                      {(currentPage - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-5 py-4 w-[180px] min-w-[180px]">
                      <div className="flex items-center gap-3 min-w-0">
                        {emp.avatar ? (
                          <img src={emp.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm" />
                        ) : (
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-655 border border-slate-200">
                            {emp.firstNameKana?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block truncate">{emp.lastName} {emp.firstName}</span>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5 truncate">{emp.lastNameKana} {emp.firstNameKana}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 w-[130px] min-w-[130px] truncate"><span className="px-2.5 py-0.5 bg-slate-50 border border-slate-200/80 text-slate-700 text-xs rounded-lg font-bold block truncate max-w-full text-center">{emp.department?.name || '-'}</span></td>
                    <td className="px-5 py-4 text-slate-650 font-semibold text-xs w-[110px] min-w-[110px] truncate">{emp.position.name}</td>
                    <td className="px-5 py-4 w-[90px] min-w-[90px]">
                      <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-lg border ${statusColor(emp.status)} block text-center`}>
                        {emp.status === 'ACTIVE' ? '在籍中' : emp.status === 'ON_LEAVE' ? '休職中' : '退職'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-800 text-xs font-extrabold w-[115px] min-w-[115px] truncate">{emp.contractType?.name || '-'}</td>
                    <td className="px-5 py-4 text-xs w-[220px] min-w-[220px]">
                      <div className="flex flex-col gap-1.5 min-w-[150px]">
                        <span className="font-black text-slate-750 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 w-fit">
                          {formatWorkDays(schedule?.workDays)} / {schedule?.standardHoursPerDay || 8}h
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono font-bold">
                          {schedule?.defaultCheckIn || '08:00'}〜{schedule?.defaultCheckOut || '17:00'} / 休憩 {schedule?.defaultBreakStart || '12:00'}〜{schedule?.defaultBreakEnd || '13:00'}
                        </span>
                        <span className={`text-[9px] font-black w-fit px-2 py-0.5 rounded-lg border ${schedule?.holidayWorkCountsAsOvertime ?? true ? 'bg-rose-50 text-rose-650 border-rose-150' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          祝日勤務: {(schedule?.holidayWorkCountsAsOvertime ?? true) ? '残業扱い' : '通常扱い'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 text-xs font-semibold w-[190px] min-w-[190px] truncate">
                      {emp.contractStartDate ? (
                        <div className="flex items-center gap-1">
                          <span>{formatDate(emp.contractStartDate)}</span>
                          <span className="text-slate-350">～</span>
                          <span>{emp.contractEndDate ? formatDate(emp.contractEndDate) : '無期'}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-5 py-4 w-[100px] min-w-[100px]">
                      {expiry ? (
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg border ${expiry.colorClasses} block text-center`}>
                          {expiry.level === 'expired' ? '契約満了' : expiry.label}
                        </span>
                      ) : <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-lg border bg-green-50 text-green-700 text-center border-green-200 block">無期</span>}
                    </td>
                    <td className="px-5 py-4 text-right w-[140px] min-w-[140px]">
                      {emp.status !== 'INACTIVE' ? (
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => openEdit(emp)} className="p-2 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-150 rounded-xl transition-all cursor-pointer" title="編集・更新">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => openContractScheduleEdit(emp)} className="p-2 text-violet-600 hover:bg-violet-50 border border-transparent hover:border-violet-150 rounded-xl transition-all cursor-pointer" title="勤務日・休日ルール設定">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M7 21h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </button>
                          <button onClick={() => handleGenerateContract(emp)} className="p-2 text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-150 rounded-xl transition-all cursor-pointer" title="契約書ダウンロード">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </button>
                          <button onClick={() => { setResignTarget(emp); setResignReason(''); }} className="p-2 text-red-650 hover:bg-red-50 border border-transparent hover:border-red-150 rounded-xl transition-all cursor-pointer" title="退職処理">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                          </button>
                        </div>
                      ) : <span className="text-xs text-slate-400 font-bold bg-slate-50 border px-2 py-0.5 rounded-lg">退職済み</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-200/80">
          <p className="text-xs text-slate-550 font-bold">{filtered.length} 件中 {(currentPage - 1) * PAGE_SIZE + 1}〜{Math.min(currentPage * PAGE_SIZE, filtered.length)} 件を表示</p>
          <div className="flex gap-1.5">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3.5 py-2 text-xs font-bold border border-slate-250 bg-white hover:bg-slate-50 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">前へ</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-2 text-xs font-black rounded-xl cursor-pointer transition-all ${page === currentPage ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-250 bg-white hover:bg-slate-50 text-slate-650'}`}>{page}</button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3.5 py-2 text-xs font-bold border border-slate-250 bg-white hover:bg-slate-50 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">次へ</button>
          </div>
        </div>
      </Card>

      {/* Edit Modal */}
      <EmployeeFormModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingEmployee(null); }} onSave={handleSave as any} employee={editingEmployee as any} />

      {/* Contract Schedule Modal */}
      {contractEditTarget && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setContractEditTarget(null)} />
            <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-2xl mx-auto p-6.5 animate-fadeIn">
              <div className="mb-5 pb-4 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-850">勤務契約・休日ルール設定</h2>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  {contractEditTarget.lastName} {contractEditTarget.firstName} の勤務曜日 and 赤日/休日出勤の残業判定を設定します。
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase">契約勤務曜日</label>
                  <div className="flex flex-wrap gap-2">
                    {weekdayOptions.map(day => {
                      const checked = contractForm.workDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => setContractForm(prev => ({
                            ...prev,
                            workDays: checked ? prev.workDays.filter(d => d !== day.value) : [...prev.workDays, day.value].sort(),
                          }))}
                          className={`px-4 py-2 rounded-xl border text-xs font-black transition-all cursor-pointer ${checked ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-250 hover:bg-slate-50'}`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase">所定時間/日</label>
                    <input type="number" min="0" max="24" step="0.5" value={contractForm.standardHoursPerDay} onChange={e => setContractForm(prev => ({ ...prev, standardHoursPerDay: Number(e.target.value) }))} className="w-full px-3 py-2 border border-slate-250 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase">出勤</label>
                    <input type="time" value={contractForm.defaultCheckIn} onChange={e => setContractForm(prev => ({ ...prev, defaultCheckIn: e.target.value }))} className="w-full px-3 py-2 border border-slate-250 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase">退勤</label>
                    <input type="time" value={contractForm.defaultCheckOut} onChange={e => setContractForm(prev => ({ ...prev, defaultCheckOut: e.target.value }))} className="w-full px-3 py-2 border border-slate-250 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase">休憩開始</label>
                    <input type="time" value={contractForm.defaultBreakStart} onChange={e => setContractForm(prev => ({ ...prev, defaultBreakStart: e.target.value }))} className="w-full px-3 py-2 border border-slate-250 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase">休憩終了</label>
                    <input type="time" value={contractForm.defaultBreakEnd} onChange={e => setContractForm(prev => ({ ...prev, defaultBreakEnd: e.target.value }))} className="w-full px-3 py-2 border border-slate-250 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>

                <label className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-rose-150 bg-rose-50/50 cursor-pointer">
                  <div>
                    <p className="text-sm font-black text-rose-800">赤日・祝日に働いた時間を残業扱いにする</p>
                    <p className="text-xs text-rose-600 font-semibold mt-0.5">オンの場合、祝日/赤日の実労働時間は全て残業時間として集計されます。</p>
                  </div>
                  <input type="checkbox" checked={contractForm.holidayWorkCountsAsOvertime} onChange={e => setContractForm(prev => ({ ...prev, holidayWorkCountsAsOvertime: e.target.checked }))} className="w-5 h-5 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer" />
                </label>
              </div>

              <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
                <button onClick={() => setContractEditTarget(null)} className="px-4 py-2.5 border border-slate-250 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer">キャンセル</button>
                <button onClick={handleSaveContractSchedule} className="px-5 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 text-xs font-black shadow-sm cursor-pointer">
                  勤務契約を保存
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Resign Confirm Dialog - Styled to match details sheets */}
      {resignTarget && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={() => setResignTarget(null)} />
            <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md mx-auto p-6.5 animate-fadeIn">
              <h2 className="text-lg font-black text-slate-800 mb-2">退職処理の実行</h2>
              <p className="text-sm text-slate-600 font-semibold mb-4">
                <span className="font-extrabold text-slate-800">{resignTarget.lastName} {resignTarget.firstName}</span> を退職処理しますか？
              </p>
              <p className="text-[11px] text-slate-450 font-bold mb-4">※退職証明書（PDF）が自動生成されダウンロードされます。</p>
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">退職事由を選択してください</label>
                <select value={resignReason} onChange={e => setResignReason(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-semibold">
                  <option value="">選択してください...</option>
                  <option value="自己都合退職">自己都合退職</option>
                  <option value="会社都合退職">会社都合退職</option>
                  <option value="契約満了">契約満了</option>
                  <option value="定年退職">定年退職</option>
                  <option value="その他">その他</option>
                </select>
              </div>
              <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button onClick={() => setResignTarget(null)} className="px-4 py-2.5 border border-slate-250 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer">キャンセル</button>
                <button onClick={handleResign} disabled={!resignReason} className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-xs font-black shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                  退職処理 & 証明書発行
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
