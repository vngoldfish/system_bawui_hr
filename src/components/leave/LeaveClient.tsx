'use client';
import { useI18n } from '@/lib/i18n';

import { useState, useMemo, useRef, useEffect } from 'react';
import Card from '@/components/common/Card';
import ExportButtons from '@/components/common/ExportButtons';

interface Employee {
  id: string; firstName: string; lastName: string; firstNameKana: string; department: string; position: string;
}

interface LeaveRequest {
  id: string; employeeId: string; type: string; startDate: string; endDate: string;
  days: number; reason: string; status: string;
}

interface LeaveBalance {
  employeeId: string;
  annual: { total: number; used: number; remaining: number };
  sick: { total: number; used: number; remaining: number };
  special: { total: number; used: number; remaining: number };
}

const PAGE_SIZE = 10;



const typeColor = (t: string) =>
  t === 'ANNUAL' ? 'bg-blue-100 text-blue-700' :
  t === 'SICK' ? 'bg-orange-100 text-orange-700' :
  t === 'PERSONAL' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700';



const statusColor = (s: string) =>
  s === 'APPROVED' ? 'bg-green-100 text-green-800' :
  s === 'REJECTED' ? 'bg-red-100 text-red-800' :
  s === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800';



function FilterDropdown({ options, selected, onSelect, onClose }: {
  options: { value: string; label: string }[]; selected: string[];
  onSelect: (values: string[]) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-[150px]">
      {options.map(opt => (
        <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
          <input type="checkbox" checked={selected.includes(opt.value)}
            onChange={e => onSelect(e.target.checked ? [...selected, opt.value] : selected.filter(v => v !== opt.value))}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm text-slate-700">{opt.label}</span>
        </label>
      ))}
      {selected.length > 0 && (
        <button onClick={() => onSelect([])} className="w-full mt-1 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded border-t border-slate-100">{t('common.clear')}</button>
      )}
    </div>
  );
}

function FilterTh({ label, filterKey, options, activeFilter, columnFilters, onFilterChange, onActiveFilterChange, widthClass }: {
  label: string; filterKey: string; options: { value: string; label: string }[];
  activeFilter: string | null; columnFilters: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void; onActiveFilterChange: (key: string | null) => void;
  widthClass?: string;
}) {
  const { t } = useI18n();
  const hasFilter = (columnFilters[filterKey]?.length ?? 0) > 0;
  const isActive = activeFilter === filterKey;
  return (
    <th className={`px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer select-none relative ${widthClass || ''}`}
      onDoubleClick={() => onActiveFilterChange(isActive ? null : filterKey)} title={t('leave.doubleClickFilter')}>
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {hasFilter && <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>}
      </div>
      {isActive && <FilterDropdown options={options} selected={columnFilters[filterKey] || []} onSelect={vals => onFilterChange(filterKey, vals)} onClose={() => onActiveFilterChange(null)} />}
    </th>
  );
}

