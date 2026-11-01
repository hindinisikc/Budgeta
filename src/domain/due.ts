import type { IncomeSummary, ItemSummary } from './calc';
import { daysBetween, type DateStr, type MonthId } from './dates';
import type { Centavos } from './money';

export interface DueEntry {
  kind: 'bill' | 'income';
  id: string;
  monthId: MonthId;
  name: string;
  date: DateStr;
  /** Still to pay (bills) or still to receive (income). */
  amount: Centavos;
  /** Negative = overdue / late. */
  daysUntil: number;
  autoPay: boolean;
  accountId: string | null;
}

/**
 * Unsettled bills and not-yet-received income whose date is past or within `windowDays`.
 * Spending pools have no due date and never appear.
 */
export function dueEntries(items: ItemSummary[], income: IncomeSummary[], today: DateStr, windowDays: number): DueEntry[] {
  const out: DueEntry[] = [];
  for (const s of items) {
    const { item } = s;
    if (item.kind !== 'bill' || item.settled || !item.dueDate || s.remaining <= 0) continue;
    const daysUntil = daysBetween(today, item.dueDate);
    if (daysUntil > windowDays) continue;
    out.push({ kind: 'bill', id: item.id, monthId: item.monthId, name: item.name, date: item.dueDate, amount: s.remaining, daysUntil, autoPay: item.autoPay, accountId: item.accountId });
  }
  for (const s of income) {
    const { income: line } = s;
    if (s.isReceived || !line.expectedDate) continue;
    const daysUntil = daysBetween(today, line.expectedDate);
    if (daysUntil > windowDays) continue;
    out.push({ kind: 'income', id: line.id, monthId: line.monthId, name: line.name, date: line.expectedDate, amount: line.expected, daysUntil, autoPay: false, accountId: line.accountId });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

/** "Due today", "Due in 3 days", "3 days overdue" / income: "Expected today", "2 days late". */
export function dueLabel(e: Pick<DueEntry, 'kind' | 'daysUntil'>): string {
  const n = Math.abs(e.daysUntil);
  const days = `${n} day${n === 1 ? '' : 's'}`;
  if (e.kind === 'income') return e.daysUntil === 0 ? 'Expected today' : e.daysUntil > 0 ? `Expected in ${days}` : `${days} late`;
  return e.daysUntil === 0 ? 'Due today' : e.daysUntil > 0 ? `Due in ${days}` : `${days} overdue`;
}
