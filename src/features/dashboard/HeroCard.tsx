import { RingChart, cx } from '../../components/ui';
import { dailySafePace, type MonthSummary } from '../../domain/calc';
import { daysLeftInMonth, type DateStr, type MonthId } from '../../domain/dates';
import { formatPeso } from '../../domain/money';

interface HeroCardProps {
  monthId: MonthId;
  summary: MonthSummary;
  today: DateStr;
}

/** The one number that matters (safe to spend), a single spending ring, and spent / remaining. */
export function HeroCard({ monthId, summary, today }: HeroCardProps) {
  const daysLeft = daysLeftInMonth(monthId, today);
  const pace = dailySafePace(summary, daysLeft);
  const spent = summary.plannedExpenses > 0 ? summary.spentToDate / summary.plannedExpenses : 0;
  const over = summary.margin < 0;

  return (
    <section className="rounded-xl bg-surface-container-low p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{over ? 'Over plan by' : 'Safe to spend'}</p>
          <p className={cx('font-headline text-4xl font-bold leading-tight', over ? 'text-error' : 'text-on-surface')}>{formatPeso(Math.abs(summary.margin))}</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            {pace !== null && !over
              ? `About ${formatPeso(pace)} a day for the ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
              : daysLeft === 0
                ? 'This month has ended'
                : 'Trim a spending pool or add income to get back on plan'}
          </p>
        </div>
        <RingChart size={92} stroke={14} rings={[{ value: spent, color: spent > 1 ? 'var(--color-error)' : 'var(--color-primary)', label: `${Math.round(spent * 100)}% of planned spending used` }]}>
          <span className="text-base font-bold">{Math.round(spent * 100)}%</span>
          <span className="text-[0.75rem] leading-none text-on-surface-variant">spent</span>
        </RingChart>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-surface-container p-3">
          <p className="text-xs text-on-surface-variant">Spent so far</p>
          <p className="font-headline text-lg font-bold">{formatPeso(summary.spentToDate)}</p>
        </div>
        <div className="rounded-lg bg-surface-container p-3">
          <p className="text-xs text-on-surface-variant">Bills & pools left</p>
          <p className="font-headline text-lg font-bold">{formatPeso(summary.remainingToSettle)}</p>
        </div>
      </div>
    </section>
  );
}
