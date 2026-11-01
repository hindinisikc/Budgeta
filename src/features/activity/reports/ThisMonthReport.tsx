import { StatTile } from '../../../components/ui';
import type { MonthSummary } from '../../../domain/calc';
import { formatMonthLabel, type MonthId } from '../../../domain/dates';
import { formatPeso, formatPesoCompact } from '../../../domain/money';
import { ReportCard } from './ReportCard';

interface ThisMonthReportProps {
  monthId: MonthId;
  summary: MonthSummary;
}

/** In / out / saved, then only the budget lines that went off plan. */
export function ThisMonthReport({ monthId, summary }: ThisMonthReportProps) {
  const offPlan = summary.items
    .filter((s) => s.overspent > 0 || s.underspent > 0)
    .sort((a, b) => b.overspent - a.overspent || b.underspent - a.underspent);

  return (
    <>
      <div className="grid grid-cols-3 gap-2.5">
        <StatTile label="In" value={formatPesoCompact(summary.incomeReceived)} caption="received" />
        <StatTile label="Out" value={formatPesoCompact(summary.spentToDate)} caption="spent" />
        <StatTile label="Saved" value={formatPesoCompact(summary.savingsContributed)} caption="to goals" />
      </div>

      <ReportCard title="Off plan" subtitle={`${formatMonthLabel(monthId)} · lines that ended over or under`}>
        {offPlan.length === 0 && summary.unplannedSpent === 0 ? (
          <p className="text-sm text-on-surface-variant">Everything is on plan so far.</p>
        ) : (
          <ul className="divide-y divide-surface-container text-sm">
            {offPlan.map((s) => (
              <li key={s.item.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate font-semibold">{s.item.name}</span>
                {s.overspent > 0 ? (
                  <span className="shrink-0 font-semibold text-error tabular-nums">Over {formatPeso(s.overspent)}</span>
                ) : (
                  <span className="shrink-0 font-semibold text-primary tabular-nums">Saved {formatPeso(s.underspent)}</span>
                )}
              </li>
            ))}
            {summary.unplannedSpent > 0 && (
              <li className="flex items-center justify-between gap-3 py-2">
                <span className="font-semibold">Unplanned spending</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatPeso(summary.unplannedSpent)}</span>
              </li>
            )}
          </ul>
        )}
      </ReportCard>
    </>
  );
}
