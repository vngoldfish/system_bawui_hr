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
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount);
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
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
