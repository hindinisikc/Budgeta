import { PageHeading } from '../../components/ui';
import { DataSection } from '../backup/DataSection';
import { IncomeTimingSection } from './IncomeTimingSection';
import { ACCOUNT_ICONS, CATEGORY_ICONS } from './iconOptions';
import { LabelSection } from './LabelSection';

export function SettingsPage() {
  return (
    <>
      <PageHeading title="Settings" />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <DataSection />
          <IncomeTimingSection />
        </div>
        <LabelSection kind="category" title="Categories" icons={CATEGORY_ICONS} />
        <LabelSection kind="account" title="Accounts" icons={ACCOUNT_ICONS} />
      </div>
    </>
  );
}
