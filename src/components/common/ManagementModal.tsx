'use client';

import { useState, useEffect } from 'react';
import Portal from './Portal';

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
}

export default function ManagementModal({ isOpen, onClose, title, apiPath }: ManagementModalProps) {
  const [items, setItems] = useState<ManageableItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
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
      setError('名前とカナは必須です');
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
        throw new Error(err.message || '保存に失敗しました');
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
    if (!confirm('本当に削除しますか？')) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiPath}/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || '削除に失敗しました');
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

  const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm";

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-800">{title}管理</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Add button */}
          {!showAdd && (
            <button
              onClick={() => { setShowAdd(true); setEditingId(null); setForm({ name: '', nameKana: '', description: '' }); }}
              className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600"
            >
              + 新規追加
            </button>
          )}

          {/* Add/Edit form */}
          {showAdd && (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">
                {editingId ? '編集' : '新規追加'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">名前</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="部長" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">カナ</label>
                  <input type="text" value={form.nameKana} onChange={e => setForm(f => ({ ...f, nameKana: e.target.value }))} placeholder="ぶちょう" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">説明</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="部門の最高責任者" className={inputCls} />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={resetForm} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">キャンセル</button>
                <button onClick={handleSave} disabled={loading} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {editingId ? '更新' : '追加'}
                </button>
              </div>
            </div>
          )}

          {/* List */}
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.nameKana}{item.description ? ` - ${item.description}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item._count && (
                    <span className="text-xs text-slate-400">{item._count.employees}人</span>
                  )}
                  <button onClick={() => startEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="編集">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="削除">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">データがありません</p>
            )}
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}
