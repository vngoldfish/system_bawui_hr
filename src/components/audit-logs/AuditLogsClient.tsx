'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Card from '@/components/common/Card';
import { useI18n } from '@/lib/i18n';
import ExportButtons from '@/components/common/ExportButtons';


interface AuditLogEntry {
  timestamp: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  model: string;
  recordId: string;
  details: any;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AuditLogsClientProps {
  initialLogs: AuditLogEntry[];
  initialPagination: PaginationInfo;
  currentUser: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

const localTranslations: Record<string, Record<string, string>> = {
  ja: {
    title: '操作ログ履歴',
    subtitle: 'システムの変更記録および管理者アクションを監視します。',
    colTimestamp: '日時',
    colUser: '実行者',
    colAction: '操作',
    colModel: '対象モデル',
    colRecordId: 'レコードID',
    colDetails: '詳細内容',
    actionCreate: '作成 (CREATE)',
    actionUpdate: '更新 (UPDATE)',
    actionDelete: '削除 (DELETE)',
    filterAllActions: 'すべてのアクション',
    filterAllModels: 'すべてのモデル',
    searchPlaceholder: 'メール、名前、変更内容を検索...',
    inspectBtn: '詳細表示',
    noLogs: '操作ログが見つかりません。',
    modalTitle: '操作ログ詳細インスペクター',
    modalTimestamp: '発生日時',
    modalOperator: '実行ユーザー',
    modalAction: 'アクションタイプ',
    modalModel: 'モデル名',
    modalRecordId: '対象レコードID',
    modalRawDetails: '操作詳細 (JSON)',
    copyBtn: 'JSONをコピー',
    copiedMsg: 'コピーしました！',
    closeBtn: '閉じる',
    startDate: '開始日',
    endDate: '終了日',
    showingText: '全 {total} 件中 {start} 〜 {end} 件を表示中'
  },
  en: {
    title: 'Audit Logs History',
    subtitle: 'Monitor system changes and administrative operations.',
    colTimestamp: 'Timestamp',
    colUser: 'Operator',
    colAction: 'Action',
    colModel: 'Target Model',
    colRecordId: 'Record ID',
    colDetails: 'Details',
    actionCreate: 'Create (CREATE)',
    actionUpdate: 'Update (UPDATE)',
    actionDelete: 'Delete (DELETE)',
    filterAllActions: 'All Actions',
    filterAllModels: 'All Models',
    searchPlaceholder: 'Search by email, name, details...',
    inspectBtn: 'Inspect',
    noLogs: 'No audit logs found.',
    modalTitle: 'Audit Log Detail Inspector',
    modalTimestamp: 'Timestamp',
    modalOperator: 'Operator',
    modalAction: 'Action Type',
    modalModel: 'Model Name',
    modalRecordId: 'Record ID',
    modalRawDetails: 'Raw Details (JSON)',
    copyBtn: 'Copy JSON',
    copiedMsg: 'Copied!',
    closeBtn: 'Close',
    startDate: 'Start Date',
    endDate: 'End Date',
    showingText: 'Showing {start} to {end} of {total} entries'
  },
  vi: {
    title: 'Lịch sử Hoạt động Hệ thống',
    subtitle: 'Giám sát các thao tác ghi nhận thay đổi và hành động của quản trị viên.',
    colTimestamp: 'Thời gian',
    colUser: 'Người thực hiện',
    colAction: 'Hành động',
    colModel: 'Đối tượng tác động',
    colRecordId: 'Mã bản ghi',
    colDetails: 'Chi tiết',
    actionCreate: 'Thêm mới (CREATE)',
    actionUpdate: 'Cập nhật (UPDATE)',
    actionDelete: 'Xóa (DELETE)',
    filterAllActions: 'Tất cả hành động',
    filterAllModels: 'Tất cả đối tượng',
    searchPlaceholder: 'Tìm theo email, tên, nội dung chi tiết...',
    inspectBtn: 'Xem chi tiết',
    noLogs: 'Không tìm thấy nhật ký hoạt động nào.',
    modalTitle: 'Chi tiết Nhật ký Hoạt động',
    modalTimestamp: 'Thời điểm',
    modalOperator: 'Người thực hiện',
    modalAction: 'Loại thao tác',
    modalModel: 'Đối tượng',
    modalRecordId: 'Mã bản ghi',
    modalRawDetails: 'Dữ liệu chi tiết (JSON)',
    copyBtn: 'Sao chép JSON',
    copiedMsg: 'Đã sao chép!',
    closeBtn: 'Đóng',
    startDate: 'Từ ngày',
    endDate: 'Đến ngày',
    showingText: 'Hiển thị từ {start} đến {end} trong tổng số {total} bản ghi'
  },
  zh: {
    title: '操作日志历史',
    subtitle: '监控系统更改记录和管理员操作。',
    colTimestamp: '时间戳',
    colUser: '操作者',
    colAction: '操作类型',
    colModel: '目标模型',
    colRecordId: '记录ID',
    colDetails: '详情',
    actionCreate: '创建 (CREATE)',
    actionUpdate: '更新 (UPDATE)',
    actionDelete: '删除 (DELETE)',
    filterAllActions: '所有操作类型',
    filterAllModels: '所有数据模型',
    searchPlaceholder: '搜索邮箱、名字、更新详情...',
    inspectBtn: '查看详情',
    noLogs: '未找到操作日志。',
    modalTitle: '操作日志详情检查器',
    modalTimestamp: '发生时间',
    modalOperator: '操作人员',
    modalAction: '操作类型',
    modalModel: '目标模型',
    modalRecordId: '记录ID',
    modalRawDetails: '操作详情 (JSON)',
    copyBtn: '复制 JSON',
    copiedMsg: '已复制！',
    closeBtn: '关闭',
    startDate: '开始日期',
    endDate: '结束日期',
    showingText: '显示第 {start} 至 {end} 项，共 {total} 项'
  },
  th: {
    title: 'ประวัติการเข้าใช้งานระบบ',
    subtitle: 'ตรวจสอบประวัติการแก้ไขข้อมูลและการทำงานของผู้ดูแลระบบ',
    colTimestamp: 'วันเวลา',
    colUser: 'ผู้ดำเนินการ',
    colAction: 'การกระทำ',
    colModel: 'เป้าหมาย',
    colRecordId: 'ไอดีบันทึก',
    colDetails: 'รายละเอียด',
    actionCreate: 'สร้าง (CREATE)',
    actionUpdate: 'อัปเดต (UPDATE)',
    actionDelete: 'ลบ (DELETE)',
    filterAllActions: 'ประเภทการกระทำทั้งหมด',
    filterAllModels: 'เป้าหมายทั้งหมด',
    searchPlaceholder: 'ค้นหาด้วยอีเมล ชื่อ หรือข้อความรายละเอียด...',
    inspectBtn: 'ตรวจสอบ',
    noLogs: 'ไม่พบประวัติการเข้าใช้งานระบบ',
    modalTitle: 'หน้าต่างตรวจสอบประวัติการใช้งาน',
    modalTimestamp: 'วันเวลาที่เกิด',
    modalOperator: 'ผู้ทำรายการ',
    modalAction: 'การกระทำ',
    modalModel: 'เป้าหมาย',
    modalRecordId: 'ไอดีบันทึก',
    modalRawDetails: 'ข้อมูลรายละเอียดแบบดิบ (JSON)',
    copyBtn: 'คัดลอก JSON',
    copiedMsg: 'คัดลอกแล้ว!',
    closeBtn: 'ปิด',
    startDate: 'วันที่เริ่มต้น',
    endDate: 'วันที่สิ้นสุด',
    showingText: 'แสดง {start} ถึง {end} จากทั้งหมด {total} รายการ'
  }
};

const knownModels = [
  'Employee',
  'Department',
  'Position',
  'ContractType',
  'EmployeeContract',
  'Holiday',
  'AttendanceRecord',
  'PayrollRecord',
  'OvertimeRequest',
  'LeaveRequest',
  'Announcement',
  'ReminderTemplate'
];

// Local Time Formatter (Asia/Tokyo)
const formatLocalTimestamp = (ts: string) => {
  try {
    const date = new Date(ts);
    // Format to Tokyo timezone
    return date.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (e) {
    return ts;
  }
};

export default function AuditLogsClient({
  initialLogs,
  initialPagination,
  currentUser
}: AuditLogsClientProps) {
  const { locale } = useI18n();
  const tLocal = useMemo(() => localTranslations[locale] || localTranslations.ja, [locale]);

  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs);
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [model, setModel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Inspect Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [copied, setCopied] = useState(false);

  const exportData = useMemo(() => {
    return logs.map(l => ({
      timestamp: formatLocalTimestamp(l.timestamp),
      operator: typeof l.user === 'object' ? `${l.user.name} (${l.user.email})` : l.user,
      action: l.action,
      model: l.model,
      recordId: l.recordId,
    }));
  }, [logs]);


  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      });

      if (search) params.append('search', search);
      if (action) params.append('action', action);
      if (model) params.append('model', model);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setLogs(result.data.logs);
          setPagination(result.data.pagination);
        }
      }
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, action, model, startDate, endDate]);

  // Debounced search trigger or load handler
  useEffect(() => {
    // Skip initial mount fetch since we have initialLogs
    if (page === 1 && search === '' && action === '' && model === '' && startDate === '' && endDate === '') {
      return;
    }
    
    const handler = setTimeout(() => {
      fetchLogs();
    }, 300);

    return () => clearTimeout(handler);
  }, [fetchLogs, page, search, action, model, startDate, endDate]);

  // Reset page to 1 when filters change
  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setPage(1);
  };

  const handleCopyJson = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog.details, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Human Operator Formatter
  const renderOperator = (log: AuditLogEntry) => {
    if (typeof log.user === 'string') {
      return <span className="font-semibold text-slate-500">{log.user}</span>;
    }
    
    const roleBadgeStyles: Record<string, string> = {
      SUPER_ADMIN: 'bg-red-50 text-red-700 border-red-200',
      HR_MANAGER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      DEPARTMENT_MANAGER: 'bg-blue-50 text-blue-700 border-blue-200',
      EMPLOYEE: 'bg-green-50 text-green-700 border-green-200',
      VIEWER: 'bg-slate-100 text-slate-650 border-slate-200'
    };

    return (
      <div className="flex flex-col">
        <span className="font-bold text-slate-800 text-xs sm:text-sm">{log.user.name}</span>
        <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[180px]">{log.user.email}</span>
        <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded border mt-1.5 self-start ${roleBadgeStyles[log.user.role] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
          {log.user.role}
        </span>
      </div>
    );
  };

  // Action Badge Renderer
  const renderActionBadge = (act: string) => {
    if (act === 'CREATE') {
      return <span className="inline-block px-2.5 py-1 text-[10px] font-black rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200">CREATE</span>;
    }
    if (act === 'UPDATE') {
      return <span className="inline-block px-2.5 py-1 text-[10px] font-black rounded-lg border bg-amber-50 text-amber-700 border-amber-200">UPDATE</span>;
    }
    if (act === 'DELETE') {
      return <span className="inline-block px-2.5 py-1 text-[10px] font-black rounded-lg border bg-rose-50 text-rose-700 border-rose-200">DELETE</span>;
    }
    return <span className="inline-block px-2.5 py-1 text-[10px] font-black rounded-lg border bg-slate-50 text-slate-600 border-slate-200">{act}</span>;
  };

  const showingStart = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const showingEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800">{tLocal.title}</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-semibold">{tLocal.subtitle}</p>
        </div>
        <ExportButtons
          data={exportData}
          columns={[
            { header: tLocal.colTimestamp || 'Timestamp', key: 'timestamp' },
            { header: tLocal.colUser || 'Operator', key: 'operator' },
            { header: tLocal.colAction || 'Action', key: 'action' },
            { header: tLocal.colModel || 'Target Model', key: 'model' },
            { header: tLocal.colRecordId || 'Record ID', key: 'recordId' },
          ]}
          fileName="audit_logs"
        />
      </div>

      {/* Filter controls */}
      <Card className="">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Keyword Search */}
          <div className="relative lg:col-span-2">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={tLocal.searchPlaceholder}
              value={search}
              onChange={e => handleFilterChange(setSearch, e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={action}
              onChange={e => handleFilterChange(setAction, e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 bg-white rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">{tLocal.filterAllActions}</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* Model Filter */}
          <div>
            <select
              value={model}
              onChange={e => handleFilterChange(setModel, e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 bg-white rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">{tLocal.filterAllModels}</option>
              {knownModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Date Picker Range */}
          <div className="flex gap-2 items-center justify-between sm:col-span-2 lg:col-span-1 min-w-[200px]">
            <input
              type="date"
              value={startDate}
              onChange={e => handleFilterChange(setStartDate, e.target.value)}
              className="w-[47%] px-2 py-2 border border-slate-300 rounded-xl text-[11px] font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              title={tLocal.startDate}
            />
            <span className="text-slate-400 text-xs font-bold">~</span>
            <input
              type="date"
              value={endDate}
              onChange={e => handleFilterChange(setEndDate, e.target.value)}
              className="w-[47%] px-2 py-2 border border-slate-300 rounded-xl text-[11px] font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              title={tLocal.endDate}
            />
          </div>
        </div>
      </Card>

      {/* Logs Table Card */}
      <Card className="overflow-hidden p-0 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm border-collapse" style={{ minWidth: '950px' }}>
            <colgroup>
              <col style={{ width: '160px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '100px' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-left text-xs text-slate-500 font-extrabold uppercase tracking-wider">
                <th className="px-5 py-3.5">{tLocal.colTimestamp}</th>
                <th className="px-5 py-3.5">{tLocal.colUser}</th>
                <th className="px-5 py-3.5 text-center">{tLocal.colAction}</th>
                <th className="px-5 py-3.5">{tLocal.colModel}</th>
                <th className="px-5 py-3.5">{tLocal.colRecordId}</th>
                <th className="px-5 py-3.5 text-center">{tLocal.colDetails}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-400 bg-slate-50/10 font-bold">
                    {tLocal.noLogs}
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={index} className="hover:bg-slate-50/30 transition-colors">
                    {/* Timestamp */}
                    <td className="px-5 py-4 text-xs font-bold text-slate-500 font-mono">
                      {formatLocalTimestamp(log.timestamp)}
                    </td>
                    
                    {/* User Operator */}
                    <td className="px-5 py-4">
                      {renderOperator(log)}
                    </td>
                    
                    {/* Action */}
                    <td className="px-5 py-4 text-center">
                      {renderActionBadge(log.action)}
                    </td>
                    
                    {/* Model */}
                    <td className="px-5 py-4 text-xs font-bold text-slate-700">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[10px] rounded-lg font-black border border-slate-200 uppercase tracking-wide">
                        {log.model}
                      </span>
                    </td>
                    
                    {/* Record ID */}
                    <td className="px-5 py-4 text-xs text-slate-450 font-mono truncate" title={log.recordId}>
                      {log.recordId}
                    </td>
                    
                    {/* Inspect button */}
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg transition-all cursor-pointer active:scale-95 shadow-sm"
                      >
                        {tLocal.inspectBtn}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.total > 0 && (
          <div className="p-4 border-t border-slate-150 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-semibold">
              {tLocal.showingText
                .replace('{start}', String(showingStart))
                .replace('{end}', String(showingEnd))
                .replace('{total}', String(pagination.total))}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1 || loading}
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 border border-slate-250 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                ◀
              </button>
              
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - pagination.page) <= 2 || p === 1 || p === pagination.totalPages)
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <div key={p} className="flex items-center">
                      {showEllipsis && <span className="px-1.5 text-slate-400 font-bold">...</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          pagination.page === p
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'border border-slate-200 bg-white hover:bg-slate-55'
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  );
                })}

              <button
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
                className="px-3 py-1.5 border border-slate-250 bg-white hover:bg-slate-55 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Inspect Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-100 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              {/* Modal Title */}
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-150">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">
                  🔍 {tLocal.modalTitle}
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold border border-transparent rounded-lg hover:bg-slate-50 px-2.5 py-0.5 transition-all cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Modal Body Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 mb-5 bg-slate-50/50 p-4 rounded-2xl border border-slate-150">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{tLocal.modalTimestamp}</span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-slate-650">{formatLocalTimestamp(selectedLog.timestamp)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{tLocal.modalOperator}</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-850">
                    {typeof selectedLog.user === 'object' ? `${selectedLog.user.name} (${selectedLog.user.role})` : selectedLog.user}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{tLocal.modalAction}</span>
                  <span className="mt-1 block">{renderActionBadge(selectedLog.action)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{tLocal.modalModel}</span>
                  <span className="text-xs sm:text-sm font-bold text-blue-600">{selectedLog.model}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{tLocal.modalRecordId}</span>
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100/60 px-2 py-1 rounded border border-slate-200 mt-1 block self-start break-all">
                    {selectedLog.recordId}
                  </span>
                </div>
              </div>

              {/* Detail JSON code block */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {tLocal.modalRawDetails}
                  </label>
                  <button
                    onClick={handleCopyJson}
                    className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded transition-all cursor-pointer active:scale-95"
                  >
                    {copied ? tLocal.copiedMsg : tLocal.copyBtn}
                  </button>
                </div>
                
                <div className="overflow-y-auto max-h-[300px] border border-slate-200 bg-slate-900 rounded-xl p-4 font-mono text-[11px] text-emerald-400 shadow-inner">
                  <pre className="whitespace-pre-wrap word-break-all leading-relaxed">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end gap-2 border-t border-slate-150 pt-4 mt-6">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  {tLocal.closeBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
