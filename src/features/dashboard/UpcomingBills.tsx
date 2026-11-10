import { SectionHeader, cx } from '../../components/ui';
import type { Lookups } from '../../db/hooks';
import type { MonthSummary } from '../../domain/calc';
import type { DateStr } from '../../domain/dates';
import { dueEntries, dueLabel, type DueEntry } from '../../domain/due';
import { formatPeso } from '../../domain/money';

interface UpcomingBillsProps {
  summary: MonthSummary;
  lookups: Lookups;
  today: DateStr;
  onPay: (entry: DueEntry) => void;
}

export function UpcomingBills({ summary, lookups, today, onPay }: UpcomingBillsProps) {
  const days = lookups.settings.dueSoonDays;
  const bills = dueEntries(summary.items, [], today, days);

  return (
    <section className="space-y-2.5">
      <SectionHeader title="Coming up" action={<span className="font-normal text-on-surface-variant">Next {days} days</span>} />
      {bills.length === 0 ? (
        <p className="rounded-xl bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant shadow-soft">No unpaid bills due in the next {days} days.</p>
      ) : (
        <div className="divide-y divide-surface-container overflow-hidden rounded-xl bg-surface-container-low shadow-soft">
          {bills.map((b) => {
            const account = b.accountId ? lookups.accountById.get(b.accountId)?.name : undefined;
            const urgent = b.daysUntil <= 3;
            return (
              <div key={b.id} className="flex animate-item-in items-center justify-between gap-3 py-2 pl-4 pr-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{b.name}</p>
                  <p className="truncate text-sm text-on-surface-variant">
                    <span className={cx(urgent && 'font-medium text-error')}>{dueLabel(b)}</span>
                    {b.autoPay ? ` · Auto-pay${account ? ` via ${account}` : ''}` : account ? ` · ${account}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="font-semibold">{formatPeso(b.amount)}</span>
                  <button type="button" onClick={() => onPay(b)} className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-primary hover:bg-primary-fixed">
                    {b.autoPay ? 'Confirm' : 'Pay'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
