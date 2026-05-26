'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';

interface Employee {
  id: string; firstName: string; lastName: string; firstNameKana: string;
  department: string; position: string;
}

interface ExpenseClaim {
  id: string;
  employeeId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  receipt: boolean;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  memo: string;
}

const categories = [
  { value: 'transport', label: '交通費', icon: '🚃' },
  { value: 'accommodation', label: '宿泊費', icon: '🏨' },
  { value: 'meal', label: '会議費・飲食費', icon: '🍽️' },
  { value: 'communication', label: '通信費', icon: '📱' },
  { value: 'supplies', label: '事務用品', icon: '📎' },
  { value: 'entertainment', label: '接待費', icon: '🤝' },
  { value: 'training', label: '研修費', icon: '📚' },
  { value: 'other', label: 'その他', icon: '📦' },
];

export default function ExpensesClient({ employees }: { employees: Employee[] }) {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formEmp, setFormEmp] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formReceipt, setFormReceipt] = useState(false);
  const [formMemo, setFormMemo] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const handleSubmit = () => {
    if (!formEmp || !formCategory || !formAmount) return;
    const newClaim: ExpenseClaim = {
      id: `exp-${Date.now()}`,
      employeeId: formEmp,
      date: formDate,
      category: formCategory,
      description: formDesc,
      amount: Number(formAmount),
      receipt: formReceipt,
      status: 'pending',
      memo: formMemo,
    };
    setClaims(prev => [newClaim, ...prev]);
    setShowForm(false);
    setFormEmp(''); setFormCategory(''); setFormDesc(''); setFormAmount(''); setFormReceipt(false); setFormMemo('');
  };

  const handleApprove = (id: string) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'approved', approvedBy: '管理者' } : c));
  };

  const handleReject = (id: string) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c));
  };

  const filtered = useMemo(() => {
    return claims.filter(c => {
      const emp = employees.find(e => e.id === c.employeeId);
      const name = emp ? `${emp.lastName} ${emp.firstName}` : '';
      const matchSearch = search === '' || name.includes(search) || c.description.includes(search);
      const matchStatus = filterStatus === '' || c.status === filterStatus;
      const matchMonth = c.date.startsWith(selectedMonth);
      return matchSearch && matchStatus && matchMonth;
    });
  }, [claims, employees, search, filterStatus, selectedMonth]);

  const stats = useMemo(() => {
    const monthClaims = claims.filter(c => c.date.startsWith(selectedMonth));
    const total = monthClaims.reduce((s, c) => s + c.amount, 0);
    const pending = monthClaims.filter(c => c.status === 'pending').length;
    const approved = monthClaims.filter(c => c.status === 'approved').length;
    const rejected = monthClaims.filter(c => c.status === 'rejected').length;
    return { total, pending, approved, rejected, count: monthClaims.length };
  }, [claims, selectedMonth]);

  const statusColor = (s: string) => {
    if (s === 'approved') return 'bg-green-100 text-green-700';
    if (s === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };
  const statusLabel = (s: string) => {
    if (s === 'approved') return '承認済み';
    if (s === 'rejected') return '却下';
    return '承認待ち';
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: '申請件数', value: `${stats.count}件`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '合計金額', value: `¥${stats.total.toLocaleString()}`, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: '承認待ち', value: `${stats.pending}件`, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: '承認済み', value: `${stats.approved}件`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '却下', value: `${stats.rejected}件`, color: 'text-red-600', bg: 'bg-red-50' },
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
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          経費申請
        </button>
      </div>

      {/* Submit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">経費申請</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">申請者</label>
                    <select value={formEmp} onChange={e => setFormEmp(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
                      <option value="">選択</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.lastName} {e.firstName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">日付</label>
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">カテゴリ</label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {categories.map(c => (
                      <button key={c.value} onClick={() => setFormCategory(c.value)}
                        className={`p-2 rounded-lg border-2 text-center text-xs transition-colors ${formCategory === c.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                        <span className="block text-lg mb-0.5">{c.icon}</span>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">金額</label>
                  <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="10000" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">内容</label>
                  <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="東京→大阪 出張交通費" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formReceipt} onChange={e => setFormReceipt(e.target.checked)} className="rounded border-slate-300" />
                    <span className="text-sm text-slate-600">領収書あり</span>
                  </label>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">メモ</label>
                  <textarea value={formMemo} onChange={e => setFormMemo(e.target.value)} rows={2}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 text-sm">キャンセル</button>
                <button onClick={handleSubmit} disabled={!formEmp || !formCategory || !formAmount}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">申請</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claims Table */}
      <Card title="経費申請一覧">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="名前・内容で検索..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">全ての状態</option>
            <option value="pending">承認待ち</option>
            <option value="approved">承認済み</option>
            <option value="rejected">却下</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: '950px' }}>
            <colgroup>
              <col style={{ width: '160px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '180px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '100px' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">申請者</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">日付</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">カテゴリ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">内容</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">金額</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">領収書</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">状態</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">経費申請がありません</td></tr>
              ) : filtered.map(c => {
                const emp = employees.find(e => e.id === c.employeeId);
                const cat = categories.find(ct => ct.value === c.category);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{emp?.lastName} {emp?.firstName}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{c.date}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{cat?.icon} {cat?.label}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{c.description}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">¥{c.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      {c.receipt ? <span className="text-green-600">✓</span> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs rounded ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.status === 'pending' && (
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleApprove(c.id)} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100">承認</button>
                          <button onClick={() => handleReject(c.id)} className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">却下</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Category Summary */}
      <Card title="カテゴリ別集計">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map(cat => {
            const total = claims.filter(c => c.category === cat.value && c.date.startsWith(selectedMonth)).reduce((s, c) => s + c.amount, 0);
            return (
              <div key={cat.value} className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                </div>
                <p className="text-lg font-bold text-slate-800">¥{total.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
