'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';

interface Employee {
  id: string; firstName: string; lastName: string; firstNameKana: string;
  department: string; position: string;
}

interface Training {
  id: string;
  title: string;
  category: string;
  provider: string;
  startDate: string;
  endDate: string;
  hours: number;
  maxParticipants: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  description: string;
}

interface Enrollment {
  id: string;
  trainingId: string;
  employeeId: string;
  status: 'enrolled' | 'completed' | 'cancelled';
  enrolledDate: string;
  completedDate?: string;
  score?: number;
  certificate: boolean;
}

const trainingCategories = [
  { value: 'tech', label: '技術研修', icon: '💻' },
  { value: 'management', label: 'マネジメント', icon: '👔' },
  { value: 'compliance', label: 'コンプライアンス', icon: '📜' },
  { value: 'safety', label: '安全衛生', icon: '🦺' },
  { value: 'language', label: '語学', icon: '🌐' },
  { value: 'business', label: 'ビジネススキル', icon: '📊' },
];

export default function TrainingClient({ employees }: { employees: Employee[] }) {
  const [trainings, setTrainings] = useState<Training[]>([
    { id: 't1', title: 'React研修', category: 'tech', provider: 'Tech Academy', startDate: '2026-06-01', endDate: '2026-06-03', hours: 24, maxParticipants: 10, status: 'upcoming', description: 'React基礎から応用まで' },
    { id: 't2', title: 'リーダーシップ研修', category: 'management', provider: 'Management School', startDate: '2026-05-15', endDate: '2026-05-16', hours: 16, maxParticipants: 8, status: 'ongoing', description: 'チームマネジメント基礎' },
    { id: 't3', title: '情報セキュリティ', category: 'compliance', provider: 'Security Inc.', startDate: '2026-04-01', endDate: '2026-04-01', hours: 4, maxParticipants: 20, status: 'completed', description: '年次セキュリティ研修' },
    { id: 't4', title: '英会話クラス', category: 'language', provider: 'Language School', startDate: '2026-05-01', endDate: '2026-07-31', hours: 48, maxParticipants: 15, status: 'ongoing', description: 'ビジネス英会話' },
  ]);

  const [enrollments, setEnrollments] = useState<Enrollment[]>([
    { id: 'e1', trainingId: 't1', employeeId: '5', status: 'enrolled', enrolledDate: '2026-05-20', certificate: false },
    { id: 'e2', trainingId: 't1', employeeId: '7', status: 'enrolled', enrolledDate: '2026-05-20', certificate: false },
    { id: 'e3', trainingId: 't2', employeeId: '1', status: 'completed', enrolledDate: '2026-05-10', completedDate: '2026-05-16', score: 92, certificate: true },
    { id: 'e4', trainingId: 't2', employeeId: '4', status: 'completed', enrolledDate: '2026-05-10', completedDate: '2026-05-16', score: 88, certificate: true },
    { id: 'e5', trainingId: 't3', employeeId: '1', status: 'completed', enrolledDate: '2026-03-15', completedDate: '2026-04-01', score: 95, certificate: true },
    { id: 'e6', trainingId: 't3', employeeId: '2', status: 'completed', enrolledDate: '2026-03-15', completedDate: '2026-04-01', score: 90, certificate: true },
    { id: 'e7', trainingId: 't3', employeeId: '3', status: 'completed', enrolledDate: '2026-03-15', completedDate: '2026-04-01', score: 85, certificate: true },
    { id: 'e8', trainingId: 't4', employeeId: '11', status: 'enrolled', enrolledDate: '2026-04-28', certificate: false },
    { id: 'e9', trainingId: 't4', employeeId: '12', status: 'enrolled', enrolledDate: '2026-04-28', certificate: false },
    { id: 'e10', trainingId: 't4', employeeId: '13', status: 'enrolled', enrolledDate: '2026-04-28', certificate: false },
  ]);

  const [showAddTraining, setShowAddTraining] = useState(false);
  const [showEnroll, setShowEnroll] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newProvider, setNewProvider] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newHours, setNewHours] = useState('');
  const [newMax, setNewMax] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');

  const handleAddTraining = () => {
    if (!newTitle || !newCategory) return;
    const t: Training = {
      id: `t-${Date.now()}`,
      title: newTitle, category: newCategory, provider: newProvider,
      startDate: newStart, endDate: newEnd, hours: Number(newHours),
      maxParticipants: Number(newMax), status: 'upcoming', description: newDesc,
    };
    setTrainings(prev => [...prev, t]);
    setShowAddTraining(false);
    setNewTitle(''); setNewCategory(''); setNewProvider(''); setNewStart(''); setNewEnd(''); setNewHours(''); setNewMax(''); setNewDesc('');
  };

  const handleEnroll = (trainingId: string, employeeId: string) => {
    const exists = enrollments.find(e => e.trainingId === trainingId && e.employeeId === employeeId);
    if (exists) return;
    const e: Enrollment = {
      id: `e-${Date.now()}`, trainingId, employeeId,
      status: 'enrolled', enrolledDate: new Date().toISOString().split('T')[0], certificate: false,
    };
    setEnrollments(prev => [...prev, e]);
    setShowEnroll(null);
  };

  const handleComplete = (enrollmentId: string) => {
    setEnrollments(prev => prev.map(e => e.id === enrollmentId ? {
      ...e, status: 'completed' as const, completedDate: new Date().toISOString().split('T')[0], score: Math.floor(Math.random() * 20) + 80, certificate: true,
    } : e));
  };

  const filtered = useMemo(() => {
    return trainings.filter(t => {
      const matchSearch = search === '' || t.title.includes(search) || t.provider.includes(search);
      const matchCat = filterCategory === '' || t.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [trainings, search, filterCategory]);

  const stats = useMemo(() => {
    const total = trainings.length;
    const ongoing = trainings.filter(t => t.status === 'ongoing').length;
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const certificates = enrollments.filter(e => e.certificate).length;
    return { total, ongoing, completed, certificates };
  }, [trainings, enrollments]);

  const statusColor = (s: string) => {
    if (s === 'completed') return 'bg-green-100 text-green-700';
    if (s === 'ongoing') return 'bg-blue-100 text-blue-700';
    return 'bg-yellow-100 text-yellow-700';
  };
  const statusLabel = (s: string) => {
    if (s === 'completed') return '完了';
    if (s === 'ongoing') return '進行中';
    return '予定';
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '研修プログラム', value: `${stats.total}件`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '進行中', value: `${stats.ongoing}件`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '受講完了', value: `${stats.completed}件`, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: '修了証', value: `${stats.certificates}枚`, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">全てのカテゴリ</option>
            {trainingCategories.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
        </div>
        <button onClick={() => setShowAddTraining(true)}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          研修追加
        </button>
      </div>

      {/* Add Training Modal */}
      {showAddTraining && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddTraining(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">研修プログラム追加</h3>
                <button onClick={() => setShowAddTraining(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">研修名</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="React研修" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">カテゴリ</label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {trainingCategories.map(c => (
                      <button key={c.value} onClick={() => setNewCategory(c.value)}
                        className={`p-2 rounded-lg border-2 text-center text-xs transition-colors ${newCategory === c.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                        <span className="block text-lg mb-0.5">{c.icon}</span>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">提供会社</label>
                    <input type="text" value={newProvider} onChange={e => setNewProvider(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">時間数</label>
                    <input type="number" value={newHours} onChange={e => setNewHours(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">開始日</label>
                    <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">終了日</label>
                    <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">定員</label>
                    <input type="number" value={newMax} onChange={e => setNewMax(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">説明</label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowAddTraining(false)} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 text-sm">キャンセル</button>
                <button onClick={handleAddTraining} disabled={!newTitle || !newCategory}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">追加</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Training Programs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(t => {
          const cat = trainingCategories.find(c => c.value === t.category);
          const enrolled = enrollments.filter(e => e.trainingId === t.id);
          const completed = enrolled.filter(e => e.status === 'completed').length;
          return (
            <Card key={t.id} title="">
              <div className="p-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{cat?.icon}</span>
                      <h3 className="text-base font-bold text-slate-800">{t.title}</h3>
                    </div>
                    <p className="text-xs text-slate-400">{t.provider}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded ${statusColor(t.status)}`}>{statusLabel(t.status)}</span>
                </div>
                <p className="text-sm text-slate-600 mb-3">{t.description}</p>
                <div className="flex gap-4 text-xs text-slate-500 mb-3">
                  <span>📅 {t.startDate} ~ {t.endDate}</span>
                  <span>⏱️ {t.hours}時間</span>
                  <span>👥 {enrolled.length}/{t.maxParticipants}名</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(completed / Math.max(enrolled.length, 1)) * 100}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">完了: {completed}/{enrolled.length}</span>
                  <button onClick={() => setShowEnroll(showEnroll === t.id ? null : t.id)}
                    className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">参加登録</button>
                </div>
                {showEnroll === t.id && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">参加者を選択:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {employees.filter(e => !enrolled.find(en => en.employeeId === e.id)).map(e => (
                        <button key={e.id} onClick={() => handleEnroll(t.id, e.id)}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 rounded flex items-center justify-between">
                          <span>{e.lastName} {e.firstName} ({e.department})</span>
                          <span className="text-blue-600 text-xs">登録</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {enrolled.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">参加者:</p>
                    <div className="flex flex-wrap gap-1">
                      {enrolled.map(en => {
                        const emp = employees.find(e => e.id === en.employeeId);
                        return (
                          <span key={en.id} className={`px-2 py-0.5 text-xs rounded ${en.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {emp?.lastName} {emp?.firstName}
                            {en.status !== 'completed' && t.status !== 'upcoming' && (
                              <button onClick={() => handleComplete(en.id)} className="ml-1 text-green-600 hover:text-green-800">✓</button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
