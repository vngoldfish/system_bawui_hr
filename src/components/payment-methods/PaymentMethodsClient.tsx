'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Card from '@/components/common/Card';
import ExportButtons from '@/components/common/ExportButtons';

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

const methodLabel = (m: string) => m === 'bank' ? '銀行振込' : '現金支給';
const methodColor = (m: string) => m === 'bank' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';

function FilterDropdown({ options, selected, onSelect, onClose }: {
  options: { value: string; label: string }[]; selected: string[];
  onSelect: (values: string[]) => void; onClose: () => void;
}) {
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
        <button onClick={() => onSelect([])} className="w-full mt-1 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded border-t border-slate-100">クリア</button>
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
      onDoubleClick={() => onActiveFilterChange(active ? null : filterKey)} title="ダブルクリックでフィルター">
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {has && <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>}
      </div>
      {active && <FilterDropdown options={options} selected={columnFilters[filterKey] || []} onSelect={v => onFilterChange(filterKey, v)} onClose={() => onActiveFilterChange(null)} />}
    </th>
  );
}

function EditPaymentModal({ emp, current, onSave, onClose }: {
  emp: Employee; current: PaymentMethod;
  onSave: (m: PaymentMethod) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState({ ...current });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">支給方法設定</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
          </div>
          <p className="text-sm text-slate-600 mb-4">{emp.lastName} {emp.firstName} ({emp.department})</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">支給方法</label>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setDraft(p => ({ ...p, method: 'bank' }))}
                  className={`flex-1 p-3 rounded-lg border-2 text-center transition-colors ${draft.method === 'bank' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                  <span className="text-2xl block mb-1">🏦</span>
                  <span className="text-sm font-medium">銀行振込</span>
                </button>
                <button onClick={() => setDraft(p => ({ ...p, method: 'cash' }))}
                  className={`flex-1 p-3 rounded-lg border-2 text-center transition-colors ${draft.method === 'cash' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-green-300'}`}>
                  <span className="text-2xl block mb-1">💵</span>
                  <span className="text-sm font-medium">現金支給</span>
                </button>
              </div>
            </div>

            {draft.method === 'bank' && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-blue-800">銀行情報</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">銀行名</label>
                    <input type="text" value={draft.bankName} onChange={e => setDraft(p => ({ ...p, bankName: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="三菱UFJ銀行" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">支店名</label>
                    <input type="text" value={draft.branchName} onChange={e => setDraft(p => ({ ...p, branchName: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="東京支店" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">口座種別</label>
                    <select value={draft.accountType} onChange={e => setDraft(p => ({ ...p, accountType: e.target.value as '普通' | '当座' }))}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
                      <option value="普通">普通</option>
                      <option value="当座">当座</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">口座番号</label>
                    <input type="text" value={draft.accountNumber} onChange={e => setDraft(p => ({ ...p, accountNumber: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="1234567" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">口座名義（カナ）</label>
                  <input type="text" value={draft.accountHolder} onChange={e => setDraft(p => ({ ...p, accountHolder: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="ヤマダ タロウ" />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500">メモ</label>
              <textarea value={draft.memo} onChange={e => setDraft(p => ({ ...p, memo: e.target.value }))} rows={2}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" placeholder="特記事項があれば..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 text-sm">キャンセル</button>
            <button onClick={() => onSave(draft)} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentMethodsClient({ employees }: { employees: Employee[] }) {
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
      const matchSearch = search === '' || name.includes(search) || item.bankName.includes(search);
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
  const methodOptions = [{ value: 'bank', label: '銀行振込' }, { value: 'cash', label: '現金支給' }];
  const activeFilterCount = Object.values(columnFilters).filter(v => v.length > 0).length;

  return (
    <>
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-green-600 text-lg">&#10003;</span>
          <span className="text-sm font-medium text-green-800">支給方法を保存しました</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: '銀行振込', value: `${stats.bankCount}名`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '現金支給', value: `${stats.cashCount}名`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '支給済み', value: `${stats.paidCount}/${stats.total}`, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: '支給総額', value: `¥${stats.totalAmount.toLocaleString()}`, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: '対象月', value: selectedMonth.replace('-', '/'), color: 'text-slate-600', bg: 'bg-slate-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Month & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-center">
          <label className="text-sm font-medium text-slate-600">対象月:</label>
          <input type="month" value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <button onClick={handlePayAll}
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          一括支給処理
        </button>
      </div>

      {/* Employee Table */}
      <Card title="支給方法一覧">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="名前・銀行名で検索..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => { setColumnFilters({}); setCurrentPage(1); }}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200">フィルタークリア ({activeFilterCount})</button>
          )}
          <ExportButtons
            data={filtered.map(item => ({
              name: `${item.employee.lastName} ${item.employee.firstName}`,
              department: item.employee.department,
              method: methodLabel(item.method),
              bank: item.method === 'bank' ? `${item.bankName} ${item.branchName}` : '-',
              account: item.method === 'bank' ? item.accountNumber : '-',
              holder: item.method === 'bank' ? item.accountHolder : '-',
              status: item.record ? '支給済み' : '未支給',
            }))}
            columns={[
              { header: '氏名', key: 'name' }, { header: '部署', key: 'department' },
              { header: '支給方法', key: 'method' }, { header: '銀行', key: 'bank' },
              { header: '口座番号', key: 'account' }, { header: '口座名義', key: 'holder' },
              { header: '状態', key: 'status' },
            ]}
            fileName="支給方法一覧"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <FilterTh label="氏名" filterKey="name" options={nameOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleFilter} onActiveFilterChange={setActiveFilter} />
                <FilterTh label="部署" filterKey="department" options={deptOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleFilter} onActiveFilterChange={setActiveFilter} />
                <FilterTh label="支給方法" filterKey="method" options={methodOptions} activeFilter={activeFilter} columnFilters={columnFilters} onFilterChange={handleFilter} onActiveFilterChange={setActiveFilter} />
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">銀行情報</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">給与</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">支給状態</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">該当するデータが見つかりません</td></tr>
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
                        <p>{item.accountType} {item.accountNumber}</p>
                        <p className="text-slate-400">{item.accountHolder}</p>
                      </div>
                    ) : <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">¥{item.employee.salary.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    {item.record ? (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">支給済み</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded">未支給</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setEditingEmp(item.employee)}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">設定</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">{filtered.length} 件中 {(currentPage - 1) * PAGE_SIZE + 1}〜{Math.min(currentPage * PAGE_SIZE, filtered.length)} 件を表示</p>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40">前へ</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${p === currentPage ? 'bg-blue-600 text-white' : 'border border-slate-300 hover:bg-slate-50'}`}>{p}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40">次へ</button>
            </div>
          </div>
        )}
      </Card>

      {/* Summary by method */}
      <Card title="支給方法別 サマリー">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🏦</span>
              <h4 className="text-sm font-semibold text-blue-800">銀行振込</h4>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-slate-600">人数: <span className="font-medium">{stats.bankCount}名</span></p>
              <p className="text-slate-600">合計金額: <span className="font-medium">¥{methods.filter(m => m.method === 'bank').reduce((s, m) => s + (employees.find(e => e.id === m.employeeId)?.salary || 0), 0).toLocaleString()}</span></p>
            </div>
          </div>
          <div className="bg-green-50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">💵</span>
              <h4 className="text-sm font-semibold text-green-800">現金支給</h4>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-slate-600">人数: <span className="font-medium">{stats.cashCount}名</span></p>
              <p className="text-slate-600">合計金額: <span className="font-medium">¥{methods.filter(m => m.method === 'cash').reduce((s, m) => s + (employees.find(e => e.id === m.employeeId)?.salary || 0), 0).toLocaleString()}</span></p>
            </div>
          </div>
        </div>
      </Card>

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
