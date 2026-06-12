'use client';

import { useState, useEffect, useMemo } from 'react';
import Card from '@/components/common/Card';
import ManagementModal from '@/components/common/ManagementModal';
import { formatCurrency } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import ExportButtons from '@/components/common/ExportButtons';
import GenericImportModal from '@/components/common/GenericImportModal';

interface Position {
  id: string;
  name: string;
  nameKana: string;
  description: string | null;
  allowance: number;
  _count?: { employees: number };
}

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: { name: string } | string | any;
  status: string;
  salary: number;
}

interface PositionStats {
  totalSalary: number;
  avgSalary: number;
  activeCount: number;
  onLeaveCount: number;
  inactiveCount: number;
}

const getPosTheme = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('manager') || lower.includes('マネージャー') || lower.includes('trưởng') || lower.includes('giám đốc')) {
    return {
      bg: 'from-rose-50/70 to-pink-50/30 border-rose-250/60 hover:border-rose-400 hover:shadow-premium-hover shadow-premium hover:-translate-y-1',
      iconBg: 'bg-rose-100 text-rose-700 border-rose-200/50',
      badge: 'bg-rose-50 text-rose-800 border-rose-200/40',
      accent: 'bg-rose-500',
    };
  }
  if (lower.includes('leader') || lower.includes('リーダー') || lower.includes('tổ trưởng') || lower.includes('nhóm trưởng') || lower.includes('lida')) {
    return {
      bg: 'from-amber-50/70 to-yellow-50/30 border-amber-250/60 hover:border-amber-400 hover:shadow-premium-hover shadow-premium hover:-translate-y-1',
      iconBg: 'bg-amber-100 text-amber-700 border-amber-200/50',
      badge: 'bg-amber-50 text-amber-800 border-amber-200/40',
      accent: 'bg-amber-500',
    };
  }
  if (lower.includes('senior') || lower.includes('chuyên viên') || lower.includes('主任')) {
    return {
      bg: 'from-violet-50/70 to-purple-50/30 border-violet-250/60 hover:border-violet-400 hover:shadow-premium-hover shadow-premium hover:-translate-y-1',
      iconBg: 'bg-violet-100 text-violet-700 border-violet-200/50',
      badge: 'bg-violet-50 text-violet-800 border-violet-200/40',
      accent: 'bg-violet-500',
    };
  }
  if (lower.includes('staff') || lower.includes('一般') || lower.includes('nhân viên')) {
    return {
      bg: 'from-emerald-50/70 to-teal-50/30 border-emerald-250/60 hover:border-emerald-400 hover:shadow-premium-hover shadow-premium hover:-translate-y-1',
      iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200/50',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200/40',
      accent: 'bg-emerald-500',
    };
  }
  // Default position
  return {
    bg: 'from-blue-50/70 to-sky-50/30 border-blue-250/60 hover:border-blue-400 hover:shadow-premium-hover shadow-premium hover:-translate-y-1',
    iconBg: 'bg-blue-100 text-blue-700 border-blue-200/50',
    badge: 'bg-blue-50 text-blue-800 border-blue-200/40',
    accent: 'bg-blue-500',
  };
};

