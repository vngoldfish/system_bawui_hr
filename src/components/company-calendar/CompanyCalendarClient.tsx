'use client';

import { useEffect, useMemo, useState } from 'react';
import Card from '@/components/common/Card';
import ExportButtons from '@/components/common/ExportButtons';
import { useI18n } from '@/lib/i18n';

interface HolidayItem {
  id: string;
  date: string;
  name: string;
  type: string;
  isPaidHoliday: boolean;
  isActive: boolean;
  notes?: string;
}

const HOLIDAY_TYPES = [
  { value: 'NATIONAL', label: '祝日' },
  { value: 'COMPANY', label: '会社休業日' },
  { value: 'RED_DAY', label: '赤日' },
];

function formatDateInput(value: string | Date): string {
  if (typeof value === 'string') return value.split('T')[0];
  return value.toISOString().split('T')[0];
}

export default function CompanyCalendarClient({ initialYear }: { initialYear: number }) {
  const { t } = useI18n();
  const [year, setYear] = useState(initialYear);
  const [items, setItems] = useState<HolidayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: '',
    name: '',
    type: 'NATIONAL',
    isPaidHoliday: false,
    isActive: true,
    notes: '',
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/holidays?year=${year}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setItems(
        list.map((h: HolidayItem & { date: string | Date }) => ({
          ...h,
          date: formatDateInput(h.date),
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [year]);

  const resetForm = () => {
    setForm({ date: '', name: '', type: 'NATIONAL', isPaidHoliday: false, isActive: true, notes: '' });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleSave = async () => {
    if (!form.date || !form.name.trim()) {
      setError(t('companyCalendar.errorRequired') || '日付と名称は必須です');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const url = editingId ? `/api/holidays/${editingId}` : '/api/holidays';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || 'Save failed');
      }
      await fetchItems();
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.deleteConfirm') || '削除しますか？')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchItems();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleImportJp = async () => {
    if (!confirm(t('companyCalendar.importConfirm') || '2026年の日本の祝日をインポートしますか？')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/holidays/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, preset: 'jp_2026' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      alert(
        `${t('companyCalendar.importDone') || '完了'}: +${data.data?.created ?? data.created ?? 0}, skip ${data.data?.skipped ?? data.skipped ?? 0}`
      );
      await fetchItems();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: HolidayItem) => {
    setEditingId(item.id);
    setForm({
      date: item.date,
      name: item.name,
      type: item.type || 'NATIONAL',
      isPaidHoliday: item.isPaidHoliday,
      isActive: item.isActive,
      notes: item.notes || '',
    });
    setShowForm(true);
  };

  const stats = useMemo(() => {
    const active = items.filter(i => i.isActive);
    return {
      total: active.length,
      national: active.filter(i => i.type === 'NATIONAL').length,
      company: active.filter(i => i.type === 'COMPANY' || i.type === 'RED_DAY').length,
      paid: active.filter(i => i.isPaidHoliday).length,
    };
  }, [items]);

  const calendarGrid = useMemo(() => {
    const byMonth: Record<number, HolidayItem[]> = {};
    for (let m = 1; m <= 12; m++) byMonth[m] = [];
    items
      .filter(i => i.isActive && i.date.startsWith(String(year)))
      .forEach(h => {
        const m = Number(h.date.split('-')[1]);
        byMonth[m].push(h);
      });
    return byMonth;
  }, [items, year]);

  const inputCls =
    'premium-input w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">{t('companyCalendar.statsTotal') || '休日数'}</p>
          <p className="text-2xl font-black text-slate-800">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">{t('companyCalendar.statsNational') || '祝日'}</p>
          <p className="text-2xl font-black text-rose-700">{stats.national}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">{t('companyCalendar.statsCompany') || '会社休'}</p>
          <p className="text-2xl font-black text-amber-700">{stats.company}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase">{t('companyCalendar.statsPaid') || '有給祝日'}</p>
          <p className="text-2xl font-black text-emerald-700">{stats.paid}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-slate-600">{t('companyCalendar.year') || '年'}:</label>
            <input
              type="number"
              min={2020}
              max={2035}
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-24"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleImportJp}
              disabled={loading || year !== 2026}
              className="px-3 py-2 text-xs font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 cursor-pointer"
            >
              {t('companyCalendar.importJp') || '🇯🇵 祝日インポート (2026)'}
            </button>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setForm({ date: '', name: '', type: 'NATIONAL', isPaidHoliday: false, isActive: true, notes: '' });
              }}
              className="px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer"
            >
              {t('common.addNew') || '+ 追加'}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="border border-blue-200 rounded-2xl p-4 mb-4 bg-blue-50/20 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500">{t('companyCalendar.colDate') || '日付'}</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">{t('companyCalendar.colName') || '名称'}</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">{t('companyCalendar.colType') || '区分'}</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
                  {HOLIDAY_TYPES.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs font-bold">
                <input type="checkbox" checked={form.isPaidHoliday} onChange={e => setForm(f => ({ ...f, isPaidHoliday: e.target.checked }))} />
                {t('companyCalendar.paidHoliday') || '有給'}
              </label>
              <label className="flex items-center gap-2 text-xs font-bold">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                {t('companyCalendar.active') || '有効'}
              </label>
            </div>
            {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={resetForm} className="px-3 py-2 text-xs border rounded-xl cursor-pointer">{t('form.cancel')}</button>
              <button onClick={handleSave} disabled={loading} className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl cursor-pointer">{t('form.save') || '保存'}</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
            <div key={month} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <p className="text-xs font-black text-slate-700 mb-2">{month}{t('companyCalendar.monthSuffix') || '月'}</p>
              <div className="space-y-1 min-h-[60px]">
                {(calendarGrid[month] || []).sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                  <div key={h.id} className="flex items-center justify-between gap-2 text-[11px] bg-white rounded-lg px-2 py-1 border border-slate-100">
                    <span>
                      <span className="font-mono font-bold text-slate-600">{h.date.slice(5)}</span>{' '}
                      <span className="font-bold text-slate-800">{h.name}</span>
                    </span>
                    <span className="flex gap-1">
                      <button onClick={() => startEdit(h)} className="text-blue-600 cursor-pointer">✎</button>
                      <button onClick={() => handleDelete(h.id)} className="text-rose-600 cursor-pointer">×</button>
                    </span>
                  </div>
                ))}
                {(calendarGrid[month] || []).length === 0 && (
                  <p className="text-[10px] text-slate-400">—</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title={t('companyCalendar.listTitle') || '休日一覧'}
        action={
          <ExportButtons
            data={items.map(h => ({ date: h.date, name: h.name, type: h.type, paid: h.isPaidHoliday ? 'Y' : 'N' }))}
            columns={[
              { header: 'Date', key: 'date' },
              { header: 'Name', key: 'name' },
              { header: 'Type', key: 'type' },
              { header: 'Paid', key: 'paid' },
            ]}
            fileName={`company_holidays_${year}`}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2 px-3">{t('companyCalendar.colDate')}</th>
                <th className="py-2 px-3">{t('companyCalendar.colName')}</th>
                <th className="py-2 px-3">{t('companyCalendar.colType')}</th>
                <th className="py-2 px-3">{t('companyCalendar.paidHoliday')}</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(h => (
                <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono">{h.date}</td>
                  <td className="py-2 px-3 font-bold">{h.name}</td>
                  <td className="py-2 px-3">{h.type}</td>
                  <td className="py-2 px-3">{h.isPaidHoliday ? '✓' : '—'}</td>
                  <td className="py-2 px-3 text-right">
                    <button onClick={() => startEdit(h)} className="text-blue-600 text-xs mr-2 cursor-pointer">{t('common.edit')}</button>
                    <button onClick={() => handleDelete(h.id)} className="text-rose-600 text-xs cursor-pointer">{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}