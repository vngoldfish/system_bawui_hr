'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/common/Card';
import ExportButtons from '@/components/common/ExportButtons';
import { useI18n } from '@/lib/i18n';

interface DispatchRow {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  contractType: string;
  category: string;
  workDays: number;
  workHours: number;
  overtimeHours: number;
  absentDays: number;
}

interface DispatchTotals {
  employees: number;
  workHours: number;
  workDays: number;
}

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function DispatchReportClient() {
  const { t } = useI18n();
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth);
  const [rows, setRows] = useState<DispatchRow[]>([]);
  const [totals, setTotals] = useState<DispatchTotals>({ employees: 0, workHours: 0, workDays: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async (month: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/dispatch-report?month=${month}`);
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || payload.details || 'Failed to load report');
      }
      const data = payload.data || payload;
      setRows(data.rows || []);
      setTotals(data.totals || { employees: 0, workHours: 0, workDays: 0 });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load report';
      setError(message);
      setRows([]);
      setTotals({ employees: 0, workHours: 0, workDays: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(selectedMonth);
  }, [selectedMonth, fetchReport]);

  const exportData = rows.map(row => ({
    employeeCode: row.employeeCode,
    name: `${row.lastName} ${row.firstName}`,
    department: row.department,
    contractType: row.contractType,
    workDays: row.workDays,
    workHours: row.workHours,
    overtimeHours: row.overtimeHours,
    absentDays: row.absentDays,
  }));

  const totalOvertime = Math.round(rows.reduce((s, r) => s + r.overtimeHours, 0) * 10) / 10;
  const totalAbsent = rows.reduce((s, r) => s + r.absentDays, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-center">
          <label className="text-sm font-medium text-slate-600">{t('dispatchReport.month')}:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-sm premium-input"
          />
        </div>
        <ExportButtons
          data={exportData}
          columns={[
            { header: t('dispatchReport.employeeCode'), key: 'employeeCode' },
            { header: t('dispatchReport.employeeName'), key: 'name' },
            { header: t('dispatchReport.department'), key: 'department' },
            { header: t('dispatchReport.contractType'), key: 'contractType' },
            { header: t('dispatchReport.workDays'), key: 'workDays' },
            { header: t('dispatchReport.workHours'), key: 'workHours' },
            { header: t('dispatchReport.overtimeHours'), key: 'overtimeHours' },
            { header: t('dispatchReport.absentDays'), key: 'absentDays' },
          ]}
          fileName={`dispatch-report-${selectedMonth}`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t('dispatchReport.totalsEmployees'), value: String(totals.employees), color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('dispatchReport.totalsWorkDays'), value: String(totals.workDays), color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: t('dispatchReport.totalsWorkHours'), value: String(totals.workHours), color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-slate-200`}>
            <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <Card title={t('dispatchReport.title')}>
        {error && (
          <p className="mb-4 text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('dispatchReport.employeeCode')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('dispatchReport.employeeName')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('dispatchReport.department')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('dispatchReport.contractType')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('dispatchReport.workDays')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('dispatchReport.workHours')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('dispatchReport.overtimeHours')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('dispatchReport.absentDays')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      {t('dispatchReport.noData')}
                    </td>
                  </tr>
                ) : (
                  <>
                    {rows.map(row => (
                      <tr key={row.employeeId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono text-slate-700">{row.employeeCode}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.lastName} {row.firstName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{row.department || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{row.contractType}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{row.workDays}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{row.workHours}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{row.overtimeHours}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{row.absentDays}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td colSpan={4} className="px-4 py-3 text-sm text-slate-700">{t('dispatchReport.totals')}</td>
                      <td className="px-4 py-3 text-sm text-right">{totals.workDays}</td>
                      <td className="px-4 py-3 text-sm text-right">{totals.workHours}</td>
                      <td className="px-4 py-3 text-sm text-right">{totalOvertime}</td>
                      <td className="px-4 py-3 text-sm text-right">{totalAbsent}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}