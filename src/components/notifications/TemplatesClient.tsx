'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';

interface Template {
  id: string;
  key: string;
  title: string;
  content: string;
}

const getTemplateKeyLabel = (key: string, t: any) => {
  const isVi = t('notifications.cardTitle').includes('Thông báo');
  const isEn = t('notifications.cardTitle').includes('Announcements');
  const isZh = t('notifications.cardTitle').includes('公告信息');
  const isTh = t('notifications.cardTitle').includes('ประกาศ');

  switch (key) {
    case 'RESIDENCE_EXPIRY':
      return isVi ? 'Hạn thẻ ngoại kiều / Visa (RESIDENCE_EXPIRY)' : isEn ? 'Visa Expiry Warning (RESIDENCE_EXPIRY)' : isZh ? '在留资格卡到期预警 (RESIDENCE_EXPIRY)' : isTh ? 'แจ้งเตือนวีซ่าหมดอายุ (RESIDENCE_EXPIRY)' : 'Passport / Visa Expiry (在留カード期限)';
    case 'CONTRACT_EXPIRY':
      return isVi ? 'Hết hạn hợp đồng lao động (CONTRACT_EXPIRY)' : isEn ? 'Contract Expiry (CONTRACT_EXPIRY)' : isZh ? '劳动合同到期提醒 (CONTRACT_EXPIRY)' : isTh ? 'แจ้งเตือนสัญญาจ้างหมดอายุ (CONTRACT_EXPIRY)' : 'Contract Expiry (契約満了時)';
    case 'BIRTHDAY':
      return isVi ? 'Chúc mừng sinh nhật nhân viên (BIRTHDAY)' : isEn ? 'Employee Birthday Greeting (BIRTHDAY)' : isZh ? '员工生日祝福 (BIRTHDAY)' : isTh ? 'อวยพรวันเกิดพนักงาน (BIRTHDAY)' : 'Employee Birthday (誕生日祝い)';
    case 'DEPENDENT_BIRTHDAY':
      return isVi ? 'Chúc mừng sinh nhật người thân (DEPENDENT_BIRTHDAY)' : isEn ? 'Family Birthday Greeting (DEPENDENT_BIRTHDAY)' : isZh ? '家属生日祝福 (DEPENDENT_BIRTHDAY)' : isTh ? 'อวยพรวันเกิดครอบครัวพนักงาน (DEPENDENT_BIRTHDAY)' : 'Family Birthday (家族の誕生日祝い)';
    case 'MISSING_PUNCH':
      return isVi ? 'Yêu cầu bổ sung chấm công thiếu (MISSING_PUNCH)' : isEn ? 'Missing Clock Punch Correction Request (MISSING_PUNCH)' : isZh ? '考勤缺卡异常补签提示 (MISSING_PUNCH)' : isTh ? 'ขอแก้ไขประวัติลงเวลาขาดหาย (MISSING_PUNCH)' : 'Missing Clock-in/out Punch (打刻漏れ修正依頼)';
    case 'ABSENT_NO_REASON':
      return isVi ? 'Cảnh báo tự ý nghỉ việc không lý do (ABSENT_NO_REASON)' : isEn ? 'Consecutive Unexcused Absence Warning (ABSENT_NO_REASON)' : isZh ? '无故缺勤/旷工警告 (ABSENT_NO_REASON)' : isTh ? 'ตักเตือนการขาดงานโดยไม่แจ้งล่วงหน้า (ABSENT_NO_REASON)' : 'Consecutive Absence Warning (無断欠勤警告)';
    default:
      return key;
  }
};

