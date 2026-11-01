import { useMemo, useState } from 'react';
import { SegmentedControl } from '../../../components/ui';
import { useLookups, useMonthRange, useMonthRecords } from '../../../db/hooks';
import { summarizeMonth } from '../../../domain/calc';
import { useUi } from '../../../state/ui';
import { CategoryReport } from './CategoryReport';
import { ThisMonthReport } from './ThisMonthReport';
import { TrendReport } from './TrendReport';

type View = 'month' | 'trends';
type Range = '6' | '12';

/** Two simple views: the month picked in the header, and spending over recent months. */
export function ReportsView() {
  const { selectedMonth } = useUi();
  const [view, setView] = useState<View>('month');
  const [range, setRange] = useState<Range>('6');
  const records = useMonthRecords(selectedMonth);
  const lookups = useLookups();
  const points = useMonthRange(selectedMonth, Number(range));
  const summary = useMemo(() => (records ? summarizeMonth(records) : null), [records]);

  if (!records || !lookups || !points || !summary) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl<View>
          label="Report"
          value={view}
          onChange={setView}
          options={[
            { value: 'month', label: 'This month' },
            { value: 'trends', label: 'Trends' },
          ]}
        />
        {view === 'trends' && (
          <SegmentedControl<Range>
            label="Range"
            value={range}
            onChange={setRange}
            options={[
              { value: '6', label: '6 mo' },
              { value: '12', label: '12 mo' },
            ]}
          />
        )}
      </div>

      {view === 'month' ? (
        <>
          <ThisMonthReport monthId={selectedMonth} summary={summary} />
          <CategoryReport monthId={selectedMonth} records={records} lookups={lookups} />
        </>
      ) : (
        <TrendReport points={points} />
      )}
    </div>
  );
}
