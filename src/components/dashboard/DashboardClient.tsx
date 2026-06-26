'use client';
import { useI18n } from '@/lib/i18n';

import { useMemo, useState, useEffect } from 'react';
import Card from '@/components/common/Card';
import Link from 'next/link';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { getLoggedUser, LoggedUser } from '@/lib/auth-client';
import Portal from '@/components/common/Portal';

interface Dependent {
  name: string;
  relationship: string;
  birthDate: string;
  gender: string;
  cohabitation: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  firstNameKana: string;
  lastNameKana: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hireDate: string;
  salary: number;
  status: string;
  nationality: string;
  residenceStatus: string;
  residenceCardNumber: string;
  residenceCardIssueDate: string;
  residenceExpiry: string;
  workRestriction: string;
  contractType: string;
  contractStartDate: string;
  contractEndDate: string;
  salaryType: string;
  hourlyRate: number;
  dailyRate: number;
  benefits: {
    healthInsurance: boolean;
    pension: boolean;
    employmentInsurance: boolean;
    workersComp: boolean;
    transportation: number;
    housing: number;
    meal: number;
  };
  dependents: number;
  dependentList: Dependent[];
  shitenIds?: string[];
}

interface DashboardShiten {
  id: string;
  name: string;
  nameKana: string | null;
  employeeIds: string[];
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  overtimeHours: number;
  status: string;
  note: string;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
}

// Check expiry status (Urgency Level)
function getExpiryStatus(dateStr: string | null, t?: any) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((d.getTime() - today.getTime()) / 86400000);

  const getLabel = (level: string) => {
    if (!t) {
      if (level === 'expired') return `Expired (${Math.abs(daysLeft)} days ago)`;
      if (level === 'urgent') return `Urgent (${daysLeft} days left)`;
      if (level === 'warning') return `Warning (${daysLeft} days left)`;
      return `Safe (${daysLeft} days left)`;
    }
    if (level === 'expired') return t('dashboard.expiryStatusExpired').replace('{days}', String(Math.abs(daysLeft)));
    if (level === 'urgent') return t('dashboard.expiryStatusUrgent').replace('{days}', String(daysLeft));
    if (level === 'warning') return t('dashboard.expiryStatusWarning').replace('{days}', String(daysLeft));
    return t('dashboard.expiryStatusSafe').replace('{days}', String(daysLeft));
  };

  if (daysLeft < 0) {
    return { level: 'expired', daysLeft, label: getLabel('expired'), colorClass: 'text-red-700 bg-red-50 border-red-200', pct: 0 };
  }
  if (daysLeft <= 30) {
    return { level: 'urgent', daysLeft, label: getLabel('urgent'), colorClass: 'text-orange-700 bg-orange-50 border-orange-200', pct: Math.max(0, (daysLeft / 30) * 100) };
  }
  if (daysLeft <= 90) {
    return { level: 'warning', daysLeft, label: getLabel('warning'), colorClass: 'text-amber-700 bg-amber-50 border-amber-200', pct: Math.max(0, (daysLeft / 90) * 100) };
  }
  return { level: 'safe', daysLeft, label: getLabel('safe'), colorClass: 'text-green-700 bg-green-50 border-green-200', pct: 100 };
}

interface DashboardWidget {
  id: string;
  visible: boolean;
  gridSpan: string;
  nameKey: string;
}

interface DashboardSection {
  id: string;
  visible: boolean;
  nameKey: string;
  emoji: string;
  widgets: DashboardWidget[];
}

const DEFAULT_SECTIONS: DashboardSection[] = [
  {
    id: 'kpiSummary',
    visible: true,
    nameKey: 'kpiSummary',
    emoji: '📊',
    widgets: []
  },
  {
    id: 'attendance',
    visible: true,
    nameKey: 'attendance',
    emoji: '📅',
    widgets: [
      { id: 'donutChart', visible: true, gridSpan: 'lg:col-span-1', nameKey: 'donutChart' },
      { id: 'rollCallTable', visible: true, gridSpan: 'lg:col-span-2', nameKey: 'rollCallTable' },
      { id: 'shitenStats', visible: true, gridSpan: 'lg:col-span-1', nameKey: 'shitenStats' },
      { id: 'shitenStaff', visible: true, gridSpan: 'lg:col-span-2', nameKey: 'shitenStaff' },
      { id: 'pendingLeaves', visible: true, gridSpan: 'lg:col-span-3', nameKey: 'pendingLeaves' },
      { id: 'attendanceTrend', visible: true, gridSpan: 'lg:col-span-3', nameKey: 'attendanceTrend' }
    ]
  },
  {
    id: 'overtime',
    visible: true,
    nameKey: 'overtime',
    emoji: '🕐',
    widgets: [
      { id: 'overtimeTrend', visible: true, gridSpan: 'lg:col-span-2', nameKey: 'overtimeTrend' },
      { id: 'overtimeWarning', visible: true, gridSpan: 'lg:col-span-1', nameKey: 'overtimeWarning' }
    ]
  },
  {
    id: 'compliance',
    visible: true,
    nameKey: 'compliance',
    emoji: '🛂',
    widgets: [
      { id: 'visaExpiry', visible: true, gridSpan: 'lg:col-span-1', nameKey: 'visaExpiry' },
      { id: 'contractExpiry', visible: true, gridSpan: 'lg:col-span-1', nameKey: 'contractExpiry' },
      { id: 'nationalityStats', visible: true, gridSpan: 'lg:col-span-2', nameKey: 'nationalityStats' }
    ]
  },
  {
    id: 'orgStats',
    visible: true,
    nameKey: 'orgStats',
    emoji: '🏢',
    widgets: [
      { id: 'deptDistribution', visible: true, gridSpan: 'lg:col-span-2', nameKey: 'deptDistribution' },
      { id: 'recentHires', visible: true, gridSpan: 'lg:col-span-1', nameKey: 'recentHires' }
    ]
  },
  {
    id: 'quickLinks',
    visible: true,
    nameKey: 'quickLinks',
    emoji: '🔗',
    widgets: []
  }
];

const sectionNames: Record<string, Record<string, string>> = {
  ja: {
    kpiSummary: 'KPI 統計サマリー',
    attendance: '勤怠・稼働状況',
    overtime: '稼働時間・時間外労働',
    compliance: 'ビザ & 契約管理',
    orgStats: '組織構造・人事データ',
    quickLinks: 'クイックリンク',
  },
  en: {
    kpiSummary: 'KPI Summary Stats',
    attendance: 'Attendance & Operations',
    overtime: 'Work Hours & Overtime',
    compliance: 'Visa & Contract Management',
    orgStats: 'Organization Statistics',
    quickLinks: 'Quick Links',
  },
  vi: {
    kpiSummary: 'Thống kê tổng hợp (KPI)',
    attendance: 'Điểm danh & Hoạt động',
    overtime: 'Giờ làm & Tăng ca',
    compliance: 'Visa & Hợp đồng',
    orgStats: 'Cơ cấu & Số liệu nhân sự',
    quickLinks: 'Liên kết thao tác nhanh',
  },
  zh: {
    kpiSummary: 'KPI 统计摘要',
    attendance: '考勤与运营状况',
    overtime: '工作时间与加班管理',
    compliance: '签证与合同管理',
    orgStats: '组织架构数据',
    quickLinks: '快速链接',
  },
  th: {
    kpiSummary: 'แถบสรุปข้อมูล KPI',
    attendance: 'การลงเวลาและการปฏิบัติงานรายสาขา',
    overtime: 'ชั่วโมงทำงานและการทำงานล่วงเวลาสะสม',
    compliance: 'การควบคุมวีซ่าและสัญญาจ้างงาน',
    orgStats: 'ข้อมูลโครงสร้างองค์กร',
    quickLinks: 'ลิงก์การเข้าถึงด่วน',
  }
};

