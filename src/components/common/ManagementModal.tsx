'use client';

import { useState, useEffect } from 'react';
import Portal from './Portal';
import { useI18n } from '@/lib/i18n';
import GenericImportModal from './GenericImportModal';


interface ManageableItem {
  id: string;
  name: string;
  nameKana: string;
  description?: string | null;
  _count?: { employees: number };
}

interface ManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  apiPath: string;
  enableImport?: boolean;
  importPayloadKey?: string;
  importTemplateJson?: string;
}

export default function ManagementModal({
  isOpen,
  onClose,
  title,
  apiPath,
  enableImport = false,
  importPayloadKey = 'data',
  importTemplateJson = '[]'
}: ManagementModalProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<ManageableItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({ name: '', nameKana: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = async () => {
    try {
      const res = await fetch(apiPath);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch {}
  };

  useEffect(() => {
    if (isOpen) fetchItems();
  }, [isOpen]);

  const resetForm = () => {
    setForm({ name: '', nameKana: '', description: '' });
    setEditingId(null);
    setShowAdd(false);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.nameKana.trim()) {
      setError(t('common.errorNameKanaRequired'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const url = editingId ? `${apiPath}/${editingId}` : apiPath;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t('common.saveError'));
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
    if (!confirm(t('common.deleteConfirm'))) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiPath}/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t('common.deleteError'));
      }
      await fetchItems();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: ManageableItem) => {
    setEditingId(item.id);
    setForm({ name: item.name, nameKana: item.nameKana, description: item.description || '' });
    setShowAdd(true);
    setError('');
  };

  if (!isOpen) return null;

  const inputCls = "premium-input w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all";

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto flex flex-col border border-slate-100 animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <h2 className="text-base font-extrabold text-slate-800 tracking-wide">{t('common.manageTitle').replace('{title}', title)}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-655 flex items-center justify-center text-lg leading-none hover:bg-slate-50 transition-colors cursor-pointer">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Add/Import buttons */}
          {!showAdd && (
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAdd(true); setEditingId(null); setForm({ name: '', nameKana: '', description: '' }); }}
                className="flex-1 px-4 py-3 border-2 border-dashed border-slate-200/80 rounded-xl text-xs font-bold text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-all hover:bg-slate-50/50 cursor-pointer"
              >
                {t('common.addNew')}
              </button>
              {enableImport && (
                <button
                  onClick={() => setImportOpen(true)}
                  className="px-4 py-3 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-655 hover:text-blue-600 transition-all hover:shadow-xs cursor-pointer flex items-center justify-center gap-1"
                >
                  📥 {t('common.import') || 'Import'}
                </button>
              )}
            </div>
          )}

          {/* Add/Edit form */}
          {showAdd && (
            <div className="border border-blue-200/60 rounded-2xl p-4 bg-blue-50/20 space-y-3.5">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                {editingId ? t('common.edit') : t('common.addTitle')}
              </h3>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('common.colName')}</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('common.placeholderName')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('common.colKana')}</label>
                  <input type="text" value={form.nameKana} onChange={e => setForm(f => ({ ...f, nameKana: e.target.value }))} placeholder={t('common.placeholderKana')} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('common.colDescription')}</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('common.placeholderDesc')} className={inputCls} />
              </div>
              {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={resetForm} className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-650 transition-colors cursor-pointer">{t('common.cancel')}</button>
                <button onClick={handleSave} disabled={loading} className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md">
                  {editingId ? t('common.save') : t('common.add')}
                </button>
              </div>
            </div>
          )}

          {/* List */}
          <div className="space-y-2.5">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/50 hover:bg-slate-50/80 transition-colors">
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-extrabold text-slate-800 tracking-wide">{item.name}</p>
                  <p className="text-xs text-slate-450 mt-1 font-semibold">{item.nameKana}{item.description ? ` — ${item.description}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item._count && (
                    <span className="text-xs font-bold bg-white px-2.5 py-1.5 border border-slate-200/60 rounded-xl text-slate-455 shadow-xs mr-1">{t('common.peopleCount').replace('{count}', String(item._count.employees))}</span>
                  )}
                  <button onClick={() => startEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all cursor-pointer" title={t('common.edit')}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all cursor-pointer" title={t('common.delete')}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/20">{t('common.noData')}</p>
            )}
          </div>
        </div>
      </div>
      {enableImport && (
        <GenericImportModal
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          onSuccess={fetchItems}
          apiPath={`${apiPath}/import`}
          payloadKey={importPayloadKey}
          templateJson={importTemplateJson}
          title={t('common.importItemsTitle')?.replace('{title}', title) || `Import ${title}`}
          description={t('common.importItemsDesc')?.replace('{title}', title) || `Upload a JSON file containing a list of ${title} to import them.`}
        />
      )}
    </div>
    </Portal>
  );
}