const getText = (key: string, t: any) => {
  const isVi = t('notifications.cardTitle').includes('Thông báo');
  const isEn = t('notifications.cardTitle').includes('Announcements');
  const isZh = t('notifications.cardTitle').includes('公告信息');
  const isTh = t('notifications.cardTitle').includes('ประกาศ');

  switch (key) {
    case 'title':
      return isVi ? '✉️ Thiết lập mẫu tin nhắn thông báo & Cảnh báo' : isEn ? '✉️ Notification & Alert Message Templates' : isZh ? '✉️ 系统通知与预警发信模板配置' : isTh ? '✉️ ตั้งค่าแม่แบบข้อความแจ้งเตือน & ข้อความเตือน' : '✉️ 通知メッセージ・アラート文章テンプレート設定';
    case 'subtitle':
      return isVi ? 'Định cấu hình chi tiết tiêu đề và nội dung email/thông báo hệ thống tự động gửi cho nhân viên.' : isEn ? 'Customize the subject and content templates of emails and notification cards automatically dispatched to workers.' : isZh ? '可在此细化编辑系统自动向员工发送的公告、电子邮件或通知卡片的标题与正文模板。' : isTh ? 'แก้ไขหัวข้อและเนื้อหาในอีเมลหรือการ์ดแจ้งเตือนที่จะส่งให้พนักงานโดยอัตโนมัติ' : '自動で従業員向けに発信されるお知らせ・Eメールや通知カードの件名と本文テンプレートを細かく編集できます。';
    case 'back':
      return isVi ? '← Quay lại danh sách' : isEn ? '← Back to Notifications' : isZh ? '← 返回通知列表' : isTh ? '← กลับไปยังหน้ารายการแจ้งเตือน' : '← 通知一覧へ戻る';
    case 'labelEmail':
      return isVi ? 'Tiêu đề thông báo (Chủ đề Email)' : isEn ? 'Notification Title (Email Subject)' : isZh ? '通知标题 (邮件主题)' : isTh ? 'หัวข้อแจ้งเตือน (ชื่อเรื่องอีเมล)' : '通知タイトル（Eメール件名）';
    case 'labelBody':
      return isVi ? 'Mẫu nội dung thông báo' : isEn ? 'Notification Body Template' : isZh ? '通知正文模板' : isTh ? 'แม่แบบเนื้อหาแจ้งเตือน' : '通知本文テンプレート';
    case 'placeholderTip':
      return isVi ? '※ Các biến động hỗ trợ: {name}: Tên nhân viên, {expiry}: Ngày hết hạn, {date}: Ngày chấm công' : isEn ? '※ Dynamic placeholders: {name}: Employee Name, {expiry}: Expiry Date, {date}: Attendance Date' : isZh ? '※ 动态通配符变量: {name}: 员工姓名、{expiry}: 截止到期日、{date}: 补卡异常日期' : isTh ? '※ ตัวแปรแทนที่อัตโนมัติ: {name}: ชื่อพนักงาน, {expiry}: วันหมดอายุ, {date}: วันที่ลงเวลา' : '※ 動的プレースホルダー（差し込み変数）: {name}: 従業員名、{expiry}: 期限日、{date}: 打刻日付';
    case 'editBtn':
      return isVi ? '✏️ Chỉnh sửa mẫu' : isEn ? '✏️ Edit Template' : isZh ? '✏️ 编辑发信模板' : isTh ? '✏️ แก้ไขแม่แบบ' : '✏️ テンプレートを編集する';
    case 'saveBtn':
      return isVi ? '💾 Lưu thay đổi' : isEn ? '💾 Save Changes' : isZh ? '💾 保存修改' : isTh ? '💾 บันทึกการเปลี่ยนแปลง' : '💾 変更を保存';
    case 'errorEmpty':
      return isVi ? 'Vui lòng nhập tiêu đề và nội dung.' : isEn ? 'Please fill in both title and content.' : isZh ? '请填写模板标题与正文内容。' : isTh ? 'กรุณากรอกหัวข้อและเนื้อหา' : 'タイトルと内容を入力してください。';
    case 'errorUpdate':
      return isVi ? 'Cập nhật mẫu thất bại.' : isEn ? 'Failed to update template.' : isZh ? '模板更新失败。' : isTh ? 'อัปเดตแม่แบบไม่สำเร็จ' : 'テンプレートの更新に失敗しました。';
    case 'successSave':
      return isVi ? 'Đã lưu mẫu thông báo.' : isEn ? 'Template saved successfully.' : isZh ? '模板配置保存成功。' : isTh ? 'บันทึกการตั้งค่าแม่แบบสำเร็จ' : 'テンプレート設定を保存しました。';
    default:
      return key;
  }
};