const widgetNames: Record<string, Record<string, string>> = {
  ja: {
    donutChart: '本日出勤率 (ドーナツチャート)',
    rollCallTable: '本日出欠一覧 (点呼テーブル)',
    shitenStats: '支店別稼働率統計 (バーチャート)',
    shitenStaff: '支店別本日の稼働メンバー一覧',
    attendanceTrend: '出勤率履歴 (7日間トレンド)',
    pendingLeaves: '休暇申請承認待ち一覧',
    overtimeTrend: '時間外労働推移 (バーチャート)',
    overtimeWarning: '過重労働アラート一覧',
    visaExpiry: '在留資格期限監視',
    contractExpiry: '雇用契約期限監視',
    nationalityStats: '国籍別外国人従業員統計',
    deptDistribution: '部署別人員配置統計',
    recentHires: '最近30日間の新規入社従業員',
  },
  en: {
    donutChart: 'Today Attendance Rate (Donut Chart)',
    rollCallTable: 'Today Attendance List (Roll Call Table)',
    shitenStats: 'Branch Attendance Rate (Bar Chart)',
    shitenStaff: 'Today Branch Operational Staff',
    attendanceTrend: 'Attendance Rate History (7-Day Trend)',
    pendingLeaves: 'Pending Leave Approvals List',
    overtimeTrend: 'Overtime Trend (Bar Chart)',
    overtimeWarning: 'Overwork Warning Alert List',
    visaExpiry: 'Residence Visa Expiry Monitor',
    contractExpiry: 'Employment Contract Expiry Monitor',
    nationalityStats: 'Nationality Statistics (Foreigners)',
    deptDistribution: 'Department Personnel Distribution',
    recentHires: 'New Employees (Last 30 Days)',
  },
  vi: {
    donutChart: 'Tỷ lệ đi làm hôm nay (Biểu đồ tròn)',
    rollCallTable: 'Danh sách điểm danh hôm nay (Bảng điểm danh)',
    shitenStats: 'Tỷ lệ hoạt động chi nhánh (Biểu đồ thanh)',
    shitenStaff: 'Thành viên làm việc tại chi nhánh hôm nay',
    attendanceTrend: 'Lịch sử tỷ lệ đi làm (Xu hướng 7 ngày)',
    pendingLeaves: 'Danh sách nghỉ phép chờ duyệt',
    overtimeTrend: 'Xu hướng làm thêm giờ (Biểu đồ cột)',
    overtimeWarning: 'Danh sách cảnh báo làm việc quá giờ',
    visaExpiry: 'Theo dõi thời hạn thẻ cư trú / Visa',
    contractExpiry: 'Theo dõi thời hạn hợp đồng lao động',
    nationalityStats: 'Thống kê quốc tịch nhân viên nước ngoài',
    deptDistribution: 'Phân bổ nhân sự theo phòng ban',
    recentHires: 'Nhân viên mới nhận việc (30 ngày qua)',
  },
  zh: {
    donutChart: '今日出勤率 (环形图)',
    rollCallTable: '今日出勤列表 (点名表)',
    shitenStats: '分店出勤率 (柱状图)',
    shitenStaff: '今日分店在岗成员列表',
    attendanceTrend: '出勤率历史 (7天趋势)',
    pendingLeaves: '待审批请假申请列表',
    overtimeTrend: '加班趋势 (柱状图)',
    overtimeWarning: '加班警报列表',
    visaExpiry: '签证过期监控',
    contractExpiry: '合同过期监控',
    nationalityStats: '外国员工国籍分布',
    deptDistribution: '部门人员分布统计',
    recentHires: '最近30日新进员工',
  },
  th: {
    donutChart: 'อัตราเข้างานวันนี้ (แผนภูมิโดนัท)',
    rollCallTable: 'รายการเข้างานวันนี้ (ตารางเรียกชื่อ)',
    shitenStats: 'อัตราการทำงานรายสาขา (แผนภูมิแท่ง)',
    shitenStaff: 'สมาชิกปฏิบัติงานรายสาขาวันนี้',
    attendanceTrend: 'ประวัติอัตราเข้างาน (แนวโน้ม 7 วัน)',
    pendingLeaves: 'รายการใบลาที่รอการอนุมัติ',
    overtimeTrend: 'แนวโน้มการทำงานล่วงเวลา (แผนภูมิแท่ง)',
    overtimeWarning: 'รายการแจ้งเตือนการทำงานล่วงเวลาสะสม',
    visaExpiry: 'ระบบตรวจวัดการหมดอายุของวีซ่า',
    contractExpiry: 'ระบบตรวจวัดการหมดอายุของสัญญาจ้าง',
    nationalityStats: 'สถิติสัญชาติของพนักงานต่างชาติ',
    deptDistribution: 'สัดส่วนพนักงานแยกตามแผนก',
    recentHires: 'พนักงานใหม่ (ในรอบ 30 วัน)',
  }
};

const settingsBtnTextMap: Record<string, string> = {
  ja: 'ダッシュボードカスタマイズ',
  en: 'Customize Dashboard',
  vi: 'Cấu hình giao diện Dashboard',
  zh: '自定义仪表板',
  th: 'ปรับแต่งแดชบอร์ด'
};

