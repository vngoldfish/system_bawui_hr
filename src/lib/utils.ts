import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to Japanese format (YYYY/MM/DD)
export function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// Format time to Japanese format (HH:mm)
export function formatTime(time: string | null): string {
  if (!time) return "-";
  const [hours, minutes] = time.split(":");
  return `${hours}:${minutes}`;
}

// Format currency to Japanese Yen
export function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount ?? 0);
}

/** Fixed ja-JP thousands separator — consistent SSR/client (avoids hydration mismatch). */
export function formatNumber(amount: number | null | undefined): string {
  return new Intl.NumberFormat("ja-JP").format(amount ?? 0);
}

// Calculate overtime hours
export function calculateOvertimeHours(
  checkIn: string | null,
  checkOut: string | null,
  breakStart: string | null,
  breakEnd: string | null
): number {
  if (!checkIn || !checkOut) return 0;

  const start = new Date(`2000-01-01T${checkIn}`);
  const end = new Date(`2000-01-01T${checkOut}`);
  let breakMinutes = 0;

  if (breakStart && breakEnd) {
    const breakStartDt = new Date(`2000-01-01T${breakStart}`);
    const breakEndDt = new Date(`2000-01-01T${breakEnd}`);
    breakMinutes = (breakEndDt.getTime() - breakStartDt.getTime()) / (1000 * 60);
  }

  const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  const workMinutes = totalMinutes - breakMinutes;
  const standardHours = 8 * 60; // 8 hours standard work day

  return Math.max(0, (workMinutes - standardHours) / 60);
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Get current month in YYYY-MM format
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Get current date in YYYY-MM-DD format
export function getCurrentDate(): string {
  return getJstDateString();
}

/** Calendar date in Asia/Tokyo — consistent between SSR and browser (avoids hydration mismatch). */
export function getJstDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(date);
}

/** Calendar month YYYY-MM in Asia/Tokyo. */
export function getJstMonthString(date: Date = new Date()): string {
  return getJstDateString(date).slice(0, 7);
}

/** Extract YYYY-MM-DD in Asia/Tokyo from an ISO timestamp or Date. */
export function dateOnlyJst(value: string | Date): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) {
    return typeof value === "string" ? value.split("T")[0] : "";
  }
  return getJstDateString(d);
}
