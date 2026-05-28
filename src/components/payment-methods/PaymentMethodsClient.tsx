'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Card from '@/components/common/Card';
import ExportButtons from '@/components/common/ExportButtons';
import { useI18n } from '@/lib/i18n';

interface Employee {
  id: string; firstName: string; lastName: string; firstNameKana: string;
  department: string; position: string; salary: number; salaryType: string;
}

interface PaymentMethod {
  employeeId: string;
  method: 'bank' | 'cash';
  bankName: string;
  branchName: string;
  accountType: '普通' | '当座';
  accountNumber: string;
  accountHolder: string;
  memo: string;
}

interface PaymentRecord {
  id: string;
  employeeId: string;
  month: string;
  amount: number;
  method: 'bank' | 'cash';
  status: 'pending' | 'completed';
  paidDate: string;
  memo: string;
}

const PAGE_SIZE = 10;

function FilterDropdown({ options, selected, onSelect, onClose }: {
  options: { value: string; label: string }[]; selected: string[];
  onSelect: (values: string[]) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-[150px]">
      {options.map(opt => (
        <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
          <input type="checkbox" checked={selected.includes(opt.value)}
            onChange={e => onSelect(e.target.checked ? [...selected, opt.value] : selected.filter(v => v !== opt.value))}
            className="rounded border-slate-300 text-blue-600" />
          <span className="text-sm text-slate-700">{opt.label}</span>
        </label>
      ))}
      {selected.length > 0 && (
        <button onClick={() => onSelect([])} className="w-full mt-1 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded border-t border-slate-100">{t('payroll.filterClear')}</button>
      )}
    </div>
  );
}

function FilterTh({ label, filterKey, options, activeFilter, columnFilters, onFilterChange, onActiveFilterChange }: {
  label: string; filterKey: string; options: { value: string; label: string }[];
  activeFilter: string | null; columnFilters: Record<string, string[]>;
  onFilterChange: (k: string, v: string[]) => void; onActiveFilterChange: (k: string | null) => void;
}) {
  const has = (columnFilters[filterKey]?.length ?? 0) > 0;
  const active = activeFilter === filterKey;
  return (
    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer select-none relative"
      onDoubleClick={() => onActiveFilterChange(active ? null : filterKey)} title="Double click to filter">
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {has && <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>}
      </div>
      {active && <FilterDropdown options={options} selected={columnFilters[filterKey] || []} onSelect={v => onFilterChange(filterKey, v)} onClose={() => onActiveFilterChange(null)} />}
    </th>
  );
}