export default function LeaveClient({
  employees,
  initialLeaves,
  isEmployeeMode = false,
  currentUserId,
}: {
  employees: Employee[];
  initialLeaves: LeaveRequest[];
  isEmployeeMode?: boolean;
  currentUserId?: string;
}) {
  const { t } = useI18n();
  const typeOptions = [
    { value: 'ANNUAL', label: t('leave.annual') },
    { value: 'SICK', label: t('leave.sick') },
    { value: 'PERSONAL', label: t('leave.special') },
  ];
  const statusOptions = [
    { value: 'PENDING', label: t('common.pending') },
    { value: 'APPROVED', label: t('common.approved') },
    { value: 'REJECTED', label: t('common.rejected') },
  ];
  const typeLabel = (typeVal: string) =>
    typeVal === 'ANNUAL' ? t('leave.annual') : typeVal === 'SICK' ? t('leave.sick') : typeVal === 'PERSONAL' ? t('leave.special') : typeVal;
  const statusLabel = (statusVal: string) =>
    statusVal === 'APPROVED' ? t('common.approved') : statusVal === 'REJECTED' ? t('common.rejected') : statusVal === 'PENDING' ? t('common.pending') : statusVal;
  const [leaves, setLeaves] = useState(initialLeaves);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [newLeave, setNewLeave] = useState({ 
    employeeId: isEmployeeMode ? (employees[0]?.id || '') : '', 
    type: 'ANNUAL', 
    startDate: '', 
    endDate: '', 
    reason: '' 
  });

  const handleColumnFilter = (key: string, values: string[]) => {
    setColumnFilters(prev => ({ ...prev, [key]: values }));
    setCurrentPage(1);
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch('/api/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'APPROVED' }),
      });
      if (res.ok) {
        setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'APPROVED' } : l));
      } else {
        alert(t('leave.approveFailed'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch('/api/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'REJECTED' }),
      });
      if (res.ok) {
        setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'REJECTED' } : l));
      } else {
        alert(t('leave.rejectFailed'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitNew = async () => {
    if (!newLeave.employeeId || !newLeave.startDate || !newLeave.endDate) return;
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeave),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        const saved = body.data;
        const start = new Date(saved.startDate);
        const end = new Date(saved.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
        const newRequest: LeaveRequest = {
          id: saved.id,
          employeeId: saved.employeeId,
          type: saved.type,
          startDate: saved.startDate.split('T')[0],
          endDate: saved.endDate.split('T')[0],
          days,
          reason: saved.reason,
          status: saved.status,
        };
        setLeaves(prev => [newRequest, ...prev]);
        setShowNewForm(false);
        setNewLeave({ 
          employeeId: isEmployeeMode ? (employees[0]?.id || '') : '', 
          type: 'ANNUAL', 
          startDate: '', 
          endDate: '', 
          reason: '' 
        });
      } else {
        alert(body.error || t('leave.applyFailed'));
      }
    } catch (error) {
      console.error('Failed to submit leave:', error);
      alert(t('leave.applyError'));
    }
  };

  // Calculate leave balances
  const balances = useMemo(() => {
    return employees.map(emp => {
      const empLeaves = leaves.filter(l => l.employeeId === emp.id && l.status === 'APPROVED');
      const annualUsed = empLeaves.filter(l => l.type === 'ANNUAL').reduce((s, l) => s + l.days, 0);
      const sickUsed = empLeaves.filter(l => l.type === 'SICK').reduce((s, l) => s + l.days, 0);
      const specialUsed = empLeaves.filter(l => l.type === 'PERSONAL').reduce((s, l) => s + l.days, 0);
      return {
        employeeId: emp.id,
        annual: { total: 20, used: annualUsed, remaining: 20 - annualUsed },
        sick: { total: 10, used: sickUsed, remaining: 10 - sickUsed },
        special: { total: 5, used: specialUsed, remaining: 5 - specialUsed },
      };
    });
  }, [employees, leaves]);

  const filtered = useMemo(() => {
    return leaves.filter(l => {
      const emp = employees.find(e => e.id === l.employeeId);
      const name = emp ? `${emp.lastName} ${emp.firstName}` : '';
      const matchSearch = search === '' || name.includes(search) || l.reason.includes(search);
      const cf = columnFilters;
      const matchName = !cf.name?.length || cf.name.includes(name);
      const matchType = !cf.type?.length || cf.type.includes(l.type);
      const matchStatus = !cf.status?.length || cf.status.includes(l.status);
      return matchSearch && matchName && matchType && matchStatus;
    });
  }, [leaves, employees, search, columnFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const pending = leaves.filter(l => l.status === 'PENDING').length;
    const approved = leaves.filter(l => l.status === 'APPROVED').length;
    const rejected = leaves.filter(l => l.status === 'REJECTED').length;
    const totalDays = leaves.filter(l => l.status === 'APPROVED').reduce((s, l) => s + l.days, 0);
    return { pending, approved, rejected, total: leaves.length, totalDays };
  }, [leaves]);

  const nameOptions = useMemo(() => {
    return employees.map(e => ({ value: `${e.lastName} ${e.firstName}`, label: `${e.lastName} ${e.firstName}` }));
  }, [employees]);

  const activeFilterCount = Object.values(columnFilters).filter(v => v.length > 0).length;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: t('common.pending'), value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: t('common.approved'), value: stats.approved, color: 'text-green-600', bg: 'bg-green-50' },
          { label: t('common.rejected'), value: stats.rejected, color: 'text-red-600', bg: 'bg-red-50' },
          { label: t('leave.totalRequests'), value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('leave.approvedDays'), value: `${stats.totalDays}${t('common.dayUnit')}`, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* New Leave Request */}
      <Card title={t('leave.list')}>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder={t('leave.searchPlaceholder')} value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => { setColumnFilters({}); setCurrentPage(1); }}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200">{t('common.clear')} ({activeFilterCount})</button>
          )}
          <button onClick={() => setShowNewForm(!showNewForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            {t('leave.newRequest')}
          </button>
          <ExportButtons
            data={filtered.map(l => {
              const emp = employees.find(e => e.id === l.employeeId);
              return {
                name: emp ? `${emp.lastName} ${emp.firstName}` : '', type: typeLabel(l.type),
                startDate: l.startDate, endDate: l.endDate, days: `${l.days}${t('common.dayUnit')}`,
                reason: l.reason, status: statusLabel(l.status),
              };
            })}
            columns={[
              { header: t('leave.colName'), key: 'name' }, { header: t('leave.colType'), key: 'type' },
              { header: t('leave.colPeriod') + ' (Start)', key: 'startDate' }, { header: t('leave.colPeriod') + ' (End)', key: 'endDate' },
              { header: t('leave.colDays'), key: 'days' }, { header: t('leave.colReason'), key: 'reason' },
              { header: t('leave.colStatus'), key: 'status' },
            ]}
            fileName={t('leave.exportFileName')}
          />
        </div>

        {/* New Form */}
        {showNewForm && (
          <div className="mb-5 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">{t('leave.claim')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {isEmployeeMode ? (
                <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-semibold text-slate-650 flex items-center">
                  {t('leave.applicantLabel').replace('{name}', `${employees[0]?.lastName} ${employees[0]?.firstName}`)}
                </div>
              ) : (
                <select value={newLeave.employeeId} onChange={e => setNewLeave(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="">{t('leave.selectEmployee')}</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName} ({e.department})</option>)}
                </select>
              )}
              <select value={newLeave.type} onChange={e => setNewLeave(prev => ({ ...prev, type: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input type="text" placeholder={t('leave.reasonPlaceholder')} value={newLeave.reason} onChange={e => setNewLeave(prev => ({ ...prev, reason: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <input type="date" value={newLeave.startDate} onChange={e => setNewLeave(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <input type="date" value={newLeave.endDate} onChange={e => setNewLeave(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <div className="flex gap-2">
                <button onClick={handleSubmitNew}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">{t('leave.claim')}</button>
                <button onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 text-sm">{t('common.cancel')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: '950px' }}>
            <colgroup>
              <col style={{ width: '160px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '190px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '80px' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <FilterTh label={t('leave.colName')} filterKey="name" options={nameOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleColumnFilter} onActiveFilterChange={setActiveFilter} />
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('leave.colDept')}</th>
                <FilterTh label={t('leave.colType')} filterKey="type" options={typeOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleColumnFilter} onActiveFilterChange={setActiveFilter} />
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('leave.colPeriod')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('leave.colDays')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('leave.colReason')}</th>
                <FilterTh label={t('leave.colStatus')} filterKey="status" options={statusOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleColumnFilter} onActiveFilterChange={setActiveFilter} />
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('leave.colActions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">{t('leave.noRequests')}</td></tr>
              ) : paginated.map(leave => {
                const emp = employees.find(e => e.id === leave.employeeId);
                return (
                  <tr key={leave.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs">{emp?.firstNameKana?.charAt(0).toUpperCase()}</div>
                        <span className="text-sm font-medium text-slate-800">{emp?.lastName} {emp?.firstName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{emp?.department}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded ${typeColor(leave.type)}`}>{typeLabel(leave.type)}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{leave.startDate} ～ {leave.endDate}</td>
                    <td className="px-4 py-3 text-sm text-center font-medium">{leave.days}{t('common.dayUnit')}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">{leave.reason}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded ${statusColor(leave.status)}`}>{statusLabel(leave.status)}</span></td>
                    <td className="px-4 py-3 text-center">
                      {leave.status === 'PENDING' && !isEmployeeMode && leave.employeeId !== currentUserId && (
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleApprove(leave.id)}
                            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors">{t('leave.approveBtn')}</button>
                          <button onClick={() => handleReject(leave.id)}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors">{t('leave.rejectBtn')}</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              {t('common.paginationText')
                .replace('{total}', String(filtered.length))
                .replace('{start}', String((currentPage - 1) * PAGE_SIZE + 1))
                .replace('{end}', String(Math.min(currentPage * PAGE_SIZE, filtered.length)))}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40">{t('common.prev')}</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-slate-300 hover:bg-slate-50'}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40">{t('common.next')}</button>
            </div>
          </div>
        )}
      </Card>

      {/* Leave Balances */}
      <Card title={t('leave.balance')}>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: '600px' }}>
            <colgroup>
              <col style={{ width: '160px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('leave.colName')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('leave.colDept')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('leave.colAnnual')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('leave.colSick')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('leave.colSpecial')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(emp => {
                const balance = balances.find(b => b.employeeId === emp.id);
                if (!balance) return null;
                return (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{emp.lastName} {emp.firstName}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{emp.department}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-medium ${balance.annual.remaining <= 5 ? 'text-red-600' : 'text-green-600'}`}>{balance.annual.remaining}</span>
                        <span className="text-slate-400">/{balance.annual.total}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(balance.annual.used / balance.annual.total) * 100}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-medium ${balance.sick.remaining <= 3 ? 'text-red-600' : 'text-green-600'}`}>{balance.sick.remaining}</span>
                        <span className="text-slate-400">/{balance.sick.total}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-medium ${balance.special.remaining <= 2 ? 'text-red-600' : 'text-green-600'}`}>{balance.special.remaining}</span>
                        <span className="text-slate-400">/{balance.special.total}</span>
                      </div>
                    </td>
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
