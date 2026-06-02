export function applyRounding(
  dateVal: Date | string | null | undefined,
  policy: string,
  roundUp: boolean
): Date | null {
  if (!dateVal) return null;
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return null;

  if (policy === 'exact' || !policy) {
    return date;
  }

  // Support 10min, 15min, and 30min rounding policies
  const interval = policy === '30min' ? 30 : policy === '10min' ? 10 : 15;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  let roundedMinutes = minutes;
  if (roundUp) {
    const totalFraction = minutes + seconds / 60;
    roundedMinutes = Math.ceil(totalFraction / interval) * interval;
  } else {
    roundedMinutes = Math.floor(minutes / interval) * interval;
  }

  const newDate = new Date(date.getTime());
  newDate.setMinutes(roundedMinutes, 0, 0);
  return newDate;
}

export function calculateRecordWorkHours(
  checkIn: string | Date | null,
  checkOut: string | Date | null,
  breakStart: string | Date | null,
  breakEnd: string | Date | null,
  policy: string
): number {
  if (!checkIn || !checkOut) return 0;

  const rCheckIn = applyRounding(checkIn, policy, true);
  const rCheckOut = applyRounding(checkOut, policy, false);

  if (!rCheckIn || !rCheckOut) return 0;
  let durationMins = (rCheckOut.getTime() - rCheckIn.getTime()) / (1000 * 60);

  if (breakStart && breakEnd) {
    const rBreakStart = applyRounding(breakStart, policy, true);
    const rBreakEnd = applyRounding(breakEnd, policy, false);
    if (rBreakStart && rBreakEnd) {
      durationMins -= (rBreakEnd.getTime() - rBreakStart.getTime()) / (1000 * 60);
    }
  }

  return Math.max(0, durationMins / 60);
}

export function isContractWorkDay(workDaysJson: any, dateStr: string): boolean {
  let workDays = [1, 2, 3, 4, 5]; // Default Mon-Fri
  if (workDaysJson != null) {
    try {
      workDays = typeof workDaysJson === 'string' ? JSON.parse(workDaysJson) : workDaysJson;
    } catch (e) {
      // Fallback if JSON parsing fails
    }
  }
  
  // Parse dateStr in a local timezone safe way or absolute
  // standard format YYYY-MM-DD
  const dateParts = dateStr.split('-');
  if (dateParts.length === 3) {
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    const d = new Date(year, month, day);
    return workDays.includes(d.getDay());
  }
  
  const d = new Date(dateStr);
  return workDays.includes(d.getDay());
}

export function calculateContractAwareOvertime(
  record: {
    checkIn: string | Date | null;
    checkOut: string | Date | null;
    breakStart: string | Date | null;
    breakEnd: string | Date | null;
    date: string | Date;
  } | null | undefined,
  contract: {
    workDays: any;
    standardHoursPerDay: number;
    holidayWorkCountsAsOvertime: boolean;
  } | null,
  holiday: { isActive: boolean; date: string | Date } | null,
  policy: string
): number {
  if (!record) return 0;
  const workHours = calculateRecordWorkHours(
    record.checkIn,
    record.checkOut,
    record.breakStart,
    record.breakEnd,
    policy
  );
  if (workHours <= 0) return 0;

  // Format date to JST YYYY-MM-DD
  const d = typeof record.date === 'string' ? new Date(record.date) : record.date;
  const jstStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(d);
  const dayStr = jstStr.split('T')[0];

  const contractWorkDay = isContractWorkDay(contract?.workDays, dayStr);
  const holidayCountsAsOvertime = !!holiday && holiday.isActive && (contract?.holidayWorkCountsAsOvertime ?? true);

  if (holidayCountsAsOvertime || !contractWorkDay) {
    return Math.round(workHours * 10) / 10;
  }

  const standard = contract?.standardHoursPerDay ?? 8;
  return Math.max(0, Math.round((workHours - standard) * 10) / 10);
}
