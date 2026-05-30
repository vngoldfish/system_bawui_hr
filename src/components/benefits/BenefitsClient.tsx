'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';

interface Employee {
  id: string; firstName: string; lastName: string; firstNameKana: string;
  department: string; position: string; salary: number; salaryType: string;
  age?: number;
  benefits?: any;
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

const allowanceKeys = [
  'familyAllowance',
  'housingAllowance',
  'commutingAllowance',
  'mealAllowance',
  'overtimeAllowance',
];

const getAllowanceTranslation = (key: string, t: any) => {
  switch (key) {
    case 'familyAllowance':
      return { label: t('benefits.familyAllowance'), desc: t('benefits.familyDesc'), icon: '👨‍👩‍👧‍👦' };
    case 'housingAllowance':
      return { label: t('benefits.housingAllowance'), desc: t('benefits.housingDesc'), icon: '🏠' };
    case 'commutingAllowance':
      return { label: t('benefits.commutingAllowance'), desc: t('benefits.commutingDesc'), icon: '🚃' };
    case 'mealAllowance':
      return { label: t('benefits.mealAllowance'), desc: t('benefits.mealDesc'), icon: '🍱' };
    case 'overtimeAllowance':
      return { label: t('benefits.overtimeAllowance'), desc: t('benefits.overtimeDesc'), icon: '⏰' };
    default:
      return { label: '', desc: '', icon: '' };
  }
};

export default function BenefitsClient({ employees }: { employees: Employee[] }) {
  const { t, locale } = useI18n();
  const [benefits, setBenefits] = useState<Benefit[]>(() =>
    employees.map(e => {
      const b = e.benefits || {};
      return {
        id: `b-${e.id}`,
        employeeId: e.id,
        healthInsurance: b.healthInsurance ?? true,
        pension: b.pension ?? true,
        employmentInsurance: b.employmentInsurance ?? true,
        workersComp: b.workersComp ?? true,
        familyAllowance: b.familyAllowance ?? 0,
        housingAllowance: b.housing ?? 15000,
        commutingAllowance: b.transportation ?? 10000,
        mealAllowance: b.meal ?? 10000,
        overtimeAllowance: b.overtimeAllowance ?? 0,
        dependents: b.dependents ?? 0,
      };
    })
  );

  const [editingEmp, setEditingEmp] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Benefit>>({});
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEdit = (empId: string) => {
    const b = benefits.find(b => b.employeeId === empId);
    if (b) {
      setDraft({ ...b });
      setEditingEmp(empId);
      setErrorMessage(null);
    }
  };

  const handleSave = async () => {
    if (!editingEmp) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload = {
        benefits: {
          healthInsurance: draft.healthInsurance ?? true,
          pension: draft.pension ?? true,
          employmentInsurance: draft.employmentInsurance ?? true,
          workersComp: draft.workersComp ?? true,
          transportation: draft.commutingAllowance ?? 0,
          housing: draft.housingAllowance ?? 0,
          meal: draft.mealAllowance ?? 0,
          familyAllowance: draft.familyAllowance ?? 0,
          overtimeAllowance: draft.overtimeAllowance ?? 0,
          dependents: draft.dependents ?? 0,
        }
      };

      const res = await fetch(`/api/employees/${editingEmp}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to save benefits data');
      }

      setBenefits(prev => prev.map(b => b.employeeId === editingEmp ? { ...b, ...draft } as Benefit : b));
      setEditingEmp(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return benefits.filter(b => {
      const emp = employees.find(e => e.id === b.employeeId);
      if (!emp) return false;
      const name = `${emp.lastName} ${emp.firstName}`;
      return search === '' || name.toLowerCase().includes(search.toLowerCase()) || emp.department.toLowerCase().includes(search.toLowerCase());
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

  return (
    <>
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-green-600 text-lg">&#10003;</span>
          <span className="text-sm font-medium text-green-800">{t('benefits.saveSuccess')}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('benefits.insuredCount'), value: `${stats.insured}/${stats.total} ${t('benefits.unitPerson')}`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('benefits.dependentsCount'), value: `${stats.totalDependents} ${t('benefits.unitPeople')}`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: t('benefits.monthlyTotal'), value: `¥${stats.totalAllowances.toLocaleString()}`, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: t('benefits.averageAllowance'), value: `¥${Math.round(stats.totalAllowances / Math.max(stats.total, 1)).toLocaleString()}`, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Insurance Overview */}
      <div className="mt-6">
        <Card title={t('benefits.burdenOverview')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-blue-700 mb-3">🏢 {t('benefits.companyBurden')}</h4>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between"><span>{t('benefits.healthInsurance')} (5%)</span><span className="font-medium text-slate-800">{t('benefits.formulaDetail').replace('{pct}', '5')}</span></div>
                <div className="flex justify-between"><span>{t('benefits.pension')} (9.15%)</span><span className="font-medium text-slate-800">{t('benefits.formulaDetail').replace('{pct}', '9.15')}</span></div>
                <div className="flex justify-between"><span>{t('benefits.employmentInsurance')} (0.6%)</span><span className="font-medium text-slate-800">{t('benefits.formulaDetail').replace('{pct}', '0.6')}</span></div>
                <div className="flex justify-between"><span>{t('benefits.workersComp')} (0.3%)</span><span className="font-medium text-slate-800">{t('benefits.formulaDetail').replace('{pct}', '0.3')}</span></div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-slate-800"><span className="font-medium">{t('benefits.total')}</span><span className="font-bold text-blue-600">{t('benefits.formulaTotal').replace('{pct}', '15.05')}</span></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-green-700 mb-3">👤 {t('benefits.employeeBurden')}</h4>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between"><span>{t('benefits.healthInsurance')} (5%)</span><span className="font-medium text-slate-800">{t('benefits.formulaDetail').replace('{pct}', '5')}</span></div>
                <div className="flex justify-between"><span>{t('benefits.pension')} (9.15%)</span><span className="font-medium text-slate-800">{t('benefits.formulaDetail').replace('{pct}', '9.15')}</span></div>
                <div className="flex justify-between"><span>{t('benefits.employmentInsurance')} (0.3%)</span><span className="font-medium text-slate-800">{t('benefits.formulaDetail').replace('{pct}', '0.3')}</span></div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-slate-800"><span className="font-medium">{t('benefits.total')}</span><span className="font-bold text-green-600">{t('benefits.formulaTotal').replace('{pct}', '14.45')}</span></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Benefits Table */}
      <div className="mt-6">
        <Card title={t('benefits.title')}>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder={t('benefits.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)}
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('benefits.colName')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('benefits.colDept')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('benefits.colSocialIns')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('benefits.colFamily')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('benefits.colHousing')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('benefits.colCommuting')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('benefits.colMeal')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('benefits.colCompanyBurden')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">{t('benefits.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(b => {
                  const emp = employees.find(e => e.id === b.employeeId);
                  if (!emp) return null;
                  const companyIns = calcCompanyInsurance(emp.salary);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{emp.lastName} {emp.firstName}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{emp.department}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs rounded ${b.healthInsurance ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {b.healthInsurance ? t('benefits.joined') : t('benefits.notJoined')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">¥{b.familyAllowance.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right">¥{b.housingAllowance.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right">¥{b.commutingAllowance.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right">¥{b.mealAllowance.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">¥{companyIns.total.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleEdit(b.employeeId)}
                          className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">{t('benefits.editBtn')}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Edit Modal */}
      {editingEmp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingEmp(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">{t('benefits.modalTitle')}</h3>
                <button onClick={() => setEditingEmp(null)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
              </div>
              {(() => {
                const emp = employees.find(e => e.id === editingEmp);
                return emp ? <p className="text-sm text-slate-600 mb-4">{emp.lastName} {emp.firstName} ({emp.department})</p> : null;
              })()}
              {errorMessage && (
                <div className="mb-4 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">
                  {errorMessage}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block">{t('benefits.socialInsHeader')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'healthInsurance', label: t('benefits.healthInsurance') },
                      { key: 'pension', label: t('benefits.pension') },
                      { key: 'employmentInsurance', label: t('benefits.employmentInsurance') },
                      { key: 'workersComp', label: t('benefits.workersComp') },
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
                  <label className="text-sm font-medium text-slate-600 mb-2 block">{t('benefits.dependentsCountHeader')}</label>
                  <input type="number" min={0} value={draft.dependents ?? 0}
                    onChange={e => setDraft(p => ({ ...p, dependents: Number(e.target.value) }))}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block">{t('benefits.allowanceMonthly')}</label>
                  <div className="space-y-2">
                    {allowanceKeys.map(key => {
                      const trans = getAllowanceTranslation(key, t);
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-lg">{trans.icon}</span>
                          <span className="text-sm text-slate-600 w-24">{trans.label}</span>
                          <input type="number" min={0} step={1000} value={(draft as any)[key] ?? 0}
                            onChange={e => setDraft(p => ({ ...p, [key]: Number(e.target.value) }))}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-right" />
                          <span className="text-xs text-slate-400">{t('benefits.unitCurrency')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setEditingEmp(null)} disabled={isSaving} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 text-sm disabled:opacity-50">{t('benefits.cancelBtn')}</button>
                <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                  {isSaving ? '...' : t('benefits.saveBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
