'use client';
import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

export default function PayrollSummaryPage() {
  const [month, setMonth] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async (m: string) => {
    if (!m) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/company-cost-summary?month=${m}`);
      const json = await res.json();
      setData(json.data);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setMonth(new Date().toISOString().slice(0, 7));
  }, []);

  useEffect(() => {
    if (month) {
      fetchSummary(month);
    }
  }, [month]);

  if (!data) return <div className="p-8">Loading...</div>;

  const totalInsurance =
    (data.breakdown.healthInsurance || 0) +
    (data.breakdown.pension || 0) +
    (data.breakdown.employmentInsurance || 0) +
    (data.breakdown.workersComp || 0);

  return (
        <div className="p-8 max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">会社負担 給受サマリー</h1>

          <div className="mb-6">
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border px-4 py-2 rounded" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg border">
              <div className="text-sm text-slate-500">対象社員数</div>
              <div className="text-3xl font-bold mt-2">{data.totalEmployees}名</div>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <div className="text-sm text-slate-500">総支給額</div>
              <div className="text-3xl font-bold mt-2 text-green-600">{formatCurrency(data.totalGross)}</div>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <div className="text-sm text-slate-500">会社負担合計</div>
              <div className="text-3xl font-bold mt-2 text-blue-600">{formatCurrency(data.totalCompanyCost)}</div>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <div className="text-sm text-slate-500">1人平均負担</div>
              <div className="text-3xl font-bold mt-2">{formatCurrency(Math.round(data.totalCompanyCost / data.totalEmployees))}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">保険別 会社負担内訳</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">保険種類</th>
                  <th className="text-right py-3">会社負担額</th>
                  <th className="text-right py-3">割合</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="py-3">健康保険</td><td className="text-right">{formatCurrency(data.breakdown.healthInsurance)}</td><td className="text-right text-sm text-slate-500">{totalInsurance > 0 ? ((data.breakdown.healthInsurance/totalInsurance)*100).toFixed(1) : '0.0'}%</td></tr>
                <tr className="border-b"><td className="py-3">厚生年金</td><td className="text-right">{formatCurrency(data.breakdown.pension)}</td><td className="text-right text-sm text-slate-500">{totalInsurance > 0 ? ((data.breakdown.pension/totalInsurance)*100).toFixed(1) : '0.0'}%</td></tr>
                <tr className="border-b"><td className="py-3">雇用保険</td><td className="text-right">{formatCurrency(data.breakdown.employmentInsurance)}</td><td className="text-right text-sm text-slate-500">{totalInsurance > 0 ? ((data.breakdown.employmentInsurance/totalInsurance)*100).toFixed(1) : '0.0'}%</td></tr>
                <tr className="border-b"><td className="py-3">労災保険</td><td className="text-right">{formatCurrency(data.breakdown.workersComp)}</td><td className="text-right text-sm text-slate-500">{totalInsurance > 0 ? ((data.breakdown.workersComp/totalInsurance)*100).toFixed(1) : '0.0'}%</td></tr>
                <tr className="font-semibold bg-blue-50"><td className="py-3">合計</td><td className="text-right text-blue-700">{formatCurrency(totalInsurance)}</td><td className="text-right">100%</td></tr>
              </tbody>
            </table>
          </div>

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">社員別 会社負担一覧</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left py-2">社員名</th><th className="text-right py-2">健康保険</th><th className="text-right py-2">厚生年金</th><th className="text-right py-2">雇用保険</th><th className="text-right py-2">労災保険</th><th className="text-right py-2 font-semibold">合計</th></tr></thead>
          <tbody>
            {data.records.map((r: any) => (
              <tr key={r.employeeId} className="border-b">
                <td className="py-2">{r.employeeName}</td>
                <td className="text-right">{formatCurrency(r.breakdown.healthInsurance)}</td>
                <td className="text-right">{formatCurrency(r.breakdown.pension)}</td>
                <td className="text-right">{formatCurrency(r.breakdown.employmentInsurance)}</td>
                <td className="text-right">{formatCurrency(r.breakdown.workersComp)}</td>
                <td className="text-right font-semibold text-blue-700">{formatCurrency(r.totalCompanyCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-4">
        <button onClick={() => window.print()} className="px-6 py-2 bg-slate-800 text-white rounded">印刷 / PDF保存</button>
      </div>
    </div>
  );
}
