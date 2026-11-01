import { Badge, Icon, ProgressBar, cx, type Tone } from '../../components/ui';
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
  /** Card body: open the item's details. */
  onOpen: () => void;
}

/** One budget line: checkbox, name, one status, amount. Details live in the sheet it opens. */
export function BudgetItemCard({ summary, account, today, dueSoonDays, onCheck, onOpen }: BudgetItemCardProps) {
  const { item, paid, state, overspent, underspent } = summary;
  const settled = state === 'settled';
  const due = dueBadge(item, today, dueSoonDays);

  // Exactly one status badge, most important first.
  const badge: { text: string; tone: Tone } | null = settled
    ? { text: 'Paid', tone: 'primary' }
    : due
      ? due
      : state === 'partial'
        ? { text: 'In progress', tone: 'tertiary' }
        : item.autoPay
          ? { text: 'Auto-debit', tone: 'neutral' }
          : null;

  const subtitle = [item.kind === 'bill' && item.dueDate ? `Due ${formatShortDate(item.dueDate)}` : item.kind === 'flexible' ? 'Spending pool' : '', account?.name]
    .filter(Boolean)
    .join(' · ');

  const amountNote = settled
    ? overspent > 0
      ? { text: `Over by ${formatPeso(overspent)}`, cls: 'text-error' }
      : underspent > 0
        ? { text: `Saved ${formatPeso(underspent)}`, cls: 'text-primary' }
        : { text: `of ${formatPeso(item.planned)}`, cls: 'text-on-surface-variant' }
    : paid > 0
      ? { text: `of ${formatPeso(item.planned)}`, cls: overspent > 0 ? 'text-error' : 'text-on-surface-variant' }
      : { text: 'planned', cls: 'text-on-surface-variant' };

  return (
    <article className="flex items-start gap-3 rounded-xl bg-surface-container-low p-4 shadow-soft">
      <button
        type="button"
        onClick={onCheck}
        aria-label={settled ? `Reopen ${item.name}` : `Record payment for ${item.name}`}
        className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <span
          className={cx(
            'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            settled ? 'bg-primary text-on-primary' : 'border-2 border-outline-variant bg-surface-container',
          )}
        >
          {settled && <Icon name="check" size={20} />}
        </span>
      </button>

      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left" aria-label={`${item.name} details`}>
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={cx('font-headline text-base font-bold leading-snug', settled && 'text-on-surface-variant line-through')}>{item.name}</span>
              {badge && <Badge tone={badge.tone}>{badge.text}</Badge>}
            </span>
            {subtitle && <span className="mt-0.5 block truncate text-xs text-on-surface-variant">{subtitle}</span>}
          </span>
          <span className="shrink-0 text-right">
            <span className={cx('block font-headline text-base font-bold', settled && 'text-primary')}>{formatPeso(paid > 0 || settled ? paid : item.planned)}</span>
            <span className={cx('block text-xs', amountNote.cls)}>{amountNote.text}</span>
          </span>
        </span>
        {state === 'partial' && item.kind === 'flexible' && (
          <ProgressBar value={summary.progress} tone={overspent > 0 ? 'error' : 'primary'} size="sm" className="mt-2.5" label={`${item.name} progress`} />
        )}
      </button>
    </article>
  );
}
