import { useState } from 'react';
import { Link } from 'react-router';
import { Badge, EmptyState, IconChip, PageHeading, SectionHeader } from '../../components/ui';
import { useDueEntries, useLookups } from '../../db/hooks';
import { formatShortDate } from '../../domain/dates';
import { dueLabel, type DueEntry } from '../../domain/due';
import { formatPeso } from '../../domain/money';
import { DueEntrySheets } from '../budget/DueEntrySheets';

/** In-app reminders: overdue bills, bills due soon, and expected income not yet received. */
export function NotificationsPage() {
  const due = useDueEntries();
  const lookups = useLookups();
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState<DueEntry | null>(null);

  if (!due || !lookups) return <PageHeading title="Notifications" />;

  const overdue = due.filter((d) => d.daysUntil < 0);
  const soon = due.filter((d) => d.daysUntil >= 0);
  const act = (d: DueEntry) => {
    setEntry(d);
    setOpen(true);
  };

  const list = (entries: DueEntry[]) => (
    <ul className="divide-y divide-surface-container overflow-hidden rounded-xl bg-surface-container-low shadow-soft">
      {entries.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 p-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <IconChip icon={d.kind === 'income' ? 'payments' : 'receipt_long'} tone={d.daysUntil < 0 ? 'error' : d.kind === 'income' ? 'primary' : 'tertiary'} look="soft" shape="rounded" />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="truncate font-headline text-sm font-bold">{d.name}</span>
                <Badge tone={d.daysUntil < 0 ? 'error' : d.daysUntil <= 1 ? 'tertiary' : 'neutral'}>{dueLabel(d)}</Badge>
              </p>
              <p className="truncate text-xs text-on-surface-variant">
                {formatShortDate(d.date)}
                {d.accountId && lookups.accountById.get(d.accountId) ? ` · ${lookups.accountById.get(d.accountId)!.name}` : ''}
                {d.autoPay ? ' · Auto-debit' : ''}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-headline text-sm font-bold">{formatPeso(d.amount)}</p>
            <button type="button" onClick={() => act(d)} className="inline-flex min-h-9 items-center text-xs font-bold text-primary hover:underline">
              {d.kind === 'income' ? 'Mark received' : d.autoPay ? 'Confirm paid' : 'Pay now'}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <PageHeading title="Notifications" />
      {due.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title="All caught up"
          message={`Nothing is overdue or due in the next ${lookups.settings.dueSoonDays} days.`}
          action={
            <Link to="/budget" className="text-sm font-bold text-primary hover:underline">
              View budget
            </Link>
          }
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {overdue.length > 0 && (
            <section className="min-w-0 space-y-2.5">
              <SectionHeader title="Overdue" icon="info" iconTone="error" action={<span className="text-on-surface-variant">{overdue.length}</span>} />
              {list(overdue)}
            </section>
          )}
          {soon.length > 0 && (
            <section className="min-w-0 space-y-2.5">
              <SectionHeader
                title="Coming up"
                icon="event_upcoming"
                iconTone="tertiary"
                action={<span className="text-on-surface-variant">Next {lookups.settings.dueSoonDays} days</span>}
              />
              {list(soon)}
            </section>
          )}
        </div>
      )}
      <DueEntrySheets entry={entry} open={open} onClose={() => setOpen(false)} lookups={lookups} />
    </>
  );
}
