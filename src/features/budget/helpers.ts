import type { Tone } from '../../components/ui';
import { daysBetween, daysInMonth, monthOf, type DateStr, type MonthId } from '../../domain/dates';
import type { Centavos } from '../../domain/money';
import type { Account, BudgetItem, Category } from '../../domain/types';

/** Centavos → editable text ("10000", "9650.5"). Empty for zero. */
export function amountToInput(value: Centavos): string {
  if (value <= 0) return '';
  return value % 100 === 0 ? String(value / 100) : (value / 100).toFixed(2);
}

/** Today when it falls in the month; otherwise the month's last day (past) or first day (future). */
export function defaultDateIn(monthId: MonthId, today: DateStr): DateStr {
  if (monthOf(today) === monthId) return today;
  return monthId < monthOf(today) ? `${monthId}-${String(daysInMonth(monthId)).padStart(2, '0')}` : `${monthId}-01`;
}

export function monthBounds(monthId: MonthId): { min: DateStr; max: DateStr } {
  return { min: `${monthId}-01`, max: `${monthId}-${String(daysInMonth(monthId)).padStart(2, '0')}` };
}

/** "Due in 4 days" / "Due today" / "Overdue 2 days" for unpaid bills with a due date. */
export function dueBadge(item: BudgetItem, today: DateStr, dueSoonDays: number): { text: string; tone: Tone } | null {
  if (item.kind !== 'bill' || !item.dueDate || item.settled) return null;
  const days = daysBetween(today, item.dueDate);
  if (days < 0) return { text: `Overdue ${-days} day${days === -1 ? '' : 's'}`, tone: 'error' };
  if (days === 0) return { text: 'Due today', tone: 'error' };
  if (days <= dueSoonDays) return { text: `Due in ${days} day${days === 1 ? '' : 's'}`, tone: 'error' };
  return null;
}

/** Active options plus the currently selected one even if it has since been archived. */
export function labelOptions<T extends Category | Account>(labels: T[], currentId: string | null): T[] {
  return labels.filter((l) => !l.archived || l.id === currentId);
}
