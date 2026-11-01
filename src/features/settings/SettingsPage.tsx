import { PageHeading } from '../../components/ui';
import { DataSection } from '../backup/DataSection';
import { ACCOUNT_ICONS, CATEGORY_ICONS } from './iconOptions';
import { LabelSection } from './LabelSection';

export function SettingsPage() {
  return (
    <>
      <PageHeading title="Settings" />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <DataSection />
        <LabelSection kind="category" title="Categories" icons={CATEGORY_ICONS} />
        <LabelSection kind="account" title="Accounts" icons={ACCOUNT_ICONS} />
      </div>
    </>
  );
}