export default function DashboardClient({
  employees,
  attendance,
  leaves: initialLeaves,
  shitens = [],
  isEmployeeMode = false,
  currentUser,
}: {
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  shitens?: DashboardShiten[];
  isEmployeeMode?: boolean;
  currentUser?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}) {
  const { t, locale } = useI18n();
  const [leaves, setLeaves] = useState<LeaveRequest[]>(initialLeaves);
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'leave' | 'unregistered'>('all');

  const [showForbiddenAlert, setShowForbiddenAlert] = useState(false);
  const [user, setUser] = useState<LoggedUser | null>(null);

  const [punchState, setPunchState] = useState<{
    checkIn: string | null;
    breakStart: string | null;
    breakEnd: string | null;
    checkOut: string | null;
  }>({ checkIn: null, breakStart: null, breakEnd: null, checkOut: null });
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchSuccess, setPunchSuccess] = useState<string | null>(null);
  const [punchError, setPunchError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [activeAnnouncementDetail, setActiveAnnouncementDetail] = useState<any | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setAnnouncementsLoading(true);
      try {
        const res = await fetch('/api/announcements');
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(Array.isArray(data) ? data : (data.data || []));
        }
      } catch (e) {
        console.error('Failed to fetch announcements', e);
      } finally {
        setAnnouncementsLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loggedUser = getLoggedUser();
      setUser(loggedUser);

      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'forbidden') {
        setShowForbiddenAlert(true);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  // Ticking time clock for Punch Card in JST
  useEffect(() => {
    if (!isEmployeeMode) return;
    
    const updateTime = () => {
      const jstTimeStr = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(new Date());
      setCurrentTime(jstTimeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isEmployeeMode]);

  // Load today's punch state
  useEffect(() => {
    if (!isEmployeeMode) return;
    
    const loadPunchState = async () => {
      try {
        const res = await fetch('/api/attendance/punch');
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            const data = body.data;
            
            const formatTime = (isoStr: string | null) => {
              if (!isoStr) return null;
              const date = new Date(isoStr);
              return date.toLocaleTimeString('ja-JP', { 
                timeZone: 'Asia/Tokyo', 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              });
            };

            setPunchState({
              checkIn: formatTime(data.checkIn),
              breakStart: formatTime(data.breakStart),
              breakEnd: formatTime(data.breakEnd),
              checkOut: formatTime(data.checkOut),
            });
          }
        }
      } catch (e) {
        console.error('Failed to load punch state', e);
      }
    };

    loadPunchState();
  }, [user]);

  const handlePunch = async (action: 'checkIn' | 'breakStart' | 'breakEnd' | 'checkOut') => {
    setPunchLoading(true);
    setPunchError(null);
    setPunchSuccess(null);

    try {
      const res = await fetch('/api/attendance/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || t('dashboard.punchError'));
      }

      if (body.success && body.data) {
        const data = body.data;
        
        const formatTime = (isoStr: string | null) => {
          if (!isoStr) return null;
          const date = new Date(isoStr);
          return date.toLocaleTimeString('ja-JP', { 
            timeZone: 'Asia/Tokyo', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          });
        };

        setPunchState({
          checkIn: formatTime(data.checkIn),
          breakStart: formatTime(data.breakStart),
          breakEnd: formatTime(data.breakEnd),
          checkOut: formatTime(data.checkOut),
        });

        setPunchSuccess(t('dashboard.punchSuccess'));
      }
    } catch (err: any) {
      setPunchError(err.message || t('dashboard.punchErrorOccurred'));
    } finally {
      setPunchLoading(false);
    }
  };

  const hasPunchToday = !!(punchState.checkIn || punchState.breakStart || punchState.breakEnd || punchState.checkOut);

  const handlePunchReset = async () => {
    if (!window.confirm(t('dashboard.punchResetConfirm'))) return;
    setPunchLoading(true);
    setPunchError(null);
    setPunchSuccess(null);

    try {
      const res = await fetch('/api/attendance/punch', { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || t('dashboard.punchError'));
      }
      setPunchState({ checkIn: null, breakStart: null, breakEnd: null, checkOut: null });
      setPunchSuccess(t('dashboard.punchResetSuccess'));
    } catch (err: any) {
      setPunchError(err.message || t('dashboard.punchErrorOccurred'));
    } finally {
      setPunchLoading(false);
    }
  };

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  }, []);

  // Compute all statistics in useMemo
  const baseStatsCalc = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
    const onLeaveEmployees = employees.filter(e => e.status === 'ON_LEAVE');

    // Attendance breakdown for today
    const todayAtt = attendance.filter(a => a.date === todayStr);

    const presentIds = new Set(todayAtt.filter(a => a.status === 'PRESENT').map(a => a.employeeId));
    const lateIds = new Set(todayAtt.filter(a => a.status === 'LATE').map(a => a.employeeId));
    const absentIds = new Set(todayAtt.filter(a => a.status === 'ABSENT').map(a => a.employeeId));

    // Active leave requests covering today
    const activeLeaves = leaves.filter(l => {
      if (l.status !== 'APPROVED') return false;
      const start = l.startDate;
      const end = l.endDate;
      return todayStr >= start && todayStr <= end;
    });
    const leaveEmpIds = new Set(activeLeaves.map(l => l.employeeId));

    // Compile employee statuses for today's roll-call list
    const rollCallList = employees.map(emp => {
      let rollStatus: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'UNREGISTERED' = 'UNREGISTERED';
      let checkIn = '-';
      let checkOut = '-';
      let note = '';

      const attRecord = todayAtt.find(a => a.employeeId === emp.id);

      if (emp.status === 'ON_LEAVE' || leaveEmpIds.has(emp.id)) {
        rollStatus = 'LEAVE';
        const leaveReq = activeLeaves.find(l => l.employeeId === emp.id);
        note = leaveReq ? t('dashboard.onLeaveWithReason').replace('{reason}', leaveReq.reason) : t('dashboard.onLeaveStatus');
      } else if (attRecord) {
        if (attRecord.status === 'PRESENT') rollStatus = 'PRESENT';
        else if (attRecord.status === 'LATE') rollStatus = 'LATE';
        else if (attRecord.status === 'ABSENT') rollStatus = 'ABSENT';
        checkIn = attRecord.checkIn || '-';
        checkOut = attRecord.checkOut || '-';
        note = attRecord.note || '';
      } else if (emp.status === 'INACTIVE') {
        rollStatus = 'UNREGISTERED';
        note = t('dashboard.resignedStatus');
      }

      return {
        ...emp,
        rollStatus,
        checkIn,
        checkOut,
        note,
      };
    }).filter(emp => emp.status !== 'INACTIVE'); // Do not show inactive employees in daily roll-call

    const presentCount = rollCallList.filter(e => e.rollStatus === 'PRESENT').length;
    const lateCount = rollCallList.filter(e => e.rollStatus === 'LATE').length;
    const absentCount = rollCallList.filter(e => e.rollStatus === 'ABSENT').length;
    const onLeaveCount = rollCallList.filter(e => e.rollStatus === 'LEAVE').length;
    const unregisteredCount = rollCallList.filter(e => e.rollStatus === 'UNREGISTERED').length;

    const workingCount = presentCount + lateCount;
    const totalWorkingForce = rollCallList.length;
    const denominator = totalWorkingForce - onLeaveCount;
    const attendanceRate = denominator > 0 ? Math.round((workingCount / denominator) * 100) : 0;

    // Overtime trends in the last 7 calendar days
    const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' });
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return formatter.format(d);
    });

    const overtimeTrend = last7Days.map(date => {
      const dateAtts = attendance.filter(a => a.date === date);
      const totalOT = dateAtts.reduce((sum, a) => sum + a.overtimeHours, 0);
      const activeWorking = dateAtts.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
      return {
        date: date.substring(5), // MM-DD
        totalOT,
        avgOT: activeWorking > 0 ? Math.round((totalOT / activeWorking) * 10) / 10 : 0,
      };
    });

    // Attendance trends in the last 7 calendar days (Line chart data)
    const attendanceTrend = last7Days.map(date => {
      const dateAtts = attendance.filter(a => a.date === date);
      const present = dateAtts.filter(a => a.status === 'PRESENT').length;
      const late = dateAtts.filter(a => a.status === 'LATE').length;
      const absent = dateAtts.filter(a => a.status === 'ABSENT').length;
      const working = present + late;
      const totalEmp = employees.filter(e => e.status !== 'INACTIVE').length;
      const leaveCount = employees.filter(e => e.status === 'ON_LEAVE').length; // approximation
      const rate = totalEmp - leaveCount > 0 ? Math.round((working / (totalEmp - leaveCount)) * 100) : 0;
      return {
        date: date.substring(5), // MM-DD
        rate,
        working,
      };
    });

    // Top Overtime workers (monthly check: last 30 days)
    const employeeOvertime = employees
      .filter(e => e.status !== 'INACTIVE')
      .map(emp => {
        const empAtts = attendance.filter(a => a.employeeId === emp.id);
        const monthlyOT = empAtts.reduce((sum, a) => sum + a.overtimeHours, 0);
        return {
          ...emp,
          monthlyOT,
        };
      })
      .sort((a, b) => b.monthlyOT - a.monthlyOT);

    const monthlyOTLimitAlerts = employeeOvertime.filter(e => e.monthlyOT >= 20); // 20h alert, 45h limit warning in Japan

    // Compliance & Visa Expire Alerts
    const foreignEmployees = employees.filter(e => e.status !== 'INACTIVE' && e.nationality && e.nationality !== '日本' && e.nationality !== 'Japan' && e.nationality !== 'ja');
    const visaAlerts = foreignEmployees
      .map(e => ({ ...e, expiry: getExpiryStatus(e.residenceExpiry, t) }))
      .filter(e => e.expiry && e.expiry.level !== 'safe')
      .sort((a, b) => a.expiry!.daysLeft - b.expiry!.daysLeft);

    // Contract Expire Alerts
    const activeContractEmployees = employees.filter(e => e.status !== 'INACTIVE' && e.contractEndDate);
    const contractAlerts = activeContractEmployees
      .map(e => ({ ...e, expiry: getExpiryStatus(e.contractEndDate, t) }))
      .filter(e => e.expiry && e.expiry.level !== 'safe')
      .sort((a, b) => a.expiry!.daysLeft - b.expiry!.daysLeft);

    // Salary total
    const monthlySalaryPool = activeEmployees.reduce((sum, e) => sum + (e.salary || 0), 0);

    return {
      totalEmp: employees.filter(e => e.status !== 'INACTIVE').length,
      active: activeEmployees.length,
      onLeave: onLeaveEmployees.length,
      presentCount,
      lateCount,
      absentCount,
      onLeaveCount,
      unregisteredCount,
      attendanceRate,
      rollCallList,
      overtimeTrend,
      attendanceTrend,
      employeeOvertime,
      monthlyOTLimitAlerts,
      visaAlerts,
      contractAlerts,
      monthlySalaryPool,
      totalForeignForce: foreignEmployees.length,
      totalContractForce: activeContractEmployees.length,
    };
  }, [employees, attendance, leaves, todayStr]);

  const stats = useMemo(() => {
    const baseStats = baseStatsCalc;
    const shitenStats = shitens.map(s => {
      const shitenEmps = employees.filter(emp => emp.shitenIds?.includes(s.id));
      const workingToday = shitenEmps.filter(emp => {
        const rc = baseStats.rollCallList.find(rcEmp => rcEmp.id === emp.id);
        return rc && (rc.rollStatus === 'PRESENT' || rc.rollStatus === 'LATE');
      });
      const notWorking = shitenEmps.filter(emp => {
        const rc = baseStats.rollCallList.find(rcEmp => rcEmp.id === emp.id);
        return !rc || (rc.rollStatus !== 'PRESENT' && rc.rollStatus !== 'LATE');
      });
      const rate = shitenEmps.length > 0 ? Math.round((workingToday.length / shitenEmps.length) * 100) : 0;
      return {
        ...s,
        totalEmployees: shitenEmps.length,
        workingTodayCount: workingToday.length,
        workingTodayEmployees: workingToday.map(e => `${e.lastName} ${e.firstName}`),
        notWorkingEmployees: notWorking.map(e => `${e.lastName} ${e.firstName}`),
        rate,
      };
    });

    return {
      ...baseStats,
      shitenStats,
    };
  }, [employees, shitens, baseStatsCalc]);

  // Pagination for roll‑call list (after stats)
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const filteredRollCall = useMemo(() => {
    return stats.rollCallList.filter(emp => {
      if (attendanceFilter === 'all') return true;
      if (attendanceFilter === 'present') return emp.rollStatus === 'PRESENT';
      if (attendanceFilter === 'late') return emp.rollStatus === 'LATE';
      if (attendanceFilter === 'absent') return emp.rollStatus === 'ABSENT';
      if (attendanceFilter === 'leave') return emp.rollStatus === 'LEAVE';
      if (attendanceFilter === 'unregistered') return emp.rollStatus === 'UNREGISTERED';
      return true;
    });
  }, [stats.rollCallList, attendanceFilter]);
  const totalPages = Math.ceil(filteredRollCall.length / PAGE_SIZE) || 1;
  const paginatedRollCall = useMemo(() => filteredRollCall.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredRollCall, page]);
  // Reset page when filter changes or data changes
  useEffect(() => setPage(1), [attendanceFilter, stats.rollCallList]);

  // Donut chart stroke definitions
  const donutChartData = useMemo(() => {
    const data = [
      { label: t('status.present'), value: stats.presentCount, color: 'url(#grad-emerald)' }, 
      { label: t('status.late'), value: stats.lateCount, color: 'url(#grad-orange)' },    
      { label: t('status.absent'), value: stats.absentCount, color: 'url(#grad-red)' },      
      { label: t('status.leave'), value: stats.onLeaveCount, color: 'url(#grad-blue)' },    
      { label: t('attendance.unregistered'), value: stats.unregisteredCount, color: 'url(#grad-slate)' }, 
    ].filter(item => item.value > 0);

    const sum = data.reduce((acc, item) => acc + item.value, 0);
    const r = 50;
    const circ = 2 * Math.PI * r;

    let accumulatedPercentage = 0;
    return data.map(item => {
      const percentage = sum > 0 ? (item.value / sum) * 100 : 0;
      const offset = (accumulatedPercentage / 100) * circ;
      accumulatedPercentage += percentage;
      return {
        ...item,
        percentage,
        strokeDasharray: `${(percentage / 100) * circ} ${circ}`,
        strokeDashoffset: -offset,
      };
    });
  }, [stats]);

  // Max overtime value for weekly chart scaling
  const maxOvertimeInTrend = useMemo(() => {
    const maxVal = Math.max(...stats.overtimeTrend.map(d => d.totalOT));
    return maxVal > 0 ? Math.ceil(maxVal / 5) * 5 : 10;
  }, [stats.overtimeTrend]);

  // Individual helper rendering functions for widgets and blocks
  const renderKPIOverview = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fadeIn">
      {[
        { label: t('dashboard.statsTotalEmp'), value: stats.totalEmp, icon: '👤', color: 'text-slate-800', border: 'border-slate-200/50', isWarning: false },
        { label: t('dashboard.statsAttendanceRate'), value: `${stats.attendanceRate}%`, icon: '📈', color: 'text-emerald-600', border: 'border-emerald-200/40 bg-emerald-50/10', isWarning: false },
        { label: t('dashboard.statsOnLeave'), value: `${stats.onLeaveCount}${t('common.personUnit')}`, icon: '🏖️', color: 'text-blue-600', border: 'border-blue-200/40 bg-blue-50/10', isWarning: false },
        { 
          label: t('dashboard.statsOvertimeAlerts'), 
          value: `${stats.monthlyOTLimitAlerts.length}${t('common.personUnit')}`, 
          icon: '⏰',
          color: stats.monthlyOTLimitAlerts.length > 0 ? 'text-red-600 font-extrabold animate-pulse' : 'text-slate-500', 
          border: stats.monthlyOTLimitAlerts.length > 0 ? 'border-red-200 bg-red-50/30 shadow-[0_4px_20px_rgba(239,68,68,0.05)]' : 'border-slate-200/50',
          isWarning: stats.monthlyOTLimitAlerts.length > 0
        },
        { 
          label: t('dashboard.statsVisaAlerts'), 
          value: `${stats.visaAlerts.length}${t('common.personUnit')}`, 
          icon: '🛂',
          color: stats.visaAlerts.length > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-500', 
          border: stats.visaAlerts.length > 0 ? 'border-rose-200 bg-rose-50/30 shadow-[0_4px_20px_rgba(244,63,94,0.05)]' : 'border-slate-200/50',
          isWarning: stats.visaAlerts.length > 0
        },
        { 
          label: t('dashboard.statsContractAlerts'), 
          value: `${stats.contractAlerts.length}${t('common.personUnit')}`, 
          icon: '📋',
          color: stats.contractAlerts.length > 0 ? 'text-amber-600 font-extrabold' : 'text-slate-500', 
          border: stats.contractAlerts.length > 0 ? 'border-amber-200 bg-amber-50/30 shadow-[0_4px_20px_rgba(245,158,11,0.05)]' : 'border-slate-200/50',
          isWarning: stats.contractAlerts.length > 0
        },
      ].map((s, idx) => (
        <div key={idx} className={cn("bg-white rounded-3xl shadow-premium border p-4.5 transition-all duration-300 hover:shadow-premium-hover hover:-translate-y-0.5 relative overflow-hidden", s.border)}>
          <div className="flex justify-between items-start">
            <p className="text-xxs text-slate-400 font-bold uppercase tracking-wider">{s.label}</p>
            <span className="text-sm opacity-80">{s.icon}</span>
          </div>
          <div className="flex items-baseline justify-between mt-2.5">
            <p className={cn("text-xl sm:text-2xl font-black tracking-tight", s.color)}>{s.value}</p>
            {s.isWarning && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderDonutChart = () => (
    <Card title={`📊 ${t('dashboard.attendanceRate')} (${t('dashboard.all')})`} className="h-full">
      <p className="text-xs text-slate-400 -mt-2 mb-4">{t('dashboard.asOf').replace('{date}', formatDate(todayStr))}</p>
      <div className="flex flex-col items-center justify-center p-2">
        <div className="relative w-44 h-44">
          <svg width="100%" height="100%" viewBox="0 0 160 160" className="-rotate-90">
            <defs>
              <linearGradient id="grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="grad-orange" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
              <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
              <linearGradient id="grad-slate" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
            </defs>
            <circle cx="80" cy="80" r="50" fill="transparent" stroke="#f8fafc" strokeWidth="16" />
            {donutChartData.map((item, idx) => (
              <circle
                key={idx}
                cx="80"
                cy="80"
                r="50"
                fill="transparent"
                stroke={item.color}
                strokeWidth="16"
                strokeDasharray={item.strokeDasharray}
                strokeDashoffset={item.strokeDashoffset}
                strokeLinecap="butt"
                className="transition-all duration-300 hover:stroke-[18px] cursor-pointer"
              >
                <title>{`${item.label}: ${item.value}${t('common.personUnit')} (${Math.round(item.percentage)}%)`}</title>
              </circle>
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-black text-slate-800 tracking-tight">{stats.attendanceRate}%</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{t('dashboard.attendanceRate')}</p>
          </div>
        </div>
        <div className="w-full mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { label: t('status.present'), count: stats.presentCount, color: 'bg-emerald-500' },
            { label: t('status.late'), count: stats.lateCount, color: 'bg-orange-500' },
            { label: t('status.absent'), count: stats.absentCount, color: 'bg-red-500' },
            { label: t('status.leave'), count: stats.onLeaveCount, color: 'bg-blue-500' },
            { label: t('attendance.unregistered'), count: stats.unregisteredCount, color: 'bg-slate-400' },
          ].map(legend => {
            const dotColor = legend.color;
            return (
              <div key={legend.label} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition-colors">
                <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                <span className="text-xs text-slate-600 font-semibold">{legend.label}</span>
                <span className="ml-auto text-xs font-black text-slate-800">{legend.count}{t('common.personUnit')}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );

  const renderRollCallTable = () => (
    <Card
      title={t('dashboard.attendanceChartTitle')}
      className="h-full"
      action={
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 overflow-x-auto max-w-full no-scrollbar flex-nowrap shrink-0">
          {[
            { id: 'all', label: t('dashboard.all') },
            { id: 'present', label: t('status.present') },
            { id: 'late', label: t('status.late') },
            { id: 'absent', label: t('status.absent') },
            { id: 'leave', label: t('status.leave') },
            { id: 'unregistered', label: t('attendance.unregistered') },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setAttendanceFilter(btn.id as any)}
              className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                attendanceFilter === btn.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      }
    >
      <p className="text-xs text-slate-400 -mt-2 mb-4">{t('dashboard.attendanceChartDesc')}</p>
      <div className="overflow-x-auto overflow-y-auto max-h-[380px] pr-2">
        <table className="w-full table-fixed text-left border-collapse" style={{ minWidth: '680px' }}>
          <colgroup>
            <col style={{ width: '140px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '90px' }} />
            <col style={{ width: '90px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '160px' }} />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
              <th className="px-4 py-3">{t('dashboard.colName')}</th>
              <th className="px-4 py-3">{t('dashboard.colDept')}</th>
              <th className="px-4 py-3">{t('dashboard.colCheckIn')}</th>
              <th className="px-4 py-3">{t('dashboard.colCheckOut')}</th>
              <th className="px-4 py-3">{t('dashboard.colStatus')}</th>
              <th className="px-4 py-3">{t('dashboard.colNotes')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRollCall.map(emp => (
               <tr key={emp.id} className="hover:bg-slate-50/40 transition-colors text-sm">
                 <td className="px-4 py-3 font-semibold text-slate-800">
                   {emp.lastName} {emp.firstName}
                 </td>
                 <td className="px-4 py-3 text-xs text-slate-500 font-medium">{emp.department}</td>
                 <td className="px-4 py-3 font-mono text-slate-600 text-xs font-semibold">{emp.checkIn}</td>
                 <td className="px-4 py-3 font-mono text-slate-600 text-xs font-semibold">{emp.checkOut}</td>
                 <td className="px-4 py-3">
                   <span className={`inline-flex px-2.5 py-0.5 text-xs rounded-lg font-bold ${
                     emp.rollStatus === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                     emp.rollStatus === 'LATE' ? 'bg-orange-50 text-orange-700 border border-orange-200 animate-pulse' :
                     emp.rollStatus === 'ABSENT' ? 'bg-red-50 text-red-700 border border-red-200' :
                     emp.rollStatus === 'LEAVE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                     'bg-slate-100 text-slate-500 border border-slate-200'
                   }`}>
                     {emp.rollStatus === 'PRESENT' ? t('status.present') :
                      emp.rollStatus === 'LATE' ? t('status.late') :
                      emp.rollStatus === 'ABSENT' ? t('status.absent') :
                      emp.rollStatus === 'LEAVE' ? t('status.leave') : t('attendance.unregistered')}
                   </span>
                 </td>
                 <td className="px-4 py-3 text-xs text-slate-400 max-w-[150px] truncate">{emp.note || '-'}</td>
               </tr>
             ))}
             {paginatedRollCall.length === 0 && (
               <tr>
                 <td colSpan={6} className="text-center text-slate-400 py-12 text-sm">
                   {t('dashboard.noRecords')}
                 </td>
               </tr>
             )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 text-sm mt-4 border-t border-slate-100 pt-3">
         <button
           onClick={() => setPage(p => Math.max(p - 1, 1))}
           disabled={page === 1}
           className="px-3 py-1 rounded-lg bg-slate-50 border hover:bg-slate-100 disabled:opacity-50 text-xs font-bold text-slate-600"
         >{t('common.pagination.prev')}</button>
         <span className="text-xs font-bold text-slate-400">{t('common.pagination.pageInfo').replace('{current}', String(page)).replace('{total}', String(totalPages))}</span>
         <button
           onClick={() => setPage(p => Math.min(p + 1, totalPages))}
           disabled={page === totalPages}
           className="px-3 py-1 rounded-lg bg-slate-50 border hover:bg-slate-100 disabled:opacity-50 text-xs font-bold text-slate-600"
         >{t('common.pagination.next')}</button>
      </div>
    </Card>
  );

  const renderShitenStats = () => (
    <Card title={`🏢 ${t('shitens.title')} (Branch Operations)`} className="h-full p-6">
      <p className="text-xs text-slate-400 -mt-2 mb-6">本日稼働率</p>
      <div className="space-y-4">
        {stats.shitenStats.length === 0 ? (
          <p className="text-center py-12 text-slate-400 text-xs font-semibold">{t('shitens.noShiten')}</p>
        ) : (
          stats.shitenStats.map((shiten) => (
            <div key={shiten.id} className="space-y-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-800">{shiten.name}</span>
                <span className="font-bold text-slate-500">{shiten.workingTodayCount} / {shiten.totalEmployees} 名</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${shiten.rate}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>稼̀u率: {shiten.rate}%</span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  const renderShitenStaff = () => (
    <Card title="👥 支店別本日の稼働メンバー (Today's Branch Team)" className="h-full p-6">
      <p className="text-xs text-slate-400 -mt-2 mb-4">本日各支店で稼働中および非稼働のメンバー一覧</p>
      <div className="space-y-4 overflow-y-auto max-h-[380px] pr-2">
        {stats.shitenStats.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            {t('shitens.noShiten')}
          </div>
        ) : (
          stats.shitenStats.map((shiten) => (
            <div key={shiten.id} className="p-4 bg-slate-50/30 border border-slate-200/80 rounded-2xl space-y-3">
              <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  📍 {shiten.name}
                </h4>
                <span className="text-xxs px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold">
                  本日稼働: {shiten.workingTodayCount} 名
                </span>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400">🟢 勤務中 ({shiten.workingTodayCount})</p>
                {shiten.workingTodayEmployees.length === 0 ? (
                  <p className="text-xxs text-slate-400 italic">勤務中のメンバーはいません</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {shiten.workingTodayEmployees.map(name => (
                      <span key={name} className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-700 font-bold">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400">⚪ 未稼働/公休/休暇 ({shiten.notWorkingEmployees.length})</p>
                {shiten.notWorkingEmployees.length === 0 ? (
                  <p className="text-xxs text-slate-400 italic">未稼働/公休のメンバーはいません</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {shiten.notWorkingEmployees.map(name => (
                      <span key={name} className="inline-flex items-center px-2 py-0.5 rounded border border-slate-200 bg-white text-[10px] text-slate-550 font-bold">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  const renderAttendanceTrend = () => (
    <Card title={t('dashboard.attendanceHistoryTitle')} className="">
      <p className="text-xs text-slate-400 -mt-2 mb-6">{t('dashboard.attendanceHistoryDesc')}</p>
      <div className="p-2">
        <div className="relative w-full">
          <svg className="w-full h-auto aspect-[16/4.5]" viewBox="0 0 600 150">
            <defs>
              <linearGradient id="attendance-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {[0, 25, 50, 75, 100].map((level, idx) => {
              const y = 140 - (level / 100) * 100;
              return (
                <g key={idx}>
                  <line x1="40" y1={y} x2="580" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="15" y={y + 3} fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">{level}%</text>
                </g>
              );
            })}
            {(() => {
              const points = stats.attendanceTrend.map((d, i) => {
                const x = 50 + i * 85;
                const y = 140 - (d.rate / 100) * 100;
                return { x, y, rate: d.rate, date: d.date };
              });
              if (points.length === 0) return null;
              const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const areaPath = `${linePath} L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`;
              return (
                <g>
                  <path d={areaPath} fill="url(#attendance-area-grad)" />
                  <path d={linePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  {points.map((p, i) => (
                    <g key={i} className="group cursor-pointer">
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="4.5"
                        fill="#ffffff"
                        stroke="#10b981"
                        strokeWidth="3"
                        className="transition-all duration-200 group-hover:r-[6px] group-hover:strokeWidth-[4px]"
                      />
                      <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <rect x={p.x - 20} y={p.y - 25} width="40" height="18" rx="5" fill="#1e293b" />
                        <text x={p.x} y={p.y - 13} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                          {p.rate}%
                        </text>
                      </g>
                      <text x={p.x} y="145" fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">{p.date}</text>
                    </g>
                  ))}
                </g>
              );
            })()}
          </svg>
        </div>
      </div>
    </Card>
  );

  const renderPendingLeaves = () => {
    const pendingList = leaves.filter(l => l.status === 'PENDING');
    const handleApproveLeave = async (id: string) => {
      try {
        const res = await fetch('/api/leave', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: 'APPROVED' }),
        });
        if (res.ok) {
          setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'APPROVED' } : l));
        } else {
          alert(t('leave.approveFailed') || 'Approval failed');
        }
      } catch (e) {
        console.error(e);
      }
    };
    const handleRejectLeave = async (id: string) => {
      try {
        const res = await fetch('/api/leave', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: 'REJECTED' }),
        });
        if (res.ok) {
          setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'REJECTED' } : l));
        } else {
          alert(t('leave.rejectFailed') || 'Rejection failed');
        }
      } catch (e) {
        console.error(e);
      }
    };
    return (
      <Card 
        title={locale === 'vi' ? `🏖️ Đơn nghỉ phép chờ duyệt (${pendingList.length})` : locale === 'ja' ? `🏖️ 承認待ちの休暇申請 (${pendingList.length}件)` : `🏖️ Pending Leaves (${pendingList.length})`}
        className="h-full p-6"
        action={
          <Link href="/leave" className="text-xs text-blue-600 hover:text-blue-800 font-bold">
            {locale === 'vi' ? 'Quản lý nghỉ phép →' : locale === 'ja' ? '休暇管理ページへ →' : 'Manage Leave →'}
          </Link>
        }
      >
        <p className="text-xs text-slate-400 -mt-2 mb-4">
          {locale === 'vi' ? 'Xét duyệt nhanh các đơn đăng ký nghỉ phép của nhân viên' : locale === 'ja' ? '従業員からの休暇申請を迅速に審査・承認します' : 'Quickly review and approve/reject employee leave requests'}
        </p>
        <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
          {pendingList.map(req => {
            const emp = employees.find(e => e.id === req.employeeId);
            const empName = emp ? `${emp.lastName} ${emp.firstName}` : 'Unknown';
            const typeLabel = req.type === 'annual' ? t('leave.annual') : req.type === 'sick' ? t('leave.sick') : t('leave.special');
            return (
              <div key={req.id} className="p-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl hover:shadow-sm hover:border-slate-350 transition-all flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{empName}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{emp?.department || '-'} • {emp?.position || '-'}</p>
                  </div>
                  <span className="text-xxs px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-black uppercase">
                    {typeLabel}
                  </span>
                </div>
                <div className="text-xs text-slate-600 font-medium space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                  <p>📅 {formatDate(req.startDate)} ~ {formatDate(req.endDate)} ({req.days} {t('common.dayUnit') || 'days'})</p>
                  <p className="italic text-slate-500">💬 {req.reason || '-'}</p>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
                  <button
                    onClick={() => handleRejectLeave(req.id)}
                    className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-650 hover:text-red-700 text-xs rounded-xl font-bold transition-all cursor-pointer"
                  >
                    {locale === 'vi' ? 'Từ chối' : locale === 'ja' ? '却下' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleApproveLeave(req.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl font-bold shadow-sm transition-all cursor-pointer"
                  >
                    {locale === 'vi' ? 'Phê duyệt' : locale === 'ja' ? '承認' : 'Approve'}
                  </button>
                </div>
              </div>
            );
          })}
          {pendingList.length === 0 && (
            <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
              <span className="text-2xl">✨</span>
              <p className="text-sm text-slate-400 mt-2 font-semibold">
                {locale === 'vi' ? 'Không có yêu cầu nghỉ phép nào cần xử lý' : locale === 'ja' ? '処理待ちの申請はありません' : 'No pending leave requests'}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderOvertimeTrend = () => (
    <Card title={t('dashboard.overtimeTrendTitle')} className="">
      <p className="text-xs text-slate-400 -mt-2 mb-4">{t('dashboard.overtimeTrendDesc')}</p>
      <div className="p-2">
        <div className="relative w-full">
          <svg className="w-full h-auto aspect-[5/2]" viewBox="0 0 500 200">
            <defs>
              <linearGradient id="overtime-bar-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map(i => {
              const value = Math.round((maxOvertimeInTrend / 4) * i);
              const y = 160 - (i * 30);
              return (
                <g key={i}>
                  <line x1="45" y1={y} x2="480" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="25" y={y + 3} fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">{value}h</text>
                </g>
              );
            })}
            {stats.overtimeTrend.map((day, idx) => {
              const barWidth = 26;
              const x = 60 + idx * 60;
              const barHeight = maxOvertimeInTrend > 0 ? (day.totalOT / maxOvertimeInTrend) * 120 : 0;
              const y = 160 - barHeight;
              return (
                <g key={idx} className="group cursor-pointer">
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, 2)}
                    rx="5"
                    fill="url(#overtime-bar-grad)"
                    className="transition-all duration-300 group-hover:opacity-85"
                  />
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <rect x={x - 25} y={y - 26} width="76" height="20" rx="5" fill="#1e293b" />
                    <text x={x + 13} y={y - 13} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                      {day.totalOT}h {t('dashboard.overtimeAverage').replace('{hours}', String(day.avgOT))}
                    </text>
                  </g>
                  <text x={x + barWidth / 2} y="180" fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">{day.date}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </Card>
  );

  const renderOvertimeWarning = () => (
    <Card
      title={t('dashboard.overtimeWarningTitle')}
      className=""
    >
      <p className="text-xs text-slate-400 -mt-2 mb-4">{t('dashboard.overtimeWarningDesc')}</p>
      <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
        {stats.monthlyOTLimitAlerts.map(emp => {
          const percent = Math.min((emp.monthlyOT / 45) * 100, 100);
          const isLimitExceeded = emp.monthlyOT >= 45;
          const isWarning = emp.monthlyOT >= 30;
          return (
            <div key={emp.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="text-sm font-bold text-slate-800">{emp.lastName} {emp.firstName}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{emp.department} • {emp.position}</p>
                </div>
                <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                  isLimitExceeded ? 'bg-red-100 text-red-700 border border-red-200' :
                  isWarning ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                  'bg-amber-100 text-amber-700 border border-amber-200'
                }`}>
                  {emp.monthlyOT}h
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isLimitExceeded ? 'bg-red-500 animate-pulse' :
                    isWarning ? 'bg-orange-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-extrabold mt-1">
                <span>{t('dashboard.overtimeLabel').replace('{hours}', '0')}</span>
                <span className={isLimitExceeded ? 'text-red-500 font-black' : ''}>{t('dashboard.overtimeLimit')}</span>
              </div>
            </div>
          );
        })}
        {stats.monthlyOTLimitAlerts.length === 0 && (
          <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
            <span className="text-3xl">✅</span>
            <p className="text-sm text-slate-500 mt-2 font-bold">{t('dashboard.noOvertimeAlerts')}</p>
          </div>
        )}
      </div>
    </Card>
  );

  const renderVisaExpiry = () => (
    <Card
      title={t('dashboard.visaExpiryMonitorTitle').replace('{count}', String(stats.visaAlerts.length))}
      className=""
      action={
        <Link href="/residence-cards" className="text-xs text-blue-600 hover:text-blue-800 font-bold">
          {t('dashboard.viewDetails')}
        </Link>
      }
    >
      <p className="text-xs text-slate-400 -mt-2 mb-4">{t('dashboard.visaMonitorDesc').replace('{total}', String(stats.totalForeignForce))}</p>
      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
        {stats.visaAlerts.map(emp => (
          <div key={emp.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">{emp.lastName} {emp.firstName}</span>
                  <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] rounded font-extrabold">{emp.nationality}</span>
                  <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] rounded font-extrabold">{emp.residenceStatus}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  {t('dashboard.visaCardNo')
                    .replace('{number}', emp.residenceCardNumber || '-')
                    .replace('{date}', formatDate(emp.residenceExpiry))}
                </p>
              </div>
              <span className={`px-2.5 py-1 text-xs rounded-lg font-bold border ${emp.expiry!.colorClass} shrink-0 whitespace-nowrap`}>
                {emp.expiry!.label}
              </span>
            </div>
            <div className="space-y-1">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    emp.expiry!.level === 'expired' ? 'bg-red-500' :
                    emp.expiry!.level === 'urgent' ? 'bg-orange-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${emp.expiry!.pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-extrabold">
                <span>{t('dashboard.visaLevelUrgent')}</span>
                <span>{t('dashboard.visaLevelWarning')}</span>
                <span>{t('dashboard.visaLevelSafe')}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-2.5">
              <Link href={`/employees`} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs text-white rounded-lg shadow-sm font-bold transition-colors">
                {t('dashboard.updateInfo')}
              </Link>
            </div>
          </div>
        ))}
        {stats.visaAlerts.length === 0 && (
          <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl">
            <span className="text-2xl">🎉</span>
            <p className="text-sm text-slate-500 mt-2 font-bold">{t('dashboard.noVisaAlerts')}</p>
          </div>
        )}
      </div>
    </Card>
  );

  const renderContractExpiry = () => (
    <Card
      title={t('dashboard.contractExpiryMonitorTitle').replace('{count}', String(stats.contractAlerts.length))}
      className=""
      action={
        <Link href="/contracts" className="text-xs text-blue-600 hover:text-blue-800 font-bold">
          {t('dashboard.contractPageLink')}
        </Link>
      }
    >
      <p className="text-xs text-slate-400 -mt-2 mb-4">{t('dashboard.contractMonitorDesc').replace('{total}', String(stats.totalContractForce))}</p>
      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
        {stats.contractAlerts.map(emp => (
          <div key={emp.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">{emp.lastName} {emp.firstName}</span>
                  <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] rounded font-extrabold">{emp.department}</span>
                  <span className="px-1.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 text-[10px] rounded font-extrabold">{emp.contractType}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  {t('dashboard.contractDuration')
                    .replace('{start}', formatDate(emp.contractStartDate))
                    .replace('{end}', formatDate(emp.contractEndDate))}
                </p>
              </div>
              <span className={`px-2.5 py-1 text-xs rounded-lg font-bold border ${emp.expiry!.colorClass} shrink-0 whitespace-nowrap`}>
                {emp.expiry!.label}
              </span>
            </div>
            <div className="space-y-1">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    emp.expiry!.level === 'expired' ? 'bg-red-500' :
                    emp.expiry!.level === 'urgent' ? 'bg-orange-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${emp.expiry!.pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-extrabold">
                <span>{t('dashboard.contractLevelExpired')}</span>
                <span>{t('dashboard.visaLevelUrgent')}</span>
                <span>{t('dashboard.visaLevelWarning')}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-2.5">
              <Link href={`/employees`} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs text-white rounded-lg shadow-sm font-bold transition-colors">
                {t('dashboard.renewContract')}
              </Link>
            </div>
          </div>
        ))}
        {stats.contractAlerts.length === 0 && (
          <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl">
            <span className="text-2xl">🎉</span>
            <p className="text-sm text-slate-500 mt-2 font-bold">{t('dashboard.noContractAlerts')}</p>
          </div>
        )}
      </div>
    </Card>
  );

  const renderNationalityStats = () => {
    const foreignEmps = employees.filter(e => e.status !== 'INACTIVE' && e.nationality && e.nationality !== '日本' && e.nationality !== 'Japan' && e.nationality !== 'ja');
    const nationalityCounts: Record<string, number> = {};
    foreignEmps.forEach(e => {
      const nat = e.nationality || 'Other';
      nationalityCounts[nat] = (nationalityCounts[nat] || 0) + 1;
    });
    const sortedNationalities = Object.entries(nationalityCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return (
      <Card 
        title={locale === 'vi' ? `🌐 Cơ cấu quốc tịch ngoại kiều` : locale === 'ja' ? `🌐 国籍別外国人従業員統計` : `🌐 Foreign Nationalities Breakdown`}
        className="h-full p-6"
      >
        <p className="text-xs text-slate-400 -mt-2 mb-4">
          {locale === 'vi' ? `Tổng số lao động nước ngoài: ${foreignEmps.length} người` : locale === 'ja' ? `外国人従業員総数: ${foreignEmps.length} 名` : `Total foreign workforce: ${foreignEmps.length} employees`}
        </p>
        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
          {sortedNationalities.map(item => {
            const pct = foreignEmps.length > 0 ? Math.round((item.count / foreignEmps.length) * 100) : 0;
            return (
              <div key={item.name} className="space-y-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-800">{item.name}</span>
                  <span className="font-bold text-slate-500">{item.count} {t('common.personUnit') || '名'}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                     className="bg-indigo-550 h-full rounded-full transition-all duration-300"
                     style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                  <span>{locale === 'vi' ? `Tỷ lệ: ${pct}%` : locale === 'ja' ? `比率: ${pct}%` : `Ratio: ${pct}%`}</span>
                </div>
              </div>
            );
          })}
          {sortedNationalities.length === 0 && (
            <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
              <span className="text-2xl">🇯🇵</span>
              <p className="text-sm text-slate-400 mt-2 font-semibold">
                {locale === 'vi' ? 'Tất cả nhân sự là quốc tịch Nhật Bản' : locale === 'ja' ? 'すべての従業員は日本国籍です' : 'All employees are Japanese'}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderDeptDistribution = () => {
    const activeEmps = employees.filter(e => e.status !== 'INACTIVE');
    const deptCounts: Record<string, number> = {};
    activeEmps.forEach(e => {
      const dept = e.department || t('common.unspecified') || 'Unspecified';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    const sortedDepts = Object.entries(deptCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return (
      <Card 
        title={locale === 'vi' ? `🏢 Phân bổ nhân sự theo phòng ban` : locale === 'ja' ? `🏢 部署別人員配置統計` : `🏢 Department Distribution`}
        className="h-full p-6"
        action={
          <Link href="/departments" className="text-xs text-blue-600 hover:text-blue-800 font-bold">
            {locale === 'vi' ? 'Quản lý phòng ban →' : locale === 'ja' ? '部署管理ページへ →' : 'Manage Departments →'}
          </Link>
        }
      >
        <p className="text-xs text-slate-400 -mt-2 mb-4">
          {locale === 'vi' ? `Tổng số nhân viên đang làm việc: ${activeEmps.length} người` : locale === 'ja' ? `アクティブ従業員数: ${activeEmps.length} 名` : `Total active workforce: ${activeEmps.length} employees`}
        </p>
        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
          {sortedDepts.map(item => {
            const pct = activeEmps.length > 0 ? Math.round((item.count / activeEmps.length) * 100) : 0;
            return (
              <div key={item.name} className="space-y-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-800">{item.name}</span>
                  <span className="font-bold text-slate-500">{item.count} {t('common.personUnit') || '名'}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                     className="bg-blue-550 h-full rounded-full transition-all duration-300"
                     style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                  <span>{locale === 'vi' ? `Tỷ lệ nhân sự: ${pct}%` : locale === 'ja' ? `比率: ${pct}%` : `Ratio: ${pct}%`}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const renderRecentHires = () => {
    const activeEmps = employees.filter(e => e.status !== 'INACTIVE');
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const recentList = activeEmps.filter(e => {
      if (!e.hireDate) return false;
      const hd = new Date(e.hireDate);
      return hd >= thirtyDaysAgo && hd <= today;
    }).sort((a, b) => new Date(b.hireDate).getTime() - new Date(a.hireDate).getTime());
    return (
      <Card 
        title={locale === 'vi' ? `🎉 Nhân sự mới nhận việc (30 ngày qua)` : locale === 'ja' ? `🎉 最近の新入社員 (直近30日間)` : `🎉 Recent New Hires (Last 35 Days)`}
        className="h-full p-6"
      >
        <p className="text-xs text-slate-400 -mt-2 mb-4">
          {locale === 'vi' ? `Có ${recentList.length} nhân viên mới gia nhập` : locale === 'ja' ? `新たに ${recentList.length} 名が入社しました` : `${recentList.length} new employees joined recently`}
        </p>
        <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
          {recentList.map(emp => (
            <div key={emp.id} className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl hover:shadow-xs hover:border-slate-300 transition-all flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-700 text-xs shrink-0 uppercase">
                  {emp.lastName.substring(0, 1)}{emp.firstName.substring(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800 truncate">{emp.lastName} {emp.firstName}</p>
                  <p className="text-[10px] text-slate-400 font-semibold truncate">{emp.department} • {emp.position}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{locale === 'vi' ? 'Ngày nhận việc' : locale === 'ja' ? '入社日' : 'Hired Date'}</p>
                <p className="text-[11px] font-bold text-slate-700 mt-0.5">{formatDate(emp.hireDate)}</p>
              </div>
            </div>
          ))}
          {recentList.length === 0 && (
            <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
              <span className="text-xl">💼</span>
              <p className="text-sm text-slate-400 mt-2 font-semibold">
                {locale === 'vi' ? 'Không có nhân viên mới nhận việc gần đây' : locale === 'ja' ? '新入社員はいません' : 'No new employees recently'}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderQuickLinks = () => (
    <Card title={t('dashboard.quickLinks')} className="">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { href: '/employees', label: t('nav.employees'), icon: '👥', color: 'text-blue-600 bg-blue-50/60 border-blue-100 hover:border-blue-300' },
          { href: '/attendance', label: t('nav.attendance'), icon: '🕐', color: 'text-green-600 bg-green-50/60 border-green-100 hover:border-green-300' },
          { href: '/leave', label: t('nav.leave'), icon: '🏖️', color: 'text-teal-600 bg-teal-50/60 border-teal-100 hover:border-teal-300' },
          { href: '/payroll', label: t('nav.payroll'), icon: '💰', color: 'text-yellow-600 bg-yellow-50/60 border-yellow-100 hover:border-yellow-300' },
          { href: '/contracts', label: t('nav.contracts'), icon: '📋', color: 'text-purple-600 bg-purple-50/60 border-purple-100 hover:border-purple-300' },
          { href: '/residence-cards', label: t('nav.foreigners'), icon: '🛂', color: 'text-rose-600 bg-rose-50/60 border-rose-100 hover:border-rose-300' },
          { href: '/departments', label: t('nav.departments'), icon: '🏢', color: 'text-indigo-600 bg-indigo-50/60 border-indigo-100 hover:border-indigo-300' },
        ].map((a, idx) => (
          <Link key={idx} href={a.href}
            className={`flex flex-col items-center gap-3.5 p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${a.color}`}>
            <span className="text-4xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]">{a.icon}</span>
            <span className="text-xs font-extrabold text-slate-700 tracking-wide text-center">{a.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );

  if (isEmployeeMode) {
    const todayJst = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(new Date());

    const currentEmp = employees[0];
    const visaExpiry = currentEmp?.residenceExpiry ? getExpiryStatus(currentEmp.residenceExpiry, t) : null;
    const contractExpiry = currentEmp?.contractEndDate ? getExpiryStatus(currentEmp.contractEndDate, t) : null;
    const hasCriticalAlerts = (visaExpiry && visaExpiry.level !== 'safe') || (contractExpiry && contractExpiry.level !== 'safe');

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-500/25 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center pr-10 pointer-events-none select-none text-9xl">
            👋
          </div>
          
          <div className="relative z-10 space-y-4 max-w-2xl">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xxs font-black tracking-widest uppercase border border-white/10">
              {todayJst}
            </span>
            <h1 className="text-2xl sm:text-4.5xl font-black tracking-tight leading-none mt-2">
              {t('dashboard.welcome').replace('{name}', currentUser ? `${currentUser.lastName} ${currentUser.firstName}` : `${currentEmp?.lastName || ''} ${currentEmp?.firstName || ''}`.trim())}
            </h1>
            <p className="text-sm opacity-90 leading-relaxed font-semibold">
              {t('dashboard.roleEmployee')} • {t('dashboard.safetyMessage')}
            </p>
          </div>
        </div>

        {/* Alerts & Critical Notifications */}
        {hasCriticalAlerts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visaExpiry && visaExpiry.level !== 'safe' && (
              <div className={`rounded-3xl p-5 border shadow-sm ${visaExpiry.colorClass}`}>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <span>🛂</span> {visaExpiry.level === 'expired' ? t('dashboard.visaExpiryUrgent') : t('dashboard.visaExpiryWarning')}
                </h3>
                <p 
                  className="text-xs mt-2.5 leading-relaxed font-semibold"
                  dangerouslySetInnerHTML={{ 
                    __html: t('dashboard.visaExpiryDetail')
                      .replace('{status}', currentEmp?.residenceStatus || '')
                      .replace('{date}', formatDate(currentEmp?.residenceExpiry))
                      .replace('{state}', visaExpiry.level === 'expired' ? t('dashboard.visaStateExpired') : t('dashboard.visaStateExpiring'))
                  }}
                />
              </div>
            )}
            
            {contractExpiry && contractExpiry.level !== 'safe' && (
              <div className={`rounded-3xl p-5 border shadow-sm ${contractExpiry.colorClass}`}>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <span>📋</span> {contractExpiry.level === 'expired' ? t('dashboard.contractExpiryUrgent') : t('dashboard.contractExpiryWarning')}
                </h3>
                <p 
                  className="text-xs mt-2.5 leading-relaxed font-semibold"
                  dangerouslySetInnerHTML={{ 
                    __html: t('dashboard.contractExpiryDetail')
                      .replace('{type}', currentEmp?.contractType || '')
                      .replace('{date}', formatDate(currentEmp?.contractEndDate))
                      .replace('{state}', contractExpiry.level === 'expired' ? t('dashboard.contractStateExpired') : t('dashboard.contractStateExpiring'))
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Punch In / Out Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card title="⏱️ タイムカード (Punch Clock)" className="h-full">
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="text-4.5xl font-black text-slate-800 font-mono tracking-wider mb-2">
                  {currentTime || '--:--:--'}
                </div>
                <p className="text-xxs text-slate-400 font-extrabold tracking-widest uppercase mb-6">Asia/Tokyo Timezone (JST)</p>

                {punchError && (
                  <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-xxs font-bold text-red-600 animate-shake">
                    ⚠️ {punchError}
                  </div>
                )}
                {punchSuccess && (
                  <div className="mb-4 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xxs font-bold text-emerald-600 animate-fadeIn">
                    ✓ {punchSuccess}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 w-full px-2 max-w-sm">
                  <button
                    disabled={punchLoading || !!punchState.checkIn}
                    onClick={() => handlePunch('checkIn')}
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-250 disabled:cursor-not-allowed border border-emerald-500/25 text-white font-extrabold rounded-2xl shadow-sm transition-all text-xs cursor-pointer"
                  >
                    {t('dashboard.punchIn')}
                    {punchState.checkIn && <span className="block text-[10px] font-medium opacity-85 mt-1 font-mono">{punchState.checkIn}</span>}
                  </button>

                  <button
                    disabled={punchLoading || !punchState.checkIn || !!punchState.checkOut}
                    onClick={() => handlePunch('checkOut')}
                    className="py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-250 disabled:cursor-not-allowed border border-rose-500/25 text-white font-extrabold rounded-2xl shadow-sm transition-all text-xs cursor-pointer"
                  >
                    {t('dashboard.punchOut')}
                    {punchState.checkOut && <span className="block text-[10px] font-medium opacity-85 mt-1 font-mono">{punchState.checkOut}</span>}
                  </button>

                  <button
                    disabled={punchLoading || !punchState.checkIn || !!punchState.breakStart || !!punchState.checkOut}
                    onClick={() => handlePunch('breakStart')}
                    className="py-2.5 px-3 border border-slate-200 bg-white hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-350 disabled:border-slate-150 disabled:cursor-not-allowed text-slate-700 font-bold rounded-2xl transition-all text-xxs cursor-pointer"
                  >
                    {t('dashboard.breakStart')}
                    {punchState.breakStart && <span className="block text-[9px] font-medium opacity-75 mt-0.5 font-mono">{punchState.breakStart}</span>}
                  </button>

                  <button
                    disabled={punchLoading || !punchState.breakStart || !!punchState.breakEnd || !!punchState.checkOut}
                    onClick={() => handlePunch('breakEnd')}
                    className="py-2.5 px-3 border border-slate-200 bg-white hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-350 disabled:border-slate-150 disabled:cursor-not-allowed text-slate-700 font-bold rounded-2xl transition-all text-xxs cursor-pointer"
                  >
                    {t('dashboard.breakEnd')}
                    {punchState.breakEnd && <span className="block text-[9px] font-medium opacity-75 mt-0.5 font-mono">{punchState.breakEnd}</span>}
                  </button>
                </div>

                {hasPunchToday && (
                  <button
                    type="button"
                    disabled={punchLoading}
                    onClick={handlePunchReset}
                    className="mt-4 w-full max-w-sm px-4 py-2.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 font-bold rounded-2xl text-xxs transition-all cursor-pointer"
                  >
                    ↩ {t('dashboard.punchReset')}
                  </button>
                )}
              </div>
            </Card>
          </div>

          {/* Company Announcements */}
          <div className="lg:col-span-2">
            <Card title={`📢 ${t('dashboard.announcements')}`} className="h-full">
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {announcementsLoading ? (
                  <p className="text-xs text-slate-400 font-bold py-6 text-center">{t('dashboard.loading')}</p>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-xl">✉️</span>
                    <p className="text-xs text-slate-400 mt-2 font-bold">{t('dashboard.noAnnouncements')}</p>
                  </div>
                ) : (
                  announcements.map((a, idx) => {
                    const dateStr = a.createdAt ? new Date(a.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';
                    const tag = a.type === 'urgent' ? t('dashboard.announcementUrgent') : a.type === 'warning' ? t('dashboard.announcementWarning') : t('dashboard.announcementTag');
                    const tagColor = a.type === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' : a.type === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-550 border-slate-200';
                    const senderName = a.showSenderName && a.sender ? `${a.sender?.lastName || ''} ${a.sender?.firstName || ''}`.trim() : t('dashboard.announcementCompany');
                    
                    return (
                      <div 
                        key={a.id || idx} 
                        onClick={() => setActiveAnnouncementDetail(a)}
                        className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl hover:border-slate-350 transition-all hover:bg-slate-50 shadow-xs cursor-pointer select-none"
                        title={t('dashboard.clickToViewDetail')}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-bold">{dateStr}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${tagColor}`}>{tag}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 leading-normal">{a.title}</h4>
                        <p className="text-[11px] text-slate-550 mt-1.5 leading-relaxed font-semibold">
                          {a.content.length > 80 ? `${a.content.substring(0, 80)}...` : a.content}
                          {a.content.length > 80 && (
                            <span className="text-[9px] text-blue-500 font-bold ml-1 block">{t('dashboard.clickForFullText')}</span>
                          )}
                        </p>
                        <div className="mt-2 text-[9px] text-slate-400 font-bold">
                          ✉️ {t('dashboard.announcementSender').replace('{name}', senderName)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
        
        {/* Announcement Detail Modal for Employee */}
        {activeAnnouncementDetail && (
          <Portal>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setActiveAnnouncementDetail(null)}>
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-100 animate-fadeIn" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex-shrink-0 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
                  <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                    <span>📢</span> {t('dashboard.announcementDetailTitle')}
                  </h3>
                  <button 
                    onClick={() => setActiveAnnouncementDetail(null)}
                    className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg leading-none hover:bg-slate-50 transition-colors"
                  >
                    &times;
                  </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto text-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="text-xs text-slate-400 font-bold space-y-1">
                      <p>📅 {t('dashboard.postDate').replace('{date}', activeAnnouncementDetail.createdAt ? new Date(activeAnnouncementDetail.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-')}</p>
                      <p>✉️ {t('dashboard.announcementSender').replace('{name}', activeAnnouncementDetail.showSenderName && activeAnnouncementDetail.sender ? `${activeAnnouncementDetail.sender?.lastName || ''} ${activeAnnouncementDetail.sender?.firstName || ''}`.trim() : t('dashboard.announcementCompany'))}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                      activeAnnouncementDetail.type === 'urgent' ? 'bg-red-50 border-red-200 text-red-700' :
                      activeAnnouncementDetail.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      {activeAnnouncementDetail.type === 'urgent' ? t('dashboard.announcementUrgent') : activeAnnouncementDetail.type === 'warning' ? t('dashboard.announcementWarning') : t('dashboard.announcementTag')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-base font-black text-slate-900 leading-normal">{activeAnnouncementDetail.title || ''}</h4>
                    <p className="text-sm text-slate-750 leading-relaxed whitespace-pre-line font-medium bg-slate-50 p-4 rounded-2xl border border-slate-150">
                      {activeAnnouncementDetail.content || ''}
                    </p>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setActiveAnnouncementDetail(null)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                      {t('common.close')}
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

  return (
    <div className="space-y-10 animate-fadeIn">
      {showForbiddenAlert && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-5 py-4 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold text-sm">{t('dashboard.noPermissionTitle')}</p>
              <p className="text-xs text-amber-700 mt-0.5">{t('dashboard.noPermissionDesc')}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowForbiddenAlert(false)}
            className="text-amber-500 hover:text-amber-700 transition-all font-bold text-lg cursor-pointer px-2"
          >
            ×
          </button>
        </div>
      )}

      {/* 1. KPI Stats overview ribbon */}
      {renderKPIOverview()}

      {/* 2. Attendance & Operations module block */}
      <div className="space-y-4 border-t border-slate-200/60 pt-6">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span>📅</span> {locale === 'vi' ? 'Điểm danh & Hoạt động' : locale === 'ja' ? '勤怠・稼働状況' : 'Attendance & Operations'}
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            {locale === 'vi' ? 'Theo dõi đi làm hôm nay, hiệu suất chi nhánh và lịch sử điểm danh' : locale === 'ja' ? '今日の出欠状況、支店別稼働、および直近7日間の出勤率履歴' : 'Monitor today attendance, branch operations, and 7-day attendance history'}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">{renderDonutChart()}</div>
          <div className="lg:col-span-2">{renderRollCallTable()}</div>
          <div className="lg:col-span-1">{renderShitenStats()}</div>
          <div className="lg:col-span-2">{renderShitenStaff()}</div>
          <div className="lg:col-span-1">{renderPendingLeaves()}</div>
          <div className="lg:col-span-2">{renderAttendanceTrend()}</div>
        </div>
      </div>

      {/* 3. Work Hours & Overtime module block */}
      <div className="space-y-4 border-t border-slate-200/60 pt-6">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span>🕐</span> {locale === 'vi' ? 'Giờ làm & Tăng ca' : locale === 'ja' ? '稼働時間・時間外労働' : 'Work Hours & Overtime'}
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            {locale === 'vi' ? '殘業時間 giám sát và phòng ngừa quá tải thời gian làm việc' : locale === 'ja' ? '残業時間の週次推移および時間外過重労働アラート' : 'Monitor weekly overtime trend and alert overwork concerns'}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{renderOvertimeTrend()}</div>
          <div className="lg:col-span-1">{renderOvertimeWarning()}</div>
        </div>
      </div>

      {/* 4. Visa & Contract Management module block */}
      <div className="space-y-4 border-t border-slate-200/60 pt-6">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span>🛂</span> {locale === 'vi' ? 'Thời hạn Visa & Hợp đồng' : locale === 'ja' ? 'ビザ & 契約管理' : 'Visa & Contract Management'}
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            {locale === 'vi' ? 'Quản lý thời hạn lưu trú cư trú, hết hạn hợp đồng lao động và thống kê quốc tịch' : locale === 'ja' ? '在留カード期限切れ、雇用契約満了の監視および外国人従業員の国籍分布' : 'Monitor visa residency, contract expirations, and nationality demographics'}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">{renderVisaExpiry()}</div>
          <div className="lg:col-span-1">{renderContractExpiry()}</div>
          <div className="lg:col-span-1">{renderNationalityStats()}</div>
        </div>
      </div>

      {/* 5. Organization Stats module block */}
      <div className="space-y-4 border-t border-slate-200/60 pt-6">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span>🏢</span> {locale === 'vi' ? 'Cơ cấu & Số liệu nhân sự' : locale === 'ja' ? '組織構造・人員配置統計' : 'Organization Statistics'}
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            {locale === 'vi' ? 'Phân tích tỷ lệ nhân sự các phòng ban và theo dõi các thành viên mới nhận việc' : locale === 'ja' ? '部署別の人員配置割合および最近30日間の新入社員データ' : 'Analyze department placement ratio and newly joined employees'}
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{renderDeptDistribution()}</div>
          <div className="lg:col-span-1">{renderRecentHires()}</div>
        </div>
      </div>

      {/* 6. Quick Links module block */}
      <div className="border-t border-slate-200/60 pt-6">
        {renderQuickLinks()}
      </div>

      {/* Announcement Detail Modal for Employee (portal fallback) */}
      {activeAnnouncementDetail && (
        <Portal>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setActiveAnnouncementDetail(null)}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-100 animate-fadeIn" onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex-shrink-0 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <span>📢</span> {t('dashboard.announcementDetailTitle')}
                </h3>
                <button 
                  onClick={() => setActiveAnnouncementDetail(null)}
                  className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg leading-none hover:bg-slate-50 transition-colors"
                >
                  &times;
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 overflow-y-auto text-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="text-xs text-slate-400 font-bold space-y-1">
                    <p>📅 {t('dashboard.postDate').replace('{date}', activeAnnouncementDetail.createdAt ? new Date(activeAnnouncementDetail.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-')}</p>
                    <p>✉️ {t('dashboard.announcementSender').replace('{name}', activeAnnouncementDetail.showSenderName && activeAnnouncementDetail.sender ? `${activeAnnouncementDetail.sender?.lastName || ''} ${activeAnnouncementDetail.sender?.firstName || ''}`.trim() : t('dashboard.announcementCompany'))}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                    activeAnnouncementDetail.type === 'urgent' ? 'bg-red-50 border-red-200 text-red-700' :
                    activeAnnouncementDetail.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    {activeAnnouncementDetail.type === 'urgent' ? t('dashboard.announcementUrgent') : activeAnnouncementDetail.type === 'warning' ? t('dashboard.announcementWarning') : t('dashboard.announcementTag')}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-base font-black text-slate-900 leading-normal">{activeAnnouncementDetail.title || ''}</h4>
                  <p className="text-sm text-slate-750 leading-relaxed whitespace-pre-line font-medium bg-slate-50 p-4 rounded-2xl border border-slate-150">
                    {activeAnnouncementDetail.content || ''}
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setActiveAnnouncementDetail(null)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    {t('common.close')}
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
