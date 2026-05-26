'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';

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
  { key: 'technical', label: '技術力', weight: 25 },
  { key: 'communication', label: 'コミュニケーション', weight: 15 },
  { key: 'leadership', label: 'リーダーシップ', weight: 15 },
  { key: 'attitude', label: '勤務態度', weight: 15 },
  { key: 'productivity', label: '生産性', weight: 15 },
  { key: 'teamwork', label: 'チームワーク', weight: 15 },
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

export default function EvaluationClient({ employees }: { employees: Employee[] }) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formEmp, setFormEmp] = useState('');
  const [formPeriod, setFormPeriod] = useState('2026-上期');
  const [formScores, setFormScores] = useState<Record<string, number>>({});
  const [formComment, setFormComment] = useState('');
  const [formGoals, setFormGoals] = useState<string[]>(['']);
  const [selectedPeriod, setSelectedPeriod] = useState('2026-上期');
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
      evaluatedBy: '管理者',
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
      const matchSearch = search === '' || name.includes(search);
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

  const periods = ['2026-上期', '2025-下期', '2025-上期', '2024-下期'];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stats - Redesigned to look premium */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '評価件数', value: `${stats.count} 名`, color: 'text-blue-600', bg: 'bg-blue-50/40 border-blue-100 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.06)]' },
          { label: '平均スコア', value: `${stats.avg} 点`, color: 'text-purple-600', bg: 'bg-purple-50/40 border-purple-100 shadow-[0_4px_20px_-4px_rgba(147,51,234,0.06)]' },
          ...stats.gradeDist.slice(0, 2).map(g => ({
            label: `ランク ${g.label} 人数`,
            value: `${g.count} 名`,
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

      {/* Period & Actions - Styled with Segmented layout */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="flex gap-3 items-center">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">対象評価期間:</label>
          <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
            className="px-3.5 py-2 border border-slate-350 bg-white rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all">
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer hover:scale-[1.01] active:scale-95">
          ➕ 新しい評価を入力
        </button>
      </div>

      {/* Evaluation Form Modal - Redesigned to look professional */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="p-6.5">
              <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">評価の入力</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold border border-transparent rounded-lg hover:bg-slate-50 p-1 transition-all cursor-pointer">&times;</button>
              </div>
              
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">対象従業員</label>
                    <select value={formEmp} onChange={e => setFormEmp(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                      <option value="">選択してください...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName} ({e.department})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">評価期間</label>
                    <select value={formPeriod} onChange={e => setFormPeriod(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                      {periods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <label className="text-xs font-black text-slate-700 mb-3 block uppercase tracking-wide">評価項目スコア設定 (0-100点)</label>
                  <div className="space-y-4">
                    {criteria.map(c => (
                      <div key={c.key} className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-150">
                        <span className="text-xs font-bold text-slate-600 w-36">{c.label} <span className="text-[10px] text-slate-400 font-medium">({c.weight}%)</span></span>
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
                    <span className="text-xs font-bold text-slate-500 uppercase">総合スコア (加重平均)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-slate-800 tracking-tight">{Math.round(totalScore)} 点</span>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${getGrade(totalScore).color}`}>
                        ランク {getGrade(totalScore).label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <label className="text-xs font-bold text-slate-500 uppercase">評価コメント</label>
                  <textarea value={formComment} onChange={e => setFormComment(e.target.value)} rows={3}
                    className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="具体的な評価コメントや業務での強み・改善点を入力してください..." />
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <label className="text-xs font-bold text-slate-500 uppercase">次期目標の設定</label>
                  <div className="space-y-2 mt-1.5">
                    {formGoals.map((g, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={g} onChange={e => {
                          const newGoals = [...formGoals];
                          newGoals[i] = e.target.value;
                          setFormGoals(newGoals);
                        }}
                          className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500" placeholder={`具体的な目標設定 ${i + 1}`} />
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
                <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-slate-250 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer">キャンセル</button>
                <button onClick={handleSubmit} disabled={!formEmp}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                  評価を保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grade Distribution - Optimized to look glowing and structured */}
      <Card title="ランク分布" className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
        <p className="text-xs text-slate-400 -mt-2 mb-4">選択された評価期間における評価ランク分布</p>
        <div className="grid grid-cols-5 gap-3.5">
          {stats.gradeDist.map(g => (
            <div key={g.label} className="text-center p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:shadow-sm hover:border-slate-300 transition-all">
              <span className={`inline-block px-3.5 py-1 text-base font-black rounded-lg border ${g.color} shadow-sm`}>{g.label}</span>
              <p className="mt-3 text-3xl font-black text-slate-800 tracking-tight">{g.count}</p>
              <p className="text-[10px] text-slate-400 font-bold -mt-0.5">名</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Evaluations Table - Refined and high contrast */}
      <Card title="評価一覧" className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="名前で検索..." value={search} onChange={e => setSearch(e.target.value)}
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
                <th className="px-5 py-3.5">従業員</th>
                <th className="px-5 py-3.5">部署</th>
                <th className="px-5 py-3.5 text-center">総合スコア</th>
                <th className="px-5 py-3.5 text-center">評価ランク</th>
                <th className="px-5 py-3.5">コメント</th>
                <th className="px-5 py-3.5">評価確定日</th>
                <th className="px-5 py-3.5">評価者</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 bg-slate-50/20">対象期間の評価データがありません</td></tr>
              ) : filtered.map(ev => {
                const emp = employees.find(e => e.id === ev.employeeId);
                const grade = getGrade(ev.totalScore);
                return (
                  <tr key={ev.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-800">{emp?.lastName} {emp?.firstName}</td>
                    <td className="px-5 py-4"><span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-lg font-bold border border-slate-200">{emp?.department}</span></td>
                    <td className="px-5 py-4 text-center font-mono font-black text-slate-700">{ev.totalScore} 点</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${grade.color}`}>{ev.grade}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 font-medium max-w-xs truncate" title={ev.comment}>{ev.comment}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs font-semibold">{ev.evaluatedDate}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs font-bold">{ev.evaluatedBy}</td>
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
