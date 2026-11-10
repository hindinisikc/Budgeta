import { AnimatedPeso, Icon, ProgressBar, cx } from '../../components/ui';
import type { MonthSummary } from '../../domain/calc';

interface BudgetSummaryCardProps {
  summary: MonthSummary;
  closed: boolean;
  /** Shown at the top when the month is closed. */
  closedText: string;
  onClose: () => void;
  onReopen: () => void;
}

/** Planned / paid / still to pay, plus Safe to spend and close / reopen. The month itself is in the header. */
export function BudgetSummaryCard({ summary, closed, closedText, onClose, onReopen }: BudgetSummaryCardProps) {
  const paidShare = summary.plannedExpenses > 0 ? summary.paidToDate / summary.plannedExpenses : 0;
  return (
    <section className="rounded-xl bg-surface-container-low p-5 shadow-soft">
      {closed && (
        <p className="mb-3 flex items-start gap-1.5 text-sm text-on-surface-variant">
          <Icon name="lock" size={16} className="mt-0.5 shrink-0" /> Closed. {closedText}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Planned', value: summary.plannedExpenses, cls: '' },
          { label: 'Paid', value: summary.paidToDate, cls: 'text-primary' },
          { label: 'Still to pay', value: summary.remainingToSettle, cls: '' },
        ].map((x) => (
          <div key={x.label} className="min-w-0">
            <p className="text-sm text-on-surface-variant">{x.label}</p>
            <p className={cx('truncate text-lg font-semibold', x.cls)}><AnimatedPeso value={x.value} /></p>
          </div>
        ))}
      </div>
      <ProgressBar value={paidShare} className="mt-3" label={`${Math.round(paidShare * 100)}% of planned paid`} />

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm text-on-surface-variant">
          Safe to spend <strong className={cx('font-semibold', summary.margin < 0 ? 'text-error' : 'text-on-surface')}><AnimatedPeso value={summary.margin} /></strong>
        </span>
        <button type="button" onClick={closed ? onReopen : onClose} className="-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-primary">
          <Icon name={closed ? 'lock_open' : 'lock'} size={18} /> {closed ? 'Reopen month' : 'Close month'}
        </button>
      </div>
    </section>
  );
}
