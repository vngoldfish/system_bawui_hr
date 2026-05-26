'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';

interface Employee {
  id: string; firstName: string; lastName: string; firstNameKana: string;
  department: string; position: string; salary: number; salaryType: string;
  age?: number;
}

interface Benefit {
  id: string;
  employeeId: string;
  healthInsurance: boolean;
  pension: boolean;
  employmentInsurance: boolean;
  workersComp: boolean;
  familyAllowance: number;
  housingAllowance: number;
  commutingAllowance: number;
  mealAllowance: number;
  overtimeAllowance: number;
  dependents: number;
}

const allowanceTypes = [
  { key: 'familyAllowance', label: '家族手当', icon: '👨‍👩‍👧‍👦', desc: '扶養家族1人につき' },
  { key: 'housingAllowance', label: '住宅手当', icon: '🏠', desc: '住居補助' },
  { key: 'commutingAllowance', label: '通勤手当', icon: '🚃', desc: '定期代相当' },
  { key: 'mealAllowance', label: '食事手当', icon: '🍱', desc: '昼食補助' },
  { key: 'overtimeAllowance', label: '時間外手当', icon: '⏰', desc: '残業手当' },
];

export default function BenefitsClient({ employees }: { employees: Employee[] }) {
  const [benefits, setBenefits] = useState<Benefit[]>(() =>
    employees.map(e => ({
      id: `b-${e.id}`,
      employeeId: e.id,
      healthInsurance: true,
      pension: true,
      employmentInsurance: true,
      workersComp: true,
      familyAllowance: 0,
      housingAllowance: 15000,
      commutingAllowance: 10000,
      mealAllowance: 10000,
      overtimeAllowance: 0,
      dependents: 0,
    }))
  );

  const [editingEmp, setEditingEmp] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Benefit>>({});
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);

  const handleEdit = (empId: string) => {
    const b = benefits.find(b => b.employeeId === empId);
    if (b) { setDraft({ ...b }); setEditingEmp(empId); }
  };

  const handleSave = () => {
    if (!editingEmp) return;
    setBenefits(prev => prev.map(b => b.employeeId === editingEmp ? { ...b, ...draft } as Benefit : b));
    setEditingEmp(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const filtered = useMemo(() => {
    return benefits.filter(b => {
      const emp = employees.find(e => e.id === b.employeeId);
      if (!emp) return false;
      const name = `${emp.lastName} ${emp.firstName}`;
      return search === '' || name.includes(search) || emp.department.includes(search);
    });
  }, [benefits, employees, search]);

  const stats = useMemo(() => {
    const totalAllowances = benefits.reduce((s, b) =>
      s + b.familyAllowance + b.housingAllowance + b.commutingAllowance + b.mealAllowance, 0);
    const totalDependents = benefits.reduce((s, b) => s + b.dependents, 0);
    const insured = benefits.filter(b => b.healthInsurance).length;
    return { totalAllowances, totalDependents, insured, total: benefits.length };
  }, [benefits]);

  const calcCompanyInsurance = (salary: number) => {
    const healthRate = 0.05;
    const pensionRate = 0.0915;
    const employmentRate = 0.006;
    const workersRate = 0.003;
    return {
      health: Math.round(salary * healthRate),
      pension: Math.round(salary * pensionRate),
      employment: Math.round(salary * employmentRate),
      workers: Math.round(salary * workersRate),
      total: Math.round(salary * (healthRate + pensionRate + employmentRate + workersRate)),
    };
  };

  const calcEmployeeInsurance = (salary: number) => {
    const healthRate = 0.05;
    const pensionRate = 0.0915;
    const employmentRate = 0.003;
    return {
      health: Math.round(salary * healthRate),
      pension: Math.round(salary * pensionRate),
      employment: Math.round(salary * employmentRate),
      total: Math.round(salary * (healthRate + pensionRate + employmentRate)),
    };
  };

  return (
    <>
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-green-600 text-lg">&#10003;</span>
          <span className="text-sm font-medium text-green-800">福利厚生情報を保存しました</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '社会保険加入', value: `${stats.insured}/${stats.total}名`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '扶養家族合計', value: `${stats.totalDependents}人`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '手当合計(月)', value: `¥${stats.totalAllowances.toLocaleString()}`, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: '手当平均', value: `¥${Math.round(stats.totalAllowances / Math.max(stats.total, 1)).toLocaleString()}`, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Insurance Overview */}
      <Card title="社会保険 負担概要">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-blue-700 mb-3">🏢 会社負担</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">健康保険 (5%)</span><span className="font-medium">報酬月額 × 5%</span></div>
              <div className="flex justify-between"><span className="text-slate-600">厚生年金 (9.15%)</span><span className="font-medium">報酬月額 × 9.15%</span></div>
              <div className="flex justify-between"><span className="text-slate-600">雇用保険 (0.6%)</span><span className="font-medium">報酬月額 × 0.6%</span></div>
              <div className="flex justify-between"><span className="text-slate-600">労災保険 (0.3%)</span><span className="font-medium">報酬月額 × 0.3%</span></div>
              <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-medium text-slate-700">合計</span><span className="font-bold text-blue-600">報酬月額 × 15.05%</span></div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-green-700 mb-3">👤 従業員負担</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">健康保険 (5%)</span><span className="font-medium">報酬月額 × 5%</span></div>
              <div className="flex justify-between"><span className="text-slate-600">厚生年金 (9.15%)</span><span className="font-medium">報酬月額 × 9.15%</span></div>
              <div className="flex justify-between"><span className="text-slate-600">雇用保険 (0.3%)</span><span className="font-medium">報酬月額 × 0.3%</span></div>
              <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-medium text-slate-700">合計</span><span className="font-bold text-green-600">報酬月額 × 14.45%</span></div>
            </div>
          </div>
        </div>
      </Card>

      {/* Benefits Table */}
      <Card title="従業員別 福利厚生">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="名前・部署で検索..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: '960px' }}>
            <colgroup>
              <col style={{ width: '160px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '80px' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">従業員</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">部署</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">社会保険</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">家族手当</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">住宅手当</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">通勤手当</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">食事手当</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">会社負担</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(b => {
                const emp = employees.find(e => e.id === b.employeeId);
                if (!emp) return null;
                const companyIns = calcCompanyInsurance(emp.salary);
                const totalAllowance = b.familyAllowance + b.housingAllowance + b.commutingAllowance + b.mealAllowance;
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{emp.lastName} {emp.firstName}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{emp.department}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs rounded ${b.healthInsurance ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {b.healthInsurance ? '加入' : '未加入'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">¥{b.familyAllowance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">¥{b.housingAllowance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">¥{b.commutingAllowance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">¥{b.mealAllowance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">¥{companyIns.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleEdit(b.employeeId)}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">編集</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Modal */}
      {editingEmp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingEmp(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">福利厚生設定</h3>
                <button onClick={() => setEditingEmp(null)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
              </div>
              {(() => {
                const emp = employees.find(e => e.id === editingEmp);
                return emp ? <p className="text-sm text-slate-600 mb-4">{emp.lastName} {emp.firstName} ({emp.department})</p> : null;
              })()}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block">社会保険</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'healthInsurance', label: '健康保険' },
                      { key: 'pension', label: '厚生年金' },
                      { key: 'employmentInsurance', label: '雇用保険' },
                      { key: 'workersComp', label: '労災保険' },
                    ].map(ins => (
                      <label key={ins.key} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg cursor-pointer">
                        <input type="checkbox" checked={(draft as any)[ins.key] ?? false}
                          onChange={e => setDraft(p => ({ ...p, [ins.key]: e.target.checked }))}
                          className="rounded border-slate-300 text-blue-600" />
                        <span className="text-sm text-slate-700">{ins.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block">扶養家族数</label>
                  <input type="number" min={0} value={draft.dependents ?? 0}
                    onChange={e => setDraft(p => ({ ...p, dependents: Number(e.target.value) }))}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block">手当 (月額)</label>
                  <div className="space-y-2">
                    {allowanceTypes.map(a => (
                      <div key={a.key} className="flex items-center gap-3">
                        <span className="text-lg">{a.icon}</span>
                        <span className="text-sm text-slate-600 w-24">{a.label}</span>
                        <input type="number" min={0} step={1000} value={(draft as any)[a.key] ?? 0}
                          onChange={e => setDraft(p => ({ ...p, [a.key]: Number(e.target.value) }))}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-right" />
                        <span className="text-xs text-slate-400">円</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setEditingEmp(null)} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 text-sm">キャンセル</button>
                <button onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
