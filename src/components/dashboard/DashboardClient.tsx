'use client';

import { useMemo, useState, useEffect } from 'react';
import Card from '@/components/common/Card';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
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
function getExpiryStatus(dateStr: string | null) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((d.getTime() - today.getTime()) / 86400000);

  if (daysLeft < 0) {
    return { level: 'expired', daysLeft, label: `期限切れ (${Math.abs(daysLeft)}日経過)`, colorClass: 'text-red-700 bg-red-50 border-red-200', pct: 0 };
  }
  if (daysLeft <= 30) {
    return { level: 'urgent', daysLeft, label: `あと ${daysLeft} 日 (切迫)`, colorClass: 'text-orange-700 bg-orange-50 border-orange-200', pct: Math.max(0, (daysLeft / 30) * 100) };
  }
  if (daysLeft <= 90) {
    return { level: 'warning', daysLeft, label: `あと ${daysLeft} 日 (注意)`, colorClass: 'text-amber-700 bg-amber-50 border-amber-200', pct: Math.max(0, (daysLeft / 90) * 100) };
  }
  return { level: 'safe', daysLeft, label: `有効 (残り ${daysLeft} 日)`, colorClass: 'text-green-700 bg-green-50 border-green-200', pct: 100 };
}

export default function DashboardClient({
  employees,
  attendance,
  leaves,
  isEmployeeMode = false,
  currentUser,
}: {
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  isEmployeeMode?: boolean;
  currentUser?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'overtime' | 'compliance'>('attendance');
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
        throw new Error(body.error || '打刻に失敗しました。');
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

        const labels = { checkIn: '出勤', breakStart: '休憩開始', breakEnd: '休憩終了', checkOut: '退勤' };
        setPunchSuccess(`${labels[action]}の打刻が完了しました！`);
      }
    } catch (err: any) {
      setPunchError(err.message || '打刻中にエラーが発生しました。');
    } finally {
      setPunchLoading(false);
    }
  };

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  }, []);

  // Compute all statistics in useMemo
  const stats = useMemo(() => {
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
        note = leaveReq ? `休暇中 (${leaveReq.reason})` : '休職中';
      } else if (attRecord) {
        if (attRecord.status === 'PRESENT') rollStatus = 'PRESENT';
        else if (attRecord.status === 'LATE') rollStatus = 'LATE';
        else if (attRecord.status === 'ABSENT') rollStatus = 'ABSENT';
        checkIn = attRecord.checkIn || '-';
        checkOut = attRecord.checkOut || '-';
        note = attRecord.note || '';
      } else if (emp.status === 'INACTIVE') {
        rollStatus = 'UNREGISTERED';
        note = '退職済';
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
    const foreignEmployees = employees.filter(e => e.status !== 'INACTIVE' && e.nationality && e.nationality !== '日本');
    const visaAlerts = foreignEmployees
      .map(e => ({ ...e, expiry: getExpiryStatus(e.residenceExpiry) }))
      .filter(e => e.expiry && e.expiry.level !== 'safe')
      .sort((a, b) => a.expiry!.daysLeft - b.expiry!.daysLeft);

    // Contract Expire Alerts
    const activeContractEmployees = employees.filter(e => e.status !== 'INACTIVE' && e.contractEndDate);
    const contractAlerts = activeContractEmployees
      .map(e => ({ ...e, expiry: getExpiryStatus(e.contractEndDate) }))
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

  // Donut chart stroke definitions
  const donutChartData = useMemo(() => {
    const data = [
      { label: '出勤', value: stats.presentCount, color: 'url(#grad-emerald)' }, // emerald
      { label: '遅刻', value: stats.lateCount, color: 'url(#grad-orange)' },    // orange
      { label: '欠勤', value: stats.absentCount, color: 'url(#grad-red)' },      // red
      { label: '休暇', value: stats.onLeaveCount, color: 'url(#grad-blue)' },    // blue
      { label: '未打刻', value: stats.unregisteredCount, color: 'url(#grad-slate)' }, // slate
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

  if (isEmployeeMode) {
    const todayJst = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(new Date());

    const currentEmp = employees[0];
    const visaExpiry = currentEmp?.residenceExpiry ? getExpiryStatus(currentEmp.residenceExpiry) : null;
    const contractExpiry = currentEmp?.contractEndDate ? getExpiryStatus(currentEmp.contractEndDate) : null;
    const hasCriticalAlerts = (visaExpiry && visaExpiry.level !== 'safe') || (contractExpiry && contractExpiry.level !== 'safe');

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-500/25 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center pr-10 pointer-events-none select-none text-9xl">
            👋
          </div>
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl font-black">
              こんにちは、{currentUser?.lastName || user?.lastName || ''} {currentUser?.firstName || user?.firstName || ''} さん！
            </h2>
            <p className="text-xs text-blue-100 mt-1 font-semibold">
              今日も一日、安全運転・安全作業で頑張りましょう。
            </p>
            <p className="text-[10px] text-blue-200 mt-4 font-bold tracking-wider uppercase">
              役割: 一般従業員 (EMPLOYEE)
            </p>
          </div>
        </div>

        {/* Personal Critical Alerts for Employee */}
        {hasCriticalAlerts && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            {visaExpiry && visaExpiry.level !== 'safe' && (
              <div className={`p-5 rounded-3xl border flex gap-4 items-start ${
                visaExpiry.level === 'expired' ? 'bg-red-50/50 border-red-200 text-red-900 shadow-sm shadow-red-100' :
                visaExpiry.level === 'urgent' ? 'bg-orange-50/50 border-orange-200 text-orange-900 shadow-sm shadow-orange-100' :
                'bg-amber-50/50 border-amber-250 text-amber-900 shadow-sm shadow-amber-100'
              }`}>
                <span className="text-3xl p-2 bg-white rounded-2xl shadow-sm border border-slate-100 shrink-0">🛂</span>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                    {visaExpiry.level === 'expired' ? '⚠️ 在留カード期限切れ' : '🛂 在留カード期限警告'}
                    <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg border uppercase ${
                      visaExpiry.level === 'expired' ? 'bg-red-100 border-red-250 text-red-700' :
                      visaExpiry.level === 'urgent' ? 'bg-orange-100 border-orange-250 text-orange-700' :
                      'bg-amber-100 border-amber-250 text-amber-700'
                    }`}>
                      {visaExpiry.label}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                    在留資格「{currentEmp.residenceStatus || '未指定'}」の期限が <strong>{currentEmp.residenceExpiry}</strong> に{visaExpiry.level === 'expired' ? '切れています' : '満了します'}。更新手続きやサポートが必要な場合は、お早めに人事担当者へご相談ください。
                  </p>
                </div>
              </div>
            )}

            {contractExpiry && contractExpiry.level !== 'safe' && (
              <div className={`p-5 rounded-3xl border flex gap-4 items-start ${
                contractExpiry.level === 'expired' ? 'bg-red-50/50 border-red-200 text-red-900 shadow-sm shadow-red-100' :
                contractExpiry.level === 'urgent' ? 'bg-orange-50/50 border-orange-200 text-orange-900 shadow-sm shadow-orange-100' :
                'bg-amber-50/50 border-amber-250 text-amber-900 shadow-sm shadow-amber-100'
              }`}>
                <span className="text-3xl p-2 bg-white rounded-2xl shadow-sm border border-slate-100 shrink-0">📋</span>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                    {contractExpiry.level === 'expired' ? '⚠️ 雇用契約期限切れ' : '📋 雇用契約満了のお知らせ'}
                    <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg border uppercase ${
                      contractExpiry.level === 'expired' ? 'bg-red-100 border-red-250 text-red-700' :
                      contractExpiry.level === 'urgent' ? 'bg-orange-100 border-orange-250 text-orange-700' :
                      'bg-amber-100 border-amber-250 text-amber-700'
                    }`}>
                      {contractExpiry.label}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-660 font-semibold leading-relaxed">
                    雇用契約（契約種別: {currentEmp.contractType || '有期'}）が <strong>{currentEmp.contractEndDate}</strong> に{contractExpiry.level === 'expired' ? '切れています' : '満了します'}。更新面談などのスケジュールについては、人事担当者へご確認ください。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Punch Card Column */}
          <div className="lg:col-span-7">
            <Card title="⏰ 今日の打刻 (Time Card)" className="h-full bg-white border border-slate-200 shadow-sm rounded-3xl p-6">
              <div className="flex flex-col items-center justify-center py-6">
                <p className="text-sm font-bold text-slate-400">{todayJst}</p>
                <div className="text-5xl font-black text-slate-800 tracking-tight font-mono mt-3 mb-8 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-200/60 shadow-inner">
                  {currentTime || '--:--:--'}
                </div>

                {punchSuccess && (
                  <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl text-xs font-bold text-center mb-6 animate-fadeIn">
                    🎉 {punchSuccess}
                  </div>
                )}
                
                {punchError && (
                  <div className="w-full bg-rose-50 border border-rose-250 text-rose-800 p-3.5 rounded-2xl text-xs font-bold text-center mb-6 animate-fadeIn">
                    ⚠️ {punchError}
                  </div>
                )}

                {/* Status Log */}
                <div className="grid grid-cols-4 gap-4 w-full max-w-md text-center text-xs font-bold mb-8">
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                    <p className="text-slate-400 mb-1">出勤</p>
                    <p className="font-mono text-sm text-slate-700">{punchState.checkIn || '--:--'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                    <p className="text-slate-400 mb-1">休憩入</p>
                    <p className="font-mono text-sm text-slate-700">{punchState.breakStart || '--:--'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                    <p className="text-slate-400 mb-1">休憩出</p>
                    <p className="font-mono text-sm text-slate-700">{punchState.breakEnd || '--:--'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                    <p className="text-slate-400 mb-1">退勤</p>
                    <p className="font-mono text-sm text-slate-700">{punchState.checkOut || '--:--'}</p>
                  </div>
                </div>

                {/* Punch Buttons */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                  <button
                    onClick={() => handlePunch('checkIn')}
                    disabled={punchLoading || !!punchState.checkIn}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200"
                  >
                    <span className="text-3xl mb-2">🚗</span>
                    <span>出勤</span>
                  </button>
                  
                  <button
                    onClick={() => handlePunch('checkOut')}
                    disabled={punchLoading || !punchState.checkIn || !!punchState.checkOut}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-rose-700 bg-rose-50 border-rose-100 hover:bg-rose-100 hover:border-rose-200"
                  >
                    <span className="text-3xl mb-2">🏁</span>
                    <span>退勤</span>
                  </button>
                  
                  <button
                    onClick={() => handlePunch('breakStart')}
                    disabled={punchLoading || !punchState.checkIn || !!punchState.breakStart || !!punchState.checkOut}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-blue-700 bg-blue-50 border-blue-100 hover:bg-blue-100 hover:border-blue-200"
                  >
                    <span className="text-3xl mb-2">☕</span>
                    <span>休憩開始</span>
                  </button>
                  
                  <button
                    onClick={() => handlePunch('breakEnd')}
                    disabled={punchLoading || !punchState.breakStart || !!punchState.breakEnd || !!punchState.checkOut}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-amber-700 bg-amber-50 border-amber-100 hover:bg-amber-100 hover:border-amber-200"
                  >
                    <span className="text-3xl mb-2">🍱</span>
                    <span>休憩終了</span>
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Company Announcements Column */}
          <div className="lg:col-span-5">
            <Card title="📢 会社からのお知らせ" className="h-full bg-white border border-slate-200 shadow-sm rounded-3xl p-6">
              <div className="space-y-4">
                {announcementsLoading ? (
                  <div className="text-center py-8 text-slate-400 font-semibold text-xs animate-pulse">
                    読み込み中...
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                    お知らせはありません
                  </div>
                ) : (
                  announcements.map((a, idx) => {
                    let tag = 'お知らせ';
                    let tagColor = 'bg-blue-50 text-blue-755 border-blue-200/60';
                    if (a.type === 'urgent') {
                      tag = '緊急';
                      tagColor = 'bg-rose-50 text-rose-700 border-rose-200/60';
                    } else if (a.type === 'warning') {
                      tag = '注意';
                      tagColor = 'bg-amber-50 text-amber-700 border-amber-200/60';
                    }
                    
                    const dateStr = new Date(a.createdAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    });

                    const senderName = a.showSenderName && a.sender
                      ? `${a.sender.lastName} ${a.sender.firstName}`
                      : '会社';

                    return (
                      <div 
                        key={a.id || idx} 
                        onClick={() => setActiveAnnouncementDetail(a)}
                        className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl hover:border-slate-300 transition-all hover:bg-slate-50 shadow-xs cursor-pointer select-none"
                        title="クリックで詳細を表示"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-bold">{dateStr}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${tagColor}`}>{tag}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 leading-normal">{a.title}</h4>
                        <p className="text-[11px] text-slate-550 mt-1.5 leading-relaxed font-semibold">
                          {a.content.length > 80 ? `${a.content.substring(0, 80)}...` : a.content}
                          {a.content.length > 80 && (
                            <span className="text-[9px] text-blue-500 font-bold ml-1 block">(クリックで全文を表示)</span>
                          )}
                        </p>
                        <div className="mt-2 text-[9px] text-slate-400 font-bold">
                          ✉️ 差出人: {senderName}
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
                
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex-shrink-0 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
                  <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                    <span>📢</span> お知らせ詳細
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
                      <p>📅 投稿日: {activeAnnouncementDetail.createdAt ? new Date(activeAnnouncementDetail.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}</p>
                      <p>✉️ 差出人: {activeAnnouncementDetail.showSenderName && activeAnnouncementDetail.sender ? `${activeAnnouncementDetail.sender?.lastName || ''} ${activeAnnouncementDetail.sender?.firstName || ''}`.trim() : '会社'}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                      activeAnnouncementDetail.type === 'urgent' ? 'bg-red-50 border-red-200 text-red-700' :
                      activeAnnouncementDetail.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      {activeAnnouncementDetail.type === 'urgent' ? '緊急' : activeAnnouncementDetail.type === 'warning' ? '注意' : 'お知らせ'}
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {showForbiddenAlert && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-5 py-4 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold text-sm">アクセス権限がありません</p>
              <p className="text-xs text-amber-700 mt-0.5">指定されたページにアクセスするための権限が不足しているため、ダッシュボードに転送されました。</p>
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

      {/* Header Overview KPI Ribbon - Redesigned with HSL Glowing Glassmorphism styles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: '総従業員数', value: stats.totalEmp, color: 'text-slate-800', bg: 'bg-white/80 border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-blue-300' },
          { label: '出勤率 (本日)', value: `${stats.attendanceRate}%`, color: 'text-emerald-600 font-extrabold', bg: 'bg-emerald-50/40 border-emerald-100/80 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.1)] hover:border-emerald-300' },
          { label: '休暇/休職中', value: `${stats.onLeaveCount} 名`, color: 'text-blue-600', bg: 'bg-blue-50/40 border-blue-100/80 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.1)] hover:border-blue-300' },
          { 
            label: '時間外警告 (今月)', 
            value: `${stats.monthlyOTLimitAlerts.length} 名`, 
            color: stats.monthlyOTLimitAlerts.length > 0 ? 'text-red-600 animate-pulse font-extrabold' : 'text-slate-500', 
            bg: stats.monthlyOTLimitAlerts.length > 0 ? 'bg-red-50/50 border-red-200 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.15)] hover:border-red-400' : 'bg-white/80 border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]' 
          },
          { 
            label: 'Visa警告', 
            value: `${stats.visaAlerts.length} 件`, 
            color: stats.visaAlerts.length > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-500', 
            bg: stats.visaAlerts.length > 0 ? 'bg-rose-50/50 border-rose-200 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.15)] hover:border-rose-400' : 'bg-white/80 border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]' 
          },
          { 
            label: '契約更新警告', 
            value: `${stats.contractAlerts.length} 件`, 
            color: stats.contractAlerts.length > 0 ? 'text-amber-600 font-extrabold' : 'text-slate-500', 
            bg: stats.contractAlerts.length > 0 ? 'bg-amber-50/50 border-amber-200 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.15)] hover:border-amber-400' : 'bg-white/80 border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]' 
          },
        ].map((s, idx) => (
          <div key={idx} className={`${s.bg} backdrop-blur-md rounded-2xl p-4 border transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-default`}>
            <p className="text-xs text-slate-500 font-semibold mb-1">{s.label}</p>
            <div className="flex items-baseline justify-between mt-1">
              <p className={`text-2xl font-black tracking-tight ${s.color}`}>{s.value}</p>
              {s.label.includes('警告') && parseInt(s.value.toString()) > 0 && (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Menu - Premium Segmented Navigation */}
      <div className="flex border border-slate-200/80 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-sm">
        {[
          { id: 'attendance', label: '📅 勤怠・稼働状況', desc: '今日の出欠・休職モニタ & 稼働率推移' },
          { id: 'overtime', label: '🕐 稼働時間・時間外労働', desc: '残業時間の監視・過重労働抑止' },
          { id: 'compliance', label: '🛂 ビザ & 契約管理', desc: '期限切迫アラート・法的順守' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 text-center py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md font-bold'
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
            }`}
          >
            <span className="block text-sm tracking-wide">{tab.label}</span>
            <span className="block text-[10px] opacity-80 font-normal mt-0.5">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: Attendance & Roll Call */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut Chart with SVG Gradients and Premium Legend */}
            <div className="lg:col-span-1">
              <Card title="出勤ステータス内訳 (本日)" className="h-full bg-white border border-slate-200/60 shadow-sm rounded-2xl">
                <p className="text-xs text-slate-400 -mt-2 mb-4">{`${formatDate(todayStr)} 現在`}</p>
                <div className="flex flex-col items-center justify-center p-2">
                  <div className="relative w-44 h-44">
                    <svg width="100%" height="100%" viewBox="0 0 160 160" className="-rotate-90">
                      <defs>
                        {/* SVG Gradients for Donut Slices */}
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
                          <title>{`${item.label}: ${item.value}名 (${Math.round(item.percentage)}%)`}</title>
                        </circle>
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-3xl font-black text-slate-800 tracking-tight">{stats.attendanceRate}%</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">出勤率</p>
                    </div>
                  </div>

                  {/* Legends */}
                  <div className="w-full mt-6 grid grid-cols-2 gap-2">
                    {[
                      { label: '出勤', count: stats.presentCount, color: 'bg-emerald-500', text: 'text-emerald-700' },
                      { label: '遅刻', count: stats.lateCount, color: 'bg-orange-500', text: 'text-orange-700' },
                      { label: '欠勤', count: stats.absentCount, color: 'bg-red-500', text: 'text-red-700' },
                      { label: '休暇', count: stats.onLeaveCount, color: 'bg-blue-500', text: 'text-blue-700' },
                      { label: '未打刻', count: stats.unregisteredCount, color: 'bg-slate-400', text: 'text-slate-600' },
                    ].map(legend => (
                      <div key={legend.label} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition-colors">
                        <span className={`w-2.5 h-2.5 rounded-full ${legend.color}`} />
                        <span className="text-xs text-slate-600 font-semibold">{legend.label}</span>
                        <span className="ml-auto text-xs font-black text-slate-800">{legend.count}名</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Detailed Roll Call Grid */}
            <div className="lg:col-span-2">
              <Card
                title="本日稼働・出欠モニター"
                className="h-full bg-white border border-slate-200/60 shadow-sm rounded-2xl"
                action={
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                    {[
                      { id: 'all', label: '全' },
                      { id: 'present', label: '出勤' },
                      { id: 'late', label: '遅刻' },
                      { id: 'absent', label: '欠勤' },
                      { id: 'leave', label: '休暇' },
                      { id: 'unregistered', label: '未打刻' },
                    ].map(btn => (
                      <button
                        key={btn.id}
                        onClick={() => setAttendanceFilter(btn.id as any)}
                        className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
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
                <p className="text-xs text-slate-400 -mt-2 mb-4">本日の従業員リアルタイム出欠一覧</p>
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
                        <th className="px-4 py-3">氏名</th>
                        <th className="px-4 py-3">部署</th>
                        <th className="px-4 py-3">出勤時間</th>
                        <th className="px-4 py-3">退勤時間</th>
                        <th className="px-4 py-3">ステータス</th>
                        <th className="px-4 py-3">備考</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.rollCallList
                        .filter(emp => {
                          if (attendanceFilter === 'all') return true;
                          if (attendanceFilter === 'present') return emp.rollStatus === 'PRESENT';
                          if (attendanceFilter === 'late') return emp.rollStatus === 'LATE';
                          if (attendanceFilter === 'absent') return emp.rollStatus === 'ABSENT';
                          if (attendanceFilter === 'leave') return emp.rollStatus === 'LEAVE';
                          if (attendanceFilter === 'unregistered') return emp.rollStatus === 'UNREGISTERED';
                          return true;
                        })
                        .map(emp => (
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
                                {emp.rollStatus === 'PRESENT' ? '出勤' :
                                 emp.rollStatus === 'LATE' ? '遅刻' :
                                 emp.rollStatus === 'ABSENT' ? '欠勤' :
                                 emp.rollStatus === 'LEAVE' ? '休暇中' : '未打刻'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400 max-w-[150px] truncate">{emp.note || '-'}</td>
                          </tr>
                        ))}
                      {stats.rollCallList.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-slate-400 py-12 text-sm">
                            該当する従業員はいません。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>

          {/* Redesigned 7-day Attendance Rate Trend - Line/Area Chart */}
          <Card title="出勤率の推移 (直近7日間)" className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
            <p className="text-xs text-slate-400 -mt-2 mb-6">稼働従業員数のデイリー変動監視</p>
            <div className="p-2">
              <div className="relative w-full">
                {/* SVG Area Line Chart */}
                <svg className="w-full h-auto aspect-[16/4.5]" viewBox="0 0 600 150">
                  <defs>
                    <linearGradient id="attendance-area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map((level, idx) => {
                    const y = 140 - (level / 100) * 100;
                    return (
                      <g key={idx}>
                        <line x1="40" y1={y} x2="580" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                        <text x="15" y={y + 3} fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">{level}%</text>
                      </g>
                    );
                  })}

                  {/* Draw the area and line path */}
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
                        {/* Area */}
                        <path d={areaPath} fill="url(#attendance-area-grad)" />
                        
                        {/* Line */}
                        <path d={linePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Interactive Circles & Tooltips */}
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
                            
                            {/* Tooltip Pill */}
                            <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                              <rect x={p.x - 20} y={p.y - 25} width="40" height="18" rx="5" fill="#1e293b" />
                              <text x={p.x} y={p.y - 13} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                                {p.rate}%
                              </text>
                            </g>

                            {/* X-axis date */}
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
        </div>
      )}

      {/* TAB 2: Work Hours & Overtime */}
      {activeTab === 'overtime' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overtime SVG Chart - Redesigned with Rounded SVG Gradients */}
          <div className="lg:col-span-2">
            <Card title="直近7日間の総残業時間トレンド" className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
              <p className="text-xs text-slate-400 -mt-2 mb-4">全従業員の合計時間外勤務時間</p>
              <div className="p-2">
                <div className="relative w-full">
                  <svg className="w-full h-auto aspect-[5/2]" viewBox="0 0 500 200">
                    <defs>
                      <linearGradient id="overtime-bar-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>

                    {/* Y Axis Grid lines */}
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

                    {/* Bars */}
                    {stats.overtimeTrend.map((day, idx) => {
                      const barWidth = 26;
                      const x = 60 + idx * 60;
                      const barHeight = maxOvertimeInTrend > 0 ? (day.totalOT / maxOvertimeInTrend) * 120 : 0;
                      const y = 160 - barHeight;

                      return (
                        <g key={idx} className="group cursor-pointer">
                          {/* Bar */}
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={Math.max(barHeight, 2)}
                            rx="5"
                            fill="url(#overtime-bar-grad)"
                            className="transition-all duration-300 group-hover:opacity-85"
                          />

                          {/* Tooltip Pill */}
                          <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <rect x={x - 25} y={y - 26} width="76" height="20" rx="5" fill="#1e293b" />
                            <text x={x + 13} y={y - 13} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                              {day.totalOT}h (平 {day.avgOT}h)
                            </text>
                          </g>

                          {/* X labels */}
                          <text x={x + barWidth / 2} y="180" fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">{day.date}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </Card>
          </div>

          {/* Overtime Alerts (Cảnh báo quá giờ) */}
          <div className="lg:col-span-1">
            <Card
              title="⚠️ 時間外勤務の警告"
              className="bg-white border border-slate-200/60 shadow-sm rounded-2xl"
            >
              <p className="text-xs text-slate-400 -mt-2 mb-4">今月の残業時間 (20h超でアラート、45h限度)</p>
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

                      {/* Progress Bar */}
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
                        <span>時間外: 0h</span>
                        <span className={isLimitExceeded ? 'text-red-500 font-black' : ''}>36協定限度: 45h</span>
                      </div>
                    </div>
                  );
                })}
                {stats.monthlyOTLimitAlerts.length === 0 && (
                  <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-3xl">✅</span>
                    <p className="text-sm text-slate-500 mt-2 font-bold">過重労働の懸念がある社員はいません</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: Compliance & Expiries (Visa / Contracts) */}
      {activeTab === 'compliance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visa Monitoring Panel */}
          <Card
            title={`🛂 在留カード（ビザ）期限監視 (${stats.visaAlerts.length}件)`}
            className="bg-white border border-slate-200/60 shadow-sm rounded-2xl"
            action={
              <Link href="/residence-cards" className="text-xs text-blue-600 hover:text-blue-800 font-bold">
                詳細一覧を表示 →
              </Link>
            }
          >
            <p className="text-xs text-slate-400 -mt-2 mb-4">{`対象外国籍従業員数: ${stats.totalForeignForce}名中`}</p>
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
                        カード番号: <span className="font-mono">{emp.residenceCardNumber || '-'}</span> | 満了日: {formatDate(emp.residenceExpiry)}
                      </p>
                    </div>
                    
                    <span className={`px-2.5 py-1 text-xs rounded-lg font-bold border ${emp.expiry!.colorClass}`}>
                      {emp.expiry!.label}
                    </span>
                  </div>

                  {/* Horizontal Timeline Track */}
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
                      <span>切迫 (30日前)</span>
                      <span>警告 (90日前)</span>
                      <span>安全範囲</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-2.5">
                    <Link href={`/employees`} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs text-white rounded-lg shadow-sm font-bold transition-colors">
                      情報を更新
                    </Link>
                  </div>
                </div>
              ))}
              {stats.visaAlerts.length === 0 && (
                <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-2xl">🎉</span>
                  <p className="text-sm text-slate-500 mt-2 font-bold">在留カード期限切れの従業員はいません</p>
                </div>
              )}
            </div>
          </Card>

          {/* Contract Expiry Monitoring Panel */}
          <Card
            title={`📋 雇用契約期限監視 (${stats.contractAlerts.length}件)`}
            className="bg-white border border-slate-200/60 shadow-sm rounded-2xl"
            action={
              <Link href="/contracts" className="text-xs text-blue-600 hover:text-blue-800 font-bold">
                契約管理ページ →
              </Link>
            }
          >
            <p className="text-xs text-slate-400 -mt-2 mb-4">{`有期契約対象者: ${stats.totalContractForce}名中`}</p>
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
                        契約期間: {formatDate(emp.contractStartDate)} 〜 {formatDate(emp.contractEndDate)}
                      </p>
                    </div>
                    
                    <span className={`px-2.5 py-1 text-xs rounded-lg font-bold border ${emp.expiry!.colorClass}`}>
                      {emp.expiry!.label}
                    </span>
                  </div>

                  {/* Horizontal Timeline Track */}
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
                      <span>満了/超過</span>
                      <span>切迫 (30日前)</span>
                      <span>警告 (90日前)</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-2.5">
                    <Link href={`/employees`} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs text-white rounded-lg shadow-sm font-bold transition-colors">
                      雇用契約を更新
                    </Link>
                  </div>
                </div>
              ))}
              {stats.contractAlerts.length === 0 && (
                <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-2xl">🎉</span>
                  <p className="text-sm text-slate-500 mt-2 font-bold">契約更新期限切れの従業員はいません</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions Panel - Premium visual upgrade */}
      <Card title="クイックリンク" className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { href: '/employees', label: '従業員管理', icon: '👥', color: 'text-blue-600 bg-blue-50/60 border-blue-100 hover:border-blue-300' },
            { href: '/attendance', label: '勤怠管理', icon: '🕐', color: 'text-green-600 bg-green-50/60 border-green-100 hover:border-green-300' },
            { href: '/leave', label: '休暇管理', icon: '🏖️', color: 'text-teal-600 bg-teal-50/60 border-teal-100 hover:border-teal-300' },
            { href: '/payroll', label: '給与計算', icon: '💰', color: 'text-yellow-600 bg-yellow-50/60 border-yellow-100 hover:border-yellow-300' },
            { href: '/contracts', label: '契約管理', icon: '📋', color: 'text-purple-600 bg-purple-50/60 border-purple-100 hover:border-purple-300' },
            { href: '/residence-cards', label: '外国人管理', icon: '🛂', color: 'text-rose-600 bg-rose-50/60 border-rose-100 hover:border-rose-300' },
            { href: '/departments', label: '部署管理', icon: '🏢', color: 'text-indigo-600 bg-indigo-50/60 border-indigo-100 hover:border-indigo-300' },
          ].map((a, idx) => (
            <Link key={idx} href={a.href}
              className={`flex flex-col items-center gap-3.5 p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${a.color}`}>
              <span className="text-4xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]">{a.icon}</span>
              <span className="text-xs font-extrabold text-slate-700 tracking-wide text-center">{a.label}</span>
            </Link>
          ))}
        </div>
      </Card>

      {/* Announcement Detail Modal for Employee */}
      {activeAnnouncementDetail && (
        <Portal>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setActiveAnnouncementDetail(null)}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col border border-slate-100 animate-fadeIn" onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex-shrink-0 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <span>📢</span> お知らせ詳細
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
                    <p>📅 投稿日: {activeAnnouncementDetail.createdAt ? new Date(activeAnnouncementDetail.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}</p>
                    <p>✉️ 差出人: {activeAnnouncementDetail.showSenderName && activeAnnouncementDetail.sender ? `${activeAnnouncementDetail.sender?.lastName || ''} ${activeAnnouncementDetail.sender?.firstName || ''}`.trim() : '会社'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                    activeAnnouncementDetail.type === 'urgent' ? 'bg-red-50 border-red-200 text-red-700' :
                    activeAnnouncementDetail.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    {activeAnnouncementDetail.type === 'urgent' ? '緊急' : activeAnnouncementDetail.type === 'warning' ? '注意' : 'お知らせ'}
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
