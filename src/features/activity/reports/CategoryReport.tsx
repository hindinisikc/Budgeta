import { toIconName, Icon } from '../../../components/ui';
import type { Lookups, MonthRecords } from '../../../db/hooks';
import { formatMonthLabel, type MonthId } from '../../../domain/dates';
import { formatPeso, sum } from '../../../domain/money';
import { categoryOf } from '../TransactionRow';
import { ReportCard } from './ReportCard';

interface CategoryReportProps {
  monthId: MonthId;
  records: MonthRecords;
  lookups: Lookups;
}

/** Where the money went: ranked horizontal bars, one hue, largest first (planned + unplanned spending). */
export function CategoryReport({ monthId, records, lookups }: CategoryReportProps) {
  const itemById = new Map(records.items.map((i) => [i.id, i]));
  const totals = new Map<string, number>();
  for (const t of records.transactions) {
    if (t.type !== 'expense') continue;
    const key = categoryOf(t, itemById) ?? 'none';
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }
  const rows = [...totals.entries()].map(([id, amount]) => ({ id, amount, category: lookups.categoryById.get(id) })).sort((a, b) => b.amount - a.amount);
  const total = sum(rows.map((r) => r.amount));
  const max = rows[0]?.amount ?? 0;

  return (
    <ReportCard title="Where it went" subtitle={`${formatMonthLabel(monthId)} · includes unplanned spending`}>
      {rows.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No spending recorded this month.</p>
      ) : (
        <ul className="space-y-3" aria-label="Spending by category">
          {rows.map((r) => (
            <li key={r.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Icon name={toIconName(r.category?.icon ?? 'category')} size={16} className="text-on-surface-variant" />
                  <span className="truncate font-semibold">{r.category?.name ?? 'Uncategorized'}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  <strong>{formatPeso(r.amount)}</strong>
                  <span className="ml-1.5 text-xs text-on-surface-variant">{total ? Math.round((r.amount / total) * 100) : 0}%</span>
                </span>
              </div>
              <div className="h-2.5 w-full" aria-hidden>
                <div className="h-full rounded-r-[4px] bg-[var(--color-viz-1)]" style={{ width: `${max ? Math.max((r.amount / max) * 100, 1) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 0 && (
        <p className="flex justify-between border-t border-outline-variant/60 pt-2 text-sm font-bold">
          <span>Total spent</span>
          <span className="tabular-nums">{formatPeso(total)}</span>
        </p>
      )}
    </ReportCard>
  );
}
