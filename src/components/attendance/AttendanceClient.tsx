'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/common/Card';
import { formatDate, cn } from '@/lib/utils';
import Portal from '@/components/common/Portal';
import { useI18n } from '@/lib/i18n';
import { getAttendanceText, weekDayLabelsMap, dayNamesMap } from '@/lib/translations/attendance';

interface EmployeeContract {
  id: string;
  employeeId: string;
  contractTypeId: string;
  contractType?: { name: string } | null;
  name: string;
  startDate: string;
  endDate: string | null;
  workDays: number[];
  standardHoursPerDay: number;
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultBreakStart: string;
  defaultBreakEnd: string;
  holidayWorkCountsAsOvertime: boolean;
  isActive: boolean;
}

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  firstNameKana?: string | null;
  lastNameKana?: string | null;
  department?: { name: string } | null;
  position?: { name: string } | null;
  hireDate: string;
  contractTypeId?: string;
  contractType?: { name: string } | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  employeeContracts?: EmployeeContract[];
}

interface Holiday {
  id: string;
  date: string;
  name: string;
  type: string;
  isPaidHoliday: boolean;
  isActive: boolean;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  overtimeHours: number;
  status: string;
  notes: string;
  employee: Employee;
}

interface AttendanceClientProps {
  initialRecords: AttendanceRecord[];
  employees: Employee[];
  holidays: Holiday[];
  isEmployeeMode?: boolean;
}