const getInitialsAvatar = (lastName: string, firstName: string) => {
  const name = `${lastName} ${firstName}`.trim();
  const initials = `${lastName.slice(0, 1)}${firstName.slice(0, 1)}`.toUpperCase() || name.slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    'from-indigo-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-sky-500 to-cyan-600',
  ];
  const colorIndex = Math.abs(hash) % gradients.length;
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradients[colorIndex]} text-white text-[10px] font-black flex items-center justify-center shadow-xs shrink-0 border border-white/20`}>
      {initials}
    </div>
  );
};

export default function PositionsClient({
  initialPositions = [],
}: {
  initialPositions?: Position[];
}) {
  const { t, locale } = useI18n();
  const [positions, setPositions] = useState<Position[]>(initialPositions);
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [posStats, setPosStats] = useState<PositionStats | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'salary' | 'department'>('name');

  const exportData = useMemo(() => {
    return positions.map(p => ({
      id: p.id,
      name: p.name,
      nameKana: p.nameKana,
      allowance: p.allowance,
      description: p.description || '',
      employeesCount: p._count?.employees || 0,
    }));
  }, [positions]);

  const fetchPositions = async () => {
    try {
      const res = await fetch('/api/positions');
      const data = await res.json();
      setPositions(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    }
  };

  const fetchEmployeesByPos = async (posId: string) => {
    setLoadingEmps(true);
    try {
      const res = await fetch(`/api/employees?positionId=${posId}&limit=100`);
      const data = await res.json();
      const emps: Employee[] = data.data || data || [];
      setEmployees(emps);
      setFilteredEmployees(emps);

      // Calculate stats
      const active = emps.filter(e => e.status === 'ACTIVE');
      const onLeave = emps.filter(e => e.status === 'ON_LEAVE');
      const inactive = emps.filter(e => e.status === 'INACTIVE');
      const totalSalary = active.reduce((sum, e) => sum + e.salary, 0);
      const avgSalary = active.length > 0 ? Math.round(totalSalary / active.length) : 0;

      setPosStats({
        totalSalary,
        avgSalary,
        activeCount: active.length,
        onLeaveCount: onLeave.length,
        inactiveCount: inactive.length,
      });
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setEmployees([]);
      setFilteredEmployees([]);
      setPosStats(null);
    } finally {
      setLoadingEmps(false);
    }
  };

  // Auto-select first position after initial load
  useEffect(() => {
    if (positions.length > 0 && !selectedPos) {
      const firstPos = positions[0];
      setSelectedPos(firstPos);
      fetchEmployeesByPos(firstPos.id);
    }
  }, [positions]);

  // Reset pagination when data changes
  useEffect(() => {
    // Logic for resets
  }, [positions, filteredEmployees]);

  // Filter and sort employees list
  useEffect(() => {
    let result = [...employees];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(emp =>
        `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(term) ||
        emp.employeeCode.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(emp => emp.status === statusFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'salary') {
        return b.salary - a.salary;
      }
      if (sortBy === 'department') {
        const deptA = typeof a.department === 'object' ? a.department?.name || '' : a.department || '';
        const deptB = typeof b.department === 'object' ? b.department?.name || '' : b.department || '';
        return deptA.localeCompare(deptB, 'ja');
      }
      // default: name
      return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'ja');
    });

    setFilteredEmployees(result);
  }, [employees, searchTerm, statusFilter, sortBy]);

  const handleSelectPos = (pos: Position) => {
    if (selectedPos?.id === pos.id) {
      setSelectedPos(null);
      setEmployees([]);
      setFilteredEmployees([]);
      setPosStats(null);
      setSearchTerm('');
      setStatusFilter('ALL');
    } else {
      setSelectedPos(pos);
      setSearchTerm('');
      setStatusFilter('ALL');
      fetchEmployeesByPos(pos.id);
    }
  };

  const totalEmployees = useMemo(() => {
    return positions.reduce((sum, p) => sum + (p._count?.employees || 0), 0);
  }, [positions]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Stat Board */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.04)]">
        <div>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('nav.positions')}</h2>
          <p className="text-xl font-black text-slate-800 mt-1">
            {locale === 'ja'
              ? `全 ${positions.length} 役職 / 合計 ${totalEmployees} 名が就任中`
              : locale === 'vi'
                ? `Tổng số ${positions.length} chức vụ / Có ${totalEmployees} nhân sự đảm nhiệm`
                : `Total ${positions.length} Positions / Assigned to ${totalEmployees} staff`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center self-start sm:self-center">
          <ExportButtons
            data={exportData}
            columns={[
              { header: 'ID', key: 'id' },
              { header: t('common.colName') || 'Name', key: 'name' },
              { header: (t('common.colName') || 'Name') + ' (Kana)', key: 'nameKana' },
              { header: t('common.colAllowance') || 'Allowance', key: 'allowance' },
              { header: t('common.colDescription') || 'Description', key: 'description' },
              { header: t('departments.colEmployeesCount') || 'Employees Count', key: 'employeesCount' },
            ]}
            fileName="positions_list"
          />
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-4.5 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:shadow-md active:scale-95"
          >
            📥 {t('common.import') || 'Import'}
          </button>
          <button
            onClick={() => setManageOpen(true)}
            className="px-4.5 py-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer hover:shadow-md active:scale-95"
          >
            {locale === 'ja' ? '役職を追加・編集' : locale === 'vi' ? 'Quản lý chức vụ' : 'Manage Positions'}
          </button>
        </div>
      </div>

      {/* Positions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {positions.length === 0 && (
          <div className="col-span-full text-center py-20 text-slate-400 bg-slate-50/50 border border-dashed rounded-3xl">
            {locale === 'ja' ? '登録されている役職はありません。' : locale === 'vi' ? 'Chưa có chức vụ nào được đăng ký.' : 'No positions registered.'}
          </div>
        )}
        {positions.map((pos) => {
          const isSelected = selectedPos?.id === pos.id;
          const theme = getPosTheme(pos.name);
          return (
            <div
              key={pos.id}
              onClick={() => handleSelectPos(pos)}
              className={`p-6 rounded-3xl border bg-gradient-to-br transition-all duration-300 cursor-pointer flex flex-col justify-between ${theme.bg} ${
                isSelected
                  ? 'border-indigo-500/80 shadow-premium ring-4 ring-indigo-500/10 scale-[1.02]'
                  : ''
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-xs shrink-0 border border-white/40 ${theme.iconBg}`}>
                    👔
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-slate-800 truncate tracking-wide">{pos.name}</h3>
                    <p className="text-[9px] text-slate-400 font-black tracking-wider truncate uppercase mt-0.5">{pos.nameKana}</p>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-xs border border-slate-100 px-3 py-1.5 rounded-2xl text-center flex flex-col justify-center min-w-[52px] h-11 shrink-0 shadow-2xs">
                  <p className="text-sm font-black text-slate-800 tracking-tight leading-none">{pos._count?.employees || 0}</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1 leading-none">{t('common.personUnit').trim()}</p>
                </div>
              </div>
              <div className="mt-4.5 bg-white/50 backdrop-blur-xs p-3 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('common.colAllowance') || '役職手当'}</p>
                <p className="text-base font-black text-blue-600 mt-0.5">
                  {pos.allowance > 0 ? formatCurrency(pos.allowance) : locale === 'ja' ? '手当なし' : locale === 'vi' ? 'Không có phụ cấp' : 'No allowance'}
                </p>
              </div>
              {pos.description ? (
                <p className="text-xs text-slate-500 line-clamp-2 mt-4 font-medium leading-relaxed">
                  {pos.description}
                </p>
              ) : (
                <p className="text-xs text-slate-350 italic mt-4 font-medium leading-relaxed">
                  {locale === 'ja' ? '説明はありません。' : locale === 'vi' ? 'Không có mô tả.' : 'No description provided.'}
                </p>
              )}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-mono truncate select-all">ID: {pos.id}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(pos.id);
                    alert('Position ID copied!');
                  }}
                  className="hover:text-indigo-600 transition-colors cursor-pointer bg-slate-100 hover:bg-indigo-50 w-6 h-6 rounded-lg flex items-center justify-center border border-slate-200/50"
                  title="Copy Position ID"
                >
                  📋
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Position Dashboard */}
      {selectedPos && (
        <div className="space-y-6 mt-8 animate-fadeIn border-t border-slate-200/60 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-slate-150 flex items-center justify-center text-base border border-slate-200/60 shadow-2xs">👔</span>
              <span>{selectedPos.name} {locale === 'ja' ? ' の詳細ダッシュボード' : locale === 'vi' ? ' - Chi tiết chức vụ' : ' Detail Dashboard'}</span>
            </h2>
            <button
              onClick={() => {
                setSelectedPos(null);
                setEmployees([]);
                setFilteredEmployees([]);
                setPosStats(null);
                setSearchTerm('');
                setStatusFilter('ALL');
              }}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
            >
              {t('departments.closeBtn') || '閉じる'}
            </button>
          </div>

          {/* KPI Row */}
          {posStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  label: locale === 'ja' ? '手当単価' : locale === 'vi' ? 'Mức phụ cấp' : 'Allowance Rate', 
                  value: formatCurrency(selectedPos.allowance), 
                  color: 'text-blue-600', 
                  bg: 'bg-white border-slate-200/80 shadow-premium', 
                  accent: 'bg-blue-500',
                  icon: '🏅'
                },
                {
                  label: locale === 'ja' ? '月額手当総額 (推測)' : locale === 'vi' ? 'Tổng quỹ phụ cấp/tháng' : 'Monthly Allowance Cost',
                  value: formatCurrency(selectedPos.allowance * posStats.activeCount),
                  color: 'text-indigo-600',
                  bg: 'bg-white border-slate-200/80 shadow-premium',
                  accent: 'bg-indigo-500',
                  icon: '💸'
                },
                { 
                  label: locale === 'ja' ? '平均基本給' : locale === 'vi' ? 'Lương cơ bản trung bình' : 'Avg Base Salary', 
                  value: formatCurrency(posStats.avgSalary), 
                  color: 'text-slate-800', 
                  bg: 'bg-white border-slate-200/80 shadow-premium', 
                  accent: 'bg-violet-500',
                  icon: '💰'
                },
                {
                  label: locale === 'ja' ? '稼働状況 (在籍/休職/退職)' : locale === 'vi' ? 'Tình trạng (Đang làm/Nghỉ/Rút)' : 'Status Ratio',
                  value: `${posStats.activeCount} / ${posStats.onLeaveCount} / ${posStats.inactiveCount}`,
                  color: 'text-slate-750',
                  bg: 'bg-white border-slate-200/80 shadow-premium',
                  accent: 'bg-emerald-500',
                  icon: '👥'
                },
              ].map((kpi, idx) => (
                <div key={idx} className={`${kpi.bg} p-5 rounded-3xl border transition-all hover:translate-y-[-2px] hover:shadow-premium-hover flex justify-between items-center relative overflow-hidden group`}>
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-transparent to-transparent group-hover:from-blue-500 group-hover:to-indigo-600 transition-all duration-300" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <span>{kpi.icon}</span>
                      <span>{kpi.label}</span>
                    </p>
                    <p className={`text-lg font-black tracking-tight ${kpi.color}`}>{kpi.value}</p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${kpi.accent} opacity-60 shrink-0`} />
                </div>
              ))}
            </div>
          )}

          {/* Members Table Card */}
          <Card
            title={locale === 'ja' ? `${selectedPos.name} の就任メンバー一覧` : locale === 'vi' ? `Danh sách nhân sự giữ chức vụ ${selectedPos.name}` : `Employees holding ${selectedPos.name} Position`}
            action={
              <button
                onClick={() => {
                  setSelectedPos(null);
                  setEmployees([]);
                  setFilteredEmployees([]);
                  setPosStats(null);
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
                className="text-xs text-slate-400 hover:text-slate-700 font-bold border border-slate-200 bg-white rounded-xl px-3.5 py-2 hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors"
              >
                {t('common.cancel')}
              </button>
            }
          >
            {/* Filter controls */}
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={t('departments.searchPrompt') || '従業員を検索...'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2.5 premium-input rounded-xl text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 premium-input rounded-xl text-sm bg-white cursor-pointer"
              >
                <option value="ALL">{t('departments.allStatuses') || 'すべてのステータス'}</option>
                <option value="ACTIVE">{t('client.statusActive') || '在籍'}</option>
                <option value="ON_LEAVE">{t('client.statusLeave') || '休職'}</option>
                <option value="INACTIVE">{t('client.statusInactive') || '退職'}</option>
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2.5 premium-input rounded-xl text-sm bg-white cursor-pointer"
              >
                <option value="name">{t('departments.sortName') || '名前順'}</option>
                <option value="salary">{t('departments.sortSalary') || '基本給順'}</option>
                <option value="department">{locale === 'ja' ? '部署順' : locale === 'vi' ? 'Phòng ban' : 'Department'}</option>
              </select>
            </div>

            {loadingEmps ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed">
                {t('departments.noMembersFound') || '該当するメンバーはいません'}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/60 rounded-2xl shadow-premium mb-5 bg-white">
                <table className="w-full table-fixed text-left border-collapse" style={{ minWidth: '700px' }}>
                  <colgroup>
                     <col style={{ width: '120px' }} />
                     <col style={{ width: '220px' }} />
                     <col style={{ width: '150px' }} />
                     <col style={{ width: '120px' }} />
                     <col style={{ width: '130px' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-4">{t('departments.colCode')}</th>
                      <th className="px-4 py-4">{t('departments.colName')}</th>
                      <th className="px-4 py-4">{locale === 'ja' ? '部署' : locale === 'vi' ? 'Bộ phận' : 'Department'}</th>
                      <th className="px-4 py-4">{t('departments.colStatus')}</th>
                      <th className="px-4 py-4 text-right">{t('departments.colSalary')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredEmployees.map((emp) => {
                      const deptName = typeof emp.department === 'object' ? emp.department?.name || '-' : emp.department || '-';
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-xs text-blue-600 font-bold">{emp.employeeCode}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              {getInitialsAvatar(emp.lastName, emp.firstName)}
                              <span className="font-extrabold text-slate-800">{emp.lastName} {emp.firstName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 font-semibold">{deptName}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                              emp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200/20' :
                              emp.status === 'ON_LEAVE' ? 'bg-amber-500/10 text-amber-700 border-amber-200/20' :
                              'bg-slate-100 text-slate-500 border-slate-200/50'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                emp.status === 'ACTIVE' ? 'bg-emerald-50' :
                                emp.status === 'ON_LEAVE' ? 'bg-amber-55' :
                                'bg-slate-400'
                              }`} />
                              <span>{emp.status === 'ACTIVE' ? t('client.statusActive') : emp.status === 'ON_LEAVE' ? t('client.statusLeave') : t('client.statusInactive')}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-black text-slate-800">{formatCurrency(emp.salary)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Management Modal */}
      <ManagementModal
        isOpen={manageOpen}
        onClose={() => { setManageOpen(false); fetchPositions(); }}
        title={t('form.pos')}
        apiPath="/api/positions"
        showAllowance={true}
      />

      <GenericImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchPositions}
        apiPath="/api/positions/import"
        payloadKey="positions"
        templateJson={JSON.stringify([
          {
            name: "マネージャー",
            nameKana: "マネージャー",
            description: "部門統括者",
            allowance: 30000
          },
          {
            name: "一般社員",
            nameKana: "イッパンシャイン",
            description: "担当業務の遂行",
            allowance: 0
          }
        ], null, 2)}
        title={locale === 'ja' ? '役職インポート' : locale === 'vi' ? 'Nhập dữ liệu chức vụ' : 'Import Positions'}
        description={locale === 'ja' ? '役職の一覧を含むJSONファイルをアップロードして、一括インポートします。' : locale === 'vi' ? 'Tải lên tệp JSON chứa danh sách các chức vụ để nhập hàng loạt.' : 'Upload a JSON file containing positions list.'}
      />
    </div>
  );
}
