import { Badge, IconChip, SectionHeader, toIconName } from '../../components/ui';
import type { Lookups } from '../../db/hooks';
import type { MonthSummary } from '../../domain/calc';
import { formatShortDate, type DateStr } from '../../domain/dates';
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
  const itemById = new Map(summary.items.map((s) => [s.item.id, s.item]));

  return (
    <section className="space-y-2.5">
      <SectionHeader title="Upcoming Bills" icon="event_upcoming" iconTone="tertiary" action={<span className="text-on-surface-variant">Next {days} days</span>} />
      {bills.length === 0 ? (
        <p className="rounded-xl bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant shadow-soft">No unpaid bills due in the next {days} days.</p>
      ) : (
        <div className="space-y-2">
          {bills.map((b) => {
            const item = itemById.get(b.id);
            const cat = item ? lookups.categoryById.get(item.categoryId) : undefined;
            const account = b.accountId ? lookups.accountById.get(b.accountId)?.name : undefined;
            const urgent = b.daysUntil <= 3;
            return (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low p-3.5 shadow-soft">
                <div className="flex min-w-0 items-center gap-3">
                  <IconChip icon={toIconName(cat?.icon ?? 'receipt_long')} tone={urgent ? 'error' : 'secondary'} look="soft" shape="rounded" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate font-headline text-sm font-bold">{b.name}</span>
                      <Badge tone={urgent ? 'error' : 'neutral'}>{dueLabel(b)}</Badge>
                    </p>
                    <p className="truncate text-xs text-on-surface-variant">{[formatShortDate(b.date), b.autoPay ? `Auto-pay${account ? ` via ${account}` : ''}` : account].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-headline text-sm font-bold">{formatPeso(b.amount)}</p>
                  <button type="button" onClick={() => onPay(b)} className="inline-flex min-h-11 items-center text-xs font-bold text-primary hover:underline">
                    {b.autoPay ? 'Confirm' : 'Pay Now'}
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
