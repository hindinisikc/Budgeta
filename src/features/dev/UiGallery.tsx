import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconChip,
  ListRow,
  PageHeading,
  ProgressBar,
  RingChart,
  SectionHeader,
  SegmentedBar,
  Sheet,
  StatTile,
} from '../../components/ui';

/** Dev-only (#/dev/ui): base components rendered with mockup sample data for visual checks. */
export default function UiGallery() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <PageHeading title="UI Gallery" trailing={<Badge tone="primary" icon="eco_fill">On Track</Badge>} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card padding="lg">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <RingChart
              rings={[
                { value: 0.6, color: 'var(--color-primary)', label: 'Expenses paid 60%' },
                { value: 0.67, color: 'var(--color-primary-container)', label: 'Savings 67%' },
                { value: 0.45, color: 'var(--color-tertiary-container)', label: 'Month elapsed 45%' },
              ]}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Pace</span>
              <span className="font-headline text-sm font-bold text-primary">Good</span>
            </RingChart>
            <div className="w-full flex-1 space-y-2.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-on-surface-variant">Monthly Outflow</span>
                <span className="font-semibold">₱38,420 / ₱64,000</span>
              </div>
              <ProgressBar value={0.6} label="Monthly outflow" />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-lg bg-surface-container p-2.5">
                  <span className="text-xs text-on-surface-variant">Spent to date</span>
                  <p className="font-headline text-base font-bold">₱38,420</p>
                </div>
                <div className="rounded-lg bg-surface-container p-2.5">
                  <span className="text-xs text-on-surface-variant">Remaining</span>
                  <p className="font-headline text-base font-bold">₱25,580</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile label="Spent" value="₱38.4k" caption="60% of budget" icon="north_east" iconTone="error" />
            <StatTile label="Left" value="₱25.6k" caption="Planned pool" icon="south_west" captionTone="primary" />
            <StatTile label="Margin" value="₱9.0k" caption="Safe to spend" icon="verified_user" iconTone="tertiary" variant="accent" />
          </div>
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconChip icon="account_balance" look="soft" size="sm" />
                <div>
                  <h3 className="font-headline text-sm font-semibold">Total Available Funds</h3>
                  <p className="text-xs text-on-surface-variant">Payroll &amp; secondary inflows</p>
                </div>
              </div>
              <span className="font-headline text-base font-bold">₱85,000</span>
            </div>
            <SegmentedBar
              segments={[
                { value: 64000, tone: 'primary', label: 'Expenses ₱64k' },
                { value: 12000, tone: 'tertiary', label: 'Savings ₱12k' },
                { value: 9000, tone: 'secondary', label: 'Margin ₱9k' },
              ]}
            />
          </Card>
        </div>
      </div>

      <div className="space-y-2.5">
        <SectionHeader title="Upcoming Bills" icon="event_upcoming" iconTone="tertiary" action={<span className="text-on-surface-variant">Next 5 days</span>} />
        <Card padding="sm" className="!p-0">
          <ListRow
            leading={<IconChip icon="apartment" tone="error" look="soft" shape="rounded" />}
            title={
              <span className="flex items-center gap-2">
                Apartment Rent <Badge tone="error">Due Oct 30</Badge>
              </span>
            }
            subtitle="Cash • 3 days left"
            trailing="₱10,000"
            trailingSub={<span className="font-bold text-primary">Pay Now</span>}
            onClick={() => setSheetOpen(true)}
          />
        </Card>
      </div>

      <div className="space-y-2.5">
        <SectionHeader title="Recent Activity" icon="receipt_long" action={<button className="text-primary hover:underline">All History</button>} />
        <div className="divide-y divide-surface-container overflow-hidden rounded-xl bg-surface-container-low shadow-soft">
          <ListRow leading={<IconChip icon="local_cafe" tone="tertiary" />} title="Lunch & Coffee" subtitle="Cash • Today, 1:15 PM" trailing="-₱180.00" trailingSub="Food" />
          <ListRow leading={<IconChip icon="shopping_cart" />} title="SM Supermarket" subtitle="BDO • Oct 24" trailing="-₱2,450.00" trailingSub="Groceries" />
          <ListRow leading={<IconChip icon="bolt" tone="secondary" />} title="Meralco" subtitle="Maya • Oct 22" trailing="-₱4,820.00" trailingSub="Utilities" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone="primary">85% Paid</Badge>
        <Badge tone="secondary">In progress</Badge>
        <Badge tone="tertiary">75% Saved</Badge>
        <Badge tone="error">Due in 4 days</Badge>
        <Badge>Auto-debit</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button icon="add" onClick={() => setSheetOpen(true)}>Open sheet</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="tonal" icon="check">Tonal</Button>
        <Button variant="ghost">Ghost</Button>
      </div>

      <EmptyState title="Nothing here yet" message="Empty states look like this." />

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Sample Sheet"
        headerAction={<Button variant="tonal" onClick={() => setSheetOpen(false)}>Save</Button>}
        footer={<Button size="lg" icon="check" fullWidth onClick={() => setSheetOpen(false)}>Add ₱180.00 Expense</Button>}
      >
        <div className="space-y-3">
          {Array.from({ length: 8 }, (_, i) => (
            <Card key={i} variant="container" padding="sm">Scrollable content row {i + 1}</Card>
          ))}
        </div>
      </Sheet>
    </>
  );
}
