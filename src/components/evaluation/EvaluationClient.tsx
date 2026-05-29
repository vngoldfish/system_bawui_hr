'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  firstNameKana: string;
  department: string;
  position: string;
}

interface Evaluation {
  id: string;
  employeeId: string;
  period: string;
  scores: Record<string, number>;
  totalScore: number;
  grade: string;
  comment: string;
  goals: string[];
  evaluatedBy: string;
  evaluatedDate: string;
}

const criteria = [
  { key: 'technical', weight: 25 },
  { key: 'communication', weight: 15 },
  { key: 'leadership', weight: 15 },
  { key: 'attitude', weight: 15 },
  { key: 'productivity', weight: 15 },
  { key: 'teamwork', weight: 15 },
];

const grades = [
  { min: 90, label: 'S', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { min: 80, label: 'A', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { min: 70, label: 'B', color: 'bg-green-50 text-green-700 border-green-200' },
  { min: 60, label: 'C', color: 'bg-yellow-50 text-yellow-750 border-yellow-200' },
  { min: 0, label: 'D', color: 'bg-red-50 text-red-700 border-red-200' },
];

function getGrade(score: number) {
  return grades.find(g => score >= g.min) || grades[grades.length - 1];
}

const getCriteriaTranslation = (key: string, t: any) => {
  switch (key) {
    case 'technical': return t('evaluation.criteriaTechnical');
    case 'communication': return t('evaluation.criteriaCommunication');
    case 'leadership': return t('evaluation.criteriaLeadership');
    case 'attitude': return t('evaluation.criteriaAttitude');
    case 'productivity': return t('evaluation.criteriaProductivity');
    case 'teamwork': return t('evaluation.criteriaTeamwork');
    default: return key;
  }
};

const getPeriodLabel = (period: string, t: any) => {
  const isVi = t('evaluation.cancelBtn').includes('Hủy');
  const isEn = t('evaluation.cancelBtn').includes('Cancel');
  const isZh = t('evaluation.cancelBtn').includes('\u53d6\u6d88');
  const isTh = t('evaluation.cancelBtn').includes('ยกเลิก');
  
  const [year, term] = period.split('-');
  if (term === '\u4e0a\u671f') return isVi ? `Nửa đầu năm ${year}` : isEn ? `H1 ${year}` : isZh ? `${year}\u5e74\u4e0a\u534a\u5e74` : isTh ? `ครึ่งปีแรก ${year}` : period;
  if (term === '\u4e0b\u671f') return isVi ? `Nửa cuối năm ${year}` : isEn ? `H2 ${year}` : isZh ? `${year}\u5e74\u4e0b\u534a\u5e74` : isTh ? `ครึ่งปีหลัง ${year}` : period;
  return period;
};

const getDepartmentLabel = (dept: string, t: any) => {
  const isVi = t('evaluation.cancelBtn').includes('Hủy');
  const isEn = t('evaluation.cancelBtn').includes('Cancel');
  const isZh = t('evaluation.cancelBtn').includes('\u53d6\u6d88');
  const isTh = t('evaluation.cancelBtn').includes('ยกเลิก');
  if (dept === '\u958b\u767a\u90e8') return isVi ? 'Bộ phận phát triển' : isEn ? 'Development' : isZh ? '\u7814\u53d1\u90e8' : isTh ? 'ฝ่ายพัฒนา' : '\u958b\u767a\u90e8';
  if (dept === '\u55b6\u696d\u90e8') return isVi ? 'Bộ phận kinh doanh' : isEn ? 'Sales' : isZh ? '\u9500\u552e\u90e8' : isTh ? 'ฝ่ายขาย' : '\u55b6\u696d\u90e8';
  if (dept === '\u7d4c\u7406\u90e8') return isVi ? 'Bộ phận kế toán' : isEn ? 'Accounting' : isZh ? '\u8d22\u52a1\u90e8' : isTh ? 'ฝ่ายบัญชี' : '\u7d4c\u7406\u90e8';
  if (dept === '\u4eba\u4e8b\u90e8') return isVi ? 'Bộ phận nhân sự' : isEn ? 'HR' : isZh ? '\u4eba\u4e8b\u90e8' : isTh ? 'ฝ่ายบุคคล' : '\u4eba\u4e8b\u90e8';
  return dept;
};

export default function EvaluationClient({ employees }: { employees: Employee[] }) {
  const { t, locale } = useI18n();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formEmp, setFormEmp] = useState('');
  const [formPeriod, setFormPeriod] = useState('2026-\u4e0a\u671f');
  const [formScores, setFormScores] = useState<Record<string, number>>({});
  const [formComment, setFormComment] = useState('');
  const [formGoals, setFormGoals] = useState<string[]>(['']);
  const [selectedPeriod, setSelectedPeriod] = useState('2026-\u4e0a\u671f');
  const [search, setSearch] = useState('');

  const handleScoreChange = (key: string, value: number) => {
    setFormScores(prev => ({ ...prev, [key]: Math.min(100, Math.max(0, value)) }));
  };

  const totalScore = useMemo(() => {
    return criteria.reduce((sum, c) => sum + ((formScores[c.key] || 0) * c.weight / 100), 0);
  }, [formScores]);

  const handleSubmit = () => {
    if (!formEmp) return;
    const newEval: Evaluation = {
      id: `eval-${Date.now()}`,
      employeeId: formEmp,
      period: formPeriod,
      scores: { ...formScores },
      totalScore: Math.round(totalScore),
      grade: getGrade(totalScore).label,
      comment: formComment,
      goals: formGoals.filter(g => g.trim()),
      evaluatedBy: '\u7ba1\u7406\u8005',
      evaluatedDate: new Date().toISOString().split('T')[0],
    };
    setEvaluations(prev => [newEval, ...prev]);
    setShowForm(false);
    setFormEmp(''); setFormScores({}); setFormComment(''); setFormGoals(['']);
  };

  const filtered = useMemo(() => {
    return evaluations.filter(e => {
      const emp = employees.find(ep => ep.id === e.employeeId);
      const name = emp ? `${emp.lastName} ${emp.firstName}` : '';
      const matchSearch = search === '' || name.toLowerCase().includes(search.toLowerCase());
      const matchPeriod = e.period === selectedPeriod;
      return matchSearch && matchPeriod;
    });
  }, [evaluations, employees, search, selectedPeriod]);

  const stats = useMemo(() => {
    const periodEvals = evaluations.filter(e => e.period === selectedPeriod);
    const avg = periodEvals.length > 0 ? Math.round(periodEvals.reduce((s, e) => s + e.totalScore, 0) / periodEvals.length) : 0;
    const gradeDist = grades.map(g => ({
      ...g,
      count: periodEvals.filter(e => e.grade === g.label).length,
    }));
    return { count: periodEvals.length, avg, gradeDist };
  }, [evaluations, selectedPeriod]);

  const periods = ['2026-\u4e0a\u671f', '2025-\u4e0b\u671f', '2025-\u4e0a\u671f', '2024-\u4e0b\u671f'];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('evaluation.statsCount'), value: `${stats.count} ${locale === 'ja' ? '\u540d' : locale === 'vi' ? 'người' : 'people'}`, color: 'text-blue-600', bg: 'bg-blue-50/40 border-blue-100 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.06)]' },
          { label: t('evaluation.statsAvg'), value: `${stats.avg}${t('evaluation.unitPoints')}`, color: 'text-purple-600', bg: 'bg-purple-50/40 border-purple-100 shadow-[0_4px_20px_-4px_rgba(147,51,234,0.06)]' },
          ...stats.gradeDist.slice(0, 2).map(g => ({
            label: t('evaluation.labelGrade').replace('{grade}', g.label),
            value: `${g.count} ${locale === 'ja' ? '\u540d' : locale === 'vi' ? 'người' : 'people'}`,
            color: 'text-slate-700',
            bg: 'bg-white border-slate-200/60 shadow-sm',
          })),
        ].map((s, idx) => (
          <div key={idx} className={`${s.bg} rounded-2xl p-4.5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-default`}>
            <p className="text-xs text-slate-500 font-semibold mb-1">{s.label}</p>
            <p className={`text-2xl font-black mt-1 tracking-tight ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Period & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex gap-3 items-center">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('evaluation.labelTargetPeriod')}</label>
          <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
            className="px-3.5 py-2 border border-slate-350 bg-white rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all">
            {periods.map(p => <option key={p} value={p}>{getPeriodLabel(p, t)}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer hover:scale-[1.01] active:scale-95">
          {t('evaluation.addBtn')}
        </button>
      </div>

      {/* Evaluation Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="p-6.5">
              <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">{t('evaluation.modalTitle')}</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-650 text-xl font-bold border border-transparent rounded-lg hover:bg-slate-50 p-1 transition-all cursor-pointer">&times;</button>
              </div>
              
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">{t('evaluation.labelEmployee')}</label>
                    <select value={formEmp} onChange={e => setFormEmp(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                      <option value="">{t('evaluation.selectEmployee')}</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName} ({getDepartmentLabel(e.department, t)})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">{t('evaluation.labelPeriod')}</label>
                    <select value={formPeriod} onChange={e => setFormPeriod(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                      {periods.map(p => <option key={p} value={p}>{getPeriodLabel(p, t)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <label className="text-xs font-black text-slate-700 mb-3 block uppercase tracking-wide">{t('evaluation.labelCriteriaHeader')}</label>
                  <div className="space-y-4">
                    {criteria.map(c => (
                      <div key={c.key} className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-150">
                        <span className="text-xs font-bold text-slate-600 w-36">{getCriteriaTranslation(c.key, t)} <span className="text-[10px] text-slate-400 font-medium">({c.weight}%)</span></span>
                        <input type="range" min={0} max={100} value={formScores[c.key] || 0}
                          onChange={e => handleScoreChange(c.key, Number(e.target.value))}
                          className="flex-1 accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none" />
                        <input type="number" min={0} max={100} value={formScores[c.key] || 0}
                          onChange={e => handleScoreChange(c.key, Number(e.target.value))}
                          className="w-16 px-2.5 py-1 border border-slate-300 rounded-lg text-sm text-center font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    ))}
                  </div>
                  
                  {/* Dynamic Real-time Total Score preview panel */}
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase">{t('evaluation.labelTotalScore')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-slate-800 tracking-tight">{Math.round(totalScore)}{t('evaluation.unitPoints')}</span>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${getGrade(totalScore).color}`}>
                        {t('evaluation.labelGrade').replace('{grade}', getGrade(totalScore).label)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('evaluation.labelComment')}</label>
                  <textarea value={formComment} onChange={e => setFormComment(e.target.value)} rows={3}
                    className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder={t('evaluation.placeholderComment')} />
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('evaluation.labelGoals')}</label>
                  <div className="space-y-2 mt-1.5">
                    {formGoals.map((g, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={g} onChange={e => {
                          const newGoals = [...formGoals];
                          newGoals[i] = e.target.value;
                          setFormGoals(newGoals);
                        }}
                          className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('evaluation.placeholderGoal').replace('{num}', String(i + 1))} />
                        {i === formGoals.length - 1 && (
                          <button onClick={() => setFormGoals([...formGoals, ''])}
                            className="px-3.5 py-2.5 bg-slate-150 border border-slate-200 hover:bg-slate-200 text-slate-700 font-extrabold text-sm rounded-xl cursor-pointer transition-colors">+</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4 mt-6">
                <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-slate-250 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer">{t('evaluation.cancelBtn')}</button>
                <button onClick={handleSubmit} disabled={!formEmp}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                  {t('evaluation.saveBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grade Distribution */}
      <Card title={t('evaluation.cardDistribution')} className="">
        <p className="text-xs text-slate-400 -mt-2 mb-4">{t('evaluation.distributionSubtitle')}</p>
        <div className="grid grid-cols-5 gap-3.5">
          {stats.gradeDist.map(g => (
            <div key={g.label} className="text-center p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:shadow-sm hover:border-slate-300 transition-all">
              <span className={`inline-block px-3.5 py-1 text-base font-black rounded-lg border ${g.color} shadow-sm`}>{g.label}</span>
              <p className="mt-3 text-3xl font-black text-slate-800 tracking-tight">{g.count}</p>
              <p className="text-[10px] text-slate-400 font-bold -mt-0.5">{t('evaluation.unitPeople')}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Evaluations Table */}
      <Card title={t('evaluation.cardList')} className="">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder={t('evaluation.searchPrompt')} value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-350 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/60">
          <table className="w-full table-fixed text-sm border-collapse" style={{ minWidth: '850px' }}>
            <colgroup>
              <col style={{ width: '160px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '100px' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 font-extrabold uppercase tracking-wider">
                <th className="px-5 py-3.5">{t('evaluation.colEmployee')}</th>
                <th className="px-5 py-3.5">{t('evaluation.colDept')}</th>
                <th className="px-5 py-3.5 text-center">{t('evaluation.colTotalScore')}</th>
                <th className="px-5 py-3.5 text-center">{t('evaluation.colGrade')}</th>
                <th className="px-5 py-3.5">{t('evaluation.colComment')}</th>
                <th className="px-5 py-3.5">{t('evaluation.colDate')}</th>
                <th className="px-5 py-3.5">{t('evaluation.colEvaluator')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 bg-slate-50/20">{t('evaluation.noEvaluations')}</td></tr>
              ) : filtered.map(ev => {
                const emp = employees.find(e => e.id === ev.employeeId);
                const grade = getGrade(ev.totalScore);
                return (
                  <tr key={ev.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-800">{emp ? `${emp.lastName} ${emp.firstName}` : ''}</td>
                    <td className="px-5 py-4"><span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-lg font-bold border border-slate-200">{emp ? getDepartmentLabel(emp.department, t) : ''}</span></td>
                    <td className="px-5 py-4 text-center font-mono font-black text-slate-700">{ev.totalScore}{t('evaluation.unitPoints')}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${grade.color}`}>{ev.grade}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-medium max-w-xs truncate" title={ev.comment}>{ev.comment}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs font-semibold">{ev.evaluatedDate}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs font-bold">{ev.evaluatedBy === '\u7ba1\u7406\u8005' ? t('evaluation.evaluatedByAdmin') : ev.evaluatedBy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
