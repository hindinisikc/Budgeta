import { GroupedColumnChart } from '../../../components/charts/GroupedColumnChart';
import { SERIES_COLORS } from '../../../components/charts/chartUtils';
import type { MonthPoint } from '../../../db/hooks';
import { formatPeso, sum } from '../../../domain/money';
import { DataTable, ReportCard } from './ReportCard';
import { monthAxisLabels } from './labels';

/** Spending per month (one series). Income, savings and net are in the table view. */
export function TrendReport({ points }: { points: MonthPoint[] }) {
  const { labels, titles } = monthAxisLabels(points.map((p) => p.monthId));
  const active = points.filter((p) => p.started);
  const avgSpent = active.length ? Math.round(sum(active.map((p) => p.summary.spentToDate)) / active.length) : 0;

  return (
    <ReportCard
      title="Spending per month"
      subtitle={active.length ? `Average ${formatPeso(avgSpent)} a month` : 'No started months in this range'}
      table={
        <DataTable
          head={['Month', 'Income', 'Spent', 'Saved', 'Left']}
          rows={points.map((p, i) => {
            const s = p.summary;
            const left = s.incomeReceived + s.withdrawals - s.spentToDate - s.savingsContributed;
            return [titles[i], formatPeso(s.incomeReceived), formatPeso(s.spentToDate), formatPeso(s.savingsContributed), <span className={left < 0 ? 'text-error' : ''}>{formatPeso(left)}</span>];
          })}
        />
      }
    >
      <GroupedColumnChart
        labels={labels}
        titles={titles}
        series={[{ name: 'Spent', color: SERIES_COLORS[0], values: points.map((p) => p.summary.spentToDate) }]}
        ariaLabel="Spending per month"
      />
    </ReportCard>
  );
}
