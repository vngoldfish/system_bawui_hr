'use client';

import { useState, useEffect, useMemo } from 'react';
import Card from '@/components/common/Card';
import ManagementModal from '@/components/common/ManagementModal';
import { formatCurrency } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import ExportButtons from '@/components/common/ExportButtons';
import GenericImportModal from '@/components/common/GenericImportModal';


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
  if (name.includes('\u55b6\u696d')) return '📈';
  if (name.includes('\u958b\u767a') || name.includes('\u6280\u8853') || name.includes('\u30b7\u30b9\u30c6\u30e0')) return '💻';
  if (name.includes('\u4eba\u4e8b') || name.includes('\u52b4\u52d9')) return '🤝';
  if (name.includes('\u7d4c\u7406') || name.includes('\u8ca1\u52d9') || name.includes('\u7dcf\u52d9')) return '📊';
  return '🏢';
};

export default function DepartmentsClient({
  initialDepartments = [],
}: {
  initialDepartments?: Department[];
}) {
  const { t, locale } = useI18n();
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [deptStats, setDeptStats] = useState<DeptStats | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'salary' | 'position'>('name');

  const exportData = useMemo(() => {
    return departments.map(d => ({
      name: d.name,
      nameKana: d.nameKana,
      description: d.description || '',
      employeesCount: d._count?.employees || 0,
    }));
  }, [departments]);


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

          return {
            month: month, // Keep original month YYYY-MM
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

  // Auto-select first department after initial load
  useEffect(() => {
    if (departments.length > 0 && !selectedDept) {
      const firstDept = departments[0];
      setSelectedDept(firstDept);
      fetchEmployeesByDept(firstDept.id);
    }
  }, [departments]);

  // Pagination state for departments
  const DEPT_PAGE_SIZE = 12;
  const [deptPage, setDeptPage] = useState(1);
  const totalDeptPages = Math.ceil(departments.length / DEPT_PAGE_SIZE);
  const paginatedDepartments = useMemo(
    () => departments.slice((deptPage - 1) * DEPT_PAGE_SIZE, deptPage * DEPT_PAGE_SIZE),
    [departments, deptPage]
  );

  // Pagination state for employees table
  const EMP_PAGE_SIZE = 10;
  const [empPage, setEmpPage] = useState(1);
  const totalEmpPages = Math.ceil(filteredEmployees.length / EMP_PAGE_SIZE);
  const paginatedEmployees = useMemo(
    () => filteredEmployees.slice((empPage - 1) * EMP_PAGE_SIZE, empPage * EMP_PAGE_SIZE),
    [filteredEmployees, empPage]
  );

  // Reset pagination when data changes
  useEffect(() => {
    setDeptPage(1);
  }, [departments]);
  useEffect(() => {
    setEmpPage(1);
  }, [filteredEmployees]);

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

  const getMonthLabel = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString(locale, { month: 'short' });
    } catch (e) {
      return monthStr;
    }
  };
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
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('nav.departments')}</h2>
          <p className="text-xl font-black text-slate-800 mt-1">
            {t('departments.activeStaff').replace('{depts}', String(departments.length)).replace('{staff}', String(totalEmployees))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center self-start sm:self-center">
          <ExportButtons
            data={exportData}
            columns={[
              { header: t('departments.colName') || 'Name', key: 'name' },
              { header: (t('departments.colName') || 'Name') + ' (Kana)', key: 'nameKana' },
              { header: t('departments.colDesc') || 'Description', key: 'description' },
              { header: t('departments.colEmployeesCount') || 'Employees Count', key: 'employeesCount' },
            ]}
            fileName="departments_list"
          />
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-4.5 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer hover:shadow-md"
          >
            📥 {t('common.import') || 'Import'}
          </button>
          <button
            onClick={() => setManageOpen(true)}
            className="px-4.5 py-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer hover:shadow-md"
          >
            {t('departments.manageBtn')}
          </button>
        </div>
      </div>

      {/* Departments Grid - Redesigned Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {departments.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-450 bg-slate-50/50 border border-dashed rounded-2xl">
            {t('departments.noDeptRegistered')}
          </div>
        )}
        {departments.map((dept) => {
          const isSelected = selectedDept?.id === dept.id;
          const icon = getDeptIcon(dept.name);
          return (
            <div
              key={dept.id}
              onClick={() => handleSelectDept(dept)}
              className={`p-6 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-br from-indigo-50/60 to-blue-50/20 border-indigo-500/80 shadow-premium ring-4 ring-indigo-500/10'
                  : 'bg-white border-slate-200/50 hover:border-slate-300 hover:shadow-premium-hover shadow-premium hover:-translate-y-1'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shadow-xs flex-shrink-0">
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-800 truncate tracking-wide">{dept.name}</h3>
                    <p className="text-[10px] text-slate-400 font-extrabold tracking-wider truncate uppercase">{dept.nameKana}</p>
                  </div>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100/30 px-2.5 py-1 rounded-xl text-center flex flex-col justify-center min-w-[48px] h-10 flex-shrink-0">
                  <p className="text-sm font-black text-indigo-600 tracking-tight leading-none">{dept._count?.employees || 0}</p>
                  <p className="text-[9px] text-indigo-500 font-bold mt-1 leading-none">{t('common.personUnit').trim()}</p>
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
              <span>{selectedDept.name}{t('departments.detailDashboard')}</span>
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
              {t('departments.closeBtn')}
            </button>
          </div>

          {/* Department KPI Stats Row */}
          {deptStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: t('departments.totalPayroll'), value: formatCurrency(deptStats.totalSalary), color: 'text-slate-800', bg: 'bg-white border-slate-200/50 shadow-premium', accent: 'bg-indigo-500' },
                { label: t('departments.averageSalary'), value: formatCurrency(deptStats.avgSalary), color: 'text-blue-600', bg: 'bg-white border-slate-200/50 shadow-premium', accent: 'bg-blue-500' },
                { label: t('departments.ratioLabel'), value: `${deptStats.activeCount} / ${deptStats.onLeaveCount} / ${deptStats.inactiveCount}`, color: 'text-slate-800', bg: 'bg-white border-slate-200/50 shadow-premium', accent: 'bg-violet-500' },
                {
                  label: t('departments.attendanceRate'),
                  value: monthlyStats.length > 0 && monthlyStats[monthlyStats.length - 1].total > 0
                    ? `${Math.round((monthlyStats[monthlyStats.length - 1].present / (monthlyStats[monthlyStats.length - 1].total)) * 100)}%`
                    : '-',
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50/20 border-emerald-200/60 shadow-premium',
                  accent: 'bg-emerald-500',
                },
              ].map((kpi, idx) => (
                <div key={idx} className={`${kpi.bg} p-5 rounded-3xl border transition-all hover:translate-y-[-2px] hover:shadow-premium-hover flex justify-between items-center relative overflow-hidden group`}>
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent to-transparent group-hover:from-blue-500 group-hover:to-indigo-600 transition-all duration-300" />
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
                    <p className={`text-xl font-extrabold tracking-tight ${kpi.color}`}>{kpi.value}</p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${kpi.accent} opacity-60`} />
                </div>
              ))}
            </div>
          )}

          {/* SVG Attendance Chart & labor statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Clustered Column Chart - Redesigned with proper SVG rounded gradients */}
            <div className="lg:col-span-2">
              <Card title={t('departments.attendanceHistoryTitle')} className="">
                <p className="text-xs text-slate-400 -mt-2 mb-6">{t('departments.attendanceHistoryDesc')}</p>
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
                            <text x="22" y={y + 3} fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">{val}{t('common.timesUnit').trim()}</text>
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
                              <rect x={xStart - 42} y={160 - hPresent - 22} width="100" height="18" rx="5" fill="#0f172a" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              <text x={xStart + 8} y={160 - hPresent - 10} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {t('departments.presentCount').replace('{count}', String(stat.present))}
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
                              <rect x={xStart - 22} y={160 - hLate - 22} width="100" height="18" rx="5" fill="#0f172a" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              <text x={xStart + 28} y={160 - hLate - 10} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {t('departments.lateCount').replace('{count}', String(stat.late))}
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
                              <rect x={xStart - 2} y={160 - hAbsent - 22} width="100" height="18" rx="5" fill="#0f172a" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              <text x={xStart + 48} y={160 - hAbsent - 10} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {t('departments.absentCount').replace('{count}', String(stat.absent))}
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
                            <text x={xStart + 28} y="182" fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">{getMonthLabel(stat.month)}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400">{t('departments.noAttendanceData')}</div>
                )}

                {/* Legends Footer */}
                <div className="flex gap-4 justify-center border-t border-slate-100 pt-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <span className="text-slate-650">{t('status.present')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    <span className="text-slate-650">{t('status.late')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                    <span className="text-slate-650">{t('status.absent')}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Department Breakdown / Labor Cost Details */}
            <div className="lg:col-span-1">
              <Card title={t('departments.ratioTitle')} className="h-full">
                <p className="text-xs text-slate-400 -mt-2 mb-4">{t('departments.ratioDesc')}</p>
                {deptStats ? (
                  <div className="space-y-5">
                    {/* Status Progress Tracks */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('departments.ratioHeader')}</h4>
                      {[
                        { label: t('client.statusActive'), count: deptStats.activeCount, color: 'bg-emerald-500', total: employees.length },
                        { label: t('client.statusLeave'), count: deptStats.onLeaveCount, color: 'bg-amber-500', total: employees.length },
                        { label: t('client.statusInactive'), count: deptStats.inactiveCount, color: 'bg-slate-400', total: employees.length },
                      ].map((item, idx) => {
                        const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-700">
                              <span>{item.label} ({item.count}{t('common.personUnit')})</span>
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
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('departments.payrollEstimateHeader')}</h4>
                      <div className="p-4.5 bg-slate-50/50 border border-slate-200/50 rounded-2xl shadow-sm">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase">Department Payroll Base</p>
                        <p className="text-xl font-black text-slate-800 tracking-tight mt-0.5">{formatCurrency(deptStats.totalSalary)}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-2.5 border-t border-slate-200/60 pt-2">
                          {t('departments.averageEstimate')}<span className="font-extrabold text-slate-700">{formatCurrency(deptStats.avgSalary)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 py-6 text-center">{t('departments.noStatsData')}</p>
                )}
              </Card>
            </div>
          </div>

          {/* Members Table Card - Spacious, premium layout */}
          <Card
            title={t('departments.membersListTitle').replace('{dept}', selectedDept.name)}
            className=""
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
                {t('common.cancel')}
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
                  placeholder={t('departments.searchPrompt')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 premium-input rounded-xl text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 premium-input rounded-xl text-sm bg-white cursor-pointer"
              >
                <option value="ALL">{t('departments.allStatuses')}</option>
                <option value="ACTIVE">{t('client.statusActive')}</option>
                <option value="ON_LEAVE">{t('client.statusLeave')}</option>
                <option value="INACTIVE">{t('client.statusInactive')}</option>
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2.5 premium-input rounded-xl text-sm bg-white cursor-pointer"
              >
                <option value="name">{t('departments.sortName')}</option>
                <option value="salary">{t('departments.sortSalary')}</option>
                <option value="position">{t('departments.sortPosition')}</option>
              </select>
            </div>

            {loadingEmps ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed">
                {t('departments.noMembersFound')}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/65 rounded-2xl shadow-premium mb-5 bg-white">
                <table className="w-full table-fixed text-left border-collapse" style={{ minWidth: '700px' }}>
                  <colgroup>
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '180px' }} />
                    <col style={{ width: '150px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '130px' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3.5">{t('departments.colCode')}</th>
                      <th className="px-4 py-3.5">{t('departments.colName')}</th>
                      <th className="px-4 py-3.5">{t('departments.colPos')}</th>
                      <th className="px-4 py-3.5">{t('departments.colStatus')}</th>
                      <th className="px-4 py-3.5 text-right">{t('departments.colSalary')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredEmployees.map((emp) => {
                      const posName = typeof emp.position === 'object' ? emp.position?.name || '-' : emp.position || '-';
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-xs text-blue-600 font-bold">{emp.employeeCode}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800">{emp.lastName} {emp.firstName}</td>
                          <td className="px-4 py-3.5 text-slate-500 font-medium">{posName}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                              emp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-250/20' :
                              emp.status === 'ON_LEAVE' ? 'bg-amber-500/10 text-amber-700 border-amber-250/20' :
                              'bg-slate-55/50 text-slate-400 border-slate-200/60'
                            }`}>
                              {emp.status === 'ACTIVE' ? t('client.statusActive') : emp.status === 'ON_LEAVE' ? t('client.statusLeave') : t('client.statusInactive')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-black text-slate-700">{formatCurrency(emp.salary)}</td>
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
        title={t('form.dept')}
        apiPath="/api/departments"
      />

      <GenericImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchDepartments}
        apiPath="/api/departments/import"
        payloadKey="departments"
        templateJson={JSON.stringify([
          {
            name: "開発部",
            nameKana: "カイハツブ",
            description: "システム開発と技術研究を行う部門"
          },
          {
            name: "営業部",
            nameKana: "エイギョウブ",
            description: "新規顧客開拓および既存顧客対応"
          }
        ], null, 2)}
        title={t('common.importDepartments') || 'Import Departments'}
        description={t('common.importDepartmentsDesc') || 'Upload a JSON file containing a list of departments to import them all at once.'}
      />
    </div>
  );
}
