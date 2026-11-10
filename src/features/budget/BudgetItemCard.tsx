import { useEffect, useRef } from 'react';
import { Icon, ProgressBar, cx } from '../../components/ui';
import type { ItemSummary } from '../../domain/calc';
import { formatShortDate, type DateStr } from '../../domain/dates';
import { formatPeso } from '../../domain/money';
import type { Account } from '../../domain/types';
import { dueBadge } from './helpers';

interface BudgetItemCardProps {
  summary: ItemSummary;
  account: Account | undefined;
  today: DateStr;
  dueSoonDays: number;
  /** Checkbox: record a payment (open items) or reopen (settled items). */
  onCheck: () => void;
  /** Row body: open the item's details. */
  onOpen: () => void;
  /** Position in the list, for a slight cascade when the list appears. */
  index?: number;
}

/** One budget line as a list row: checkbox, name, one line of detail, amount. Details live in the sheet it opens. */
export function BudgetItemCard({ summary, account, today, dueSoonDays, onCheck, onOpen, index = 0 }: BudgetItemCardProps) {
  const { item, paid, state, overspent, underspent } = summary;
  const settled = state === 'settled';
  // Pop the tick only when the item becomes paid, not every time the list appears.
  const wasSettled = useRef(settled);
  const justSettled = settled && !wasSettled.current;
  useEffect(() => {
    wasSettled.current = settled;
  }, [settled]);
  // "Due in 2 days" replaces the plain due date when it's close; no separate pill.
  const due = !settled ? dueBadge(item, today, dueSoonDays) : null;

  const subtitle = [
    due ? due.text : item.kind === 'bill' && item.dueDate ? `Due ${formatShortDate(item.dueDate)}` : item.kind === 'flexible' ? 'Budget' : '',
    item.autoPay && !settled ? 'Auto-debit' : '',
    account?.name,
  ]
    .filter(Boolean)
    .join(' · ');

  const amountNote = settled
    ? overspent > 0
      ? { text: `Over by ${formatPeso(overspent)}`, cls: 'text-error' }
      : underspent > 0
        ? { text: `Saved ${formatPeso(underspent)}`, cls: 'text-primary' }
        : null
    : paid > 0
      ? { text: `of ${formatPeso(item.planned)}`, cls: overspent > 0 ? 'text-error' : 'text-on-surface-variant' }
      : null;

  return (
    <article
      className="flex animate-item-in items-center gap-1 py-1 pl-2 pr-4 transition-colors active:bg-surface-container/60"
      style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
    >
      <button
        type="button"
        onClick={onCheck}
        aria-label={settled ? `Reopen ${item.name}` : `Record payment for ${item.name}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <span
          className={cx(
            'flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 active:scale-90',
            settled ? 'bg-primary text-on-primary' : 'border-2 border-outline-variant',
            justSettled && 'animate-pop',
          )}
        >
          {settled && <Icon name="check" size={16} />}
        </span>
      </button>

      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-2 text-left" aria-label={`${item.name} details`}>
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className={cx('block truncate font-medium transition-colors duration-300', settled && 'text-on-surface-variant line-through')}>{item.name}</span>
            {subtitle && <span className={cx('block truncate text-sm', due ? 'font-medium text-error' : 'text-on-surface-variant')}>{subtitle}</span>}
          </span>
          <span className="shrink-0 text-right">
            <span className={cx('block font-semibold', settled && 'text-on-surface-variant')}>{formatPeso(paid > 0 || settled ? paid : item.planned)}</span>
            {amountNote && <span className={cx('block text-sm', amountNote.cls)}>{amountNote.text}</span>}
          </span>
        </span>
        {state === 'partial' && item.kind === 'flexible' && (
          <ProgressBar value={summary.progress} tone={overspent > 0 ? 'error' : 'primary'} size="sm" className="mt-2" label={`${item.name} progress`} />
        )}
      </button>
    </article>
  );
}
