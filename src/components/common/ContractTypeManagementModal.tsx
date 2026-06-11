'use client';

import { useState, useEffect } from 'react';
import Portal from './Portal';
import { useI18n } from '@/lib/i18n';

interface ContractTypeItem {
  id: string;
  name: string;
  nameKana: string;
  description?: string | null;
  defaultEndDateType: string;
  defaultSalaryType: string;
  defaultWorkDays: number[];
  defaultStandardHoursPerDay: number;
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultBreakStart: string;
  defaultBreakEnd: string;
  defaultHolidayWorkCountsAsOvertime: boolean;
  _count?: { employees: number };
}

interface ContractTypeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContractTypeManagementModal({
  isOpen,
  onClose,
}: ContractTypeManagementModalProps) {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<ContractTypeItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    nameKana: '',
    description: '',
    defaultEndDateType: 'none',
    defaultSalaryType: '月給',
    defaultWorkDays: [1, 2, 3, 4, 5] as number[],
    defaultStandardHoursPerDay: 8,
    defaultCheckIn: '08:00',
    defaultCheckOut: '17:00',
    defaultBreakStart: '12:00',
    defaultBreakEnd: '13:00',
    defaultHolidayWorkCountsAsOvertime: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const weekdayNames: Record<string, string[]> = {
    ja: ['日', '月', '火', '水', '木', '金', '土'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    vi: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    zh: ['日', '一', '二', '三', '四', '五', '六'],
    th: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
  };

  const getWeekdayLabel = (value: number) => {
    return weekdayNames[locale]?.[value] || '';
  };

  const weekdayOptions = [
    { value: 1, label: getWeekdayLabel(1) },
    { value: 2, label: getWeekdayLabel(2) },
    { value: 3, label: getWeekdayLabel(3) },
    { value: 4, label: getWeekdayLabel(4) },
    { value: 5, label: getWeekdayLabel(5) },
    { value: 6, label: getWeekdayLabel(6) },
    { value: 0, label: getWeekdayLabel(0) },
  ];

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/contract-types');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Failed to fetch contract types:', err);
    }
  };

  useEffect(() => {
    if (isOpen) fetchItems();
  }, [isOpen]);

  const resetForm = () => {
    setForm({
      name: '',
      nameKana: '',
      description: '',
      defaultEndDateType: 'none',
      defaultSalaryType: '月給',
      defaultWorkDays: [1, 2, 3, 4, 5],
      defaultStandardHoursPerDay: 8,
      defaultCheckIn: '08:00',
      defaultCheckOut: '17:00',
      defaultBreakStart: '12:00',
      defaultBreakEnd: '13:00',
      defaultHolidayWorkCountsAsOvertime: true,
    });
    setEditingId(null);
    setShowAdd(false);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.nameKana.trim()) {
      setError(t('common.errorNameKanaRequired') || '名前とフリガナは必須です');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const url = editingId ? `/api/contract-types/${editingId}` : '/api/contract-types';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || t('common.saveError') || '保存に失敗しました');
      }
      await fetchItems();
      resetForm();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.deleteConfirm') || '削除してもよろしいですか？')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contract-types/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || t('common.deleteError') || '削除に失敗しました');
      }
      await fetchItems();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: ContractTypeItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      nameKana: item.nameKana,
      description: item.description || '',
      defaultEndDateType: item.defaultEndDateType || 'none',
      defaultSalaryType: item.defaultSalaryType || '月給',
      defaultWorkDays: item.defaultWorkDays || [1, 2, 3, 4, 5],
      defaultStandardHoursPerDay: item.defaultStandardHoursPerDay || 8,
      defaultCheckIn: item.defaultCheckIn || '08:00',
      defaultCheckOut: item.defaultCheckOut || '17:00',
      defaultBreakStart: item.defaultBreakStart || '12:00',
      defaultBreakEnd: item.defaultBreakEnd || '13:00',
      defaultHolidayWorkCountsAsOvertime: item.defaultHolidayWorkCountsAsOvertime ?? true,
    });
    setShowAdd(true);
    setError('');
  };

  if (!isOpen) return null;

  const inputCls = "premium-input w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all";

  // Translate helpers
  const getSalaryTypeLabel = (type: string) => {
    if (type === '月給') return t('form.salaryTypeMonthly') || '月給';
    if (type === '日給') return t('form.salaryTypeDaily') || '日給';
    return t('form.salaryTypeHourly') || '時給';
  };

  const getEndDateTypeLabel = (type: string) => {
    return type === 'none' ? (t('form.periodIndefinite') || '無期限') : (t('form.periodFixed') || '有期限');
  };

  const formatWorkDaysLocal = (days?: number[]) => {
    const values = Array.isArray(days) ? days : [1, 2, 3, 4, 5];
    return weekdayOptions.filter(d => values.includes(d.value)).map(d => d.label).join('・') || '-';
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col border border-slate-100 animate-fadeIn">
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-md z-10">
            <h2 className="text-base font-extrabold text-slate-800 tracking-wide">
              {t('common.manageTitle')?.replace('{title}', t('form.contractType')) || `${t('form.contractType')}の管理`}
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-655 flex items-center justify-center text-lg leading-none hover:bg-slate-50 transition-colors cursor-pointer">&times;</button>
          </div>

          <div className="p-6 space-y-6">
            {/* Add button */}
            {!showAdd && (
              <button
                onClick={() => { setShowAdd(true); setEditingId(null); resetForm(); setShowAdd(true); }}
                className="w-full px-4 py-3.5 border-2 border-dashed border-slate-200/80 rounded-2xl text-xs font-bold text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-all hover:bg-slate-50/50 cursor-pointer"
              >
                {t('common.addNew') || '+ 新規追加'}
              </button>
            )}

            {/* Add/Edit form */}
            {showAdd && (
              <div className="border border-blue-200/50 rounded-3xl p-5 bg-blue-50/10 space-y-4 shadow-sm animate-fadeIn">
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  {editingId ? (t('common.edit') || '編集') : (t('common.addTitle') || '新規登録')}
                </h3>
                
                {/* Basic Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('common.colName') || '名称'}</label>
                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="正社員、パートなど" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('common.colKana') || 'フリガナ'}</label>
                    <input type="text" value={form.nameKana} onChange={e => setForm(f => ({ ...f, nameKana: e.target.value }))} placeholder="セイシャインなど" className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('common.colDescription') || '説明'}</label>
                  <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="雇用形態に関するメモ" className={inputCls} />
                </div>

                <div className="border-t border-slate-200/60 pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t('contracts.editContractTitle') || '勤務条件（デフォルト設定）'}
                  </h4>

                  {/* Conditions Defaults */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('form.contractPeriod') || '契約期間区分'}</label>
                      <select value={form.defaultEndDateType} onChange={e => setForm(f => ({ ...f, defaultEndDateType: e.target.value }))} className={inputCls}>
                        <option value="none">{t('form.periodIndefinite') || '無期限'}</option>
                        <option value="fixed">{t('form.periodFixed') || '有期限'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('form.salaryType') || '給与形態'}</label>
                      <select value={form.defaultSalaryType} onChange={e => setForm(f => ({ ...f, defaultSalaryType: e.target.value }))} className={inputCls}>
                        <option value="月給">{t('form.salaryTypeMonthly') || '月給'}</option>
                        <option value="日給">{t('form.salaryTypeDaily') || '日給'}</option>
                        <option value="時給">{t('form.salaryTypeHourly') || '時給'}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-2 uppercase">
                      {t('contracts.workdayLabel') || '契約勤務曜日'}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {weekdayOptions.map(day => {
                        const checked = form.defaultWorkDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => setForm(prev => ({
                              ...prev,
                              defaultWorkDays: checked
                                ? prev.defaultWorkDays.filter(d => d !== day.value)
                                : [...prev.defaultWorkDays, day.value].sort(),
                            }))}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-black transition-all cursor-pointer ${checked ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 mb-1.5 uppercase">{t('contracts.hoursPerDayLabel') || '所定時間/日'}</label>
                      <input type="number" min="0" max="24" step="0.5" value={form.defaultStandardHoursPerDay} onChange={e => setForm(prev => ({ ...prev, defaultStandardHoursPerDay: Number(e.target.value) }))} className="w-full px-2 py-2 border border-slate-350 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 mb-1.5 uppercase">{t('contracts.checkinLabel') || '出勤'}</label>
                      <input type="time" value={form.defaultCheckIn} onChange={e => setForm(prev => ({ ...prev, defaultCheckIn: e.target.value }))} className="w-full px-2 py-2 border border-slate-350 rounded-lg text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 mb-1.5 uppercase">{t('contracts.checkoutLabel') || '退勤'}</label>
                      <input type="time" value={form.defaultCheckOut} onChange={e => setForm(prev => ({ ...prev, defaultCheckOut: e.target.value }))} className="w-full px-2 py-2 border border-slate-350 rounded-lg text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 mb-1.5 uppercase">{t('contracts.breakstartLabel') || '休憩開始'}</label>
                      <input type="time" value={form.defaultBreakStart} onChange={e => setForm(prev => ({ ...prev, defaultBreakStart: e.target.value }))} className="w-full px-2 py-2 border border-slate-350 rounded-lg text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 mb-1.5 uppercase">{t('contracts.breakendLabel') || '休憩終了'}</label>
                      <input type="time" value={form.defaultBreakEnd} onChange={e => setForm(prev => ({ ...prev, defaultBreakEnd: e.target.value }))} className="w-full px-2 py-2 border border-slate-350 rounded-lg text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                  </div>

                  <label className="flex items-center justify-between gap-4 p-3 rounded-xl border border-rose-150 bg-rose-50/30 cursor-pointer">
                    <div>
                      <p className="text-xs font-black text-rose-800">{t('contracts.holidayOtSwitch') || '赤日・祝日に働いた時間を残業扱いにする'}</p>
                    </div>
                    <input type="checkbox" checked={form.defaultHolidayWorkCountsAsOvertime} onChange={e => setForm(prev => ({ ...prev, defaultHolidayWorkCountsAsOvertime: e.target.checked }))} className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer" />
                  </label>
                </div>

                {error && <p className="text-xs font-bold text-rose-650 bg-rose-50 p-2.5 rounded-xl border border-rose-150">{error}</p>}
                
                <div className="flex gap-2.5 justify-end pt-2 border-t border-slate-200/50">
                  <button onClick={resetForm} className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-650 transition-colors cursor-pointer">{t('form.cancel') || 'キャンセル'}</button>
                  <button onClick={handleSave} disabled={loading} className="px-5 py-2 text-xs font-black bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs">
                    {editingId ? (t('form.update') || '更新') : (t('form.create') || '追加')}
                  </button>
                </div>
              </div>
            )}

            {/* List of items */}
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 hover:bg-slate-50/80 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-extrabold text-slate-800 tracking-wide">{item.name}</p>
                        <span className="text-[9px] font-mono bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-500 flex items-center gap-1 select-all">
                          ID: {item.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-450 mt-0.5 font-bold">{item.nameKana}{item.description ? ` — ${item.description}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item._count && (
                        <span className="text-xs font-bold bg-white px-2.5 py-1.5 border border-slate-200/60 rounded-xl text-slate-455 shadow-xs mr-1">
                          {t('common.peopleCount')?.replace('{count}', String(item._count.employees)) || `${item._count.employees}人`}
                        </span>
                      )}
                      <button onClick={() => startEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all cursor-pointer" title={t('common.edit') || '編集'}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-650 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all cursor-pointer" title={t('common.delete') || '削除'}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Display of default conditions */}
                  <div className="mt-3.5 pt-3 border-t border-slate-200/50 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
                    <span className="bg-slate-200/50 px-2 py-1 rounded-lg">
                      {t('form.contractPeriod') || '期間'}: {getEndDateTypeLabel(item.defaultEndDateType)}
                    </span>
                    <span className="bg-slate-200/50 px-2 py-1 rounded-lg">
                      {t('form.salaryType') || '給与'}: {getSalaryTypeLabel(item.defaultSalaryType)}
                    </span>
                    <span className="bg-blue-50 text-blue-750 px-2 py-1 rounded-lg border border-blue-100">
                      {t('contracts.workdayLabel') || '曜日'}: {formatWorkDaysLocal(item.defaultWorkDays)} / {item.defaultStandardHoursPerDay || 8}h
                    </span>
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-100 font-mono">
                      {item.defaultCheckIn || '08:00'}～{item.defaultCheckOut || '17:00'}
                    </span>
                    <span className={`px-2 py-1 rounded-lg border ${item.defaultHolidayWorkCountsAsOvertime ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-100 text-slate-550 border-slate-200'}`}>
                      {t('contracts.holidayWorkLabel') || '祝日OT'}: {item.defaultHolidayWorkCountsAsOvertime ? (t('contracts.holidayOt') || '残業') : (t('contracts.holidayNormal') || '通常')}
                    </span>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/20">{t('common.noData') || 'データがありません'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
