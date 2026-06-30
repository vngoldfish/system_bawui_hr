export const DEFAULT_AUTO_SCHEDULE_TIME_FROM = '08:00';
export const DEFAULT_AUTO_SCHEDULE_TIME_TO = '22:00';
export const DEFAULT_AUTO_SCHEDULE_BREAK_ENABLED = true;
export const DEFAULT_AUTO_SCHEDULE_BREAK_FROM = '12:00';
export const DEFAULT_AUTO_SCHEDULE_BREAK_TO = '13:00';
export const DEFAULT_AUTO_SCHEDULE_BREAK_MINUTES = 60;

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(totalMins: number): string {
  const nh = Math.floor(totalMins / 60) % 24;
  const nm = totalMins % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export function computeBreakEndFromMinutes(breakFrom: string, breakMinutes: number): string {
  return minutesToTime(timeToMinutes(breakFrom) + breakMinutes);
}