const statusOptions = [
  { value: 'PRESENT', color: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50' },
  { value: 'LATE', color: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50' },
  { value: 'EARLY_LEAVE', color: 'bg-yellow-500', text: 'text-yellow-750 dark:text-yellow-350', bg: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-100 dark:border-yellow-900/50' },
  { value: 'ABSENT', color: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50' },
  { value: 'HOLIDAY', color: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900/50' },
];

import {
  applyRounding as sharedApplyRounding,
  calculateRecordWorkHours as sharedCalculateRecordWorkHours,
  calculateContractAwareOvertime as sharedCalculateContractAwareOvertime
} from '@/lib/attendance-helpers';

export function applyRounding(dateVal: Date | string | null | undefined, policy: string, roundUp: boolean): Date | null {
  return sharedApplyRounding(dateVal, policy, roundUp);
}

export function calculateRecordWorkHours(
  checkIn: string | Date | null,
  checkOut: string | Date | null,
  breakStart: string | Date | null,
  breakEnd: string | Date | null,
  policy: string
): number {
  return sharedCalculateRecordWorkHours(checkIn, checkOut, breakStart, breakEnd, policy);
}

const dateOnly = (value: string | Date) => {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return typeof value === 'string' ? value.split('T')[0] : '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function getActiveContractForDate(employee: Employee | null, dateStr: string): EmployeeContract | null {
  if (!employee?.employeeContracts?.length) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  return employee.employeeContracts.find(contract => {
    if (!contract.isActive) return false;
    const start = new Date(contract.startDate);
    const end = contract.endDate ? new Date(contract.endDate) : null;
    return start <= target && (!end || end >= target);
  }) || employee.employeeContracts.find(c => c.isActive) || null;
}

function getHolidayForDate(holidays: Holiday[], dateStr: string): Holiday | null {
  return holidays.find(h => h.isActive && dateOnly(h.date) === dateStr) || null;
}

function isContractWorkDay(contract: EmployeeContract | null, dateStr: string): boolean {
  if (!contract) return true;
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return (contract.workDays || [1, 2, 3, 4, 5]).includes(day);
}

function calculateContractAwareOvertime(
  record: AttendanceRecord | undefined,
  contract: EmployeeContract | null,
  holiday: Holiday | null,
  policy: string
): number {
  return sharedCalculateContractAwareOvertime(record, contract, holiday, policy);
}

function getWorkDayLabel(contract: EmployeeContract | null, holiday: Holiday | null, dateStr: string, locale: string) {
  if (holiday) return `${getAttendanceText('workDayHoliday', locale)}: ${holiday.name}`;
  if (!isContractWorkDay(contract, dateStr)) return getAttendanceText('workDayContractHoliday', locale);
  return getAttendanceText('workDayContractWorkDay', locale);
}

export default function AttendanceClient({ initialRecords, employees, holidays, isEmployeeMode = false }: AttendanceClientProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  
  const [roundingPolicy, setRoundingPolicy] = useState<string>('exact');

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'PRESENT': return t('status.present');
      case 'LATE': return t('status.late');
      case 'EARLY_LEAVE': return t('status.earlyLeave');
      case 'ABSENT': return t('status.absent');
      case 'HOLIDAY': return t('status.leave');
      default: return s;
    }
  };

  // Load company rounding policy on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedInfo = localStorage.getItem('company_info');
      if (savedInfo) {
        try {
          const parsed = JSON.parse(savedInfo);
          if (parsed.roundingPolicy) {
            setRoundingPolicy(parsed.roundingPolicy);
          }
        } catch (e) {
          console.error('Failed to load company rounding policy:', e);
        }
      }
    }

    const loadCompany = async () => {
      try {
        const res = await fetch('/api/company');
        if (res.ok) {
          const data = await res.json();
          if (data.roundingPolicy) {
            setRoundingPolicy(data.roundingPolicy);
            localStorage.setItem('company_info', JSON.stringify(data));
          }
        }
      } catch (e) {
        // ignore
      }
    };
    loadCompany();
  }, []);

  // Selection States
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    isEmployeeMode ? (employees[0] || null) : null
  );
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // Default to May
  const [showInputModal, setShowInputModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isPayrollLocked, setIsPayrollLocked] = useState(false);

  // Filters for Employee selector
  const [empSearch, setEmpSearch] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('ALL');

  // View state
  const [viewMode, setViewMode] = useState<'box' | 'list'>('box');

  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('attendance_sidebar_collapsed');
      if (saved !== null) {
        setRightSidebarCollapsed(saved === 'true');
      }
      const savedView = localStorage.getItem('attendanceViewMode');
      if (savedView === 'box' || savedView === 'list') {
        setViewMode(savedView);
      }
    }
  }, []);

  const toggleRightSidebar = () => {
    const newVal = !rightSidebarCollapsed;
    setRightSidebarCollapsed(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('attendance_sidebar_collapsed', String(newVal));
    }
  };

  // Dynamic Form states for real-time overtime calculator
  const [formDate, setFormDate] = useState('');
  const [formCheckIn, setFormCheckIn] = useState('');
  const [formCheckOutDate, setFormCheckOutDate] = useState('');
  const [formCheckOutTime, setFormCheckOutTime] = useState('');
  const [formBreakStart, setFormBreakStart] = useState('');
  const [formBreakEnd, setFormBreakEnd] = useState('');
  const [formHasBreak, setFormHasBreak] = useState(true);
  const [formSplitShift, setFormSplitShift] = useState(false);
  const [formNakanukeHours, setFormNakanukeHours] = useState(0);
  const [formStatus, setFormStatus] = useState('PRESENT');
  const [formNotes, setFormNotes] = useState('');
  const [formOvertimeHours, setFormOvertimeHours] = useState<number>(0.0);
  const [isManualOvertime, setIsManualOvertime] = useState<boolean>(false);

  // Monthly Shift Defaults state (saved in localStorage by employeeId-year-month)
  const [defaultCheckIn, setDefaultCheckIn] = useState('08:00');
  const [defaultCheckOut, setDefaultCheckOut] = useState('17:00');
  const [defaultBreakStart, setDefaultBreakStart] = useState('12:00');
  const [defaultBreakEnd, setDefaultBreakEnd] = useState('13:00');
  const [defaultHasBreak, setDefaultHasBreak] = useState(true);

  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [tempCheckIn, setTempCheckIn] = useState('08:00');
  const [tempCheckOut, setTempCheckOut] = useState('17:00');
  const [tempBreakStart, setTempBreakStart] = useState('12:00');
  const [tempBreakEnd, setTempBreakEnd] = useState('13:00');
  const [tempHasBreak, setTempHasBreak] = useState(true);

  // Sync temp states and load defaults from localStorage when employee/year/month changes
  useEffect(() => {
    if (!selectedEmployee) return;
    const key = `shift-default-${selectedEmployee.id}-${selectedYear}-${selectedMonth}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDefaultCheckIn(parsed.checkIn || '08:00');
        setDefaultCheckOut(parsed.checkOut || '17:00');
        setDefaultBreakStart(parsed.breakStart || '12:00');
        setDefaultBreakEnd(parsed.breakEnd || '13:00');
        setDefaultHasBreak(parsed.hasBreak !== undefined ? parsed.hasBreak : true);
      } catch (e) {
        console.error(e);
      }
    } else {
      // Fallback: Default shift is 08:00 - 17:00, 1h break
      setDefaultCheckIn('08:00');
      setDefaultCheckOut('17:00');
      setDefaultBreakStart('12:00');
      setDefaultBreakEnd('13:00');
      setDefaultHasBreak(true);
    }
  }, [selectedEmployee, selectedYear, selectedMonth]);

  useEffect(() => {
    setTempCheckIn(defaultCheckIn);
    setTempCheckOut(defaultCheckOut);
    setTempBreakStart(defaultBreakStart);
    setTempBreakEnd(defaultBreakEnd);
    setTempHasBreak(defaultHasBreak);
  }, [defaultCheckIn, defaultCheckOut, defaultBreakStart, defaultBreakEnd, defaultHasBreak]);

  useEffect(() => {
    const checkPayrollLock = async () => {
      if (!selectedEmployee) return;
      try {
        const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        const res = await fetch(`/api/payroll?employeeId=${selectedEmployee.id}&month=${monthStr}`);
        if (res.ok) {
          const data = await res.json();
          const recordsList = data.data || data || [];
          const isLocked = recordsList.some((r: any) => r.status === 'APPROVED' || r.status === 'PAID');
          setIsPayrollLocked(isLocked);
        }
      } catch (e) {
        console.error('Failed to check payroll status:', e);
      }
    };
    checkPayrollLock();
  }, [selectedEmployee, selectedYear, selectedMonth]);

  const saveMonthlyDefaults = (checkIn: string, checkOut: string, breakStart: string, breakEnd: string, hasBreak: boolean) => {
    if (!selectedEmployee) return;
    const key = `shift-default-${selectedEmployee.id}-${selectedYear}-${selectedMonth}`;
    const value = { checkIn, checkOut, breakStart, breakEnd, hasBreak };
    localStorage.setItem(key, JSON.stringify(value));
    
    setDefaultCheckIn(checkIn);
    setDefaultCheckOut(checkOut);
    setDefaultBreakStart(breakStart);
    setDefaultBreakEnd(breakEnd);
    setDefaultHasBreak(hasBreak);
  };

  // Live Clock State
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Initialize clock on mount
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save viewMode to local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('attendanceViewMode', viewMode);
    }
  }, [viewMode]);

  // Read employee from URL query on mount
  useEffect(() => {
    if (isEmployeeMode) return;
    const empCode = searchParams.get('emp');
    if (empCode) {
      const emp = employees.find(e => e.employeeCode === empCode);
      if (emp) setSelectedEmployee(emp);
    }
  }, [searchParams, employees, isEmployeeMode]);

  const years = Array.from({ length: 8 }, (_, i) => 2020 + i);

  // Departments list for filter
  const departments = useMemo(() => {
    const set = new Set(employees.map(e => e.department?.name).filter(Boolean));
    return Array.from(set).sort();
  }, [employees]);

  // Today's Date String format YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Today's summary stats for all employees
  const todayStats = useMemo(() => {
    const todayRecs = records.filter(r => dateOnly(r.date) === todayStr);
    const present = todayRecs.filter(r => r.status === 'PRESENT').length;
    const late = todayRecs.filter(r => r.status === 'LATE').length;
    const earlyLeave = todayRecs.filter(r => r.status === 'EARLY_LEAVE').length;
    const absent = todayRecs.filter(r => r.status === 'ABSENT').length;
    const leave = todayRecs.filter(r => r.status === 'HOLIDAY').length;
    const unregistered = employees.length - todayRecs.length;
    return { present, late, earlyLeave, absent, leave, unregistered };
  }, [records, employees, todayStr]);

  // Filtered employees for selector
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = empSearch === '' ||
        `${emp.lastName} ${emp.firstName}`.includes(empSearch) ||
        `${emp.lastNameKana || ''} ${emp.firstNameKana || ''}`.includes(empSearch) ||
        emp.employeeCode.includes(empSearch);
      const matchDept = empDeptFilter === 'ALL' || (emp.department?.name === empDeptFilter);
      return matchSearch && matchDept;
    });
  }, [employees, empSearch, empDeptFilter]);

  // Records filtered for selected month & employee
  const monthRecords = useMemo(() => {
    if (!selectedEmployee) return [];
    const empId = selectedEmployee.id;
    const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    return records.filter(r =>
      r.employeeId === empId &&
      r.date.startsWith(monthStr)
    );
  }, [records, selectedEmployee, selectedYear, selectedMonth]);

  // Selected Employee Monthly Stats
  const monthlySummary = useMemo(() => {
    const totalDays = monthRecords.length;
    const presentDays = monthRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EARLY_LEAVE').length;
    const lateDays = monthRecords.filter(r => r.status === 'LATE').length;
    const absentDays = monthRecords.filter(r => r.status === 'ABSENT').length;
    const leaveDays = monthRecords.filter(r => r.status === 'HOLIDAY').length;

    // Sum total actual working hours (excluding breaks) using rounding policy
    const totalWorkHours = monthRecords.reduce((sum, r) => {
      const hours = calculateRecordWorkHours(r.checkIn, r.checkOut, r.breakStart, r.breakEnd, roundingPolicy);
      return sum + hours;
    }, 0);

    // Sum total overtime hours using contract-aware holiday/rest-day policy
    const totalOT = monthRecords.reduce((sum, r) => {
      const dateStr = dateOnly(r.date);
      const contract = getActiveContractForDate(selectedEmployee, dateStr);
      const holiday = getHolidayForDate(holidays, dateStr);
      return sum + calculateContractAwareOvertime(r, contract, holiday, roundingPolicy);
    }, 0);

    const holidayWorkDays = monthRecords.filter(r => {
      const dateStr = dateOnly(r.date);
      return !!getHolidayForDate(holidays, dateStr) && calculateRecordWorkHours(r.checkIn, r.checkOut, r.breakStart, r.breakEnd, roundingPolicy) > 0;
    }).length;

    const contractRestWorkDays = monthRecords.filter(r => {
      const dateStr = dateOnly(r.date);
      const contract = getActiveContractForDate(selectedEmployee, dateStr);
      return !getHolidayForDate(holidays, dateStr) && !isContractWorkDay(contract, dateStr) && calculateRecordWorkHours(r.checkIn, r.checkOut, r.breakStart, r.breakEnd, roundingPolicy) > 0;
    }).length;

    return { 
      totalDays, 
      presentDays, 
      lateDays, 
      absentDays, 
      holidays: leaveDays, 
      totalOT: Math.round(totalOT * 10) / 10,
      totalWorkHours: Math.round(totalWorkHours * 10) / 10,
      holidayWorkDays,
      contractRestWorkDays,
    };
  }, [monthRecords, roundingPolicy, selectedEmployee, holidays]);

  // Generate calendar days
  const daysInMonth = useMemo(() => {
    const days: { day: number; date: string; record: AttendanceRecord | undefined }[] = [];
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();

    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const record = monthRecords.find(r => dateOnly(r.date) === dateStr);
      days.push({ day: d, date: dateStr, record });
    }
    return days;
  }, [selectedYear, selectedMonth, monthRecords]);

  // Calculate day of the week for the 1st of the month (0 = Monday, ..., 6 = Sunday)
  const firstDayOfWeek = useMemo(() => {
    const d = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    return d === 0 ? 6 : d - 1;
  }, [selectedYear, selectedMonth]);

  // Today's record for Selected Employee
  const todayRecord = useMemo(() => {
    if (!selectedEmployee) return null;
    return records.find(r => r.employeeId === selectedEmployee.id && dateOnly(r.date) === todayStr);
  }, [records, selectedEmployee, todayStr]);

  // Today's real-time state for Clock panel
  const clockStatus = useMemo(() => {
    if (!todayRecord) return 'NOT_CLOCKED_IN';
    if (todayRecord.checkIn && !todayRecord.checkOut) {
      if (todayRecord.breakStart && !todayRecord.breakEnd) {
        return 'ON_BREAK';
      }
      return 'WORKING';
    }
    if (todayRecord.checkIn && todayRecord.checkOut) {
      return 'CLOCKED_OUT';
    }
    return 'NOT_CLOCKED_IN';
  }, [todayRecord]);

  // Automated Compliance alerts scanner
  const complianceAlerts = useMemo(() => {
    if (!selectedEmployee) return [];

    const alerts: {
      id: string;
      date: string;
      title: string;
      description: string;
      severity: 'error' | 'warning' | 'info';
      record?: AttendanceRecord;
    }[] = [];

    monthRecords.forEach(rec => {
      const dateStr = dateOnly(rec.date);
      const recDate = new Date(dateStr);
      const limitToday = new Date();
      limitToday.setHours(0, 0, 0, 0);

      // Warning 1: Missing Clock-out on past days
      if (recDate < limitToday && rec.checkIn && !rec.checkOut) {
        alerts.push({
          id: `missing-out-${dateStr}`,
          date: dateStr,
          title: getAttendanceText('alertMissingOutTitle', locale),
          description: getAttendanceText('alertMissingOutDesc', locale),
          severity: 'error',
          record: rec,
        });
      }

      if (rec.checkIn && rec.checkOut) {
        const rCheckIn = applyRounding(rec.checkIn, roundingPolicy, true);
        const rCheckOut = applyRounding(rec.checkOut, roundingPolicy, false);
        let workMins = 0;
        let breakMins = 0;
        if (rCheckIn && rCheckOut) {
          workMins = (rCheckOut.getTime() - rCheckIn.getTime()) / (1000 * 60);
          if (rec.breakStart && rec.breakEnd) {
            const rBreakStart = applyRounding(rec.breakStart, roundingPolicy, true);
            const rBreakEnd = applyRounding(rec.breakEnd, roundingPolicy, false);
            if (rBreakStart && rBreakEnd) {
              breakMins = (rBreakEnd.getTime() - rBreakStart.getTime()) / (1000 * 60);
            }
          }
        }

        const actualHours = Math.max(0, (workMins - breakMins) / 60);

        // Warning 2: Overwork Risk (>10 hours actual work)
        if (actualHours > 10) {
          alerts.push({
            id: `overwork-${dateStr}`,
            date: dateStr,
            title: getAttendanceText('alertOverworkTitle', locale),
            description: getAttendanceText('alertOverworkDesc', locale).replace('{hours}', actualHours.toFixed(1)),
            severity: 'warning',
            record: rec,
          });
        }

        // Warning 3: Insufficient breaks under Japanese law
        // >6 hours requires >=45 mins, >8 hours requires >=60 mins
        const totalDurationHrs = workMins / 60;
        if (totalDurationHrs > 8 && breakMins < 60) {
          alerts.push({
            id: `break-short-8h-${dateStr}`,
            date: dateStr,
            title: getAttendanceText('alertBreakShortTitle', locale),
            description: getAttendanceText('alertBreakShort8hDesc', locale).replace('{breakMins}', String(breakMins)),
            severity: 'error',
            record: rec,
          });
        } else if (totalDurationHrs > 6 && breakMins < 45) {
          alerts.push({
            id: `break-short-6h-${dateStr}`,
            date: dateStr,
            title: getAttendanceText('alertBreakShortTitle', locale),
            description: getAttendanceText('alertBreakShort6hDesc', locale).replace('{breakMins}', String(breakMins)),
            severity: 'error',
            record: rec,
          });
        }
      }

      // Warning 4: Lateness Reason Missing
      if (rec.status === 'LATE' && (!rec.notes || rec.notes.trim() === '')) {
        alerts.push({
          id: `late-notes-${dateStr}`,
          date: dateStr,
          title: getAttendanceText('alertLateNotesTitle', locale),
          description: getAttendanceText('alertLateNotesDesc', locale),
          severity: 'info',
          record: rec,
        });
      }
    });

    return alerts.sort((a, b) => b.date.localeCompare(a.date));
  }, [monthRecords, selectedEmployee, roundingPolicy, locale]);

  // Weekly work distribution analytics data (Mon-Sun averages)
  const weeklyWorkDistribution = useMemo(() => {
    const sums = Array(7).fill(0);
    const counts = Array(7).fill(0);

    monthRecords.forEach(rec => {
      const hours = calculateRecordWorkHours(rec.checkIn, rec.checkOut, rec.breakStart, rec.breakEnd, roundingPolicy);
      if (hours > 0) {
        const d = new Date(rec.date);
        // Shift Sunday to 6 (Mon=0, Tue=1 ... Sun=6)
        const dayIdx = (d.getDay() + 6) % 7;
        sums[dayIdx] += hours;
        counts[dayIdx] += 1;
      }
    });

    const daysJP = weekDayLabelsMap[locale] || weekDayLabelsMap.ja;
    return daysJP.map((label, idx) => {
      const avg = counts[idx] > 0 ? Math.round((sums[idx] / counts[idx]) * 10) / 10 : 0;
      return { label, avg };
    });
  }, [monthRecords, roundingPolicy, locale]);

  // Open modal
  const openModal = (date: string, record?: AttendanceRecord) => {
    if (isPayrollLocked && !isEmployeeMode) {
      alert('この月の給与計算は確定済みのため、勤怠データの編集はできません。');
      return;
    }
    setSelectedDate(date);
    setEditingRecord(record || null);
    
    setFormDate(record ? dateOnly(record.date) : date);
    
    if (record) {
      setFormCheckIn(record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).substring(0, 5) : '08:00');
      setFormCheckOutDate(record.checkOut ? dateOnly(record.checkOut) : date);
      setFormCheckOutTime(record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).substring(0, 5) : '17:00');
      
      const hasRecordBreak = !!record.breakStart && !!record.breakEnd;
      setFormBreakStart(record.breakStart ? new Date(record.breakStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).substring(0, 5) : '12:00');
      setFormBreakEnd(record.breakEnd ? new Date(record.breakEnd).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).substring(0, 5) : '13:00');
      setFormHasBreak(hasRecordBreak);
      setFormSplitShift(false);
      setFormNakanukeHours(0);
      setFormStatus(record.status || 'PRESENT');
      setFormNotes(record.notes || '');
      setFormOvertimeHours(record.overtimeHours);
      setIsManualOvertime(false);
    } else {
      // Use configured monthly defaults
      setFormCheckIn(defaultCheckIn);
      setFormCheckOutDate(date);
      setFormCheckOutTime(defaultCheckOut); // Match exactly (e.g. 17:00)
      setFormBreakStart(defaultBreakStart);
      setFormBreakEnd(defaultBreakEnd);
      setFormHasBreak(defaultHasBreak);
      setFormSplitShift(false);
      setFormNakanukeHours(0);
      setFormStatus('PRESENT');
      setFormNotes('');
      
      // Calculate what the auto overtime would be for these default times
      const initialCalculatedOT = (() => {
        try {
          const start = new Date(`${date}T${defaultCheckIn}`);
          const end = new Date(`${date}T${defaultCheckOut}`);
          const rStart = applyRounding(start, roundingPolicy, true);
          const rEnd = applyRounding(end, roundingPolicy, false);
          if (!rStart || !rEnd) return 0;
          const totalMinutes = (rEnd.getTime() - rStart.getTime()) / (1000 * 60);
          if (totalMinutes <= 0) return 0;
          let breakMinutes = defaultHasBreak ? 60 : 0;
          if (defaultHasBreak && defaultBreakStart && defaultBreakEnd) {
            const bStart = new Date(`${date}T${defaultBreakStart}`);
            const bEnd = new Date(`${date}T${defaultBreakEnd}`);
            const rBStart = applyRounding(bStart, roundingPolicy, true);
            const rBEnd = applyRounding(bEnd, roundingPolicy, false);
            if (rBStart && rBEnd) {
              breakMinutes = (rBEnd.getTime() - rBStart.getTime()) / (1000 * 60);
            }
          }
          const workMinutes = totalMinutes - breakMinutes;
          return Math.max(0, (workMinutes - 8 * 60) / 60);
        } catch (e) {
          return 0;
        }
      })();

      setFormOvertimeHours(initialCalculatedOT);
      setIsManualOvertime(false); // Mode is completely automatic by default!
    }
    
    setShowInputModal(true);
  };

  const closeModal = () => {
    setShowInputModal(false);
    setSelectedDate(null);
    setEditingRecord(null);
  };

  // Real-time automatic overtime calculation
  const calculatedWorkHours = useMemo(() => {
    if (!formDate || !formCheckIn || !formCheckOutTime || !formCheckOutDate) return 0;
    try {
      const start = new Date(`${formDate}T${formCheckIn}`);
      const end = new Date(`${formCheckOutDate}T${formCheckOutTime}`);
      
      const rStart = applyRounding(start, roundingPolicy, true);
      const rEnd = applyRounding(end, roundingPolicy, false);
      if (!rStart || !rEnd) return 0;

      const totalMinutes = (rEnd.getTime() - rStart.getTime()) / (1000 * 60);
      if (totalMinutes <= 0) return 0;

      let breakMinutes = 0;
      if (formHasBreak) {
        if (formBreakStart && formBreakEnd) {
          const bStart = new Date(`${formDate}T${formBreakStart}`);
          const bEnd = new Date(`${formDate}T${formBreakEnd}`);
          const rBStart = applyRounding(bStart, roundingPolicy, true);
          const rBEnd = applyRounding(bEnd, roundingPolicy, false);
          if (rBStart && rBEnd) {
            breakMinutes = (rBEnd.getTime() - rBStart.getTime()) / (1000 * 60);
          }
        } else {
          breakMinutes = 60; // Default 60 minutes
        }
      }

      const nakanukeMinutes = formSplitShift ? formNakanukeHours * 60 : 0;
      const workMinutes = totalMinutes - breakMinutes - nakanukeMinutes;
      return Math.max(0, workMinutes / 60);
    } catch (e) {
      return 0;
    }
  }, [formDate, formCheckIn, formCheckOutTime, formCheckOutDate, formBreakStart, formBreakEnd, formHasBreak, formSplitShift, formNakanukeHours, roundingPolicy]);

  const calculatedOvertime = useMemo(() => {
    const standardHours = 8;
    return Math.max(0, Math.round((calculatedWorkHours - standardHours) * 10) / 10);
  }, [calculatedWorkHours]);

  // Synchronize formOvertimeHours with calculatedOvertime unless overridden manually
  useEffect(() => {
    if (!isManualOvertime) {
      setFormOvertimeHours(calculatedOvertime);
    }
  }, [calculatedOvertime, isManualOvertime]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (!formDate && !selectedDate) {
      alert('日付を入力してください');
      return;
    }

    let attendanceDate: Date;
    try {
      attendanceDate = new Date(formDate ? `${formDate}T00:00:00.000Z` : `${selectedDate}T00:00:00.000Z`);
      if (isNaN(attendanceDate.getTime())) throw new Error('Invalid date');
    } catch (e) {
      alert('日付が無効です');
      return;
    }

    const checkOut = (formCheckOutDate && formCheckOutTime) ? `${formCheckOutDate}T${formCheckOutTime}:00` : null;
    const checkIn = (formDate && formCheckIn) ? `${formDate}T${formCheckIn}:00` : null;
    const breakStart = (formDate && formBreakStart && formHasBreak) ? `${formDate}T${formBreakStart}:00` : null;
    const breakEnd = (formDate && formBreakEnd && formHasBreak) ? `${formDate}T${formBreakEnd}:00` : null;

    const data = {
      employeeId: selectedEmployee.id,
      date: formDate ? `${formDate}T00:00:00.000Z` : `${selectedDate}T00:00:00.000Z`,
      checkIn,
      checkOut,
      breakStart,
      breakEnd,
      overtimeHours: formOvertimeHours,
      status: formStatus,
      notes: formNotes,
    };

    try {
      if (editingRecord) {
        await fetch('/api/attendance', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, id: editingRecord.id }),
        });
      } else {
        await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }

      // Fetch updated records
      const res = await fetch(`/api/attendance?employeeId=${selectedEmployee.id}`);
      const updatedRecords = await res.json();

      setRecords(prev => {
        const others = prev.filter(r => r.employeeId !== selectedEmployee.id);
        return [...others, ...updatedRecords];
      });

      closeModal();
    } catch (error) {
      console.error('Failed to save attendance:', error);
      alert(getAttendanceText('punchSaveError', locale));
    }
  };

  // Quick Action Clock Punch
  const handleQuickClock = async (action: 'CLOCK_IN' | 'BREAK_START' | 'BREAK_END' | 'CLOCK_OUT') => {
    if (!selectedEmployee) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateISO = `${todayStr}T00:00:00.000Z`;

    const data: any = {
      employeeId: selectedEmployee.id,
      date: dateISO,
    };

    if (action === 'CLOCK_IN') {
      const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);
      data.checkIn = timeStr;
      data.status = isLate ? 'LATE' : 'PRESENT';
      data.notes = isLate ? getAttendanceText('autoLateReason', locale) : '';
    } else if (action === 'BREAK_START') {
      data.checkIn = todayRecord?.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '09:00';
      data.breakStart = timeStr;
      data.status = todayRecord?.status || 'PRESENT';
    } else if (action === 'BREAK_END') {
      data.checkIn = todayRecord?.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '09:00';
      data.breakStart = todayRecord?.breakStart ? new Date(todayRecord.breakStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '12:00';
      data.breakEnd = timeStr;
      data.status = todayRecord?.status || 'PRESENT';
    } else if (action === 'CLOCK_OUT') {
      const checkInTime = todayRecord?.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '09:00';
      const breakStartTime = todayRecord?.breakStart ? new Date(todayRecord.breakStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null;
      const breakEndTime = todayRecord?.breakEnd ? new Date(todayRecord.breakEnd).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null;
      
      data.checkIn = checkInTime;
      data.breakStart = breakStartTime;
      data.breakEnd = breakEndTime;
      data.checkOut = `${todayStr}T${timeStr}:00`;
      
      // Calculate overtime hours using rounding policy
      const rStart = todayRecord?.checkIn ? applyRounding(new Date(todayRecord.checkIn), roundingPolicy, true) : applyRounding(new Date(`${todayStr}T09:00:00`), roundingPolicy, true);
      const rEnd = applyRounding(now, roundingPolicy, false);
      
      let workMinutes = 0;
      if (rStart && rEnd) {
        workMinutes = (rEnd.getTime() - rStart.getTime()) / (1000 * 60);
        
        let breakMinutes = 0;
        if (todayRecord?.breakStart && todayRecord?.breakEnd) {
          const rBStart = applyRounding(new Date(todayRecord.breakStart), roundingPolicy, true);
          const rBEnd = applyRounding(new Date(todayRecord.breakEnd), roundingPolicy, false);
          if (rBStart && rBEnd) {
            breakMinutes = (rBEnd.getTime() - rBStart.getTime()) / (1000 * 60);
          }
        } else if (todayRecord?.breakStart || todayRecord?.breakEnd) {
          breakMinutes = 60;
        }
        workMinutes -= breakMinutes;
      }
      
      const ot = Math.max(0, (workMinutes - 8 * 60) / 60);
      data.overtimeHours = Math.round(ot * 10) / 10;
      data.status = todayRecord?.status || 'PRESENT';
    }

    try {
      let resSave;
      if (isEmployeeMode) {
        const actionMap: Record<string, string> = {
          CLOCK_IN: 'checkIn',
          BREAK_START: 'breakStart',
          BREAK_END: 'breakEnd',
          CLOCK_OUT: 'checkOut'
        };
        resSave = await fetch('/api/attendance/punch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: actionMap[action] }),
        });
      } else {
        const method = todayRecord ? 'PUT' : 'POST';
        const bodyData = todayRecord ? { ...data, id: todayRecord.id } : data;

        resSave = await fetch('/api/attendance', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        });
      }

      if (!resSave.ok) throw new Error('Save failed');

      // Refresh records
      const res = await fetch(`/api/attendance?employeeId=${selectedEmployee.id}`);
      const updatedRecords = await res.json();

      setRecords(prev => {
        const others = prev.filter(r => r.employeeId !== selectedEmployee.id);
        return [...others, ...updatedRecords];
      });
    } catch (e) {
      console.error(e);
      alert(getAttendanceText('punchSaveError', locale));
    }
  };

  const getDayColor = (record: AttendanceRecord | undefined, holiday: Holiday | null, contractWorkDay: boolean, dateStr: string) => {
    const dObj = new Date(`${dateStr}T00:00:00`);
    const isSunday = dObj.getDay() === 0;
    const isSaturday = dObj.getDay() === 6;

    if (holiday || isSunday) {
      return record
        ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 hover:shadow-rose-100 ring-1 ring-rose-200/70'
        : 'bg-rose-50/70 dark:bg-rose-950/10 border-rose-250 dark:border-rose-900/60 hover:bg-rose-100/70';
    }
    if (isSaturday) {
      return record
        ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 hover:shadow-sky-100 ring-1 ring-sky-200/70'
        : 'bg-sky-50/70 dark:bg-sky-950/10 border-sky-250 dark:border-sky-900/60 hover:bg-sky-100/70';
    }
    if (!contractWorkDay) {
      return record
        ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-250 dark:border-orange-900 hover:shadow-orange-100'
        : 'bg-violet-50/60 dark:bg-violet-950/10 border-violet-200 dark:border-violet-900/60 hover:bg-violet-100/60';
    }
    if (!record) return 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 hover:border-slate-350 hover:bg-slate-100/50';
    const opt = statusOptions.find(o => o.value === record.status);
    if (!opt) return 'bg-slate-50 dark:bg-slate-900 border-slate-200';
    return `${opt.bg} hover:shadow-sm`;
  };

  // Helper to format dates with weekday coloring
  const formatJapaneseDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const dayNames = dayNamesMap[locale] || dayNamesMap.ja;
    const dayIdx = d.getDay();
    const dayName = dayNames[dayIdx];

    let colorClass = 'text-slate-700 dark:text-slate-300';
    if (dayIdx === 0) colorClass = 'text-rose-600 font-extrabold'; // Sun
    if (dayIdx === 6) colorClass = 'text-sky-600 font-extrabold'; // Sat

    if (locale === 'ja') {
      return (
        <span className={colorClass}>
          {m}{'\u6708'}{day}{'\u65e5'} <span className="text-[10px] opacity-75">({dayName})</span>
        </span>
      );
    } else if (locale === 'zh') {
      return (
        <span className={colorClass}>
          {m}{'\u6708'}{day}{'\u65e5'} <span className="text-[10px] opacity-75">({dayName})</span>
        </span>
      );
    } else if (locale === 'vi' || locale === 'th') {
      return (
        <span className={colorClass}>
          {day}/{m} <span className="text-[10px] opacity-75">({dayName})</span>
        </span>
      );
    } else {
      return (
        <span className={colorClass}>
          {m}/{day} <span className="text-[10px] opacity-75">({dayName})</span>
        </span>
      );
    }
  };

  // Percentage calculations for Overtime Meter (36 Agreement - 45h limit)
  const otLimitPercentage = Math.min(100, (monthlySummary.totalOT / 45) * 100);
  const otLimitDashoffset = 251.3 - (otLimitPercentage / 100) * 251.3;
  const otColorClass = useMemo(() => {
    if (monthlySummary.totalOT < 20) return 'stroke-emerald-500';
    if (monthlySummary.totalOT < 36) return 'stroke-amber-500';
    return 'stroke-rose-500 animate-pulse';
  }, [monthlySummary.totalOT]);

  // Render Employee List Selector Grid
  if (!selectedEmployee) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header KPI Overview */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { label: getAttendanceText('totalEmployees', locale), value: employees.length, color: 'text-slate-800 dark:text-slate-100', bg: 'bg-white/80 dark:bg-slate-900/60 border-slate-200/50 shadow-sm' },
            { label: getAttendanceText('presentToday', locale), value: todayStats.present + todayStats.late + todayStats.earlyLeave, color: 'text-emerald-600 font-extrabold', bg: 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100/50 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.06)]' },
            { label: getAttendanceText('lateEmployees', locale), value: todayStats.late, color: 'text-amber-600 font-extrabold', bg: 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-100/50 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.06)]' },
            { label: getAttendanceText('earlyLeaveEmployees', locale), value: todayStats.earlyLeave, color: 'text-yellow-600 font-extrabold', bg: 'bg-yellow-50/40 dark:bg-yellow-950/20 border-yellow-100/50 shadow-[0_4px_20px_-4px_rgba(234,179,8,0.06)]' },
            { label: getAttendanceText('absentEmployees', locale), value: todayStats.absent, color: 'text-rose-650 font-extrabold', bg: 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-100/50 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.06)]' },
            { label: getAttendanceText('leaveEmployees', locale), value: todayStats.leave, color: 'text-sky-600 font-extrabold', bg: 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-100/50 shadow-[0_4px_20px_-4px_rgba(14,165,233,0.06)]' },
          ].map((s, idx) => (
            <div key={idx} className={`${s.bg} rounded-2xl p-4 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-default`}>
              <p className="text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wider">{s.label}</p>
              <p className={`text-xl font-black mt-1 tracking-tight ${s.color}`}>{s.value} <span className="text-xs font-normal text-slate-400">{getAttendanceText('staffUnit', locale)}</span></p>
            </div>
          ))}
        </div>

        {/* Search & Filter card */}
        <Card title={getAttendanceText('cardTitle', locale)} className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/50 shadow-sm rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={getAttendanceText('searchPlaceholder', locale)}
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <select
              value={empDeptFilter}
              onChange={e => setEmpDeptFilter(e.target.value)}
              className="px-3.5 py-2.5 border border-slate-200 bg-white dark:bg-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">{getAttendanceText('allDepts', locale)}</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Employee grid profile cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredEmployees.map(emp => {
            const todayRec = records.find(r => r.employeeId === emp.id && dateOnly(r.date) === todayStr);
            const statusTag = todayRec ? statusOptions.find(o => o.value === todayRec.status) : null;
            
            return (
              <div
                key={emp.id}
                onClick={() => {
                  setSelectedEmployee(emp);
                  router.push(`/attendance?emp=${emp.employeeCode}`);
                }}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-350 dark:hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-black shadow-sm ring-4 ring-blue-50 dark:ring-blue-950/40">
                    {emp.lastName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-650 transition-colors">
                      {emp.lastName} {emp.firstName}
                    </h3>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 font-mono mt-0.5">
                      {emp.employeeCode} | {emp.position?.name || '-'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-300 text-[10px] rounded-lg font-bold">
                    {emp.department?.name || getAttendanceText('unassigned', locale)}
                  </span>
                  
                  {/* Status Indicator */}
                  {statusTag ? (
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border flex items-center gap-1 ${statusTag.bg} ${statusTag.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusTag.color} animate-pulse`} />
                      {getStatusLabel(statusTag.value)}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-850 text-slate-400 border border-slate-200 dark:border-slate-700 text-[9px] rounded-lg font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                      {getAttendanceText('noPunch', locale)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Selected Employee Detail View
  return (
    <>
      <div className="space-y-6 animate-fadeIn">
      {/* Top Banner Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/50 shadow-sm">
        <div className="flex items-center gap-4">
          {!isEmployeeMode && (
            <button 
              onClick={() => { setSelectedEmployee(null); router.push('/attendance'); }} 
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3.5 py-2 transition-colors cursor-pointer"
            >
              {getAttendanceText('backToSelect', locale)}
            </button>
          )}
          <div>
            <div className="text-lg font-black text-slate-800 dark:text-slate-100">
              {selectedEmployee.lastName} {selectedEmployee.firstName} 
              <span className="text-xs font-normal text-slate-400 ml-2 font-mono">({selectedEmployee.employeeCode})</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              {selectedEmployee.department?.name || getAttendanceText('unassigned', locale)} <span className="text-slate-300 dark:text-slate-750">|</span> {selectedEmployee.position?.name || getAttendanceText('noPosition', locale)}
            </div>
          </div>
        </div>

        {/* Selected Employee Monthly Stats */}
        <div className="flex flex-wrap gap-2.5 bg-slate-50/50 dark:bg-slate-850/50 p-2 rounded-2xl border border-slate-200/50 dark:border-slate-800 self-start md:self-center">
          {[
            { label: t('attendance.workHours'), value: `${monthlySummary.totalWorkHours}h`, color: 'text-slate-800 dark:text-slate-200' },
            { label: t('attendance.otHours'), value: `${monthlySummary.totalOT}h`, color: monthlySummary.totalOT > 36 ? 'text-rose-600 font-black' : monthlySummary.totalOT > 20 ? 'text-amber-600' : 'text-slate-750' },
            { label: t('attendance.holidayWork'), value: `${monthlySummary.holidayWorkDays}${t('common.dayUnit')}`, color: monthlySummary.holidayWorkDays > 0 ? 'text-rose-650 font-black' : 'text-slate-750' },
            { label: t('attendance.contractRestWork'), value: `${monthlySummary.contractRestWorkDays}${t('common.dayUnit')}`, color: monthlySummary.contractRestWorkDays > 0 ? 'text-violet-650 font-black' : 'text-slate-750' },
            { label: t('attendance.lateDays'), value: `${monthlySummary.lateDays}${t('common.timesUnit')}`, color: monthlySummary.lateDays > 0 ? 'text-rose-650' : 'text-slate-750' },
            { label: t('attendance.leaveDays'), value: `${monthlySummary.holidays}${t('common.dayUnit')}`, color: 'text-sky-650' }
          ].map((stat, i) => (
            <div key={i} className="text-center px-4 py-1.5 border-r border-slate-200 dark:border-slate-800/80 last:border-0">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{stat.label}</p>
              <p className={`text-sm font-black mt-0.5 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Calendar & Log Timeline */}
        <div className={`space-y-6 transition-all duration-300 ${rightSidebarCollapsed ? "lg:col-span-3" : "lg:col-span-2"}`}>
          
          {/* Calendar Controller Card */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 shadow-sm rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <select 
                  value={selectedYear} 
                  onChange={e => setSelectedYear(parseInt(e.target.value))} 
                  className="px-3.5 py-2 border border-slate-200 bg-white dark:bg-slate-850 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  {years.map(y => <option key={y} value={y}>{locale === 'ja' || locale === 'zh' ? `${y}${getAttendanceText('yearUnit', locale)}` : `${getAttendanceText('yearUnit', locale)}${y}`}</option>)}
                </select>
                
                {/* Tabbed Capsule for months */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-850 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 max-w-full overflow-x-auto">
                  <button 
                    onClick={() => setSelectedMonth(selectedMonth === 1 ? 12 : selectedMonth - 1)} 
                    className="px-2 py-1.5 text-slate-450 hover:text-slate-800 dark:hover:text-slate-200 font-bold"
                  >
                    &lt;
                  </button>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <button 
                      key={m} 
                      onClick={() => setSelectedMonth(m)} 
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${selectedMonth === m ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-black' : 'text-slate-650 hover:text-slate-950 dark:hover:text-white'}`}
                    >
                      {locale === 'ja' || locale === 'zh' ? `${m}${getAttendanceText('monthUnit', locale)}` : `${getAttendanceText('monthUnit', locale)}${m}`}
                    </button>
                  ))}
                  <button 
                    onClick={() => setSelectedMonth(selectedMonth === 12 ? 1 : selectedMonth + 1)} 
                    className="px-2 py-1.5 text-slate-450 hover:text-slate-800 dark:hover:text-slate-200 font-bold"
                  >
                    &gt;
                  </button>
                </div>
              </div>

              {/* Monthly Shift Pattern Settings Button */}
              {!isEmployeeMode && (
                <button
                  onClick={() => {
                    if (isPayrollLocked) {
                      alert('この月の給与計算は確定済みのため、シフトパターンの変更はできません。');
                      return;
                    }
                    setShowSettingsDrawer(!showSettingsDrawer);
                  }}
                  disabled={isPayrollLocked}
                  className={`px-3.5 py-2 border rounded-xl text-xs font-bold outline-none transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isPayrollLocked
                      ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-350 dark:text-slate-600 cursor-not-allowed'
                      : showSettingsDrawer 
                        ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-blue-650 dark:text-blue-400' 
                        : 'border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  {getAttendanceText('patternSettings', locale)}
                </button>
              )}
              
              {/* View Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-850 rounded-xl p-0.5 border border-slate-200 dark:border-slate-800 shadow-inner">
                 <button 
                  onClick={() => { setViewMode('box'); localStorage.setItem('attendanceViewMode', 'box'); }} 
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${viewMode === 'box' ? 'bg-white dark:bg-slate-800 shadow text-blue-650 dark:text-blue-400 font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {getAttendanceText('calendarView', locale)}
                </button>
                <button 
                  onClick={() => { setViewMode('list'); localStorage.setItem('attendanceViewMode', 'list'); }} 
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 shadow text-blue-650 dark:text-blue-400 font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {getAttendanceText('timelineView', locale)}
                </button>
              </div>

              {/* Right Sidebar Toggle */}
              <button
                onClick={toggleRightSidebar}
                className={cn(
                  "px-3.5 py-2 border rounded-xl text-xs font-bold outline-none transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                  rightSidebarCollapsed
                    ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750"
                    : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400"
                )}
              >
                {rightSidebarCollapsed ? getAttendanceText('showStats', locale) : getAttendanceText('hideStats', locale)}
              </button>
            </div>

            {/* Expandable Shift Pattern Settings Panel */}
            {showSettingsDrawer && (
              <div className="mt-4 p-4.5 bg-slate-50/50 dark:bg-slate-850/20 border border-slate-200/60 dark:border-slate-800 rounded-2xl animate-fadeIn space-y-4 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                  <span className="font-black text-slate-800 dark:text-slate-200 text-sm">{getAttendanceText('defaultPatternTitle', locale)}</span>
                  <span className="text-[10px] text-slate-450 dark:text-slate-400">{getAttendanceText('defaultPatternDesc', locale)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">{getAttendanceText('defaultClockIn', locale)}</label>
                    <input 
                      type="time" 
                      value={tempCheckIn} 
                      onChange={e => setTempCheckIn(e.target.value)} 
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-xl outline-none font-bold font-mono focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">{getAttendanceText('defaultClockOut', locale)}</label>
                    <input 
                      type="time" 
                      value={tempCheckOut} 
                      onChange={e => setTempCheckOut(e.target.value)} 
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-xl outline-none font-bold font-mono focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">{getAttendanceText('defaultBreak', locale)}</label>
                    <div className="flex items-center gap-2 py-2">
                      <input 
                        type="checkbox" 
                        id="tempHasBreak" 
                        checked={tempHasBreak} 
                        onChange={e => setTempHasBreak(e.target.checked)} 
                        className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="tempHasBreak" className="font-black text-slate-750 dark:text-slate-300 cursor-pointer">{getAttendanceText('takeBreak', locale)}</label>
                    </div>
                  </div>
                </div>

                {tempHasBreak && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pl-4.5 border-l-2 border-blue-500/50 animate-fadeIn">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 mb-1">{getAttendanceText('modalBreakStart', locale)}</label>
                      <input 
                        type="time" 
                        value={tempBreakStart} 
                        onChange={e => setTempBreakStart(e.target.value)} 
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 mb-1">{getAttendanceText('modalBreakEnd', locale)}</label>
                      <input 
                        type="time" 
                        value={tempBreakEnd} 
                        onChange={e => setTempBreakEnd(e.target.value)} 
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-lg outline-none font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setShowSettingsDrawer(false)} 
                    className="px-4 py-2 border border-slate-250 dark:border-slate-700 rounded-xl text-slate-650 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 font-bold cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      saveMonthlyDefaults(tempCheckIn, tempCheckOut, tempBreakStart, tempBreakEnd, tempHasBreak);
                      setShowSettingsDrawer(false);
                    }} 
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black cursor-pointer shadow-sm"
                  >
                    {getAttendanceText('saveSettings', locale)}
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Calendar / Log Sheet */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/50 shadow-sm rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-4">
              {locale === 'ja' || locale === 'zh' ? `${selectedYear}${getAttendanceText('yearUnit', locale)}${selectedMonth}${getAttendanceText('monthUnit', locale)}` : `${getAttendanceText('monthUnit', locale)}${selectedMonth} ${getAttendanceText('yearUnit', locale)}${selectedYear}`} {getAttendanceText('attendanceLog', locale)} ({daysInMonth.length}{getAttendanceText('daysUnit', locale)})
            </h3>

            {isPayrollLocked && (
              <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-xl text-red-650 dark:text-red-400 text-xs font-bold flex items-center gap-2 shadow-sm animate-pulse">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span>この月の給与計算は確定済みのため、勤怠データの編集および ca Cài đặt はロックされています。 (Bảng lương tháng này đã chốt, dữ liệu chấm công bị khóa.)</span>
              </div>
            )}

            {viewMode === 'box' ? (
              <div className="space-y-5">
                <div className="grid grid-cols-7 gap-1.5">
                  {/* Weekday headers */}
                  {(weekDayLabelsMap[locale] || weekDayLabelsMap.ja).map(w => (
                    <div key={w} className="text-center text-[10px] font-bold text-slate-400 py-1">{w}</div>
                  ))}

                  {/* Empty cells to align the 1st of the month with the correct weekday header */}
                  {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="aspect-square p-2 border border-transparent" />
                  ))}
                  
                  {daysInMonth.map(({ day, date, record }) => {
                    const contract = getActiveContractForDate(selectedEmployee, date);
                    const holiday = getHolidayForDate(holidays, date);
                    const contractWorkDay = isContractWorkDay(contract, date);
                    const dayLabel = getWorkDayLabel(contract, holiday, date, locale);
                    const workHours = record ? calculateRecordWorkHours(record.checkIn, record.checkOut, record.breakStart, record.breakEnd, roundingPolicy) : 0;
                    const otHours = calculateContractAwareOvertime(record, contract, holiday, roundingPolicy);
                    const formattedWork = Math.round(workHours * 10) / 10;
                    const formattedOt = Math.round(otHours * 10) / 10;

                    return (
                      <button
                        key={day}
                        onClick={() => openModal(date, record)}
                        className={`aspect-square p-2 rounded-xl border transition-all duration-200 flex flex-col items-center justify-between hover:ring-2 hover:ring-blue-500/20 hover:scale-[1.01] cursor-pointer ${getDayColor(record, holiday, contractWorkDay, date)}`}
                      >
                        <div className="w-full flex items-start justify-between gap-1">
                          <div className={`text-[11px] md:text-xs font-black self-start ${
                            (holiday || new Date(`${date}T00:00:00`).getDay() === 0) ? 'text-rose-600 dark:text-rose-400' :
                            (new Date(`${date}T00:00:00`).getDay() === 6) ? 'text-sky-600 dark:text-sky-400' :
                            !contractWorkDay ? 'text-violet-650 dark:text-violet-400' : 'text-slate-600 dark:text-slate-400'
                          }`}>{day}</div>
                          {(holiday || !contractWorkDay) && (
                            <span className={`px-1 py-0.5 rounded text-[7px] font-black border truncate max-w-[54px] ${holiday ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-violet-100 text-violet-700 border-violet-200'}`} title={dayLabel}>
                              {holiday ? getAttendanceText('workDayHoliday', locale) : getAttendanceText('contractOff', locale)}
                            </span>
                          )}
                        </div>
                        {record ? (
                          <div className="w-full text-center space-y-1">
                            <div className="text-[11px] md:text-xs text-slate-800 dark:text-slate-200 font-mono font-extrabold leading-tight">
                              {record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              <div className="text-slate-350 dark:text-slate-650 leading-none my-0.5">↓</div>
                              {record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                            
                            {record.checkIn && record.checkOut && (
                              <div className="text-[10px] md:text-xs font-black text-slate-700 dark:text-slate-300 bg-black/5 dark:bg-white/5 py-0.5 rounded leading-normal">
                                <div>{getAttendanceText('actualLabel', locale)}{formattedWork}h</div>
                                {formattedOt > 0 && <div className="text-orange-650 dark:text-orange-450 font-black">{getAttendanceText('otLabel', locale)}{formattedOt}h</div>}
                              </div>
                            )}
                            
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`inline-block px-1 rounded text-[8px] md:text-[9px] font-black border ${statusOptions.find(o => o.value === record.status)?.text || 'text-slate-500'}`}>
                                {getStatusLabel(record.status)}
                              </span>
                              {(holiday || !contractWorkDay) && (
                                <span className="text-[8px] md:text-[9px] font-black text-rose-600 dark:text-rose-400 truncate max-w-full" title={dayLabel}>
                                  {holiday ? getAttendanceText('timelineHoliday', locale) : getAttendanceText('outOfContractOt', locale)}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-black mb-1">{getAttendanceText('noPunch', locale)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legends */}
                <div className="flex flex-wrap gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs font-semibold">
                  {statusOptions.map(opt => (
                    <div key={opt.value} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded border ${opt.color.replace('500', '200')} ${opt.color}`} />
                      <span className="text-slate-550 dark:text-slate-400">{getStatusLabel(opt.value)}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded" />
                    <span className="text-slate-550 dark:text-slate-400">{getAttendanceText('legendUnrecorded', locale)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-rose-100 border border-rose-300 rounded" />
                    <span className="text-rose-650 dark:text-rose-400">{getAttendanceText('legendHoliday', locale)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-violet-100 border border-violet-300 rounded" />
                    <span className="text-violet-650 dark:text-violet-400">{getAttendanceText('legendContractOff', locale)}</span>
                  </div>
                </div>
              </div>
            ) : (
              // Intelligent timeline log list
              <div className="relative border-l-2 border-slate-150 dark:border-slate-800 pl-4 space-y-4 py-2">
                {daysInMonth.map(({ day, date, record }) => {
                  const contract = getActiveContractForDate(selectedEmployee, date);
                  const holiday = getHolidayForDate(holidays, date);
                  const contractWorkDay = isContractWorkDay(contract, date);
                  const dayLabel = getWorkDayLabel(contract, holiday, date, locale);
                  const workHours = record ? calculateRecordWorkHours(record.checkIn, record.checkOut, record.breakStart, record.breakEnd, roundingPolicy) : 0;
                  const otHours = calculateContractAwareOvertime(record, contract, holiday, roundingPolicy);
                  const formattedWork = Math.round(workHours * 10) / 10;
                  const formattedOt = Math.round(otHours * 10) / 10;

                  return (
                    <div key={day} className="relative group animate-fadeIn">
                      {/* Timeline Node dot */}
                      <div className={`absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 transition-all ${holiday ? 'bg-rose-500' : !contractWorkDay ? 'bg-violet-500' : record ? statusOptions.find(o => o.value === record.status)?.color || 'bg-slate-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                      
                      <div 
                        onClick={() => openModal(date, record)}
                        className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-850/60 border rounded-2xl transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${holiday ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/50' : !contractWorkDay ? 'bg-violet-50/40 dark:bg-violet-950/10 border-violet-200 dark:border-violet-900/50' : 'bg-slate-50/40 dark:bg-slate-850/30 border-slate-200/50 dark:border-slate-800/80'}`}
                      >
                        {/* Date & Weekday */}
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[100px]">
                            {formatJapaneseDate(date)}
                          </div>
                          {record && (
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${statusOptions.find(o => o.value === record.status)?.bg} ${statusOptions.find(o => o.value === record.status)?.text}`}>
                              {getStatusLabel(record.status)}
                            </span>
                          )}
                          {(holiday || !contractWorkDay) && (
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${holiday ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-violet-100 text-violet-700 border-violet-200'}`} title={dayLabel}>
                              {holiday ? getAttendanceText('timelineHoliday', locale) : getAttendanceText('timelineContractOff', locale)}
                            </span>
                          )}
                        </div>

                        {/* Time punches timeline representation */}
                        {record ? (
                          <div className="flex-1 flex flex-wrap items-center gap-4 text-xs">
                            {/* Visual Time Flow */}
                            <div className="flex items-center gap-1.5 font-mono text-slate-650 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm font-semibold">
                              <span>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                              <span className="text-slate-300 dark:text-slate-600">→</span>
                              {record.breakStart && record.breakEnd && (
                                <span className="text-[10px] text-slate-450 flex items-center gap-0.5 bg-slate-50 dark:bg-slate-850 px-1.5 py-0.2 rounded border border-slate-100 dark:border-slate-700">
                                  {getAttendanceText('timelineBreak', locale)} ({new Date(record.breakStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}〜{new Date(record.breakEnd).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })})
                                </span>
                              )}
                              <span className="text-slate-300 dark:text-slate-600">→</span>
                              <span>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                            </div>

                            {/* Hours Display (Actual & Overtime) */}
                            {record.checkIn && record.checkOut && (
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 text-blue-650 dark:text-blue-400 rounded-lg font-black text-[10px]">
                                  {getAttendanceText('actualLabel', locale)}{formattedWork}h
                                </span>
                                <span className={`px-2.5 py-1 rounded-lg font-black text-[10px] border ${
                                  formattedOt > 0 
                                    ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50 text-orange-650 dark:text-orange-400 shadow-sm' 
                                    : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-450 dark:text-slate-400'
                                }`}>
                                  {getAttendanceText('otLabel', locale)}{formattedOt}h
                                </span>
                              </div>
                            )}

                            {/* Notes Preview */}
                            {record.notes && (
                              <span className="text-[11px] text-slate-550 dark:text-slate-400 italic truncate max-w-[200px]" title={record.notes}>
                                💬 {record.notes}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 text-xs text-slate-400 font-bold bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 px-3 py-1 rounded-xl w-fit">
                            {getAttendanceText('timelineUnrecorded', locale)}
                          </div>
                        )}

                        <button className="text-[10px] text-blue-650 dark:text-blue-400 font-bold border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-xl transition-colors shrink-0">
                          {isEmployeeMode ? getAttendanceText('btnDetail', locale) : getAttendanceText('btnEdit', locale)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Live Punch Console, Labor Compliance Dial, Alerts */}
        {!rightSidebarCollapsed && (
          <div className="space-y-6 animate-fadeIn">
          
          {/* Live Punch Console */}
          <Card className="bg-slate-900 text-white border-0 shadow-[0_10px_35px_rgba(0,0,0,0.15)] rounded-3xl p-5 relative overflow-hidden">
            {/* Background glowing halo */}
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center relative">
              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
                {getAttendanceText('punchStation', locale)}
              </span>
              
              {/* Digital Clock */}
              <div className="my-4">
                <p className="text-3xl font-black tracking-widest font-mono tabular-nums leading-none">
                  {currentTime ? currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '00:00:00'}
                </p>
                <p className="text-[10px] text-slate-450 mt-1">
                  {currentTime ? currentTime.toLocaleDateString(locale === 'vi' ? 'vi-VN' : locale === 'zh' ? 'zh-CN' : locale === 'th' ? 'th-TH' : locale === 'en' ? 'en-US' : 'ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : '---'}
                </p>
              </div>

              {/* Status Ring */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 transition-all duration-300">
                <span className={`w-2 h-2 rounded-full ${
                  clockStatus === 'WORKING' ? 'bg-emerald-500 animate-ping' :
                  clockStatus === 'ON_BREAK' ? 'bg-sky-500 animate-pulse' :
                  clockStatus === 'CLOCKED_OUT' ? 'bg-slate-400' :
                  'bg-rose-500'
                }`} />
                <span className="text-[10px] font-black tracking-wide uppercase">
                  {clockStatus === 'WORKING' ? getAttendanceText('statusWorking', locale) :
                   clockStatus === 'ON_BREAK' ? getAttendanceText('statusOnBreak', locale) :
                   clockStatus === 'CLOCKED_OUT' ? getAttendanceText('statusClockedOut', locale) :
                   getAttendanceText('statusNotClockedIn', locale)}
                </span>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleQuickClock('CLOCK_IN')}
                  disabled={clockStatus !== 'NOT_CLOCKED_IN'}
                  className={`py-3.5 rounded-2xl text-xs font-black shadow transition-all duration-200 cursor-pointer ${
                    clockStatus === 'NOT_CLOCKED_IN'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white'
                      : 'bg-white/5 text-slate-550 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  {getAttendanceText('btnClockIn', locale)}
                </button>
                <button
                  onClick={() => handleQuickClock('CLOCK_OUT')}
                  disabled={clockStatus !== 'WORKING'}
                  className={`py-3.5 rounded-2xl text-xs font-black shadow transition-all duration-200 cursor-pointer ${
                    clockStatus === 'WORKING'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white'
                      : 'bg-white/5 text-slate-550 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  {getAttendanceText('btnClockOut', locale)}
                </button>
                <button
                  onClick={() => handleQuickClock('BREAK_START')}
                  disabled={clockStatus !== 'WORKING'}
                  className={`py-3.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    clockStatus === 'WORKING'
                      ? 'bg-white/10 hover:bg-white/15 active:scale-95 text-white border border-white/10'
                      : 'bg-white/5 text-slate-550 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  {getAttendanceText('btnBreakStart', locale)}
                </button>
                <button
                  onClick={() => handleQuickClock('BREAK_END')}
                  disabled={clockStatus !== 'ON_BREAK'}
                  className={`py-3.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    clockStatus === 'ON_BREAK'
                      ? 'bg-white/10 hover:bg-white/15 active:scale-95 text-white border border-white/10'
                      : 'bg-white/5 text-slate-550 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  {getAttendanceText('btnBreakEnd', locale)}
                </button>
              </div>
            </div>
          </Card>

          {/* 36 Agreement Limit Gauge */}
          <Card title={getAttendanceText('otLimitTitle', locale)} className="bg-white dark:bg-slate-900 border border-slate-200/50 shadow-sm rounded-2xl p-5">
            <div className="flex items-center gap-5">
              {/* Circular SVG Gauge */}
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Track circle */}
                  <circle 
                    cx="50" cy="50" r="40" 
                    className="stroke-slate-100 dark:stroke-slate-800" 
                    strokeWidth="8" fill="transparent" 
                  />
                  {/* Progress circle */}
                  <circle 
                    cx="50" cy="50" r="40" 
                    className={otColorClass}
                    strokeWidth="8" fill="transparent" 
                    strokeDasharray="251.3" 
                    strokeDashoffset={otLimitDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-250 leading-none">
                    {monthlySummary.totalOT}
                  </span>
                  <span className="text-[7px] text-slate-450 dark:text-slate-400 font-semibold mt-0.5 leading-none">
                    / 45h
                  </span>
                </div>
              </div>

              {/* Progress Text */}
              <div>
                <h4 className="text-xs font-bold text-slate-750 dark:text-slate-350">
                  {getAttendanceText('otProgressTitle', locale)}
                </h4>
                <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1">
                  {getAttendanceText('otProgressDesc', locale)}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-black border ${
                    monthlySummary.totalOT < 20 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-700' :
                    monthlySummary.totalOT < 36 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 text-amber-700' :
                    'bg-rose-50 dark:bg-rose-950/20 border-rose-200 text-rose-700'
                  }`}>
                    {otLimitPercentage.toFixed(0)}{getAttendanceText('otProgressUsed', locale)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Weekly Work Hours Distribution (Horizontal SVG Bars) */}
          <Card title={getAttendanceText('avgHoursTitle', locale)} className="bg-white dark:bg-slate-900 border border-slate-200/50 shadow-sm rounded-2xl p-5">
            <div className="space-y-2">
              {weeklyWorkDistribution.map((w, i) => {
                const maxVal = 10; // reference max hours
                const barWidth = Math.min(100, (w.avg / maxVal) * 100);
                return (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="w-5 text-slate-500 font-bold">{w.label}</span>
                    {/* SVG Progress bar */}
                    <div className="flex-1 h-3 bg-slate-50 dark:bg-slate-850 rounded-full border border-slate-100 dark:border-slate-800 overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" 
                        style={{ width: `${barWidth}%` }} 
                      />
                      {/* 8-hour marker line */}
                      <div className="absolute left-[80%] top-0 bottom-0 w-[1.5px] bg-red-400/60 border-dashed border-l border-red-500/20" title={getAttendanceText('legal8h', locale)} />
                    </div>
                    <span className="w-8 text-right font-mono font-bold text-slate-700 dark:text-slate-350">{w.avg}h</span>
                  </div>
                );
              })}
              <div className="flex justify-between text-[8px] text-slate-400 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>0h</span>
                <span>{getAttendanceText('scheduled8h', locale)}</span>
                <span>10h+</span>
              </div>
            </div>
          </Card>

          {/* Labor Compliance Scanner Panel */}
          <Card title={getAttendanceText('complianceTitle', locale)} className="bg-white dark:bg-slate-900 border border-slate-200/50 shadow-sm rounded-2xl p-5">
            {complianceAlerts.length === 0 ? (
              <div className="text-center py-5">
                <svg className="w-8 h-8 text-emerald-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-bold text-emerald-600">
                  {getAttendanceText('complianceClear', locale)}
                </p>
                <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5">
                  {getAttendanceText('complianceNoAlerts', locale)}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {complianceAlerts.map(alert => (
                  <div 
                    key={alert.id} 
                    onClick={() => openModal(alert.date, alert.record)}
                    className={`p-3 border rounded-xl text-left transition-all hover:-translate-y-0.5 hover:shadow-sm cursor-pointer ${
                      alert.severity === 'error' ? 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/40 text-rose-850 dark:text-rose-300' :
                      alert.severity === 'warning' ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/40 text-amber-850 dark:text-amber-300' :
                      'bg-slate-50/40 dark:bg-slate-850/10 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          alert.severity === 'error' ? 'bg-rose-500' :
                          alert.severity === 'warning' ? 'bg-amber-500' :
                          'bg-blue-500'
                        }`} />
                        <span className="text-[11px] font-black tracking-wide uppercase">{alert.title}</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold opacity-60">
                        {locale === 'ja' || locale === 'zh' ? `${alert.date.split('-')[1]}\u6708${alert.date.split('-')[2]}\u65e5` : `${alert.date.split('-')[2]}/${alert.date.split('-')[1]}`}
                      </span>
                    </div>
                    <p className="text-[10px] opacity-80 mt-1 leading-relaxed">
                      {alert.description}
                    </p>
                    <div className="mt-1.5 text-[9px] font-bold text-blue-650 dark:text-blue-400 flex items-center gap-1">
                      <span>{isEmployeeMode ? getAttendanceText('complianceDetailLink', locale) : getAttendanceText('complianceEditLink', locale)}</span>
                      <span>→</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        )}

      </div>
    </div>

      {/* Editing / Input Modal */}
      {showInputModal && selectedDate && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" onClick={closeModal} />
          <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md mx-auto p-6 animate-fadeIn">
            <h2 className="text-base font-black text-slate-800 mb-4 pb-3 border-b border-slate-100 uppercase tracking-wide">
              {editingRecord ? (isEmployeeMode ? getAttendanceText('modalDetailTitle', locale) : getAttendanceText('modalEditTitle', locale)) : (isEmployeeMode ? getAttendanceText('modalDetailTitle', locale) : getAttendanceText('modalInputTitle', locale))} — {formatDate(selectedDate)}
            </h2>

            <form onSubmit={e => { if (isEmployeeMode) { e.preventDefault(); return; } handleSave(e); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">{getAttendanceText('modalDate', locale)}</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    required
                    disabled={isEmployeeMode}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">{getAttendanceText('modalClockIn', locale)}</label>
                  <input
                    type="time"
                    value={formCheckIn}
                    onChange={e => setFormCheckIn(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    disabled={isEmployeeMode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">{getAttendanceText('modalClockOutDate', locale)}</label>
                  <input
                    type="date"
                    value={formCheckOutDate}
                    onChange={e => setFormCheckOutDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    disabled={isEmployeeMode}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">{getAttendanceText('modalClockOutTime', locale)}</label>
                  <input
                    type="time"
                    value={formCheckOutTime}
                    onChange={e => setFormCheckOutTime(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    disabled={isEmployeeMode}
                  />
                </div>
              </div>

              {/* Conditional Break Section */}
              <div className="p-3.5 bg-slate-50/50 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasBreak"
                    checked={formHasBreak}
                    onChange={e => setFormHasBreak(e.target.checked)}
                    className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                    disabled={isEmployeeMode}
                  />
                  <label htmlFor="hasBreak" className="text-xs font-bold text-slate-750 cursor-pointer disabled:text-slate-400">{getAttendanceText('modalHasBreak', locale)}</label>
                </div>
                
                {formHasBreak && (
                  <div className="grid grid-cols-2 gap-3.5 pl-6 border-l-2 border-blue-500/60 animate-fadeIn">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">{getAttendanceText('modalBreakStart', locale)}</label>
                      <input
                        type="time"
                        value={formBreakStart}
                        onChange={e => setFormBreakStart(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                        disabled={isEmployeeMode}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">{getAttendanceText('modalBreakEnd', locale)}</label>
                      <input
                        type="time"
                        value={formBreakEnd}
                        onChange={e => setFormBreakEnd(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                        disabled={isEmployeeMode}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Conditional Nakanuke (Split Shift) Section */}
              <div className="p-3.5 bg-slate-50/50 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="splitShift"
                    checked={formSplitShift}
                    onChange={e => setFormSplitShift(e.target.checked)}
                    className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                    disabled={isEmployeeMode}
                  />
                  <label htmlFor="splitShift" className="text-xs font-bold text-slate-750 cursor-pointer disabled:text-slate-400">{getAttendanceText('modalHasSplit', locale)}</label>
                </div>
                
                {formSplitShift && (
                  <div className="pl-6 border-l-2 border-orange-500/60 animate-fadeIn space-y-2">
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">{getAttendanceText('modalSplitHours', locale)}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={formNakanukeHours}
                        onChange={e => setFormNakanukeHours(parseFloat(e.target.value) || 0)}
                        className="w-24 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                        disabled={isEmployeeMode}
                      />
                      <span className="text-xs font-bold text-slate-500">{getAttendanceText('modalHoursUnit', locale)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">{getAttendanceText('modalStatus', locale)}</label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer disabled:bg-slate-50 disabled:text-slate-500"
                  disabled={isEmployeeMode}
                >
                  {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{getStatusLabel(opt.value)}</option>)}
                </select>
              </div>

              {/* Overtime Hours Input (with manual override control) */}
              <div className="p-4 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-650 dark:text-slate-350 uppercase">{getAttendanceText('modalOtLabel', locale)}</span>
                  <p className="text-[9px] text-slate-450 dark:text-slate-400 font-semibold">
                    {isManualOvertime ? getAttendanceText('modalOtManual', locale).replace('{hours}', String(calculatedOvertime)) : getAttendanceText('modalOtAuto', locale)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={formOvertimeHours}
                    onChange={e => {
                      setFormOvertimeHours(parseFloat(e.target.value) || 0);
                      setIsManualOvertime(true);
                    }}
                    className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900 rounded-lg text-center text-sm font-mono font-black text-orange-700 outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-slate-100 disabled:text-orange-500"
                    disabled={isEmployeeMode}
                  />
                  <span className="text-xs font-bold text-orange-700">h</span>
                  {isManualOvertime && !isEmployeeMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualOvertime(false);
                        setFormOvertimeHours(calculatedOvertime);
                      }}
                      className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:underline border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 rounded px-1.5 py-0.5 cursor-pointer"
                    >
                      {getAttendanceText('modalReset', locale)}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">{getAttendanceText('modalNotes', locale)}</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 resize-none disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder={getAttendanceText('modalNotesPlaceholder', locale)}
                  disabled={isEmployeeMode}
                />
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 pt-4 mt-6">
                {isEmployeeMode ? (
                  <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer text-center">{getAttendanceText('modalClose', locale)}</button>
                ) : (
                  <>
                    <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer">{getAttendanceText('modalCancel', locale)}</button>
                    <button type="submit" className="flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer">{getAttendanceText('modalSave', locale)}</button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}
    </>
  );
}
