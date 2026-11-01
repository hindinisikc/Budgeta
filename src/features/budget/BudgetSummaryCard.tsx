import { Icon, cx } from '../../components/ui';
import type { MonthSummary } from '../../domain/calc';
import { formatMonthLabel, type MonthId } from '../../domain/dates';
import { formatPeso } from '../../domain/money';

interface BudgetSummaryCardProps {
  monthId: MonthId;
  summary: MonthSummary;
  closed: boolean;
  /** Shown under the title when the month is closed. */
  closedText: string;
  onClose: () => void;
  onReopen: () => void;
}

/** Planned / paid / remaining, plus the month's Margin and close / reopen action. */
export function BudgetSummaryCard({ monthId, summary, closed, closedText, onClose, onReopen }: BudgetSummaryCardProps) {
  return (
    <section className="rounded-xl bg-surface-container-low p-5 shadow-soft">
      <h2 className="font-headline text-2xl font-bold leading-tight">{formatMonthLabel(monthId)}</h2>
      {closed && (
        <p className="mt-1 flex items-start gap-1.5 text-sm text-on-surface-variant">
          <Icon name="lock" size={16} className="mt-0.5 shrink-0" /> Closed. {closedText}
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Planned', value: summary.plannedExpenses, cls: '' },
          { label: 'Paid', value: summary.paidToDate, cls: 'text-primary' },
          { label: 'Remaining', value: summary.remainingToSettle, cls: 'text-tertiary' },
        ].map((x) => (
          <div key={x.label} className="min-w-0">
            <p className="text-xs text-on-surface-variant">{x.label}</p>
            <p className={cx('truncate font-headline text-lg font-bold', x.cls)}>{formatPeso(x.value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-surface-container pt-3">
        <span className="text-sm text-on-surface-variant">
          Margin <strong className={summary.margin < 0 ? 'text-error' : 'text-primary'}>{formatPeso(summary.margin)}</strong>
        </span>
        <button type="button" onClick={closed ? onReopen : onClose} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary">
          <Icon name={closed ? 'lock_open' : 'lock'} size={18} /> {closed ? 'Reopen month' : 'Close month'}
        </button>
      </div>
    </section>
  );
}
