'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/common/Card';
import { getLoggedUser } from '@/lib/auth-client';
import Portal from '@/components/common/Portal';

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

const priorityConfig = {
  high: { label: '高優先度', color: 'bg-red-100 text-red-700 border-red-200 font-bold' },
  medium: { label: '中優先度', color: 'bg-amber-100 text-amber-700 border-amber-200 font-medium' },
  low: { label: '低優先度', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function NotificationsClient({
  initialNotifications = [],
}: {
  initialNotifications?: Notification[];
}) {
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
      alert('タイトルと内容を入力してください。');
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
        throw new Error(body.error || 'お知らせの作成に失敗しました。');
      }
      
      alert('お知らせを作成しました。');
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
      alert(err.message || 'エラーが発生しました。');
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
      // If date is equal, sort by ID to maintain stability.
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

  // Hydration safety: render skeleton loader while waiting for mounting
  if (!isMounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-slate-100 rounded-2xl h-24 border border-slate-200" />
          ))}
        </div>
        <div className="h-10 bg-slate-100 rounded-xl w-full" />
        <div className="bg-white rounded-2xl border border-slate-200 h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Dynamic Summary Cards with Premium Styling */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '未読の通知', value: stats.unread, color: 'text-rose-600', bg: 'bg-rose-50/40 border-rose-100 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.1)] hover:border-rose-300' },
          { label: '高優先度 (未読)', value: stats.high, color: 'text-red-600', bg: 'bg-red-50/40 border-red-100 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.1)] hover:border-red-300' },
          { label: '重要マーク', value: stats.starred, color: 'text-amber-600', bg: 'bg-amber-50/40 border-amber-100 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.1)] hover:border-amber-300 animate-pulse-subtle' },
          { label: '全通知件数', value: stats.total, color: 'text-slate-800', bg: 'bg-white/80 border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-blue-300' },
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
            { id: 'all', label: '📥 全て', count: stats.total },
            { id: 'unread', label: '🔵 未読のみ', count: stats.unread },
            { id: 'starred', label: '⭐ 重要', count: stats.starred },
            { id: 'high', label: '🔴 緊急・警告', count: stats.high },
            { id: 'visa', label: '🛂 ビザ期限', count: stats.visa },
            { id: 'contract', label: '📋 契約期限', count: stats.contract },
            { id: 'requests', label: '🏖️ 申請承認', count: stats.requests },
            { id: 'birthday', label: '🎂 誕生日', count: stats.birthday },
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
                📢 お知らせ作成
              </button>
              <a
                href="/notifications/templates"
                className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                ⚙️ テンプレート設定
              </a>
            </>
          )}
          {stats.unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              全て既読にする
            </button>
          )}
          {(readIds.length > 0 || deletedIds.length > 0 || starredIds.length > 0) && (
            <button
              onClick={handleResetNotifications}
              className="px-3.5 py-2 border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-750 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              title="既読・削除済み・重要マークの履歴をリセットして再表示"
            >
              履歴リセット
            </button>
          )}
        </div>
      </div>

      {/* Admin specific Unified Search Filter */}
      {(role === 'SUPER_ADMIN' || role === 'HR_MANAGER') && (
        <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-4.5">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filter type dropdown (Left) */}
            <div className="w-full sm:w-1/4">
              <select
                value={searchType}
                onChange={e => setSearchType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-250 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold bg-slate-50 cursor-pointer text-slate-700"
              >
                <option value="sender">✉️ 差出人で検索 (Sender)</option>
                <option value="receiver">👤 宛先・対象者で検索 (Receiver)</option>
                <option value="content">📝 本文・件名で検索 (Content)</option>
              </select>
            </div>

            {/* Search query input (Right) */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-3 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder={
                  searchType === 'sender' ? '差出人名を入力 (例: 会社, 山田, 吉田...)' :
                  searchType === 'receiver' ? '宛先・対象従業員名を入力 (例: 佐藤, 鈴木...)' :
                  '通知のタイトルや本文に含まれるキーワードを入力...'
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-slate-250 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-slate-800"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Notifications List */}
      <Card title="通知・アラート一覧" className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
        <div className="space-y-4">
          {paginatedNotifications.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
              <span className="text-4xl filter drop-shadow-sm">📭</span>
              <p className="text-sm text-slate-500 font-bold mt-3.5">表示する通知はありません</p>
              <p className="text-xs text-slate-400 mt-1 font-semibold">フィルター条件を変更するか、新しい通知が届くまでお待ちください</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {paginatedNotifications.map(n => {
                const tc = typeConfig.find(t => t.key === n.type);
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
                    title="クリックで詳細を表示"
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
                            title={n.starred ? '重要マークを外す' : '重要マークを付ける'}
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
                            <span className="text-[10px] text-blue-500 font-bold ml-1 block md:inline">(クリックで全文を表示)</span>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-3.5 text-xs text-slate-400 font-bold pt-1">
                          <span>📅 {n.date}</span>
                          {n.senderName && (
                            <span className="bg-slate-50 border border-slate-150 text-slate-600 px-2 py-0.5 rounded-md text-[10px]">
                              ✉️ 差出人: {n.senderName}
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
                      {/* Action link */}
                      {n.actionUrl && (
                        <a
                          href={n.actionUrl}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          対応する →
                        </a>
                      )}
                      {/* Mark read button */}
                      {!n.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(n.id);
                          }}
                          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                        >
                          既読にする
                        </button>
                      )}
                      {/* Delete button */}
                      {!n.starred && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(n.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="非表示にする"
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
                全 {filteredNotifications.length} 件中 {((currentPage - 1) * itemsPerPage) + 1} 〜 {Math.min(currentPage * itemsPerPage, filteredNotifications.length)} 件を表示
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  ◀ 前へ
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
                  次へ ▶
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
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex-shrink-0 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <span>📢</span> 新しいお知らせを作成
                </h3>
                <button 
                  onClick={() => setCreateModalOpen(false)}
                  className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg leading-none hover:bg-slate-50 transition-colors"
                >
                  &times;
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={handleSubmitAnnouncement} className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-550 mb-1">お知らせのタイトル</label>
                  <input
                    type="text"
                    required
                    value={newAnnouncement.title}
                    onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="例: 【重要】ゴールデンウィーク期間の営業について"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-555 mb-1">お知らせ内容</label>
                  <textarea
                    required
                    rows={4}
                    value={newAnnouncement.content}
                    onChange={e => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="お知らせの具体的な内容を入力してください..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800"
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
                  <label htmlFor="showSenderName" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    差出人名（管理者名）を表示する（オフの場合は「会社」として表示されます）
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-550 mb-1">重要度 (Type)</label>
                    <select
                      value={newAnnouncement.type}
                      onChange={e => setNewAnnouncement(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none"
                    >
                      <option value="info">🔵 情報 (Info)</option>
                      <option value="warning">🟡 注意 (Warning)</option>
                      <option value="urgent">🔴 緊急 (Urgent)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-550 mb-1">宛先範囲 (Target Scope)</label>
                    <select
                      value={newAnnouncement.targetType}
                      onChange={e => setNewAnnouncement(prev => ({ ...prev, targetType: e.target.value, targetId: '' }))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none"
                    >
                      <option value="ALL">🌐 全体 (System-wide)</option>
                      <option value="DEPARTMENT">🏢 部署指定 (Department)</option>
                      <option value="POSITION">🔑 役職指定 (Position)</option>
                      <option value="EMPLOYEE">👤 個人指定 (Individual)</option>
                    </select>
                  </div>
                </div>

                {/* Dependent Dropdowns */}
                {newAnnouncement.targetType !== 'ALL' && (
                  <div className="animate-fadeIn">
                    <label className="block text-xs font-bold text-slate-550 mb-1">
                      {newAnnouncement.targetType === 'DEPARTMENT' ? '宛先部署' :
                       newAnnouncement.targetType === 'POSITION' ? '宛先役職' : '宛先社員'}
                    </label>
                    
                    {loadingTargets ? (
                      <div className="text-xs text-slate-400 font-bold animate-pulse py-2">宛先リストを取得中...</div>
                    ) : (
                      <select
                        required
                        value={newAnnouncement.targetId}
                        onChange={e => setNewAnnouncement(prev => ({ ...prev, targetId: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none"
                      >
                        <option value="">-- 宛先を選択してください --</option>
                        {newAnnouncement.targetType === 'DEPARTMENT' && departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.nameKana})</option>
                        ))}
                        {newAnnouncement.targetType === 'POSITION' && positions.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.nameKana})</option>
                        ))}
                        {newAnnouncement.targetType === 'EMPLOYEE' && employees.map(e => (
                          <option key={e.id} value={e.id}>{e.lastName} {e.firstName} ({e.employeeCode})</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                  >
                    {submitting ? '作成中...' : 'お知らせを公開'}
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
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex-shrink-0 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <span>📢</span> お知らせ詳細
                </h3>
                <button 
                  onClick={() => setActiveDetail(null)}
                  className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg leading-none hover:bg-slate-50 transition-colors"
                >
                  &times;
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 overflow-y-auto text-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="text-xs text-slate-400 font-bold space-y-1">
                    <p>📅 投稿日: {activeDetail.date}</p>
                    {activeDetail.senderName && <p>✉️ 差出人: {activeDetail.senderName}</p>}
                    {activeDetail.relatedEmployee && <p>👥 宛先範囲: {activeDetail.relatedEmployee}</p>}
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                    activeDetail.priority === 'high' ? 'bg-red-50 border-red-200 text-red-700' :
                    activeDetail.priority === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    {activeDetail.priority === 'high' ? '緊急' : activeDetail.priority === 'medium' ? '警告' : '一般'}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-base font-black text-slate-900 leading-normal">{activeDetail.title}</h4>
                  <p className="text-sm text-slate-750 leading-relaxed whitespace-pre-line font-medium bg-slate-50 p-4 rounded-2xl border border-slate-150">
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
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    閉じる
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