// Edit Modal
function EditPaymentModal({ emp, current, onSave, onClose }: {
  emp: Employee; current: PaymentMethod;
  onSave: (m: PaymentMethod) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState({ ...current });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">{t('paymentMethods.paymentSettings')}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
          </div>
          <p className="text-sm text-slate-600 mb-4">{emp.lastName} {emp.firstName} ({emp.department})</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">{t('paymentMethods.colMethod')}</label>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setDraft(p => ({ ...p, method: 'bank' }))}
                  className={`flex-1 p-3 rounded-lg border-2 text-center transition-colors ${draft.method === 'bank' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                  <span className="text-2xl block mb-1">🏦</span>
                  <span className="text-sm font-medium">{t('paymentMethods.methodBank')}</span>
                </button>
                <button onClick={() => setDraft(p => ({ ...p, method: 'cash' }))}
                  className={`flex-1 p-3 rounded-lg border-2 text-center transition-colors ${draft.method === 'cash' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-green-300'}`}>
                  <span className="text-2xl block mb-1">💵</span>
                  <span className="text-sm font-medium">{t('paymentMethods.methodCash')}</span>
                </button>
              </div>
            </div>

            {draft.method === 'bank' && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-blue-800">{t('paymentMethods.bankInfoTitle')}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">{t('paymentMethods.bankName')}</label>
                    <input type="text" value={draft.bankName} onChange={e => setDraft(p => ({ ...p, bankName: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="🏦" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">{t('paymentMethods.branchName')}</label>
                    <input type="text" value={draft.branchName} onChange={e => setDraft(p => ({ ...p, branchName: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="🏛️" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">{t('paymentMethods.accountType')}</label>
                    <select value={draft.accountType} onChange={e => setDraft(p => ({ ...p, accountType: e.target.value as '普通' | '当座' }))}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
                      <option value="普通">{t('paymentMethods.ordinaryAccount')}</option>
                      <option value="当座">{t('paymentMethods.checkingAccount')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">{t('paymentMethods.accountNumber')}</label>
                    <input type="text" value={draft.accountNumber} onChange={e => setDraft(p => ({ ...p, accountNumber: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="1234567" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">{t('paymentMethods.accountHolder')}</label>
                  <input type="text" value={draft.accountHolder} onChange={e => setDraft(p => ({ ...p, accountHolder: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="YAMADA TARO" />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500">{t('paymentMethods.memo')}</label>
              <textarea value={draft.memo} onChange={e => setDraft(p => ({ ...p, memo: e.target.value }))} rows={2}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" placeholder={t('paymentMethods.memoPlaceholder')} />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 text-sm">{t('paymentMethods.cancelBtn')}</button>
            <button onClick={() => onSave(draft)} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">{t('paymentMethods.saveBtn')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function PaymentMethodsClient({ employees }: { employees: Employee[] }) {
  const { t, locale } = useI18n();
  const [methods, setMethods] = useState<PaymentMethod[]>(() =>
    employees.map(e => ({
      employeeId: e.id,
      method: 'bank' as const,
      bankName: '三菱UFJ銀行', branchName: '東京支店',
      accountType: '普通' as const, accountNumber: String(1000000 + Number(e.id) * 111111),
      accountHolder: `${e.lastName} ${e.firstName}`,
      memo: '',
    }))
  );

  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [saved, setSaved] = useState(false);

  const methodLabel = (m: string) => m === 'bank' ? t('paymentMethods.methodBank') : t('paymentMethods.methodCash');
  const methodColor = (m: string) => m === 'bank' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';

  const handleFilter = (k: string, v: string[]) => {
    setColumnFilters(p => ({ ...p, [k]: v }));
    setCurrentPage(1);
  };

  const handleSaveMethod = (m: PaymentMethod) => {
    setMethods(prev => prev.map(x => x.employeeId === m.employeeId ? m : x));
    setEditingEmp(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePayAll = () => {
    const monthRecords: PaymentRecord[] = methods.map(m => {
      const emp = employees.find(e => e.id === m.employeeId);
      return {
        id: `pay-${m.employeeId}-${selectedMonth}`,
        employeeId: m.employeeId,
        month: selectedMonth,
        amount: emp?.salary || 0,
        method: m.method,
        status: 'completed' as const,
        paidDate: new Date().toISOString().split('T')[0],
        memo: m.method === 'bank' ? '振込済み' : '手渡し済み',
      };
    });
    setRecords(prev => {
      const filtered = prev.filter(r => r.month !== selectedMonth);
      return [...monthRecords, ...filtered];
    });
  };

  const merged = useMemo(() => {
    return methods.map(m => {
      const emp = employees.find(e => e.id === m.employeeId);
      const record = records.find(r => r.employeeId === m.employeeId && r.month === selectedMonth);
      return { ...m, employee: emp!, record };
    });
  }, [methods, employees, records, selectedMonth]);

  const filtered = useMemo(() => {
    return merged.filter(item => {
      const name = `${item.employee.lastName} ${item.employee.firstName}`;
      const matchSearch = search === '' || name.toLowerCase().includes(search.toLowerCase()) || item.bankName.toLowerCase().includes(search.toLowerCase());
      const cf = columnFilters;
      const matchName = !cf.name?.length || cf.name.includes(name);
      const matchDept = !cf.department?.length || cf.department.includes(item.employee.department);
      const matchMethod = !cf.method?.length || cf.method.includes(item.method);
      return matchSearch && matchName && matchDept && matchMethod;
    });
  }, [merged, search, columnFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const bankCount = methods.filter(m => m.method === 'bank').length;
    const cashCount = methods.filter(m => m.method === 'cash').length;
    const paidCount = records.filter(r => r.month === selectedMonth && r.status === 'completed').length;
    const totalAmount = records.filter(r => r.month === selectedMonth && r.status === 'completed').reduce((s, r) => s + r.amount, 0);
    return { bankCount, cashCount, paidCount, totalAmount, total: methods.length };
  }, [methods, records, selectedMonth]);

  const nameOptions = useMemo(() => employees.map(e => ({ value: `${e.lastName} ${e.firstName}`, label: `${e.lastName} ${e.firstName}` })), [employees]);
  const deptOptions = useMemo(() => [...new Set(employees.map(e => e.department))].map(d => ({ value: d, label: d })), [employees]);
  const methodOptions = [{ value: 'bank', label: t('paymentMethods.methodBank') }, { value: 'cash', label: t('paymentMethods.methodCash') }];
  const activeFilterCount = Object.values(columnFilters).filter(v => v.length > 0).length;

  return (
    <>
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-green-600 text-lg">&#10003;</span>
          <span className="text-sm font-medium text-green-800">{t('paymentMethods.saveSuccess')}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: t('paymentMethods.bankCount'), value: t('payroll.daysLeft').replace('{days}', String(stats.bankCount)).replace('days remaining', 'people').replace('あと', '').replace('日', '人'), color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('paymentMethods.cashCount'), value: t('payroll.daysLeft').replace('{days}', String(stats.cashCount)).replace('days remaining', 'people').replace('あと', '').replace('日', '人'), color: 'text-green-600', bg: 'bg-green-50' },
          { label: t('paymentMethods.statusPaid'), value: `${stats.paidCount}/${stats.total}`, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: t('paymentMethods.totalAmount'), value: `¥${stats.totalAmount.toLocaleString()}`, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: t('paymentMethods.targetMonth'), value: selectedMonth.replace('-', '/'), color: 'text-slate-600', bg: 'bg-slate-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Month & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mt-6">
        <div className="flex gap-3 items-center">
          <label className="text-sm font-medium text-slate-600">{t('paymentMethods.targetMonth')}:</label>
          <input type="month" value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <button onClick={handlePayAll}
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          {t('paymentMethods.batchPayBtn')}
        </button>
      </div>

      {/* Employee Table */}
      <div className="mt-6">
        <Card title={t('paymentMethods.title')}>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder={t('paymentMethods.searchPlaceholder')} value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            {activeFilterCount > 0 && (
              <button onClick={() => { setColumnFilters({}); setCurrentPage(1); }}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200">{t('payroll.filterClear')} ({activeFilterCount})</button>
            )}
            <ExportButtons
              data={filtered.map(item => ({
                name: `${item.employee.lastName} ${item.employee.firstName}`,
                department: item.employee.department,
                method: methodLabel(item.method),
                bank: item.method === 'bank' ? `${item.bankName} ${item.branchName}` : '-',
                account: item.method === 'bank' ? item.accountNumber : '-',
                holder: item.method === 'bank' ? item.accountHolder : '-',
                status: item.record ? t('paymentMethods.statusPaid') : t('paymentMethods.statusUnpaid'),
              }))}
              columns={[
                { header: t('paymentMethods.colName'), key: 'name' }, { header: t('paymentMethods.colDept'), key: 'department' },
                { header: t('paymentMethods.colMethod'), key: 'method' }, { header: t('paymentMethods.bankName'), key: 'bank' },
                { header: t('paymentMethods.accountNumber'), key: 'account' }, { header: t('paymentMethods.accountHolder'), key: 'holder' },
                { header: t('paymentMethods.colStatus'), key: 'status' },
              ]}
              fileName={t('paymentMethods.title')}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <FilterTh label={t('paymentMethods.colName')} filterKey="name" options={nameOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleFilter} onActiveFilterChange={setActiveFilter} />
                  <FilterTh label={t('paymentMethods.colDept')} filterKey="department" options={deptOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleFilter} onActiveFilterChange={setActiveFilter} />
                  <FilterTh label={t('paymentMethods.colMethod')} filterKey="method" options={methodOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleFilter} onActiveFilterChange={setActiveFilter} />
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('paymentMethods.colBankInfo')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('paymentMethods.colSalary')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('paymentMethods.colStatus')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('paymentMethods.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">{t('paymentMethods.noData')}</td></tr>
                ) : paginated.map(item => (
                  <tr key={item.employeeId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs">{item.employee.firstNameKana?.charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{item.employee.lastName} {item.employee.firstName}</p>
                          <p className="text-xs text-slate-400">{item.employee.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{item.employee.department}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded ${methodColor(item.method)}`}>{methodLabel(item.method)}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {item.method === 'bank' ? (
                        <div>
                          <p>{item.bankName} {item.branchName}</p>
                          <p>{item.accountType === '普通' ? t('paymentMethods.ordinaryAccount') : t('paymentMethods.checkingAccount')} {item.accountNumber}</p>
                          <p className="text-slate-400">{item.accountHolder}</p>
                        </div>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">¥{item.employee.salary.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      {item.record ? (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">{t('paymentMethods.statusPaid')}</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded">{t('paymentMethods.statusUnpaid')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setEditingEmp(item.employee)}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">{t('paymentMethods.editBtn')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                {locale === 'ja' ? (
                  `${filtered.length} 件中 ${(currentPage - 1) * PAGE_SIZE + 1}〜${Math.min(currentPage * PAGE_SIZE, filtered.length)} 件を表示`
                ) : locale === 'vi' ? (
                  `Hiển thị ${(currentPage - 1) * PAGE_SIZE + 1}〜${Math.min(currentPage * PAGE_SIZE, filtered.length)} trên tổng số ${filtered.length} mục`
                ) : (
                  `Showing ${(currentPage - 1) * PAGE_SIZE + 1} to ${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length} items`
                )}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40">
                  {locale === 'ja' ? '前へ' : locale === 'vi' ? 'Trước' : 'Prev'}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1.5 text-sm rounded-lg ${p === currentPage ? 'bg-blue-600 text-white' : 'border border-slate-300 hover:bg-slate-50'}`}>{p}</button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40">
                  {locale === 'ja' ? '次へ' : locale === 'vi' ? 'Tiếp' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Summary by method */}
      <div className="mt-6">
        <Card title={t('paymentMethods.summaryTitle')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🏦</span>
                <h4 className="text-sm font-semibold text-blue-800">{t('paymentMethods.methodBank')}</h4>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <p>{locale === 'ja' ? '人数' : locale === 'vi' ? 'Số người' : 'Employees'}: <span className="font-medium text-slate-800">{stats.bankCount} {locale === 'ja' ? '名' : locale === 'vi' ? 'người' : 'people'}</span></p>
                <p>{locale === 'ja' ? '合計金額' : locale === 'vi' ? 'Tổng tiền' : 'Total Amount'}: <span className="font-medium text-slate-800">¥{methods.filter(m => m.method === 'bank').reduce((s, m) => s + (employees.find(e => e.id === m.employeeId)?.salary || 0), 0).toLocaleString()}</span></p>
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">💵</span>
                <h4 className="text-sm font-semibold text-green-800">{t('paymentMethods.methodCash')}</h4>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <p>{locale === 'ja' ? '人数' : locale === 'vi' ? 'Số người' : 'Employees'}: <span className="font-medium text-slate-800">{stats.cashCount} {locale === 'ja' ? '名' : locale === 'vi' ? 'người' : 'people'}</span></p>
                <p>{locale === 'ja' ? '合計金額' : locale === 'vi' ? 'Tổng tiền' : 'Total Amount'}: <span className="font-medium text-slate-800">¥{methods.filter(m => m.method === 'cash').reduce((s, m) => s + (employees.find(e => e.id === m.employeeId)?.salary || 0), 0).toLocaleString()}</span></p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit Modal */}
      {editingEmp && (
        <EditPaymentModal
          emp={editingEmp}
          current={methods.find(m => m.employeeId === editingEmp.id)!}
          onSave={handleSaveMethod}
          onClose={() => setEditingEmp(null)}
        />
      )}
    </>
  );
}
