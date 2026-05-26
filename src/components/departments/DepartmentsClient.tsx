'use client';

import { useState, useEffect, useMemo } from 'react';
import Card from '@/components/common/Card';
import ManagementModal from '@/components/common/ManagementModal';
import { formatCurrency } from '@/lib/utils';

interface Department {
  id: string;
  name: string;
  nameKana: string;
  description: string | null;
  _count?: { employees: number };
}

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  position: { name: string } | string | any;
  status: string;
  salary: number;
}

interface MonthlyStats {
  month: string;
  present: number;
  late: number;
  absent: number;
  total: number;
}

interface DeptStats {
  totalSalary: number;
  avgSalary: number;
  activeCount: number;
  onLeaveCount: number;
  inactiveCount: number;
}

const getDeptIcon = (name: string) => {
  if (name.includes('営業')) return '📈';
  if (name.includes('開発') || name.includes('技術') || name.includes('システム')) return '💻';
  if (name.includes('人事') || name.includes('労務')) return '🤝';
  if (name.includes('経理') || name.includes('財務') || name.includes('総務')) return '📊';
  return '🏢';
};

export default function DepartmentsClient({
  initialDepartments = [],
}: {
  initialDepartments?: Department[];
}) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [deptStats, setDeptStats] = useState<DeptStats | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'salary' | 'position'>('name');

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchEmployeesByDept = async (deptId: string) => {
    setLoadingEmps(true);
    try {
      const res = await fetch(`/api/employees?departmentId=${deptId}&limit=100`);
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

      setDeptStats({
        totalSalary,
        avgSalary,
        activeCount: active.length,
        onLeaveCount: onLeave.length,
        inactiveCount: inactive.length,
      });

      // Fetch attendance stats for 3 months
      if (emps.length > 0) {
        await fetchMonthlyStats(emps.map(e => e.id));
      } else {
        setMonthlyStats([]);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setEmployees([]);
      setFilteredEmployees([]);
      setMonthlyStats([]);
      setDeptStats(null);
    } finally {
      setLoadingEmps(false);
    }
  };

  // Highly optimized database scanner: only 3 queries (one per month) instead of 3 * N
  const fetchMonthlyStats = async (employeeIds: string[]) => {
    try {
      const now = new Date();
      const months = [];
      for (let i = 2; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.push(monthStr);
      }

      const stats: MonthlyStats[] = await Promise.all(
        months.map(async (month) => {
          const res = await fetch(`/api/attendance?month=${month}`);
          if (!res.ok) throw new Error('Failed to fetch attendance');
          const monthRecords = await res.json();

          // Filter records belonging to this department's employees in memory
          const deptRecords = monthRecords.filter((rec: any) => employeeIds.includes(rec.employeeId));

          let present = 0, late = 0, absent = 0;
          deptRecords.forEach((rec: any) => {
            if (rec.status === 'PRESENT') present++;
            else if (rec.status === 'LATE') late++;
            else if (rec.status === 'ABSENT') absent++;
          });

          const [, monthNum] = month.split('-');
          return {
            month: `${parseInt(monthNum)}月`,
            present,
            late,
            absent,
            total: present + late + absent,
          };
        })
      );

      setMonthlyStats(stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setMonthlyStats([]);
    }
  };

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
      if (sortBy === 'position') {
        const posA = typeof a.position === 'object' ? a.position?.name || '' : a.position || '';
        const posB = typeof b.position === 'object' ? b.position?.name || '' : b.position || '';
        return posA.localeCompare(posB, 'ja');
      }
      // default: name
      return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'ja');
    });

    setFilteredEmployees(result);
  }, [employees, searchTerm, statusFilter, sortBy]);

  const handleSelectDept = (dept: Department) => {
    if (selectedDept?.id === dept.id) {
      setSelectedDept(null);
      setEmployees([]);
      setFilteredEmployees([]);
      setMonthlyStats([]);
      setDeptStats(null);
      setSearchTerm('');
      setStatusFilter('ALL');
    } else {
      setSelectedDept(dept);
      setSearchTerm('');
      setStatusFilter('ALL');
      fetchEmployeesByDept(dept.id);
    }
  };

  const totalEmployees = useMemo(() => {
    return departments.reduce((sum, d) => sum + (d._count?.employees || 0), 0);
  }, [departments]);

  // SVG Chart Dimensions & Math helpers
  const svgChartProps = useMemo(() => {
    const maxCount = Math.max(...monthlyStats.map(s => Math.max(s.present, s.late, s.absent)), 10);
    const maxYScale = Math.ceil(maxCount / 5) * 5;
    return {
      maxYScale,
      gridLines: Array.from({ length: 5 }, (_, i) => Math.round((maxYScale / 4) * i)),
    };
  }, [monthlyStats]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Stat Board - Redesigned to look extremely premium */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Departments Overview</h2>
          <p className="text-xl font-black text-slate-800 mt-1">
            全 {departments.length} 部署 <span className="text-slate-350 font-normal mx-2">|</span> 稼働人員 {totalEmployees} 名
          </p>
        </div>
        <button
          onClick={() => setManageOpen(true)}
          className="px-4.5 py-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm self-start sm:self-center cursor-pointer hover:shadow-md"
        >
          ⚙️ 部署マスター管理
        </button>
      </div>

      {/* Departments Grid - Redesigned Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {departments.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-450 bg-slate-50/50 border border-dashed rounded-2xl">
            部署が登録されていません。「部署マスター管理」から追加してください。
          </div>
        )}
        {departments.map((dept) => {
          const isSelected = selectedDept?.id === dept.id;
          const icon = getDeptIcon(dept.name);
          return (
            <div
              key={dept.id}
              onClick={() => handleSelectDept(dept)}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
                  : 'bg-white border-slate-200/60 hover:border-slate-350 hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl filter drop-shadow-sm">{icon}</span>
                    <h3 className="text-sm font-extrabold text-slate-800 truncate tracking-wide">{dept.name}</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold tracking-wider truncate uppercase">{dept.nameKana}</p>
                </div>
                <div className="text-right ml-2 bg-slate-50 border border-slate-200/80 px-3 py-1 rounded-xl">
                  <p className="text-sm font-black text-blue-600 tracking-tight">{dept._count?.employees || 0}</p>
                  <p className="text-[9px] text-slate-450 font-bold -mt-0.5">名</p>
                </div>
              </div>
              {dept.description && (
                <p className="text-xs text-slate-500 line-clamp-2 mt-4 font-medium leading-relaxed">
                  {dept.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Department Dashboard - Premium Glassmorphism Section */}
      {selectedDept && (
        <div className="space-y-6 mt-8 animate-fadeIn">
          <div className="flex items-center justify-between border-t border-slate-200/80 pt-6">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <span className="text-xl">{getDeptIcon(selectedDept.name)}</span>
              <span>{selectedDept.name} — 詳細ダッシュボード</span>
            </h2>
            <button
              onClick={() => {
                setSelectedDept(null);
                setEmployees([]);
                setFilteredEmployees([]);
                setMonthlyStats([]);
                setDeptStats(null);
                setSearchTerm('');
                setStatusFilter('ALL');
              }}
              className="text-xs text-slate-400 hover:text-slate-650 font-bold border border-slate-200 rounded-lg px-2 py-1 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              閉じる ✕
            </button>
          </div>

          {/* Department KPI Stats Row */}
          {deptStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '人件費総額 (月給合計)', value: formatCurrency(deptStats.totalSalary), color: 'text-slate-800', bg: 'bg-white border-slate-200/60 shadow-sm' },
                { label: '平均基本給 (在籍者平均)', value: formatCurrency(deptStats.avgSalary), color: 'text-blue-600', bg: 'bg-white border-slate-200/60 shadow-sm' },
                { label: '在籍比率 (在籍/休職/退職)', value: `${deptStats.activeCount} / ${deptStats.onLeaveCount} / ${deptStats.inactiveCount}`, color: 'text-slate-800', bg: 'bg-white border-slate-200/60 shadow-sm' },
                {
                  label: '出勤率 (直近月)',
                  value: monthlyStats.length > 0 && monthlyStats[monthlyStats.length - 1].total > 0
                    ? `${Math.round((monthlyStats[monthlyStats.length - 1].present / (monthlyStats[monthlyStats.length - 1].total)) * 100)}%`
                    : '-',
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50/40 border-emerald-100 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.1)]',
                },
              ].map((kpi, idx) => (
                <div key={idx} className={`${kpi.bg} p-4.5 rounded-2xl border`}>
                  <p className="text-xs text-slate-500 font-semibold mb-1">{kpi.label}</p>
                  <p className={`text-lg font-black tracking-tight ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* SVG Attendance Chart & labor statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Clustered Column Chart - Redesigned with proper SVG rounded gradients */}
            <div className="lg:col-span-2">
              <Card title="過去3ヶ月の勤怠実績 (出勤・遅刻・欠勤内訳)" className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
                <p className="text-xs text-slate-400 -mt-2 mb-6">部署メンバーの総打刻記録データ（月次推移）</p>
                {monthlyStats.length > 0 ? (
                  <div className="relative h-64 w-full">
                    <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="dept-grad-present" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="dept-grad-late" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#ea580c" />
                        </linearGradient>
                        <linearGradient id="dept-grad-absent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                      </defs>

                      {/* Y-Axis Grid Lines */}
                      {svgChartProps.gridLines.map((val, idx) => {
                        const y = 160 - (idx * 35);
                        return (
                          <g key={idx}>
                            <line x1="45" y1={y} x2="480" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                            <text x="22" y={y + 3} fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">{val}回</text>
                          </g>
                        );
                      })}

                      {/* Clustered Bars */}
                      {monthlyStats.map((stat, mIdx) => {
                        const groupWidth = 60;
                        const xStart = 85 + mIdx * 140;
                        const hPresent = svgChartProps.maxYScale > 0 ? (stat.present / svgChartProps.maxYScale) * 130 : 0;
                        const hLate = svgChartProps.maxYScale > 0 ? (stat.late / svgChartProps.maxYScale) * 130 : 0;
                        const hAbsent = svgChartProps.maxYScale > 0 ? (stat.absent / svgChartProps.maxYScale) * 130 : 0;

                        return (
                          <g key={mIdx}>
                            {/* Present Bar */}
                            <g className="group cursor-pointer">
                              <rect x={xStart - 12} y={160 - hPresent - 22} width="40" height="18" rx="5" fill="#1e293b" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              <text x={xStart + 8} y={160 - hPresent - 10} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                出勤: {stat.present}回
                              </text>
                              <rect
                                x={xStart}
                                y={160 - hPresent}
                                width="16"
                                height={Math.max(hPresent, 2)}
                                rx="4"
                                fill="url(#dept-grad-present)"
                                className="transition-all duration-300"
                              />
                            </g>

                            {/* Late Bar */}
                            <g className="group cursor-pointer">
                              <rect x={xStart + 8} y={160 - hLate - 22} width="40" height="18" rx="5" fill="#1e293b" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              <text x={xStart + 28} y={160 - hLate - 10} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                遅刻: {stat.late}回
                              </text>
                              <rect
                                x={xStart + 20}
                                y={160 - hLate}
                                width="16"
                                height={Math.max(hLate, 2)}
                                rx="4"
                                fill="url(#dept-grad-late)"
                                className="transition-all duration-300"
                              />
                            </g>

                            {/* Absent Bar */}
                            <g className="group cursor-pointer">
                              <rect x={xStart + 28} y={160 - hAbsent - 22} width="40" height="18" rx="5" fill="#1e293b" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              <text x={xStart + 48} y={160 - hAbsent - 10} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                欠勤: {stat.absent}回
                              </text>
                              <rect
                                x={xStart + 40}
                                y={160 - hAbsent}
                                width="16"
                                height={Math.max(hAbsent, 2)}
                                rx="4"
                                fill="url(#dept-grad-absent)"
                                className="transition-all duration-300"
                              />
                            </g>

                            {/* Month Label */}
                            <text x={xStart + 28} y="182" fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">{stat.month}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400">勤怠実績データが存在しません</div>
                )}

                {/* Legends Footer */}
                <div className="flex gap-4 justify-center border-t border-slate-100 pt-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <span className="text-slate-650">出勤</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    <span className="text-slate-650">遅刻</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                    <span className="text-slate-650">欠勤</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Department Breakdown / Labor Cost Details */}
            <div className="lg:col-span-1">
              <Card title="就業状態割合 & 給与目安" className="bg-white border border-slate-200/60 shadow-sm h-full rounded-2xl">
                <p className="text-xs text-slate-400 -mt-2 mb-4">雇用状況と報酬内訳</p>
                {deptStats ? (
                  <div className="space-y-5">
                    {/* Status Progress Tracks */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-455 uppercase tracking-wider">就業状態割合</h4>
                      {[
                        { label: '在籍中', count: deptStats.activeCount, color: 'bg-emerald-550', total: employees.length },
                        { label: '休職中', count: deptStats.onLeaveCount, color: 'bg-amber-550', total: employees.length },
                        { label: '退職済み', count: deptStats.inactiveCount, color: 'bg-slate-350', total: employees.length },
                      ].map((item, idx) => {
                        const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-700">
                              <span>{item.label} ({item.count}名)</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-2">
                      <h4 className="text-xs font-bold text-slate-455 uppercase tracking-wider">人件費目安（基本給）</h4>
                      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-sm">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase">Department Payroll Base</p>
                        <p className="text-xl font-black text-slate-800 tracking-tight mt-0.5">{formatCurrency(deptStats.totalSalary)}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-2.5 border-t border-slate-200/60 pt-2">
                          一人当たり平均: <span className="font-extrabold text-slate-700">{formatCurrency(deptStats.avgSalary)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-6 text-center">統計データがありません</p>
                )}
              </Card>
            </div>
          </div>

          {/* Members Table Card - Spacious, premium layout */}
          <Card
            title={`${selectedDept.name} 所属メンバー一覧`}
            className="bg-white border border-slate-200/60 shadow-sm rounded-2xl"
            action={
              <button
                onClick={() => {
                  setSelectedDept(null);
                  setEmployees([]);
                  setFilteredEmployees([]);
                  setMonthlyStats([]);
                  setDeptStats(null);
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
                className="text-xs text-slate-400 hover:text-slate-650 font-bold border border-slate-250 bg-white rounded-lg px-2.5 py-1 hover:bg-slate-50 cursor-pointer"
              >
                閉じる
              </button>
            }
          >
            {/* Filter controls */}
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="氏名・従業員コードで検索..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="ALL">全ての就業状態</option>
                <option value="ACTIVE">在籍中</option>
                <option value="ON_LEAVE">休職中</option>
                <option value="INACTIVE">退職</option>
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="name">氏名順</option>
                <option value="salary">給与額順</option>
                <option value="position">役職順</option>
              </select>
            </div>

            {loadingEmps ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed">
                条件に合致するメンバーは見つかりませんでした。
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/60">
                <table className="w-full table-fixed text-left border-collapse" style={{ minWidth: '700px' }}>
                  <colgroup>
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '180px' }} />
                    <col style={{ width: '150px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '130px' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">社員コード</th>
                      <th className="px-4 py-3">氏名</th>
                      <th className="px-4 py-3">役職</th>
                      <th className="px-4 py-3">ステータス</th>
                      <th className="px-4 py-3 text-right">基本給 (月給)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredEmployees.map((emp) => {
                      const posName = typeof emp.position === 'object' ? emp.position?.name || '-' : emp.position || '-';
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-blue-600 font-bold">{emp.employeeCode}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{emp.lastName} {emp.firstName}</td>
                          <td className="px-4 py-3 text-slate-500 font-medium">{posName}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                              emp.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                              emp.status === 'ON_LEAVE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {emp.status === 'ACTIVE' ? '在籍中' : emp.status === 'ON_LEAVE' ? '休職中' : '退職'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-black text-slate-700">{emp.salary.toLocaleString()}円</td>
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
        onClose={() => { setManageOpen(false); fetchDepartments(); }}
        title="部署"
        apiPath="/api/departments"
      />
    </div>
  );
}