export default function TemplatesClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const startEdit = (tItem: Template) => {
    setEditingId(tItem.id);
    setEditForm({ title: tItem.title, content: tItem.content });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: '', content: '' });
  };

  const handleSave = async (id: string) => {
    if (!editForm.title || !editForm.content) {
      showMessage('error', getText('errorEmpty', t));
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
        throw new Error(body.error || getText('errorUpdate', t));
      }

      setTemplates(prev =>
        prev.map(tItem => (tItem.id === id ? { ...tItem, title: editForm.title, content: editForm.content } : tItem))
      );
      setEditingId(null);
      showMessage('success', getText('successSave', t));
      router.refresh();
    } catch (e: any) {
      showMessage('error', e.message || (locale === 'ja' ? 'エラーが発生しました。' : 'An error occurred.'));
    } finally {
      setSavingId(null);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const isVi = t('notifications.cardTitle').includes('Thông báo');
  const isEn = t('notifications.cardTitle').includes('Announcements');
  const isZh = t('notifications.cardTitle').includes('公告信息');
  const isTh = t('notifications.cardTitle').includes('ประกาศ');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Alert Notification */}
      {message && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-fadeIn transition-all shadow-md ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-805 border-emerald-255' : 'bg-rose-50 text-rose-805 border-rose-255'
        }`}>
          <span className="text-lg">{message.type === 'success' ? '✅' : '⚠️'}</span>
          <p className="text-xs font-bold">{message.text}</p>
        </div>
      )}

      {/* Intro Card */}
      <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{getText('title', t)}</h3>
            <p className="text-xs text-slate-500 mt-1 font-semibold leading-relaxed">
              {getText('subtitle', t)}
            </p>
          </div>
          <a
            href="/notifications"
            className="px-4 py-2 border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            {getText('back', t)}
          </a>
        </div>
      </Card>

      {/* Templates List */}
      <div className="grid grid-cols-1 gap-6">
        {templates.map(tItem => {
          const isEditing = editingId === tItem.id;
          const isSaving = savingId === tItem.id;
          const keyLabel = getTemplateKeyLabel(tItem.key, t);

          return (
            <Card key={tItem.id} title={keyLabel} className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
              {isEditing ? (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">{getText('labelEmail', t)}</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">{getText('labelBody', t)}</label>
                    <textarea
                      rows={4}
                      value={editForm.content}
                      onChange={e => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed text-slate-800 bg-white resize-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-1.5 block font-bold leading-normal">
                      {getText('placeholderTip', t)}
                    </span>
                  </div>

                  <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 mt-4">
                    <button
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {t('notifications.cancelBtn')}
                    </button>
                    <button
                      onClick={() => handleSave(tItem.id)}
                      disabled={isSaving}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      {isSaving ? '...' : getText('saveBtn', t)}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-200/60 space-y-3 shadow-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">件名 / Title</span>
                      <p className="text-sm font-extrabold text-slate-800 mt-0.5">{tItem.title}</p>
                    </div>
                    <div className="border-t border-slate-200/60 pt-2.5">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">本文 / Content</span>
                      <p className="text-xs text-slate-650 leading-relaxed font-semibold whitespace-pre-line mt-1">{tItem.content}</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={() => startEdit(tItem)}
                      className="px-3.5 py-2 border border-slate-250 hover:bg-slate-50 text-slate-705 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {getText('editBtn', t)}
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
