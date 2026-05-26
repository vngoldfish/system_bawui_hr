'use client';

import { useState, useMemo, useEffect } from 'react';
import Card from '@/components/common/Card';
import EmployeeFormModal from '@/components/employees/EmployeeFormModal';
import { formatDate } from '@/lib/utils';
import type { Employee } from '@/types';

type ExpiryLevel = 'expired' | 'expiring' | 'valid';

function getExpiryStatus(expiryDate: string): { level: ExpiryLevel; daysLeft: number; label: string; colorClasses: string; pct: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { level: 'expired', daysLeft, label: `期限切れ (${Math.abs(daysLeft)}日経過)`, colorClasses: 'bg-red-50 text-red-700 border-red-200', pct: 0 };
  }
  if (daysLeft <= 90) {
    return { level: 'expiring', daysLeft, label: `残${daysLeft}日 (警告)`, colorClasses: 'bg-amber-50 text-amber-700 border-amber-200', pct: Math.max(0, (daysLeft / 90) * 100) };
  }
  return { level: 'valid', daysLeft, label: '有効', colorClasses: 'bg-green-50 text-green-700 border-green-200', pct: 100 };
}

export default function ResidenceCardsClient({ initialEmployees }: { initialEmployees: Employee[] }) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ExpiryLevel>('ALL');
  const [nationalityFilter, setNationalityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'expiry' | 'name' | 'nationality'>('expiry');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter foreign employees only
  const foreignEmployees = useMemo(() => {
    return employees.filter(emp => emp.nationality && emp.nationality !== '日本' && emp.residenceExpiry);
  }, [employees]);

  // Apply filters and sort
  const filteredEmployees = useMemo(() => {
    let result = [...foreignEmployees];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(emp =>
        `${emp.lastName}${emp.firstName}`.toLowerCase().includes(term) ||
        emp.employeeCode.toLowerCase().includes(term) ||
        (emp.residenceCardNumber || '').toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(emp => {
        if (!emp.residenceExpiry) return false;
        const status = getExpiryStatus(emp.residenceExpiry);
        return status.level === statusFilter;
      });
    }

    // Nationality filter
    if (nationalityFilter !== 'ALL') {
      result = result.filter(emp => emp.nationality === nationalityFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'expiry') {
        const dateA = a.residenceExpiry ? new Date(a.residenceExpiry).getTime() : Infinity;
        const dateB = b.residenceExpiry ? new Date(b.residenceExpiry).getTime() : Infinity;
        return dateA - dateB; // Soonest expiry first
      } else if (sortBy === 'name') {
        return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'ja');
      } else {
        return (a.nationality || '').localeCompare(b.nationality || '', 'ja');
      }
    });

    return result;
  }, [foreignEmployees, searchTerm, statusFilter, nationalityFilter, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const expired = foreignEmployees.filter(e => e.residenceExpiry && getExpiryStatus(e.residenceExpiry).level === 'expired').length;
    const expiring = foreignEmployees.filter(e => e.residenceExpiry && getExpiryStatus(e.residenceExpiry).level === 'expiring').length;
    const valid = foreignEmployees.filter(e => e.residenceExpiry && getExpiryStatus(e.residenceExpiry).level === 'valid').length;
    return { total: foreignEmployees.length, expired, expiring, valid };
  }, [foreignEmployees]);

  // Get unique nationalities
  const nationalities = useMemo(() => {
    const set = new Set(foreignEmployees.map(e => e.nationality).filter(Boolean));
    return Array.from(set).sort();
  }, [foreignEmployees]);

  const handleUpdate = (emp: Employee) => {
    setEditingEmployee(emp);
    setModalOpen(true);
  };

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
        throw new Error(err.details || err.error || '在留カード情報の更新に失敗しました');
      }
      window.location.reload();
    } catch (err: any) {
      console.error('Save failed:', err);
      alert(err.message || '在留カード情報の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stats Overview - Premium Glassmorphism */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '外国人従業員', value: stats.total, color: 'text-slate-800', bg: 'bg-white border-slate-200/60 shadow-sm' },
          { label: '期限切れ', value: stats.expired, color: 'text-red-755 font-black', bg: 'bg-red-50/40 border-red-100 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.06)]' },
          { label: '期限切れ予定 (90日内)', value: stats.expiring, color: 'text-orange-600 font-black', bg: 'bg-orange-50/40 border-orange-100 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.06)]' },
          { label: '在留資格有効', value: stats.valid, color: 'text-emerald-650 font-black', bg: 'bg-emerald-50/40 border-emerald-100 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.06)]' },
        ].map((s, idx) => (
          <div key={idx} className={`${s.bg} rounded-2xl p-4.5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-default`}>
            <p className="text-xs text-slate-550 font-semibold mb-1">{s.label}</p>
            <div className="flex items-baseline justify-between mt-1">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              {s.label.includes('期限切れ') && parseInt(s.value.toString()) > 0 && (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters - Redesigned to look premium */}
      <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="氏名・コード・カード番号で検索..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-350 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-3 py-2.5 border border-slate-350 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-semibold">
            <option value="ALL">全ての期限状態</option>
            <option value="expired">期限切れ</option>
            <option value="expiring">期限切れ予定</option>
            <option value="valid">有効のみ</option>
          </select>
          <select value={nationalityFilter} onChange={e => setNationalityFilter(e.target.value)} className="px-3 py-2.5 border border-slate-350 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-semibold">
            <option value="ALL">全ての国籍</option>
            {nationalities.map(nat => (
              <option key={nat} value={nat}>{nat}</option>
            ))}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2.5 border border-slate-350 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-semibold">
            <option value="expiry">期限が近い順</option>
            <option value="name">氏名五十音順</option>
            <option value="nationality">国籍順</option>
          </select>
        </div>
      </Card>

      {/* Table - Spacious, elegant details */}
      <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-slate-50/20">
            該当する従業員はいません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm border-collapse" style={{ minWidth: '1050px' }}>
              <colgroup>
                <col style={{ width: '100px' }} />
                <col style={{ width: '180px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '170px' }} />
                <col style={{ width: '80px' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-505 font-extrabold uppercase tracking-wider">
                  <th className="px-5 py-3.5 w-[100px] min-w-[100px]">社員コード</th>
                  <th className="px-5 py-3.5 w-[180px] min-w-[180px]">氏名</th>
                  <th className="px-5 py-3.5 w-[100px] min-w-[100px]">国籍</th>
                  <th className="px-5 py-3.5 w-[160px] min-w-[160px]">在留資格</th>
                  <th className="px-5 py-3.5 w-[150px] min-w-[150px]">在留カード番号</th>
                  <th className="px-5 py-3.5 w-[110px] min-w-[110px]">満了日</th>
                  <th className="px-5 py-3.5 w-[170px] min-w-[170px]">タイムライン期限状態</th>
                  <th className="px-5 py-3.5 text-right w-[80px] min-w-[80px]">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map(emp => {
                  const expiryStatus = emp.residenceExpiry ? getExpiryStatus(emp.residenceExpiry) : null;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-blue-600 font-bold w-[100px] min-w-[100px] truncate">{emp.employeeCode}</td>
                      <td className="px-5 py-4 w-[180px] min-w-[180px]">
                        <div className="flex items-center gap-3 min-w-0">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm" />
                          ) : (
                            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600 border border-slate-200">
                              {emp.firstNameKana?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-bold text-slate-800 truncate">{emp.lastName} {emp.firstName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 w-[100px] min-w-[100px] truncate">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-655 text-[11px] font-extrabold rounded-lg border border-slate-200/80 block truncate max-w-full text-center">
                          {emp.nationality}
                        </span>
                      </td>
                      <td className="px-5 py-4 w-[160px] min-w-[160px] truncate">
                        <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200/60 text-blue-700 text-xs rounded-lg font-bold block truncate max-w-full text-center">
                          {emp.residenceStatus || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-500 w-[150px] min-w-[150px] truncate">{emp.residenceCardNumber || '-'}</td>
                      <td className="px-5 py-4 text-slate-655 font-bold text-xs w-[110px] min-w-[110px] truncate">{emp.residenceExpiry ? formatDate(emp.residenceExpiry) : '-'}</td>
                      <td className="px-5 py-4 w-[170px] min-w-[170px]">
                        {expiryStatus && (
                          <div className="space-y-1 max-w-[150px]">
                            <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${expiryStatus.colorClasses} block truncate max-w-full text-center`}>
                              {expiryStatus.label}
                            </span>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  expiryStatus.level === 'expired' ? 'bg-red-500' :
                                  expiryStatus.level === 'expiring' ? 'bg-orange-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${expiryStatus.pct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right w-[80px] min-w-[80px]">
                        <button
                          onClick={() => handleUpdate(emp)}
                          className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                        >
                          更新
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Employee Form Modal */}
      <EmployeeFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEmployee(null); }}
        onSave={handleSave}
        employee={editingEmployee}
      />
    </div>
  );
}
