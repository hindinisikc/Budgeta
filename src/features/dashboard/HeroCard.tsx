import { AnimatedPeso, Badge, ProgressBar, cx } from '../../components/ui';
import { dailySafePace, type MonthSummary } from '../../domain/calc';
import { daysLeftInMonth, monthElapsedFraction, type DateStr, type MonthId } from '../../domain/dates';
import { formatPeso } from '../../domain/money';
import { PACE_LABEL, paceStatus } from '../../domain/status';

const PACE_TONE = { on_track: 'primary', watch: 'tertiary', over: 'error' } as const;

interface HeroCardProps {
  monthId: MonthId;
  summary: MonthSummary;
  today: DateStr;
}

/** The one number that matters (safe to spend), how much of the plan is spent, and what's still to pay. */
export function HeroCard({ monthId, summary, today }: HeroCardProps) {
  const daysLeft = daysLeftInMonth(monthId, today);
  const rawPace = dailySafePace(summary, daysLeft);
  const pace = rawPace === null ? null : Math.floor(rawPace / 100) * 100; // whole pesos: centavos are noise here
  const spent = summary.plannedExpenses > 0 ? summary.spentToDate / summary.plannedExpenses : 0;
  const over = summary.margin < 0;
  const status = paceStatus(summary, monthElapsedFraction(monthId, today));

  return (
    <section className="rounded-xl bg-surface-container-low p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-on-surface-variant">{over ? 'Over plan by' : 'Safe to spend'}</p>
        <Badge tone={PACE_TONE[status]}>{PACE_LABEL[status]}</Badge>
      </div>
      <p className={cx('mt-1 text-4xl font-bold tracking-tight', over && 'text-error')}><AnimatedPeso value={Math.abs(summary.margin)} fromZero /></p>
      <p className="mt-1 text-sm text-on-surface-variant">
        {pace !== null && !over
          ? `About ${formatPeso(pace)} a day for everyday things · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
          : daysLeft === 0
            ? 'This month has ended'
            : 'Lower a budget or add income to get back on plan'}
      </p>

      <ProgressBar value={spent} tone={spent > 1 ? 'error' : 'primary'} className="mt-5" label={`${Math.round(spent * 100)}% of planned spending used`} />
      <div className="mt-2.5 flex justify-between gap-3 text-sm">
        <span className="text-on-surface-variant">
          Spent <strong className="font-semibold text-on-surface"><AnimatedPeso value={summary.spentToDate} /></strong>
        </span>
        <span className="text-on-surface-variant">
          Still to pay <strong className="font-semibold text-on-surface"><AnimatedPeso value={summary.remainingToSettle} /></strong>
        </span>
      </div>
    </section>
  );
}
