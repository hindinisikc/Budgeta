import { useState } from 'react';
import { PageHeading, SegmentedControl } from '../../components/ui';
import { HistoryView } from './HistoryView';
import { ReportsView } from './reports/ReportsView';

type Tab = 'history' | 'reports';

export function ActivityPage() {
  const [tab, setTab] = useState<Tab>('history');
  return (
    <>
      <PageHeading
       
        title="Activity"
        trailing={
          <SegmentedControl<Tab>
            label="View"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'history', label: 'History' },
              { value: 'reports', label: 'Reports' },
            ]}
          />
        }
      />
      {tab === 'history' ? <HistoryView /> : <ReportsView />}
    </>
  );
}
