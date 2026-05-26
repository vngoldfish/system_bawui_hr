'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/common/Card';

interface Template {
  id: string;
  key: string;
  title: string;
  content: string;
}

const TEMPLATE_KEYS_JP: Record<string, string> = {
  RESIDENCE_EXPIRY: 'Passport / Visa Expiry (在留カード期限)',
  CONTRACT_EXPIRY: 'Contract Expiry (契約満了時)',
  BIRTHDAY: 'Employee Birthday (誕生日祝い)',
  DEPENDENT_BIRTHDAY: 'Family Birthday (家族の誕生日祝い)',
  MISSING_PUNCH: 'Missing Clock-in/out Punch (打刻漏れ修正依頼)',
  ABSENT_NO_REASON: 'Consecutive Absence Warning (無断欠勤警告)',
};

export default function TemplatesClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setEditForm({ title: t.title, content: t.content });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: '', content: '' });
  };

  const handleSave = async (id: string) => {
    if (!editForm.title || !editForm.content) {
      showMessage('error', 'タイトルと内容を入力してください。');
      return;
    }

    setSavingId(id);
    try {
      const res = await fetch('/api/reminder-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title: editForm.title,
          content: editForm.content,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'テンプレートの更新に失敗しました。');
      }

      setTemplates(prev =>
        prev.map(t => (t.id === id ? { ...t, title: editForm.title, content: editForm.content } : t))
      );
      setEditingId(null);
      showMessage('success', 'テンプレート設定を保存しました。');
      router.refresh();
    } catch (e: any) {
      showMessage('error', e.message || 'エラーが発生しました。');
    } finally {
      setSavingId(null);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Alert Notification */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fadeIn transition-all shadow-md ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span className="text-lg">{message.type === 'success' ? '✅' : '⚠️'}</span>
          <p className="text-sm font-bold">{message.text}</p>
        </div>
      )}

      {/* Intro Card */}
      <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">✉️ 通知メッセージ・アラート文章テンプレート設定</h3>
            <p className="text-xs text-slate-500 mt-1">
              自動で従業員向けに発信されるお知らせ・Eメールや通知カードの件名と本文テンプレートを細かく編集できます。
            </p>
          </div>
          <a
            href="/notifications"
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            ← 通知一覧へ戻る
          </a>
        </div>
      </Card>

      {/* Templates List */}
      <div className="grid grid-cols-1 gap-6">
        {templates.map(t => {
          const isEditing = editingId === t.id;
          const isSaving = savingId === t.id;
          const keyLabel = TEMPLATE_KEYS_JP[t.key] || t.key;

          return (
            <Card key={t.id} title={keyLabel} className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
              {isEditing ? (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">通知タイトル（Eメール件名）</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">通知本文テンプレート</label>
                    <textarea
                      rows={4}
                      value={editForm.content}
                      onChange={e => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 mt-1.5 block font-medium">
                      ※ 動的プレースホルダー（差し込み変数）: <code className="bg-slate-100 border px-1 py-0.5 rounded text-blue-600 font-mono font-bold">{`{name}`}</code>: 従業員名、<code className="bg-slate-100 border px-1 py-0.5 rounded text-blue-600 font-mono font-bold">{`{expiry}`}</code>: 期限日、<code className="bg-slate-100 border px-1 py-0.5 rounded text-blue-600 font-mono font-bold">{`{date}`}</code>: 打刻日付
                    </span>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => handleSave(t.id)}
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      {isSaving ? '保存中...' : '💾 変更を保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">件名 / Title</span>
                      <p className="text-sm font-extrabold text-slate-800 mt-0.5">{t.title}</p>
                    </div>
                    <div className="border-t border-slate-200/60 pt-2.5">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">本文 / Content</span>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold whitespace-pre-line mt-1">{t.content}</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => startEdit(t)}
                      className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      ✏️ テンプレートを編集する
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
