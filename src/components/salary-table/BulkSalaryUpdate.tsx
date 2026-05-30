'use client';

import { useState, useEffect, useMemo } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';
import { formatCurrency } from '@/lib/utils';

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  firstNameKana: string;
  lastNameKana: string;
  salaryType: string;
  salary: number;
  hourlyRate: number;
  dailyRate: number;
  departmentId: string;
  positionId: string;
  contractTypeId: string;
  status: string;
  department: { name: string };
  position: { name: string };
  contractType: { name: string };
}

interface Department {
  id: string;
  name: string;
}

interface Position {
  id: string;
  name: string;
}

interface ContractType {
  id: string;
  name: string;
}

export default function BulkSalaryUpdate() {
  const { t, locale } = useI18n();

  // Data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [selectedContract, setSelectedContract] = useState('');
  const [selectedSalaryType, setSelectedSalaryType] = useState('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Adjustment state
  const [adjustmentType, setAdjustmentType] = useState<'fixed' | 'percentage' | 'set'>('fixed');
  const [adjustmentValue, setAdjustmentValue] = useState('');

  // Draft wages (stores draft values for modified employees)
  const [draftWages, setDraftWages] = useState<Record<string, number>>({});

  // Success/error banner states
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Helper functions
  const getCurrentWage = (emp: Employee) => {
    if (emp.salaryType === '時給') return emp.hourlyRate;
    if (emp.salaryType === '日給') return emp.dailyRate;
    return emp.salary; // default to monthly
  };

  const getSalaryTypeBadgeColor = (type: string) => {
    if (type === '時給') return 'bg-amber-50 text-amber-700 border-amber-200/50';
    if (type === '日給') return 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
    return 'bg-blue-50 text-blue-700 border-blue-200/50';
  };

  // Fetch meta & employees
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch filters list
      const [deptRes, posRes, contractRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/positions'),
        fetch('/api/contract-types'),
      ]);

      const depts = await deptRes.json();
      const poses = await posRes.json();
      const contracts = await contractRes.json();

      setDepartments(Array.isArray(depts) ? depts : depts.data || []);
      setPositions(Array.isArray(poses) ? poses : poses.data || []);
      setContractTypes(Array.isArray(contracts) ? contracts : contracts.data || []);

      // 2. Fetch employees (paginated query loop to get all)
      let allEmployees: Employee[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const empRes = await fetch(`/api/employees?limit=100&page=${page}`);
        const empData = await empRes.json();
        const emps = empData.data || [];
        allEmployees = [...allEmployees, ...emps];

        const totalPages = empData.meta?.totalPages || 1;
        if (page >= totalPages || emps.length === 0) {
          hasMore = false;
        } else {
          page++;
        }
      }

      // Filter only Active & On Leave employees for salary changes
      const activeOrLeaveEmps = allEmployees.filter(e => e.status === 'ACTIVE' || e.status === 'ON_LEAVE');
      setEmployees(activeOrLeaveEmps);

      // Initialize draft wages
      const drafts: Record<string, number> = {};
      activeOrLeaveEmps.forEach(emp => {
        drafts[emp.id] = getCurrentWage(emp);
      });
      setDraftWages(drafts);
    } catch (err) {
      console.error('Failed to load data for bulk salary update:', err);
      setMessage({ text: 'データの取得に失敗しました。', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const name = `${emp.lastName} ${emp.firstName}`.toLowerCase();
      const nameKana = `${emp.lastNameKana} ${emp.firstNameKana}`.toLowerCase();
      const code = emp.employeeCode.toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = searchTerm
        ? name.includes(term) || nameKana.includes(term) || code.includes(term)
        : true;

      const matchesDept = selectedDept ? emp.departmentId === selectedDept : true;
      const matchesPos = selectedPos ? emp.positionId === selectedPos : true;
      const matchesContract = selectedContract ? emp.contractTypeId === selectedContract : true;
      const matchesSalaryType = selectedSalaryType ? emp.salaryType === selectedSalaryType : true;

      return matchesSearch && matchesDept && matchesPos && matchesContract && matchesSalaryType;
    });
  }, [employees, searchTerm, selectedDept, selectedPos, selectedContract, selectedSalaryType]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDept, selectedPos, selectedContract, selectedSalaryType]);

  // Paginated employees
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredEmployees, currentPage]);

  const totalPages = Math.ceil(filteredEmployees.length / PAGE_SIZE) || 1;

  // Select all handlers
  const isAllFilteredSelected = useMemo(() => {
    if (filteredEmployees.length === 0) return false;
    return filteredEmployees.every(emp => selectedIds.has(emp.id));
  }, [filteredEmployees, selectedIds]);

  const handleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllFilteredSelected) {
      // Remove all filtered employees
      filteredEmployees.forEach(emp => next.delete(emp.id));
    } else {
      // Add all filtered employees
      filteredEmployees.forEach(emp => next.add(emp.id));
    }
    setSelectedIds(next);
  };

  const handleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Bulk Apply changes to selected rows
  const handleBulkApply = () => {
    const val = parseFloat(adjustmentValue);
    if (isNaN(val) || selectedIds.size === 0) return;

    setDraftWages(prev => {
      const next = { ...prev };
      employees.forEach(emp => {
        if (selectedIds.has(emp.id)) {
          const current = getCurrentWage(emp);
          let updated = current;
          if (adjustmentType === 'fixed') {
            updated = Math.max(0, current + val);
          } else if (adjustmentType === 'percentage') {
            updated = Math.max(0, Math.round(current * (1 + val / 100)));
          } else if (adjustmentType === 'set') {
            updated = Math.max(0, val);
          }
          next[emp.id] = updated;
        }
      });
      return next;
    });

    setMessage({
      text: `${selectedIds.size}名に一括改定を適用しました（保存するまでデータベースには反映されません）。`,
      type: 'success',
    });
    setTimeout(() => setMessage(null), 5000);
  };

  // Check if any wages have changed
  const changedEmployees = useMemo(() => {
    return employees.filter(emp => {
      const draft = draftWages[emp.id];
      const current = getCurrentWage(emp);
      return draft !== undefined && draft !== current;
    });
  }, [employees, draftWages]);

  // Form submission
  const handleSave = async () => {
    setSubmitting(true);
    setShowConfirmModal(false);
    setMessage(null);

    const payload = changedEmployees.map(emp => {
      const draft = draftWages[emp.id];
      const updateObj: any = {
        id: emp.id,
        salary: emp.salary, // default original monthly
      };

      if (emp.salaryType === '時給') {
        updateObj.hourlyRate = draft;
      } else if (emp.salaryType === '日給') {
        updateObj.dailyRate = draft;
      } else {
        updateObj.salary = draft; // for Monthly
      }

      return updateObj;
    });

    try {
      const res = await fetch('/api/employees/bulk-salary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Update failed');
      }

      setMessage({
        text: data.message || `${changedEmployees.length}名の給与を一括改定しました。`,
        type: 'success',
      });
      setSelectedIds(new Set());
      await loadData();
    } catch (err: any) {
      console.error('Submit error:', err);
      setMessage({
        text: err.message || '更新に失敗しました。入力内容を確認してください。',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
              : 'bg-rose-50 border-rose-250 text-rose-800'
          }`}
        >
          <span className="text-lg">{message.type === 'success' ? '✓' : '⚠️'}</span>
          <span className="text-sm font-semibold">{message.text}</span>
        </div>
      )}

      {/* 1. Filter Section */}
      <Card title={t('payroll.filterClear') + ' / ' + t('common.searchBtn') || '検索・フィルター'}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder={t('payroll.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('payroll.colDept') || 'すべての部署'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedPos}
              onChange={e => setSelectedPos(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('payroll.deptPos')?.split('/')[1]?.trim() || 'すべての役職'}</option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedContract}
              onChange={e => setSelectedContract(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('payroll.contractSalaryType')?.split('/')[0]?.trim() || 'すべての契約形態'}</option>
              {contractTypes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedSalaryType}
              onChange={e => setSelectedSalaryType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('payroll.contractSalaryType')?.split('/')[1]?.trim() || '給与体系'}</option>
              <option value="月給">{t('payroll.typeMonthly')}</option>
              <option value="日給">{t('payroll.typeDaily')}</option>
              <option value="時給">{t('payroll.typeHourly')}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 2. Bulk Adjustment Tool */}
      <Card title={t('salaryTable.applyToSelected') || '選択した行に一括適用'}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              {t('salaryTable.adjustmentMethod') || '改定方法'}
            </label>
            <div className="grid grid-cols-3 border border-slate-200 rounded-xl overflow-hidden text-sm">
              {[
                { type: 'fixed', label: t('salaryTable.amountFixed') || '固定額 JPY' },
                { type: 'percentage', label: t('salaryTable.percentage') || '比率 %' },
                { type: 'set', label: t('salaryTable.setBaseTo') || '値を設定' },
              ].map(opt => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setAdjustmentType(opt.type as any)}
                  className={`py-2 text-center transition-all ${
                    adjustmentType === opt.type
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {opt.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full sm:w-48">
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              {t('salaryTable.adjustmentValue') || '改定値'}
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder={adjustmentType === 'percentage' ? '+5' : '10000'}
                value={adjustmentValue}
                onChange={e => setAdjustmentValue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                {adjustmentType === 'percentage' ? '%' : 'JPY'}
              </span>
            </div>
          </div>

          <div className="flex items-end pt-5">
            <button
              type="button"
              onClick={handleBulkApply}
              disabled={selectedIds.size === 0 || !adjustmentValue}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-40 shadow-sm cursor-pointer"
            >
              {t('salaryTable.applyBtn') || '一括適用'} ({selectedIds.size})
            </button>
          </div>
        </div>
      </Card>

      {/* 3. Main Data Grid */}
      <Card
        title={`${t('payroll.totalEmployees')}: ${filteredEmployees.length} 名`}
        action={
          <span className="text-xs font-bold text-slate-500">
            {t('salaryTable.selectedCount').replace('{count}', String(selectedIds.size))}
          </span>
        }
      >
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-16 text-slate-450 bg-slate-50/50 border border-dashed rounded-2xl">
            {t('payroll.noData')}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-200/50 rounded-2xl bg-white shadow-premium">
              <table className="w-full text-left border-collapse" style={{ minWidth: '850px' }}>
                <thead>
                  <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-4 w-24">{t('payroll.employeeCode') || 'コード'}</th>
                    <th className="p-4 w-40">{t('payroll.colName') || '氏名'}</th>
                    <th className="p-4 w-48">{t('payroll.colDept') || '部署'} / {t('payroll.deptPos')?.split('/')[1]?.trim() || '役職'}</th>
                    <th className="p-4 w-32 text-center">{t('payroll.contractSalaryType')?.split('/')[1]?.trim() || '体系'}</th>
                    <th className="p-4 text-right w-36">{t('salaryTable.currentSalary') || '現行単価'}</th>
                    <th className="p-4 text-right w-44">{t('salaryTable.newSalary') || '改定単価'}</th>
                    <th className="p-4 text-right w-44">{t('salaryTable.historyField') || '差額'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedEmployees.map(emp => {
                    const current = getCurrentWage(emp);
                    const draft = draftWages[emp.id] ?? current;
                    const diff = draft - current;
                    const isSelected = selectedIds.has(emp.id);

                    // Calc diff percentage
                    const pct = current > 0 ? (diff / current) * 100 : 0;

                    return (
                      <tr
                        key={emp.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-indigo-50/20' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(emp.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-4 font-mono text-xs text-blue-600 font-bold">
                          {emp.employeeCode}
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-800">
                            {emp.lastName} {emp.firstName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {emp.lastNameKana} {emp.firstNameKana}
                          </p>
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-600">
                          <p>{emp.department?.name || '-'}</p>
                          <p className="text-slate-400">{emp.position?.name || '-'}</p>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getSalaryTypeBadgeColor(
                              emp.salaryType
                            )}`}
                          >
                            {emp.salaryType}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-slate-600">
                          {formatCurrency(current)}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              value={draftWages[emp.id] ?? ''}
                              onChange={e => {
                                const v = Math.max(0, parseFloat(e.target.value) || 0);
                                handleSelectRow(emp.id); // auto-check when overridden
                                setDraftWages(prev => ({ ...prev, [emp.id]: v }));
                              }}
                              className="w-32 px-2 py-1 text-right border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            />
                            <span className="text-slate-400 text-xs font-medium">円</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {diff === 0 ? (
                            <span className="text-slate-400 text-xs font-bold">-</span>
                          ) : diff > 0 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-250/20">
                              +{diff.toLocaleString()}円 (+{pct.toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-250/20">
                              {diff.toLocaleString()}円 ({pct.toFixed(1)}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-1.5 pt-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  &larr;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      currentPage === page
                        ? 'bg-blue-600 border-blue-600 text-white font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 4. Action Summary Footer */}
      {changedEmployees.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-xl w-[90%] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center justify-between border border-slate-800 z-40 animate-fadeIn">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">
              {changedEmployees.length} 名の給与が変更中
            </p>
            <p className="text-sm font-black mt-0.5">
              変動総額:{' '}
              {changedEmployees
                .reduce((acc, emp) => {
                  const current = getCurrentWage(emp);
                  const draft = draftWages[emp.id] ?? current;
                  return acc + (draft - current);
                }, 0)
                .toLocaleString()}{' '}
              円
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const reset: Record<string, number> = {};
                employees.forEach(emp => {
                  reset[emp.id] = getCurrentWage(emp);
                });
                setDraftWages(reset);
              }}
              className="px-4 py-2 border border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              リセット
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md hover:shadow-lg"
            >
              {t('salaryTable.saveBulkBtn') || '変更を保存'}
            </button>
          </div>
        </div>
      )}

      {/* 5. Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-950 flex items-center gap-2 mb-3">
                <span>🔔</span>
                <span>{t('salaryTable.confirmBulkTitle') || '給与改定の確認'}</span>
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed font-semibold">
                {t('salaryTable.confirmBulkMessage').replace('{count}', String(changedEmployees.length))}
              </p>

              <div className="mt-4 p-4.5 bg-slate-50 border border-slate-200/50 rounded-2xl max-h-48 overflow-y-auto space-y-2.5">
                {changedEmployees.map(emp => {
                  const current = getCurrentWage(emp);
                  const draft = draftWages[emp.id];
                  const diff = draft - current;
                  return (
                    <div key={emp.id} className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-755 truncate max-w-[150px]">
                        {emp.lastName} {emp.firstName}
                      </span>
                      <span className="font-mono text-slate-500 font-medium">
                        {current.toLocaleString()} &rarr;{' '}
                        <span className="font-bold text-slate-800">{draft.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-bold ml-1">({emp.salaryType})</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {t('salaryTable.cancelBtn') || 'キャンセル'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-40 flex items-center gap-1.5"
                >
                  {submitting && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  )}
                  {t('salaryTable.saveBtn') || '保存する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
