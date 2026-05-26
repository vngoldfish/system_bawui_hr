'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';

interface JobPosting {
  id: string;
  title: string;
  department: string;
  type: string;
  salary: string;
  description: string;
  requirements: string[];
  status: 'open' | 'closed' | 'draft';
  postedDate: string;
  deadline: string;
}

interface Applicant {
  id: string;
  jobPostingId: string;
  name: string;
  nameKana: string;
  email: string;
  phone: string;
  age: number;
  education: string;
  experience: string;
  appliedDate: string;
  status: 'document' | 'interview1' | 'interview2' | 'offer' | 'hired' | 'rejected';
  memo: string;
}

const statusSteps = [
  { key: 'document', label: '書類選考', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  { key: 'interview1', label: '一次面接', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'interview2', label: '二次面接', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'offer', label: '内定', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'hired', label: '採用決定', color: 'bg-green-100 text-green-800 border-green-300' },
  { key: 'rejected', label: '不採用', color: 'bg-red-50 text-red-700 border-red-200' },
];

export default function RecruitmentClient() {
  const [postings, setPostings] = useState<JobPosting[]>([
    { id: 'j1', title: 'フロントエンドエンジニア', department: '開発部', type: '正社員', salary: '月給30万~50万', description: 'React/Next.jsを使用したWebアプリケーション開発', requirements: ['React経験3年以上', 'TypeScript必須', 'チーム開発経験'], status: 'open', postedDate: '2026-05-01', deadline: '2026-06-30' },
    { id: 'j2', title: '営業担当', department: '営業部', type: '正社員', salary: '月給25万~40万', description: '法人営業・新規開拓', requirements: ['営業経験2年以上', '普通自動車免許'], status: 'open', postedDate: '2026-05-10', deadline: '2026-06-15' },
    { id: 'j3', title: '経理スタッフ', department: '経理部', type: '正社員', salary: '月給28万~38万', description: '経理・財務業務全般', requirements: ['簿記2級以上', '経理経験3年以上'], status: 'open', postedDate: '2026-04-15', deadline: '2026-05-31' },
  ]);

  const [applicants, setApplicants] = useState<Applicant[]>([
    { id: 'a1', jobPostingId: 'j1', name: '田中 太郎', nameKana: 'タナカ タロウ', email: 'tanaka@example.com', phone: '090-1111-2222', age: 28, education: '大学卒（情報工学）', experience: 'React 4年', appliedDate: '2026-05-05', status: 'interview1', memo: '技術力高い' },
    { id: 'a2', jobPostingId: 'j1', name: '佐藤 花子', nameKana: 'サトウ ハナコ', email: 'sato@example.com', phone: '090-3333-4444', age: 25, education: '大学卒（计算机科学）', experience: 'React 2年', appliedDate: '2026-05-08', status: 'document', memo: '' },
    { id: 'a3', jobPostingId: 'j2', name: '鈴木 一郎', nameKana: 'スズキ イチロウ', email: 'suzuki@example.com', phone: '090-5555-6666', age: 32, education: '大学卒（経済学）', experience: '営業 6年', appliedDate: '2026-05-12', status: 'interview2', memo: 'コミュニケーション力高い' },
    { id: 'a4', jobPostingId: 'j2', name: '高橋 健二', nameKana: 'タカハシ ケンジ', email: 'takahashi@example.com', phone: '090-7777-8888', age: 29, education: '大学卒（商学）', experience: '営業 4年', appliedDate: '2026-05-15', status: 'offer', memo: '即戦力' },
    { id: 'a5', jobPostingId: 'j3', name: '渡辺 由美', nameKana: 'ワタナベ ユミ', email: 'watanabe@example.com', phone: '090-9999-0000', age: 35, education: '大学卒（会計学）', experience: '経理 8年', appliedDate: '2026-04-20', status: 'hired', memo: '簿記1級取得' },
  ]);

  const [selectedPosting, setSelectedPosting] = useState<string>('all');
  const [showAddPosting, setShowAddPosting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newType, setNewType] = useState('正社員');
  const [newSalary, setNewSalary] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [search, setSearch] = useState('');

  const handleAddPosting = () => {
    if (!newTitle || !newDept) return;
    const p: JobPosting = {
      id: `j-${Date.now()}`, title: newTitle, department: newDept, type: newType,
      salary: newSalary, description: newDesc, requirements: [],
      status: 'open', postedDate: new Date().toISOString().split('T')[0], deadline: '',
    };
    setPostings(prev => [...prev, p]);
    setShowAddPosting(false);
    setNewTitle(''); setNewDept(''); setNewSalary(''); setNewDesc('');
  };

  const handleAdvanceStatus = (appId: string) => {
    setApplicants(prev => prev.map(a => {
      if (a.id !== appId) return a;
      const idx = statusSteps.findIndex(s => s.key === a.status);
      const next = statusSteps[idx + 1];
      return next ? { ...a, status: next.key as Applicant['status'] } : a;
    }));
  };

  const handleReject = (appId: string) => {
    setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status: 'rejected' } : a));
  };

  const filteredApplicants = useMemo(() => {
    return applicants.filter(a => {
      const matchPosting = selectedPosting === 'all' || a.jobPostingId === selectedPosting;
      const matchSearch = search === '' || a.name.includes(search) || a.nameKana.includes(search);
      return matchPosting && matchSearch;
    });
  }, [applicants, selectedPosting, search]);

  const stats = useMemo(() => {
    const total = applicants.length;
    const inProcess = applicants.filter(a => !['hired', 'rejected'].includes(a.status)).length;
    const hired = applicants.filter(a => a.status === 'hired').length;
    const openPositions = postings.filter(p => p.status === 'open').length;
    return { total, inProcess, hired, openPositions };
  }, [applicants, postings]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stats - Redesigned to look premium */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '募集ポジション', value: `${stats.openPositions} 件`, color: 'text-blue-600', bg: 'bg-blue-50/40 border-blue-100 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.06)]' },
          { label: '応募者数', value: `${stats.total} 名`, color: 'text-purple-600', bg: 'bg-purple-50/40 border-purple-100 shadow-[0_4px_20px_-4px_rgba(147,51,234,0.06)]' },
          { label: '選考中', value: `${stats.inProcess} 名`, color: 'text-orange-600', bg: 'bg-orange-50/40 border-orange-100 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.06)]' },
          { label: '採用決定', value: `${stats.hired} 名`, color: 'text-emerald-650', bg: 'bg-emerald-50/40 border-emerald-100 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.06)]' },
        ].map((s, idx) => (
          <div key={idx} className={`${s.bg} rounded-2xl p-4.5 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-default`}>
            <p className="text-xs text-slate-500 font-semibold mb-1">{s.label}</p>
            <p className={`text-2xl font-black mt-1 tracking-tight ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Job Postings Grid Card */}
      <Card
        title="募集中のポジション"
        className="bg-white border border-slate-200/60 shadow-sm rounded-2xl animate-fadeIn"
        action={
          <button onClick={() => setShowAddPosting(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer">
            ➕ 求人を追加
          </button>
        }
      >
        <p className="text-xs text-slate-400 -mt-2 mb-4">求人カードをクリックして応募者を絞り込みます（もう一度クリックで解除）</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {postings.map(p => {
            const appCount = applicants.filter(a => a.jobPostingId === p.id).length;
            const isSelected = selectedPosting === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPosting(isSelected ? 'all' : p.id)}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between h-40 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/10 shadow-sm'
                    : 'border-slate-200/80 bg-white hover:border-slate-350 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-1.5">
                    <h4 className="text-sm font-extrabold text-slate-800 tracking-wide line-clamp-1">{p.title}</h4>
                    <span className={`px-2 py-0.5 text-[9px] rounded-lg font-bold border ${
                      p.status === 'open' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {p.status === 'open' ? '募集中' : '終了'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-450 font-bold uppercase">{p.department} <span className="text-slate-300">|</span> {p.type}</p>
                </div>
                
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-black text-slate-800">{p.salary}</p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    応募: <span className="text-blue-600 font-black text-sm">{appCount}</span> 名
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Add Posting Modal */}
      {showAddPosting && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddPosting(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="p-6.5">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">求人ポジションの追加</h3>
                <button onClick={() => setShowAddPosting(false)} className="text-slate-400 hover:text-slate-650 text-xl font-bold border border-transparent rounded-lg hover:bg-slate-50 p-1 transition-all cursor-pointer">&times;</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">職種・求人名</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full mt-1.5 px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500" placeholder="例: Webデザイナー" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">部署</label>
                    <select value={newDept} onChange={e => setNewDept(e.target.value)} className="w-full mt-1.5 px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                      <option value="">選択</option>
                      <option value="営業部">営業部</option>
                      <option value="開発部">開発部</option>
                      <option value="人事部">人事部</option>
                      <option value="経理部">経理部</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">雇用形態</label>
                    <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full mt-1.5 px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                      <option>正社員</option>
                      <option>契約社員</option>
                      <option>パート</option>
                      <option>アルバイト</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">給与目安</label>
                  <input type="text" value={newSalary} onChange={e => setNewSalary(e.target.value)} className="w-full mt-1.5 px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500" placeholder="例: 月給25万~40万" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">仕事内容・要件</label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="主な業務内容や必要となるスキル等..." />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4 mt-6">
                <button onClick={() => setShowAddPosting(false)} className="px-4 py-2.5 border border-slate-250 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer">キャンセル</button>
                <button onClick={handleAddPosting} disabled={!newTitle || !newDept} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">追加する</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applicants List Table */}
      <Card title="応募者一覧" className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="名前・フリガナで検索..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-350 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/60">
          <table className="w-full table-fixed text-sm border-collapse" style={{ minWidth: '1000px' }}>
            <colgroup>
              <col style={{ width: '160px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '130px' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 font-extrabold uppercase tracking-wider">
                <th className="px-5 py-3.5">応募者</th>
                <th className="px-5 py-3.5">応募ポジション</th>
                <th className="px-5 py-3.5">学歴</th>
                <th className="px-5 py-3.5">経歴・経験</th>
                <th className="px-5 py-3.5 text-center">選考フェーズ</th>
                <th className="px-5 py-3.5">備考メモ</th>
                <th className="px-5 py-3.5 text-right">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApplicants.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 bg-slate-50/20">対象の応募者がいません</td></tr>
              ) : filteredApplicants.map(a => {
                const posting = postings.find(p => p.id === a.jobPostingId);
                const step = statusSteps.find(s => s.key === a.status);
                return (
                  <tr key={a.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{a.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{a.nameKana} <span className="text-slate-300">|</span> {a.age}歳</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700 font-semibold text-xs">{posting?.title}</td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-500">{a.education}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-600">{a.experience}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-black rounded-lg border ${step?.color}`}>
                        {step?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400 font-medium max-w-xs truncate" title={a.memo}>{a.memo || '-'}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex gap-1.5 justify-end">
                        {!['hired', 'rejected'].includes(a.status) ? (
                          <>
                            <button
                              onClick={() => handleAdvanceStatus(a.id)}
                              className="px-2.5 py-1.5 text-[10px] font-bold bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                            >
                              進める →
                            </button>
                            <button
                              onClick={() => handleReject(a.id)}
                              className="px-2.5 py-1.5 text-[10px] font-bold bg-red-50 border border-red-200 text-red-650 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                            >
                              不採用
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-450 font-bold bg-slate-50 border px-2 py-1 rounded-lg">選考完了</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Selection Pipeline Flowchart - Redesigned to look extremely premium */}
      <Card title="選考パイプライン進捗" className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
        <p className="text-xs text-slate-400 -mt-2 mb-6">各選考ステップごとのアクティブ応募者数 (不採用を除く)</p>
        <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-50/50 rounded-2xl border gap-4">
          {statusSteps.filter(s => s.key !== 'rejected').map((s, idx, arr) => {
            const count = applicants.filter(a => a.status === s.key).length;
            return (
              <div key={s.key} className="flex flex-col md:flex-row items-center flex-1 w-full">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-black border-2 transition-all ${
                    count > 0 ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    {count}
                  </div>
                  <p className="text-[10px] text-slate-500 font-extrabold mt-2 tracking-wide text-center">{s.label}</p>
                </div>
                
                {/* Horizontal Chevron arrow on Desktop, Vertical on Mobile */}
                {idx < arr.length - 1 && (
                  <div className="flex justify-center items-center py-2 md:py-0 md:px-2 flex-shrink-0">
                    <svg className="w-5 h-5 text-slate-300 hidden md:block rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                    <svg className="w-4 h-4 text-slate-350 block md:hidden rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
