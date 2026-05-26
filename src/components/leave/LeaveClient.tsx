'use client';

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

const typeOptions = [
  { value: 'ANNUAL', label: '有給休暇' },
  { value: 'SICK', label: '病気休暇' },
  { value: 'PERSONAL', label: '特別休暇' },
];

const statusOptions = [
  { value: 'PENDING', label: '承認待ち' },
  { value: 'APPROVED', label: '承認済み' },
  { value: 'REJECTED', label: '却下' },
];

const typeColor = (t: string) =>
  t === 'ANNUAL' ? 'bg-blue-100 text-blue-700' :
  t === 'SICK' ? 'bg-orange-100 text-orange-700' :
  t === 'PERSONAL' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700';

const typeLabel = (t: string) =>
  t === 'ANNUAL' ? '有給休暇' : t === 'SICK' ? '病気休暇' : t === 'PERSONAL' ? '特別休暇' : t;

const statusColor = (s: string) =>
  s === 'APPROVED' ? 'bg-green-100 text-green-800' :
  s === 'REJECTED' ? 'bg-red-100 text-red-800' :
  s === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800';

const statusLabel = (s: string) =>
  s === 'APPROVED' ? '承認済み' : s === 'REJECTED' ? '却下' : s === 'PENDING' ? '承認待ち' : s;

function FilterDropdown({ options, selected, onSelect, onClose }: {
  options: { value: string; label: string }[]; selected: string[];
  onSelect: (values: string[]) => void; onClose: () => void;
}) {
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
        <button onClick={() => onSelect([])} className="w-full mt-1 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded border-t border-slate-100">クリア</button>
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
  const hasFilter = (columnFilters[filterKey]?.length ?? 0) > 0;
  const isActive = activeFilter === filterKey;
  return (
    <th className={`px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer select-none relative ${widthClass || ''}`}
      onDoubleClick={() => onActiveFilterChange(isActive ? null : filterKey)} title="ダブルクリックでフィルター">
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {hasFilter && <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>}
      </div>
      {isActive && <FilterDropdown options={options} selected={columnFilters[filterKey] || []} onSelect={vals => onFilterChange(filterKey, vals)} onClose={() => onActiveFilterChange(null)} />}
    </th>
  );
}

export default function LeaveClient({ employees, initialLeaves, isEmployeeMode = false }: { employees: Employee[]; initialLeaves: LeaveRequest[]; isEmployeeMode?: boolean }) {
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
        alert('承認に失敗しました');
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
        alert('却下に失敗しました');
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
        alert(body.error || '申請に失敗しました');
      }
    } catch (error) {
      console.error('Failed to submit leave:', error);
      alert('申請中にエラーが発生しました');
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
          { label: '承認待ち', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: '承認済み', value: stats.approved, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '却下', value: stats.rejected, color: 'text-red-600', bg: 'bg-red-50' },
          { label: '総申請数', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '承認済日数', value: `${stats.totalDays}日`, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* New Leave Request */}
      <Card title="休暇申請一覧">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="名前・理由で検索..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => { setColumnFilters({}); setCurrentPage(1); }}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200">フィルタークリア ({activeFilterCount})</button>
          )}
          <button onClick={() => setShowNewForm(!showNewForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            新規申請
          </button>
          <ExportButtons
            data={filtered.map(l => {
              const emp = employees.find(e => e.id === l.employeeId);
              return {
                name: emp ? `${emp.lastName} ${emp.firstName}` : '', type: typeLabel(l.type),
                startDate: l.startDate, endDate: l.endDate, days: `${l.days}日`,
                reason: l.reason, status: statusLabel(l.status),
              };
            })}
            columns={[
              { header: '氏名', key: 'name' }, { header: '種類', key: 'type' },
              { header: '開始日', key: 'startDate' }, { header: '終了日', key: 'endDate' },
              { header: '日数', key: 'days' }, { header: '理由', key: 'reason' },
              { header: '状態', key: 'status' },
            ]}
            fileName="休暇申請一覧"
          />
        </div>

        {/* New Form */}
        {showNewForm && (
          <div className="mb-5 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-3">新規休暇申請</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {isEmployeeMode ? (
                <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-semibold text-slate-650 flex items-center">
                  申請者: {employees[0]?.lastName} {employees[0]?.firstName}
                </div>
              ) : (
                <select value={newLeave.employeeId} onChange={e => setNewLeave(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="">従業員を選択</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName} ({e.department})</option>)}
                </select>
              )}
              <select value={newLeave.type} onChange={e => setNewLeave(prev => ({ ...prev, type: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input type="text" placeholder="理由" value={newLeave.reason} onChange={e => setNewLeave(prev => ({ ...prev, reason: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <input type="date" value={newLeave.startDate} onChange={e => setNewLeave(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <input type="date" value={newLeave.endDate} onChange={e => setNewLeave(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              <div className="flex gap-2">
                <button onClick={handleSubmitNew}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">申請</button>
                <button onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 text-sm">キャンセル</button>
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
                <FilterTh label="氏名" filterKey="name" options={nameOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleColumnFilter} onActiveFilterChange={setActiveFilter} />
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">部署</th>
                <FilterTh label="種類" filterKey="type" options={typeOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleColumnFilter} onActiveFilterChange={setActiveFilter} />
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">期間</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">日数</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">理由</th>
                <FilterTh label="状態" filterKey="status" options={statusOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleColumnFilter} onActiveFilterChange={setActiveFilter} />
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">該当する申請が見つかりません</td></tr>
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
                    <td className="px-4 py-3 text-sm text-center font-medium">{leave.days}日</td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">{leave.reason}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded ${statusColor(leave.status)}`}>{statusLabel(leave.status)}</span></td>
                    <td className="px-4 py-3 text-center">
                      {leave.status === 'PENDING' && !isEmployeeMode && (
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleApprove(leave.id)}
                            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors">承認</button>
                          <button onClick={() => handleReject(leave.id)}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors">却下</button>
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
            <p className="text-sm text-slate-500">{filtered.length} 件中 {(currentPage - 1) * PAGE_SIZE + 1}〜{Math.min(currentPage * PAGE_SIZE, filtered.length)} 件を表示</p>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40">前へ</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-slate-300 hover:bg-slate-50'}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40">次へ</button>
            </div>
          </div>
        )}
      </Card>

      {/* Leave Balances */}
      <Card title="残り休暇日数">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">氏名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">部署</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">有給 (残/合計)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">病気 (残/合計)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">特別 (残/合計)</th>
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
