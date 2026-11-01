import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { Badge, Icon, PageHeading, SectionHeader } from '../../components/ui';
import { db } from '../../db/db';
import { useLookups, useMonthRecords, useTemplates } from '../../db/hooks';
import { summarizeMonth } from '../../domain/calc';
import { formatShortDate, monthElapsedFraction, todayStr } from '../../domain/dates';
import type { DueEntry } from '../../domain/due';
import { PACE_LABEL, paceStatus } from '../../domain/status';
import { useUi } from '../../state/ui';
import { TransactionRow } from '../activity/TransactionRow';
import { DueEntrySheets } from '../budget/DueEntrySheets';
import { StartMonthCard } from '../budget/StartMonthCard';
import { HeroCard } from './HeroCard';
import { UpcomingBills } from './UpcomingBills';
import { WelcomeChecklist } from './WelcomeChecklist';

const PACE_TONE = { on_track: 'primary', watch: 'tertiary', over: 'error' } as const;

export function DashboardPage() {
  const { selectedMonth, openQuickAdd } = useUi();
  const navigate = useNavigate();
  const records = useMonthRecords(selectedMonth);
  const lookups = useLookups();
  const templates = useTemplates();
  const goals = useLiveQuery(() => db.goals.orderBy('order').toArray(), []);
  const anyTransaction = useLiveQuery(async () => (await db.transactions.count()) > 0, []);
  const [payOpen, setPayOpen] = useState(false);
  const [payEntry, setPayEntry] = useState<DueEntry | null>(null);

  const summary = useMemo(() => (records ? summarizeMonth(records) : null), [records]);
  const today = todayStr();

  if (!records || !lookups || !templates || !goals || !summary || anyTransaction === undefined) return <PageHeading title="Financial Health" />;

  const status = paceStatus(summary, monthElapsedFraction(selectedMonth, today));
  const checklist = (
    <WelcomeChecklist
      hasTemplates={templates.length > 0}
      monthStarted={!!records.month}
      hasGoals={goals.length > 0}
      hasTransactions={anyTransaction}
      monthId={selectedMonth}
      onQuickAdd={openQuickAdd}
    />
  );

  if (!records.month) {
    return (
      <>
        <PageHeading title="Financial Health" />
        {checklist}
        <StartMonthCard monthId={selectedMonth} templates={templates} />
      </>
    );
  }

  const recent = [...records.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const ctx = {
    lookups,
    itemById: new Map(records.items.map((i) => [i.id, i])),
    incomeById: new Map(records.incomeItems.map((i) => [i.id, i])),
    goalById: new Map(goals.map((g) => [g.id, g])),
  };

  return (
    <>
      <PageHeading
        title="Financial Health"
        trailing={
          <Badge tone={PACE_TONE[status]} icon="eco_fill" className="px-3 py-1.5">
            {PACE_LABEL[status]}
          </Badge>
        }
      />
      {checklist}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <HeroCard monthId={selectedMonth} summary={summary} today={today} />
          <UpcomingBills
            summary={summary}
            lookups={lookups}
            today={today}
            onPay={(e) => {
              setPayEntry(e);
              setPayOpen(true);
            }}
          />
        </div>

        <section className="min-w-0 space-y-2.5">
          <SectionHeader
            title="Recent Activity"
            action={
              <Link to="/activity" className="inline-flex min-h-11 items-center px-1 text-primary hover:underline">
                All History
              </Link>
            }
          />
          {recent.length === 0 ? (
            <button type="button" onClick={openQuickAdd} className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-low px-4 py-5 text-sm font-semibold text-primary shadow-soft">
              <Icon name="add_circle" size={20} /> Log your first expense
            </button>
          ) : (
            <div className="divide-y divide-surface-container overflow-hidden rounded-xl bg-surface-container-low shadow-soft">
              {recent.map((t) => (
                <TransactionRow key={t.id} tx={t} ctx={ctx} suffix={formatShortDate(t.date)} onClick={() => navigate('/activity')} />
              ))}
            </div>
          )}
        </section>
      </div>

      <DueEntrySheets entry={payEntry} open={payOpen} onClose={() => setPayOpen(false)} lookups={lookups} />
    </>
  );
}
