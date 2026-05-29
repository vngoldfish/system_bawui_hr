'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/common/Card';
import { getLoggedUser } from '@/lib/auth-client';
import Portal from '@/components/common/Portal';
import { useI18n } from '@/lib/i18n';

interface Notification {
  id: string;
  type: 'birthday' | 'contract' | 'probation' | 'residence' | 'evaluation' | 'training' | 'general';
  title: string;
  message: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  actionUrl?: string;
  relatedEmployee?: string;
  showSenderName?: boolean;
  senderName?: string;
}

const typeConfig = [
  { key: 'residence', label: '在留カード', icon: '🛂', color: 'bg-rose-50 border-rose-200 text-rose-700' },
  { key: 'contract', label: '契約更新', icon: '📋', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { key: 'birthday', label: '誕生日', icon: '🎂', color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { key: 'general', label: '申請・一般', icon: '📢', color: 'bg-blue-50 border-blue-200 text-blue-700' },
];

const getSummaryLabel = (key: string, t: any) => {
  const isVi = t('notifications.cardTitle').includes('Thông báo');
  const isEn = t('notifications.cardTitle').includes('Announcements');
  const isZh = t('notifications.cardTitle').includes('公告信息');
  const isTh = t('notifications.cardTitle').includes('ประกาศ');

  if (key === 'unread') return isVi ? 'Thông báo chưa đọc' : isEn ? 'Unread Notifications' : isZh ? '未读通知' : isTh ? 'การแจ้งเตือนที่ยังไม่ได้อ่าน' : '未読の通知';
  if (key === 'high') return isVi ? 'Khẩn cấp (Chưa đọc)' : isEn ? 'High Priority (Unread)' : isZh ? '高优先级 (未读)' : isTh ? 'สำคัญเร่งด่วน (ยังไม่ได้อ่าน)' : '高優先度 (未読)';
  if (key === 'starred') return isVi ? 'Đã đánh dấu sao' : isEn ? 'Starred' : isZh ? '星标重要' : isTh ? 'ติดดาวสำคัญ' : '重要マーク';
  if (key === 'total') return isVi ? 'Tổng số thông báo' : isEn ? 'Total Notifications' : isZh ? '全部通知' : isTh ? 'จำนวนการแจ้งเตือนทั้งหมด' : '全通知件数';
  return key;
};

const getPillLabel = (key: string, t: any) => {
  const isVi = t('notifications.cardTitle').includes('Thông báo');
  const isEn = t('notifications.cardTitle').includes('Announcements');
  const isZh = t('notifications.cardTitle').includes('公告信息');
  const isTh = t('notifications.cardTitle').includes('ประกาศ');

  if (key === 'all') return isVi ? '📥 Tất cả' : isEn ? '📥 All' : isZh ? '📥 全部' : isTh ? '📥 ทั้งหมด' : '📥 全て';
  if (key === 'unread') return isVi ? '🔵 Chưa đọc' : isEn ? '🔵 Unread' : isZh ? '🔵 未読のみ' : isTh ? '🔵 เฉพาะที่ยังไม่ได้อ่าน' : '🔵 未読のみ';
  if (key === 'starred') return isVi ? '⭐ Quan trọng' : isEn ? '⭐ Starred' : isZh ? '⭐ 重要' : isTh ? '⭐ สำคัญ' : '⭐ 重要';
  if (key === 'high') return isVi ? '🔴 Khẩn cấp/Cảnh báo' : isEn ? '🔴 Urgent / Warnings' : isZh ? '🔴 紧急/警告' : isTh ? '🔴 เร่งด่วน/เตือน' : '🔴 緊急・警告';
  if (key === 'visa') return isVi ? '🛂 Hạn Visa' : isEn ? '🛂 Visa Expiry' : isZh ? '🛂 签证期限' : isTh ? '🛂 วันหมดอายุวีซ่า' : '🛂 ビザ期限';
  if (key === 'contract') return isVi ? '📋 Hạn hợp đồng' : isEn ? '📋 Contract Expiry' : isZh ? '📋 合同期限' : isTh ? '📋 วันหมดอายุสัญญา' : '📋 契約期限';
  if (key === 'requests') return isVi ? '🏖️ Yêu cầu duyệt' : isEn ? '🏖️ Approvals' : isZh ? '🏖️ 审批申请' : isTh ? '🏖️ อนุมัติคำขอ' : '🏖️ 申請承認';
  if (key === 'birthday') return isVi ? '🎂 Sinh nhật' : isEn ? '🎂 Birthdays' : isZh ? '🎂 生日' : isTh ? '🎂 วันเกิด' : '🎂 誕生日';
  return key;
};

const getPaginationText = (start: number, end: number, total: number, t: any) => {
  const isVi = t('notifications.cardTitle').includes('Thông báo');
  const isEn = t('notifications.cardTitle').includes('Announcements');
  const isZh = t('notifications.cardTitle').includes('公告信息');
  const isTh = t('notifications.cardTitle').includes('ประกาศ');

  if (isVi) return `Hiển thị từ ${start} đến ${end} trong tổng số ${total} thông báo`;
  if (isEn) return `Showing ${start} to ${end} of ${total} notifications`;
  if (isZh) return `显示第 ${start} 至 ${end} 项，共 ${total} 项`;
  if (isTh) return `แสดงรายการที่ ${start} ถึง ${end} จากทั้งหมด ${total} รายการ`;
  return `全 ${total} 件中 ${start} 〜 ${end} 件を表示`;
};

const getDepartmentLabel = (dept: string, t: any) => {
  const isVi = t('notifications.cardTitle').includes('Thông báo');
  const isEn = t('notifications.cardTitle').includes('Announcements');
  const isZh = t('notifications.cardTitle').includes('公告信息');
  const isTh = t('notifications.cardTitle').includes('ประกาศ');
  if (dept === '開発部') return isVi ? 'Bộ phận phát triển' : isEn ? 'Development' : isZh ? '研发部' : isTh ? 'ฝ่ายพัฒนา' : '開発部';
  if (dept === '営業部') return isVi ? 'Bộ phận kinh doanh' : isEn ? 'Sales' : isZh ? '销售部' : isTh ? 'ฝ่ายขาย' : '営業部';
  if (dept === '経理部') return isVi ? 'Bộ phận kế toán' : isEn ? 'Accounting' : isZh ? '财务部' : isTh ? 'ฝ่ายบัญชี' : '経理部';
  if (dept === '人事部') return isVi ? 'Bộ phận nhân sự' : isEn ? 'HR' : isZh ? '人事部' : isTh ? 'ฝ่ายบุคคล' : '人事部';
  return dept;
};

const getPositionLabel = (pos: string, t: any) => {
  const isVi = t('notifications.cardTitle').includes('Thông báo');
  const isEn = t('notifications.cardTitle').includes('Announcements');
  const isZh = t('notifications.cardTitle').includes('公告信息');
  const isTh = t('notifications.cardTitle').includes('ประกาศ');
  if (pos === '課長') return isVi ? 'Trưởng phòng' : isEn ? 'Manager' : isZh ? '课长' : isTh ? 'ผู้จัดการ' : '課長';
  if (pos === '部長') return isVi ? 'Trưởng bộ phận' : isEn ? 'Director' : isZh ? '部长' : isTh ? 'ผู้อำนวยการ' : '部長';
  if (pos === '一般') return isVi ? 'Nhân viên' : isEn ? 'Staff' : isZh ? '普通员工' : isTh ? 'พนักงานทั่วไป' : '一般';
  return pos;
};

export default function NotificationsClient({
  initialNotifications = [],
}: {
  initialNotifications?: Notification[];
}) {
  const { t, locale } = useI18n();
  const isVi = t('notifications.cardTitle').includes('Thông báo');
  const isEn = t('notifications.cardTitle').includes('Announcements');
  const isZh = t('notifications.cardTitle').includes('公告信息');
  const isTh = t('notifications.cardTitle').includes('ประกาศ');
  const router = useRouter();
  const [readIds, setReadIds] = useState<string[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'high' | 'visa' | 'contract' | 'birthday' | 'requests' | 'starred'>('all');
  
  const [role, setRole] = useState<string>('EMPLOYEE');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'info',
    targetType: 'ALL',
    targetId: '',
    showSenderName: true,
  });
  const [activeDetail, setActiveDetail] = useState<Notification | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [starredIds, setStarredIds] = useState<string[]>([]);

  // Unified search filter states (Admin search)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'sender' | 'receiver' | 'content'>('sender');

  const priorityConfig = useMemo(() => ({
    high: { label: isVi ? 'Cao' : isEn ? 'High' : isZh ? '高' : isTh ? 'สูง' : '高優先度', color: 'bg-red-105 text-red-700 border-red-200 font-bold' },
    medium: { label: isVi ? 'Trung bình' : isEn ? 'Medium' : isZh ? '中' : isTh ? 'กลาง' : '中優先度', color: 'bg-amber-105 text-amber-700 border-amber-200 font-medium' },
    low: { label: isVi ? 'Thấp' : isEn ? 'Low' : isZh ? '低' : isTh ? 'ต่ำ' : '低優先度', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  }), [isVi, isEn, isZh, isTh]);

  // Load read/deleted list from localStorage safely after mount (client-side only)
  useEffect(() => {
    const storedRead = localStorage.getItem('read_notification_ids');
    if (storedRead) {
      try { setReadIds(JSON.parse(storedRead)); } catch (e) { console.error(e); }
    }
    const storedDeleted = localStorage.getItem('deleted_notification_ids');
    if (storedDeleted) {
      try { setDeletedIds(JSON.parse(storedDeleted)); } catch (e) { console.error(e); }
    }
    const storedStarred = localStorage.getItem('starred_notification_ids');
    if (storedStarred) {
      try { setStarredIds(JSON.parse(storedStarred)); } catch (e) { console.error(e); }
    }
    
    const loggedUser = getLoggedUser();
    if (loggedUser) {
      setRole(loggedUser.role);
    }
    
    setIsMounted(true);
  }, []);

  // Fetch targets for announcement targeting
  useEffect(() => {
    if (!createModalOpen) return;
    
    const fetchTargets = async () => {
      setLoadingTargets(true);
      try {
        if (newAnnouncement.targetType === 'DEPARTMENT' && departments.length === 0) {
          const res = await fetch('/api/departments');
          if (res.ok) {
            const body = await res.json();
            setDepartments(Array.isArray(body) ? body : (body.data || []));
          }
        } else if (newAnnouncement.targetType === 'POSITION' && positions.length === 0) {
          const res = await fetch('/api/positions');
          if (res.ok) {
            const body = await res.json();
            setPositions(Array.isArray(body) ? body : (body.data || []));
          }
        } else if (newAnnouncement.targetType === 'EMPLOYEE' && employees.length === 0) {
          const res = await fetch('/api/employees?limit=100');
          if (res.ok) {
            const body = await res.json();
            setEmployees(body.data || body);
          }
        }
      } catch (e) {
        console.error('Failed to fetch targets', e);
      } finally {
        setLoadingTargets(false);
      }
    };
    fetchTargets();
  }, [createModalOpen, newAnnouncement.targetType, departments.length, positions.length, employees.length]);

  const handleSubmitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.content) {
      alert(isVi ? 'Vui lòng nhập tiêu đề và nội dung.' : isEn ? 'Please enter a title and content.' : isZh ? '请填写标题与内容。' : isTh ? 'กรุณาระบุหัวข้อและเนื้อหา' : 'タイトルと内容を入力してください。');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          type: newAnnouncement.type,
          targetType: newAnnouncement.targetType,
          targetId: newAnnouncement.targetType === 'ALL' ? null : newAnnouncement.targetId || null,
          showSenderName: newAnnouncement.showSenderName,
        }),
      });
      
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || (isVi ? 'Không thể tạo thông báo mới.' : isEn ? 'Failed to publish announcement.' : isZh ? '创建公告失败。' : isTh ? 'สร้างประกาศใหม่ไม่สำเร็จ' : 'お知らせの作成に失敗しました。'));
      }
      
      alert(isVi ? 'Đã tạo thông báo mới thành công.' : isEn ? 'Announcement published successfully.' : isZh ? '公告发布成功。' : isTh ? 'สร้างประกาศใหม่เรียบร้อย' : 'お知らせを作成しました。');
      setCreateModalOpen(false);
      // Reset form
      setNewAnnouncement({
        title: '',
        content: '',
        type: 'info',
        targetType: 'ALL',
        targetId: '',
        showSenderName: true,
      });
      router.refresh();
    } catch (err: any) {
      alert(err.message || (isVi ? 'Đã xảy ra lỗi.' : isEn ? 'An error occurred.' : isZh ? '发生错误。' : isTh ? 'เกิดข้อผิดพลาดขึ้น' : 'エラーが発生しました。'));
    } finally {
      setSubmitting(false);
    }
  };

  // Process notifications with localStorage states
  const processedNotifications = useMemo(() => {
    return initialNotifications
      .map(n => ({
        ...n,
        read: readIds.includes(n.id) || n.read,
        starred: starredIds.includes(n.id),
      }))
      .filter(n => !deletedIds.includes(n.id))
      // Sort newest to oldest: Sort by date descending.
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [initialNotifications, readIds, deletedIds, starredIds]);

  const handleMarkRead = (id: string) => {
    const updated = [...readIds, id];
    setReadIds(updated);
    localStorage.setItem('read_notification_ids', JSON.stringify(updated));
  };

  const handleMarkAllRead = () => {
    const unreadIds = processedNotifications.filter(n => !n.read).map(n => n.id);
    const updated = [...readIds, ...unreadIds];
    setReadIds(updated);
    localStorage.setItem('read_notification_ids', JSON.stringify(updated));
  };

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated;
    if (starredIds.includes(id)) {
      updated = starredIds.filter(item => item !== id);
    } else {
      updated = [...starredIds, id];
    }
    setStarredIds(updated);
    localStorage.setItem('starred_notification_ids', JSON.stringify(updated));
  };

  const handleDelete = (id: string) => {
    const updated = [...deletedIds, id];
    setDeletedIds(updated);
    localStorage.setItem('deleted_notification_ids', JSON.stringify(updated));
  };

  const handleResetNotifications = () => {
    setReadIds([]);
    setDeletedIds([]);
    setStarredIds([]);
    localStorage.removeItem('read_notification_ids');
    localStorage.removeItem('deleted_notification_ids');
    localStorage.removeItem('starred_notification_ids');
  };

  // Filter logic
  const filteredNotifications = useMemo(() => {
    return processedNotifications.filter(n => {
      // Category tabs filter
      if (selectedFilter === 'unread') return !n.read;
      if (selectedFilter === 'high') return n.priority === 'high';
      if (selectedFilter === 'visa') return n.type === 'residence';
      if (selectedFilter === 'contract') return n.type === 'contract';
      if (selectedFilter === 'birthday') return n.type === 'birthday';
      if (selectedFilter === 'requests') return n.title.includes('申請');
      if (selectedFilter === 'starred') return n.starred;
      return true;
    }).filter(n => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.trim().toLowerCase();

      if (searchType === 'sender') {
        const sName = n.senderName || '会社';
        return sName.toLowerCase().includes(query);
      } else if (searchType === 'receiver') {
        const rName = n.relatedEmployee || '';
        return rName.toLowerCase().includes(query);
      } else if (searchType === 'content') {
        const titleMatch = n.title.toLowerCase().includes(query);
        const msgMatch = n.message.toLowerCase().includes(query);
        return titleMatch || msgMatch;
      }
      return true;
    });
  }, [processedNotifications, selectedFilter, searchQuery, searchType]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter, searchQuery, searchType]);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredNotifications.slice(start, start + itemsPerPage);
  }, [filteredNotifications, currentPage]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = processedNotifications.length;
    const unread = processedNotifications.filter(n => !n.read).length;
    const high = processedNotifications.filter(n => !n.read && n.priority === 'high').length;
    const visa = processedNotifications.filter(n => n.type === 'residence').length;
    const contract = processedNotifications.filter(n => n.type === 'contract').length;
    const birthday = processedNotifications.filter(n => n.type === 'birthday').length;
    const requests = processedNotifications.filter(n => n.title.includes('申請')).length;
    const starred = processedNotifications.filter(n => n.starred).length;

    return { total, unread, high, visa, contract, birthday, requests, starred };
  }, [processedNotifications]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Dynamic Summary Cards with Premium Styling */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: getSummaryLabel('unread', t), value: stats.unread, color: 'text-rose-600', bg: 'bg-rose-50/40 border-rose-100 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.1)] hover:border-rose-300' },
          { label: getSummaryLabel('high', t), value: stats.high, color: 'text-red-655 font-black', bg: 'bg-red-50/40 border-red-100 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.1)] hover:border-red-300' },
          { label: getSummaryLabel('starred', t), value: stats.starred, color: 'text-amber-600', bg: 'bg-amber-50/40 border-amber-100 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.1)] hover:border-amber-300' },
          { label: getSummaryLabel('total', t), value: stats.total, color: 'text-slate-800', bg: 'bg-white/80 border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-blue-300' },
        ].map((s, idx) => (
          <div key={idx} className={`${s.bg} backdrop-blur-md rounded-2xl p-4 border transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default`}>
            <p className="text-xs text-slate-500 font-semibold mb-1">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pill Filters Header - Segmented controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: getPillLabel('all', t), count: stats.total },
            { id: 'unread', label: getPillLabel('unread', t), count: stats.unread },
            { id: 'starred', label: getPillLabel('starred', t), count: stats.starred },
            { id: 'high', label: getPillLabel('high', t), count: stats.high },
            { id: 'visa', label: getPillLabel('visa', t), count: stats.visa },
            { id: 'contract', label: getPillLabel('contract', t), count: stats.contract },
            { id: 'requests', label: getPillLabel('requests', t), count: stats.requests },
            { id: 'birthday', label: getPillLabel('birthday', t), count: stats.birthday },
          ].map(pill => (
            <button
              key={pill.id}
              onClick={() => setSelectedFilter(pill.id as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedFilter === pill.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <span>{pill.label}</span>
              {pill.count > 0 && (
                <span className={`px-1.5 py-0.5 text-[9px] rounded-lg font-black transition-all ${
                  selectedFilter === pill.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {pill.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Global actions */}
        <div className="flex gap-2">
          {(role === 'SUPER_ADMIN' || role === 'HR_MANAGER') && (
            <>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{t('notifications.addBtn')}</span>
              </button>
              <a
                href="/notifications/templates"
                className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                ⚙️ {isVi ? 'Cấu hình mẫu gửi' : isEn ? 'Templates Config' : isZh ? '通知发信模板' : isTh ? 'แม่แบบข้อความ' : 'テンプレート設定'}
              </a>
            </>
          )}
          {stats.unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              {isVi ? 'Đọc tất cả' : isEn ? 'Mark all read' : isZh ? '全部设为已读' : isTh ? 'อ่านทั้งหมด' : '全て既読にする'}
            </button>
          )}
          {(readIds.length > 0 || deletedIds.length > 0 || starredIds.length > 0) && (
            <button
              onClick={handleResetNotifications}
              className="px-3.5 py-2 border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-750 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              {isVi ? 'Đặt lại lịch sử' : isEn ? 'Reset History' : isZh ? '重置历史' : isTh ? 'รีเซ็ตประวัติ' : '履歴リセット'}
            </button>
          )}
        </div>
      </div>

      {/* Admin specific Unified Search Filter */}
      {(role === 'SUPER_ADMIN' || role === 'HR_MANAGER') && (
        <Card className="p-4.5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-1/4">
              <select
                value={searchType}
                onChange={e => setSearchType(e.target.value as any)}
                className="w-full px-3 py-2.5 border border-slate-350 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold bg-slate-50 cursor-pointer text-slate-700"
              >
                <option value="sender">✉️ {isVi ? 'Tìm theo người gửi' : isEn ? 'Search by sender' : isZh ? '按发信人' : isTh ? 'ค้นหาตามผู้ส่ง' : '差出人で検索'}</option>
                <option value="receiver">👤 {isVi ? 'Tìm theo người nhận' : isEn ? 'Search by recipient' : isZh ? '按收信人' : isTh ? 'ค้นหาตามผู้รับ' : '宛先・対象者で検索'}</option>
                <option value="content">📝 {isVi ? 'Tìm theo nội dung/tiêu đề' : isEn ? 'Search by content' : isZh ? '按标题或正文' : isTh ? 'ค้นหาตามเนื้อหา' : '本文・件名で検索'}</option>
              </select>
            </div>

            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={
                  searchType === 'sender' ? (isVi ? 'Nhập tên người gửi (ví dụ: công ty, nhân sự...)' : isEn ? 'Enter sender name...' : '差出人名を入力...') :
                  searchType === 'receiver' ? (isVi ? 'Nhập tên nhân viên nhận...' : isEn ? 'Enter recipient name...' : '宛先・対象従業員名を入力...') :
                  (isVi ? 'Nhập từ khóa tìm kiếm trong nội dung hoặc tiêu đề...' : isEn ? 'Enter keyword in subject or content...' : '通知のタイトルや本文に含まれるキーワードを入力...')
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 border border-slate-350 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-slate-800"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 font-bold text-sm cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Notifications List */}
      <Card title={t('notifications.cardTitle')} className="">
        <div className="space-y-4">
          {paginatedNotifications.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
              <span className="text-4xl filter drop-shadow-sm">📭</span>
              <p className="text-sm text-slate-500 font-bold mt-3.5">{isVi ? 'Không có thông báo nào hiển thị' : isEn ? 'No notifications to display' : isZh ? '暂无通知消息记录' : isTh ? 'ไม่มีการแจ้งเตือนที่แสดงผล' : '表示する通知はありません'}</p>
              <p className="text-xs text-slate-400 mt-1 font-semibold">{isVi ? 'Vui lòng thay đổi bộ lọc hoặc đợi thông báo mới' : isEn ? 'Try changing filters or wait for new notifications' : 'フィルター条件を変更するか、新しい通知が届くまでお待ちください'}</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {paginatedNotifications.map(n => {
                const tc = typeConfig.find(ty => ty.key === n.type);
                const pc = priorityConfig[n.priority];

                // Determine visual accent based on type/priority
                let cardStyle = 'bg-white border-slate-200 hover:border-slate-350 hover:shadow-sm';
                let borderLeftStyle = 'border-l-4 border-slate-400';

                if (!n.read) {
                  cardStyle = 'bg-blue-50/30 border-blue-200/80 hover:border-blue-300 hover:shadow-sm';
                }

                if (n.priority === 'high') {
                  borderLeftStyle = 'border-l-4 border-red-500';
                } else if (n.priority === 'medium') {
                  borderLeftStyle = 'border-l-4 border-amber-500';
                } else if (n.type === 'birthday') {
                  borderLeftStyle = 'border-l-4 border-pink-500';
                } else if (n.type === 'general') {
                  borderLeftStyle = 'border-l-4 border-blue-500';
                }

                if (n.starred) {
                  cardStyle = 'bg-amber-50/20 border-amber-300 hover:border-amber-400 hover:shadow-md transition-all duration-300';
                  borderLeftStyle = 'border-l-4 border-amber-500 shadow-[inset_4px_0_0_0_#f59e0b]';
                }

                return (
                  <div
                     key={n.id}
                     onClick={() => {
                       if (!n.read) {
                         handleMarkRead(n.id);
                       }
                       setActiveDetail(n);
                     }}
                     className={`p-4.5 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none ${cardStyle} ${borderLeftStyle}`}
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <span className="text-3xl p-2 bg-white border border-slate-100 rounded-xl shadow-sm flex-shrink-0">
                        {tc?.icon || '📢'}
                      </span>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={(e) => handleToggleStar(n.id, e)}
                            className="text-base focus:outline-none hover:scale-125 transition-transform mr-1 cursor-pointer select-none"
                          >
                            {n.starred ? '⭐' : '☆'}
                          </button>
                          <h4 className={`text-sm font-bold truncate ${n.read ? 'text-slate-700' : 'text-slate-900 font-extrabold'}`}>
                            {n.title}
                          </h4>
                          <span className={`px-2 py-0.5 text-[9px] rounded-lg border font-bold ${pc.color}`}>
                            {pc.label}
                          </span>
                          {!n.read && (
                            <span className="flex h-2.5 w-2.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-650 font-medium leading-relaxed mt-1">
                          {n.message.length > 80 ? `${n.message.substring(0, 80)}...` : n.message}
                          {n.message.length > 80 && (
                            <span className="text-[10px] text-blue-500 font-bold ml-1 block md:inline">({isVi ? 'Xem chi tiết' : isEn ? 'View detail' : '詳細表示'})</span>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-3.5 text-xs text-slate-450 font-bold pt-1">
                          <span>📅 {n.date}</span>
                          {n.senderName && (
                            <span className="bg-slate-50 border border-slate-150 text-slate-600 px-2 py-0.5 rounded-md text-[10px]">
                              ✉️ {isVi ? 'Người gửi' : isEn ? 'Sender' : '差出人'}: {n.senderName}
                            </span>
                          )}
                          {n.relatedEmployee && (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px]">
                              👤 {n.relatedEmployee}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                      {n.actionUrl && (
                        <a
                          href={n.actionUrl}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          {isVi ? 'Xử lý →' : isEn ? 'Action →' : '対応する →'}
                        </a>
                      )}
                      {!n.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(n.id);
                          }}
                          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap"
                        >
                          {isVi ? 'Đã đọc' : isEn ? 'Mark read' : '既読にする'}
                        </button>
                      )}
                      {!n.starred && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(n.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 flex-wrap gap-2 text-xs font-bold text-slate-500">
              <div>
                {getPaginationText(((currentPage - 1) * itemsPerPage) + 1, Math.min(currentPage * itemsPerPage, filteredNotifications.length), filteredNotifications.length, t)}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  ◀
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      currentPage === page
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-655 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  ▶
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Announcement Creator Modal */}
      {createModalOpen && (
        <Portal>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCreateModalOpen(false)}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-100 animate-fadeIn" onClick={e => e.stopPropagation()}>
              
              <div className="p-6 border-b border-slate-100 flex-shrink-0 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                  <span>📢</span> {t('notifications.modalTitle')}
                </h3>
                <button 
                  onClick={() => setCreateModalOpen(false)}
                  className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg leading-none hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitAnnouncement} className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">{t('notifications.labelTitle')}</label>
                  <input
                    type="text"
                    required
                    value={newAnnouncement.title}
                    onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t('notifications.placeholderTitle')}
                    className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">{t('notifications.labelContent')}</label>
                  <textarea
                    required
                    rows={4}
                    value={newAnnouncement.content}
                    onChange={e => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                    placeholder={t('notifications.placeholderContent')}
                    className="w-full mt-1.5 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800 bg-white resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="showSenderName"
                    checked={newAnnouncement.showSenderName}
                    onChange={e => setNewAnnouncement(prev => ({ ...prev, showSenderName: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="showSenderName" className="text-xs font-bold text-slate-550 cursor-pointer select-none">
                    {isVi ? 'Hiển thị tên người gửi (Nếu tắt, sẽ hiển thị là "Công ty")' : isEn ? 'Show sender\'s name (If off, displayed as "Company")' : isZh ? '显示发布者姓名（关闭则显示为“公司”）' : isTh ? 'แสดงชื่อผู้ส่ง (หากไม่แสดงระบบจะระบุเป็น "บริษัท")' : '差出人名（管理者名）を表示する（オフの場合は「会社」として表示されます）'}
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">{t('notifications.labelCategory')}</label>
                    <select
                      value={newAnnouncement.type}
                      onChange={e => setNewAnnouncement(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none"
                    >
                      <option value="info">🔵 {t('notifications.categoryInfo')}</option>
                      <option value="warning">🟡 {isVi ? 'Cảnh báo' : isEn ? 'Warning' : '注意'}</option>
                      <option value="urgent">🔴 {isVi ? 'Khẩn cấp' : isEn ? 'Urgent' : '緊急'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">{isVi ? 'Phạm vi gửi' : isEn ? 'Target Scope' : isZh ? '发布范围' : isTh ? 'ขอบเขตผู้รับ' : '宛先範囲'}</label>
                    <select
                      value={newAnnouncement.targetType}
                      onChange={e => setNewAnnouncement(prev => ({ ...prev, targetType: e.target.value, targetId: '' }))}
                      className="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none"
                    >
                      <option value="ALL">🌐 {isVi ? 'Toàn bộ công ty' : isEn ? 'System-wide' : isZh ? '全体广播' : isTh ? 'พนักงานทุกคน' : '全体'}</option>
                      <option value="DEPARTMENT">🏢 {isVi ? 'Theo phòng ban' : isEn ? 'Department' : isZh ? '按指定部门' : isTh ? 'ระบุแผนก' : '部署指定'}</option>
                      <option value="POSITION">🔑 {isVi ? 'Theo chức vụ' : isEn ? 'Position' : isZh ? '按指定职位' : isTh ? 'ระบุตำแหน่ง' : '役職指定'}</option>
                      <option value="EMPLOYEE">👤 {isVi ? 'Chỉ định cá nhân' : isEn ? 'Individual' : isZh ? '按指定人员' : isTh ? 'ระบุรายบุคคล' : '個人指定'}</option>
                    </select>
                  </div>
                </div>

                {newAnnouncement.targetType !== 'ALL' && (
                  <div className="animate-fadeIn">
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                      {newAnnouncement.targetType === 'DEPARTMENT' ? (isVi ? 'Chọn phòng ban' : isEn ? 'Target Department' : '宛先部署') :
                       newAnnouncement.targetType === 'POSITION' ? (isVi ? 'Chọn chức vụ' : isEn ? 'Target Position' : '宛先役職') : (isVi ? 'Chọn nhân viên' : isEn ? 'Target Employee' : '宛先社員')}
                    </label>
                    
                    {loadingTargets ? (
                      <div className="text-xs text-slate-400 font-bold animate-pulse py-2">{isVi ? 'Đang tải danh sách...' : '宛先リストを取得中...'}</div>
                    ) : (
                      <select
                        required
                        value={newAnnouncement.targetId}
                        onChange={e => setNewAnnouncement(prev => ({ ...prev, targetId: e.target.value }))}
                        className="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none"
                      >
                        <option value="">-- {isVi ? 'Vui lòng chọn' : isEn ? 'Select a target' : '宛先を選択してください'} --</option>
                        {newAnnouncement.targetType === 'DEPARTMENT' && departments.map(d => (
                          <option key={d.id} value={d.id}>{getDepartmentLabel(d.name, t)}</option>
                        ))}
                        {newAnnouncement.targetType === 'POSITION' && positions.map(p => (
                          <option key={p.id} value={p.id}>{getPositionLabel(p.name, t)}</option>
                        ))}
                        {newAnnouncement.targetType === 'EMPLOYEE' && employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.lastName} {emp.firstName} ({emp.employeeCode})</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2.5 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {t('notifications.cancelBtn')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                  >
                    {submitting ? '...' : t('notifications.submitBtn')}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </Portal>
      )}

      {/* Announcement Detail Modal */}
      {activeDetail && (
        <Portal>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setActiveDetail(null)}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-100 animate-fadeIn" onClick={e => e.stopPropagation()}>
              
              <div className="p-6 border-b border-slate-100 flex-shrink-0 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                  <span>📢</span> {isVi ? 'Chi tiết thông báo' : isEn ? 'Announcement Detail' : 'お知らせ詳細'}
                </h3>
                <button 
                  onClick={() => setActiveDetail(null)}
                  className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg leading-none hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto text-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="text-xs text-slate-450 font-bold space-y-1">
                    <p>📅 {isVi ? 'Ngày đăng' : isEn ? 'Post Date' : '投稿日'}: {activeDetail.date}</p>
                    {activeDetail.senderName && <p>✉️ {isVi ? 'Người gửi' : isEn ? 'Sender' : '差出人'}: {activeDetail.senderName}</p>}
                    {activeDetail.relatedEmployee && <p>👥 {isVi ? 'Phạm vi nhận' : isEn ? 'Scope' : '宛先範囲'}: {activeDetail.relatedEmployee}</p>}
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                    activeDetail.priority === 'high' ? 'bg-red-50 border-red-200 text-red-700' :
                    activeDetail.priority === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    {activeDetail.priority === 'high' ? (isVi ? 'Khẩn cấp' : isEn ? 'Urgent' : '緊急') : activeDetail.priority === 'medium' ? (isVi ? 'Cảnh báo' : isEn ? 'Warning' : '警告') : (isVi ? 'Thông tin' : isEn ? 'Info' : '一般')}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-black text-slate-900 leading-normal">{activeDetail.title}</h4>
                  <p className="text-xs text-slate-750 leading-relaxed whitespace-pre-line font-semibold bg-slate-50 p-4 rounded-2xl border border-slate-150">
                    {activeDetail.message}
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      if (!activeDetail.read) {
                        handleMarkRead(activeDetail.id);
                      }
                      setActiveDetail(null);
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    {isVi ? 'Đóng' : isEn ? 'Close' : '閉じる'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
