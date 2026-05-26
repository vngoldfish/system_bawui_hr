'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/common/Card';

interface Employee {
  id: string; firstName: string; lastName: string; department: string; position: string;
  salary: number; salaryType: string; joinDate?: string; age?: number;
}

function BarChart({ data, maxVal }: { data: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div className="space-y-3">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-slate-600 w-20 text-right">{d.label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
            <div className={`${d.color} h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
              style={{ width: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%` }}>
              <span className="text-[10px] font-medium text-white">{d.value > 0 ? d.value.toLocaleString() : ''}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let cumulative = 0;
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          {data.map(d => {
            const pct = total > 0 ? (d.value / total) * 100 : 0;
            const dasharray = `${pct} ${100 - pct}`;
            const dashoffset = 100 - cumulative;
            cumulative += pct;
            return (
              <circle key={d.label} cx="18" cy="18" r="15.9" fill="none" stroke={d.color.replace('bg-', '').replace('-500', '')}
                className={d.color} strokeWidth="3.5" strokeDasharray={dasharray} strokeDashoffset={dashoffset} />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-slate-700">{total}</span>
        </div>
      </div>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${d.color}`} />
            <span className="text-xs text-slate-600">{d.label}</span>
            <span className="text-xs font-medium text-slate-800">{d.value}名</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsClient({ employees }: { employees: Employee[] }) {
  const [selectedReport, setSelectedReport] = useState('overview');

  const reports = [
    { key: 'overview', label: '人事概要', icon: '📊' },
    { key: 'department', label: '部署分析', icon: '🏬' },
    { key: 'salary', label: '給与分析', icon: '💰' },
    { key: 'demographics', label: '人員構成', icon: '👥' },
  ];

  const stats = useMemo(() => {
    const total = employees.length;
    const totalSalary = employees.reduce((s, e) => s + e.salary, 0);
    const avgSalary = Math.round(totalSalary / total);
    const maxSalary = Math.max(...employees.map(e => e.salary));
    const minSalary = Math.min(...employees.map(e => e.salary));

    const byDept = [...new Set(employees.map(e => e.department))].map(dept => {
      const deptEmps = employees.filter(e => e.department === dept);
      return {
        department: dept,
        count: deptEmps.length,
        totalSalary: deptEmps.reduce((s, e) => s + e.salary, 0),
        avgSalary: Math.round(deptEmps.reduce((s, e) => s + e.salary, 0) / deptEmps.length),
      };
    });

    const byPosition = [...new Set(employees.map(e => e.position))].map(pos => ({
      position: pos,
      count: employees.filter(e => e.position === pos).length,
      avgSalary: Math.round(employees.filter(e => e.position === pos).reduce((s, e) => s + e.salary, 0) / employees.filter(e => e.position === pos).length),
    }));

    const salaryRanges = [
      { label: '~25万', min: 0, max: 250000 },
      { label: '25~30万', min: 250000, max: 300000 },
      { label: '30~35万', min: 300000, max: 350000 },
      { label: '35~40万', min: 350000, max: 400000 },
      { label: '40~45万', min: 400000, max: 450000 },
      { label: '45万~', min: 450000, max: Infinity },
    ].map(r => ({
      label: r.label,
      count: employees.filter(e => e.salary >= r.min && e.salary < r.max).length,
    }));

    return { total, totalSalary, avgSalary, maxSalary, minSalary, byDept, byPosition, salaryRanges };
  }, [employees]);

  const deptColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500'];
  const posColors = ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400', 'bg-pink-400'];

  return (
    <>
      {/* Report Navigation */}
      <div className="flex gap-2 flex-wrap">
        {reports.map(r => (
          <button key={r.key} onClick={() => setSelectedReport(r.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedReport === r.key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            <span>{r.icon}</span>
            {r.label}
          </button>
        ))}
      </div>

      {/* Overview Report */}
      {selectedReport === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: '総従業員数', value: `${stats.total}名`, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: '給与合計', value: `¥${stats.totalSalary.toLocaleString()}`, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: '平均給与', value: `¥${stats.avgSalary.toLocaleString()}`, color: 'text-green-600', bg: 'bg-green-50' },
              { label: '最高給与', value: `¥${stats.maxSalary.toLocaleString()}`, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: '最低給与', value: `¥${stats.minSalary.toLocaleString()}`, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-200`}>
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="部署別人数">
              <BarChart data={stats.byDept.map((d, i) => ({ label: d.department, value: d.count, color: deptColors[i % deptColors.length] }))}
                maxVal={Math.max(...stats.byDept.map(d => d.count))} />
            </Card>
            <Card title="役職別人数">
              <BarChart data={stats.byPosition.map((d, i) => ({ label: d.position, value: d.count, color: posColors[i % posColors.length] }))}
                maxVal={Math.max(...stats.byPosition.map(d => d.count))} />
            </Card>
          </div>
        </>
      )}

      {/* Department Report */}
      {selectedReport === 'department' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.byDept.map((dept, i) => (
              <Card key={dept.department} title="">
                <div className="p-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg ${deptColors[i % deptColors.length]} flex items-center justify-center text-white font-bold`}>
                      {dept.department.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">{dept.department}</h3>
                      <p className="text-xs text-slate-400">{dept.count}名</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">人数</p>
                      <p className="text-lg font-bold text-slate-700">{dept.count}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">平均給与</p>
                      <p className="text-lg font-bold text-blue-600">¥{Math.round(dept.avgSalary / 10000)}万</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">給与合計</p>
                      <p className="text-lg font-bold text-purple-600">¥{Math.round(dept.totalSalary / 10000)}万</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>会社負担 (15.05%)</span>
                      <span>¥{Math.round(dept.totalSalary * 0.1505).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>総人件費</span>
                      <span className="font-bold">¥{Math.round(dept.totalSalary * 1.1505).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card title="部署別 給与比較">
            <BarChart data={stats.byDept.map((d, i) => ({ label: d.department, value: d.avgSalary, color: deptColors[i % deptColors.length] }))}
              maxVal={Math.max(...stats.byDept.map(d => d.avgSalary))} />
          </Card>
        </>
      )}

      {/* Salary Report */}
      {selectedReport === 'salary' && (
        <>
          <Card title="給与分布">
            <BarChart data={stats.salaryRanges.map((d, i) => ({
              label: d.label, value: d.count, color: ['bg-blue-400', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700', 'bg-blue-800', 'bg-blue-900'][i],
            }))} maxVal={Math.max(...stats.salaryRanges.map(d => d.count))} />
          </Card>

          <Card title="役職別 給与分析">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: '750px' }}>
                <colgroup>
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '150px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">役職</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">人数</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">平均給与</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">最高</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">最低</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">給与合計</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.byPosition.map(pos => {
                    const posEmps = employees.filter(e => e.position === pos.position);
                    return (
                      <tr key={pos.position} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{pos.position}</td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">{pos.count}名</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-blue-600">¥{pos.avgSalary.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-sm text-green-600">¥{Math.max(...posEmps.map(e => e.salary)).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-sm text-red-600">¥{Math.min(...posEmps.map(e => e.salary)).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">¥{(pos.avgSalary * pos.count).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="給与 TOP 5">
            <div className="space-y-3">
              {employees.sort((a, b) => b.salary - a.salary).slice(0, 5).map((e, i) => (
                <div key={e.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{e.lastName} {e.firstName}</p>
                    <p className="text-xs text-slate-400">{e.department} | {e.position}</p>
                  </div>
                  <span className="text-sm font-bold text-blue-600">¥{e.salary.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Demographics Report */}
      {selectedReport === 'demographics' && (
        <>
          <Card title="部署別 構成比">
            <DonutChart data={stats.byDept.map((d, i) => ({
              label: d.department, value: d.count, color: deptColors[i % deptColors.length],
            }))} />
          </Card>

          <Card title="役職別 構成比">
            <DonutChart data={stats.byPosition.map((d, i) => ({
              label: d.position, value: d.count, color: posColors[i % posColors.length],
            }))} />
          </Card>

          <Card title="従業員一覧 ダウンロード">
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                Excel出力
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                PDF出力
              </button>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
