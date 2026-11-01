/**
 * Dates are stored as local calendar strings, never as timestamps, so a transaction
 * entered at 11:30 PM can't drift into the next day/month through timezone conversion.
 */

/** Month id `YYYY-MM`. */
export type MonthId = string;
/** Calendar date `YYYY-MM-DD`. */
export type DateStr = string;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const pad = (n: number) => String(n).padStart(2, '0');

// ---- Months ---------------------------------------------------------------

export function toMonthId(year: number, monthIndex: number): MonthId {
  return `${year}-${pad(monthIndex + 1)}`;
}

export function currentMonthId(now: Date = new Date()): MonthId {
  return toMonthId(now.getFullYear(), now.getMonth());
}

export function isValidMonthId(id: string): boolean {
  const m = /^(\d{4})-(\d{2})$/.exec(id);
  return !!m && Number(m[2]) >= 1 && Number(m[2]) <= 12;
}

export function parseMonthId(id: MonthId): { year: number; monthIndex: number } {
  const [y, m] = id.split('-');
  return { year: Number(y), monthIndex: Number(m) - 1 };
}

export function addMonths(id: MonthId, delta: number): MonthId {
  const { year, monthIndex } = parseMonthId(id);
  const total = year * 12 + monthIndex + delta;
  return toMonthId(Math.floor(total / 12), ((total % 12) + 12) % 12);
}

export function daysInMonth(id: MonthId): number {
  const { year, monthIndex } = parseMonthId(id);
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function monthName(monthIndex: number, short = false): string {
  const name = MONTH_NAMES[monthIndex] ?? '';
  return short ? name.slice(0, 3) : name;
}

export function formatMonthLabel(id: MonthId): string {
  const { year, monthIndex } = parseMonthId(id);
  return `${monthName(monthIndex)} ${year}`;
}

// ---- Days -----------------------------------------------------------------

export function toDateStr(d: Date): DateStr {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(now: Date = new Date()): DateStr {
  return toDateStr(now);
}

export function isValidDateStr(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(`${m[1]}-${m[2]}`);
}

/** Month a date belongs to: "2026-10-31" → "2026-10". */
export function monthOf(date: DateStr): MonthId {
  return date.slice(0, 7);
}

export function dayOf(date: DateStr): number {
  return Number(date.slice(8, 10));
}

/** Due date for a recurring "day of month"; clamps 29–31 to the month's last day (e.g. 31 → Feb 28). */
export function dueDateFor(id: MonthId, dueDay: number): DateStr {
  const day = Math.min(Math.max(1, Math.trunc(dueDay)), daysInMonth(id));
  return `${id}-${pad(day)}`;
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: DateStr, to: DateStr): number {
  const a = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, dayOf(from));
  const b = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, dayOf(to));
  return Math.round((b - a) / 86_400_000);
}

/** Days left in a month counting today. Past month → 0, future month → all of its days. */
export function daysLeftInMonth(id: MonthId, today: DateStr): number {
  const current = monthOf(today);
  if (id < current) return 0;
  if (id > current) return daysInMonth(id);
  return daysInMonth(id) - dayOf(today) + 1;
}

/** Share of the month already elapsed, counting today as elapsed (0..1). */
export function monthElapsedFraction(id: MonthId, today: DateStr): number {
  const current = monthOf(today);
  if (id < current) return 1;
  if (id > current) return 0;
  return dayOf(today) / daysInMonth(id);
}

/** "Oct 12" */
export function formatShortDate(date: DateStr): string {
  return `${monthName(Number(date.slice(5, 7)) - 1, true)} ${dayOf(date)}`;
}
