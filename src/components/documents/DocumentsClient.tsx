'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';

interface Employee {
  id: string; firstName: string; lastName: string; firstNameKana: string;
  department: string; position: string; salary: number; salaryType: string;
  joinDate?: string; birthDate?: string; address?: string;
}

interface DocRecord {
  id: string;
  employeeId: string;
  type: string;
  issuedDate: string;
  purpose: string;
  status: 'issued' | 'pending';
}

const docTypes = [
  { value: 'income', label: '収入証明書', icon: '💰' },
  { value: 'employment', label: '在籍証明書', icon: '🏢' },
  { value: 'resignation', label: '退職証明書', icon: '📄' },
  { value: 'withholding', label: '源泉徴収票', icon: '🧾' },
  { value: 'contract', label: '雇用契約書', icon: '📋' },
  { value: 'id_cert', label: '身分証明書', icon: '🪪' },
  { value: 'salary_cert', label: '給与証明書', icon: '💵' },
  { value: 'attendance_cert', label: '勤怠証明書', icon: '🕐' },
];

export default function DocumentsClient({ employees }: { employees: Employee[] }) {
  const [records, setRecords] = useState<DocRecord[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [purpose, setPurpose] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!selectedEmp || !selectedType) return;
    const newRecord: DocRecord = {
      id: `doc-${Date.now()}`,
      employeeId: selectedEmp,
      type: selectedType,
      issuedDate: new Date().toISOString().split('T')[0],
      purpose: purpose || '本人用',
      status: 'issued',
    };
    setRecords(prev => [newRecord, ...prev]);
    setGenerating(newRecord.id);
    setTimeout(() => setGenerating(null), 2000);
    setShowGenerate(false);
    setSelectedEmp('');
    setSelectedType('');
    setPurpose('');
  };

  const filtered = useMemo(() => {
    return records.filter(r => {
      const emp = employees.find(e => e.id === r.employeeId);
      const name = emp ? `${emp.lastName} ${emp.firstName}` : '';
      const matchSearch = search === '' || name.includes(search) || r.purpose.includes(search);
      const matchType = filterType === '' || r.type === filterType;
      return matchSearch && matchType;
    });
  }, [records, employees, search, filterType]);

  const stats = useMemo(() => {
    const total = records.length;
    const thisMonth = records.filter(r => {
      const now = new Date();
      const d = new Date(r.issuedDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const byType = docTypes.map(t => ({
      ...t,
      count: records.filter(r => r.type === t.value).length,
    })).filter(t => t.count > 0);
    return { total, thisMonth, byType };
  }, [records]);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-slate-500 mb-1">発行済み書類</p>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs text-slate-500 mb-1">今月発行</p>
          <p className="text-2xl font-bold text-green-600">{stats.thisMonth}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <p className="text-xs text-slate-500 mb-1">書類種別</p>
          <p className="text-2xl font-bold text-purple-600">{stats.byType.length}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <p className="text-xs text-slate-500 mb-1">対象従業員</p>
          <p className="text-2xl font-bold text-orange-600">{new Set(records.map(r => r.employeeId)).size}</p>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end">
        <button onClick={() => setShowGenerate(true)}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          書類発行
        </button>
      </div>

      {/* Generate Modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowGenerate(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">書類発行</h3>
                <button onClick={() => setShowGenerate(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">従業員</label>
                  <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    <option value="">選択してください</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.lastName} {e.firstName} ({e.department})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">書類種別</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {docTypes.map(t => (
                      <button key={t.value} onClick={() => setSelectedType(t.value)}
                        className={`p-3 rounded-lg border-2 text-left transition-colors ${selectedType === t.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                        <span className="text-lg mr-2">{t.icon}</span>
                        <span className="text-sm">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">発行目的</label>
                  <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="本人用、銀行提出用、入管提出用..." />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowGenerate(false)} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 text-sm">キャンセル</button>
                <button onClick={handleGenerate} disabled={!selectedEmp || !selectedType}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">発行</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Types Overview */}
      <Card title="書類種別">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {docTypes.map(t => (
            <div key={t.value} className="bg-slate-50 rounded-lg p-4 text-center hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => { setFilterType(filterType === t.value ? '' : t.value); }}>
              <span className="text-2xl block mb-2">{t.icon}</span>
              <p className="text-sm font-medium text-slate-700">{t.label}</p>
              <p className="text-xs text-slate-400 mt-1">{records.filter(r => r.type === t.value).length}件</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Records Table */}
      <Card title="発行履歴">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="名前・目的で検索..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">全ての書類</option>
            {docTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">書類名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">従業員</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">部署</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">発行日</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">目的</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">状態</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  {records.length === 0 ? '書類発行ボタンから書類を発行してください' : '該当するデータが見つかりません'}
                </td></tr>
              ) : filtered.map(r => {
                const emp = employees.find(e => e.id === r.employeeId);
                const dt = docTypes.find(t => t.value === r.type);
                return (
                  <tr key={r.id} className={`hover:bg-slate-50 ${generating === r.id ? 'bg-green-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{dt?.icon}</span>
                        <span className="text-sm font-medium text-slate-800">{dt?.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{emp?.lastName} {emp?.firstName}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{emp?.department}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.issuedDate}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.purpose}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs rounded ${r.status === 'issued' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {r.status === 'issued' ? '発行済み' : '処理中'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">PDF</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
