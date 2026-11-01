import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { Button, Icon, PageHeading, SectionHeader, cx } from '../../components/ui';
import { db } from '../../db/db';
import { useLookups, useMonthRecords } from '../../db/hooks';
import { contribute, withdraw } from '../../db/repo/goals';
import { goalBalances, summarizeMonth } from '../../domain/calc';
import { formatMonthLabel, monthName, parseMonthId } from '../../domain/dates';
import { formatPeso, sum } from '../../domain/money';
import { suggestedSavings } from '../../domain/suggestions';
import { useUi } from '../../state/ui';
import { RecordMoneySheet } from '../budget/RecordMoneySheet';
import { GoalCard } from './GoalCard';
import { GoalEditorSheet } from './GoalEditorSheet';
import { MarginSimulator } from './MarginSimulator';
import { TransferSheet } from './TransferSheet';

type SheetState =
  | { kind: 'none' }
  | { kind: 'edit'; goalId: string | null }
  | { kind: 'contribute' | 'withdraw'; goalId: string }
  | { kind: 'transfer' };

export function SavingsPage() {
  const { selectedMonth, showToast } = useUi();
  const records = useMonthRecords(selectedMonth);
  const lookups = useLookups();
  const goals = useLiveQuery(() => db.goals.orderBy('order').toArray(), []);
  const savingsTx = useLiveQuery(() => db.transactions.where('type').anyOf('contribution', 'withdrawal').toArray(), []);
  const [sheet, setSheet] = useState<SheetState>({ kind: 'none' });
  const [last, setLast] = useState<SheetState>({ kind: 'none' });
  const [showSim, setShowSim] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const open = (s: SheetState) => {
    setSheet(s);
    setLast(s);
  };
  const close = () => setSheet({ kind: 'none' });

  const summary = useMemo(() => (records ? summarizeMonth(records) : null), [records]);
  const balances = useMemo(() => goalBalances(savingsTx ?? []), [savingsTx]);

  if (!records || !lookups || !goals || !summary) return <PageHeading title="Savings" />;

  const goalMonth = new Map(summary.goals.map((g) => [g.goalId, g]));
  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');
  const due = activeGoals
    .map((goal) => ({ goal, amount: Math.max((goalMonth.get(goal.id)?.planned ?? 0) - (goalMonth.get(goal.id)?.contributed ?? 0), 0) }))
    .filter((d) => d.amount > 0);
  const dueTotal = sum(due.map((d) => d.amount));
  const monthLabel = monthName(parseMonthId(selectedMonth).monthIndex);
  const over = summary.margin < 0;

  const target = last.kind === 'edit' || last.kind === 'contribute' || last.kind === 'withdraw' ? goals.find((g) => g.id === last.goalId) : undefined;
  const targetBalance = target ? (balances.get(target.id) ?? 0) : 0;
  const targetMonth = target ? goalMonth.get(target.id) : undefined;

  const goalCard = (g: (typeof goals)[number]) => (
    <GoalCard
      key={g.id}
      goal={g}
      balance={balances.get(g.id) ?? 0}
      month={goalMonth.get(g.id)}
      viewedMonth={selectedMonth}
      onContribute={() => open({ kind: 'contribute', goalId: g.id })}
      onOpen={() => open({ kind: 'edit', goalId: g.id })}
    />
  );

  return (
    <>
      <PageHeading title="Savings" />

      {!records.month && (
        <p className="flex items-start gap-2 rounded-lg bg-tertiary-fixed/60 px-3 py-2 text-sm text-on-tertiary-fixed">
          <Icon name="info" size={18} className="mt-0.5" />
          <span>
            {formatMonthLabel(selectedMonth)} hasn't been started yet.{' '}
            <Link to="/budget" className="font-bold underline">
              Start it on Budget
            </Link>
            .
          </span>
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-3">
          {/* The one card that matters: what's free to spend after bills and savings. */}
          <section className={cx('relative overflow-hidden rounded-xl p-5 shadow-soft', over ? 'bg-error-container' : 'bg-primary-fixed')}>
            <span aria-hidden className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-primary-container/30" />
            <div className="relative flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-primary-fixed-variant">{over ? 'Over plan by' : 'Safe to spend'}</p>
                <p className="font-headline text-4xl font-bold leading-tight text-on-primary-fixed">{formatPeso(Math.abs(summary.margin))}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-on-primary-fixed-variant">Saving this month</p>
                <p className="font-headline text-xl font-bold text-on-primary-fixed">{formatPeso(summary.savingsTarget)}</p>
              </div>
            </div>
            <p className="relative mt-2 text-sm text-on-primary-fixed-variant">
              {over ? 'More is planned or spent than you have this month.' : 'What is left after your bills, spending pools and savings.'}
            </p>
            <button
              type="button"
              onClick={() => setShowSim((s) => !s)}
              aria-expanded={showSim}
              className="relative mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-bold text-on-primary-fixed underline-offset-2 hover:underline"
            >
              <Icon name="tune" size={16} /> {showSim ? 'Hide' : 'Try a different savings amount'}
            </button>
          </section>
          {summary.plannedIncome > 0 && (
            <p className="flex items-start gap-2 px-1 text-sm text-on-surface-variant">
              <Icon name="info" size={18} className="mt-0.5 shrink-0" />
              <span>
                {summary.savingsTarget >= suggestedSavings(summary.plannedIncome)
                  ? `You're saving at least 20% of income — the common 50/30/20 guide. Nice.`
                  : <>A common guide is saving 20% of income (<strong className="text-on-surface">{formatPeso(suggestedSavings(summary.plannedIncome))}</strong>). You're planning {formatPeso(summary.savingsTarget)}.</>}
              </span>
            </p>
          )}
          {showSim && <MarginSimulator savingsTarget={summary.savingsTarget} margin={summary.margin} />}
        </div>

        <div className="min-w-0 space-y-3">
          <SectionHeader
            title="Goals"
            action={
              <button type="button" onClick={() => open({ kind: 'edit', goalId: null })} className="inline-flex min-h-11 items-center gap-1 px-1 text-primary hover:underline">
                <Icon name="add" size={16} /> Add goal
              </button>
            }
          />
          {activeGoals.length === 0 ? (
            <div className="rounded-xl bg-surface-container-low px-4 py-8 text-center text-sm text-on-surface-variant shadow-soft">
              No goals yet. An emergency fund is a good first one.
            </div>
          ) : (
            activeGoals.map(goalCard)
          )}

          {dueTotal > 0 && (
            <Button size="lg" icon="savings" fullWidth onClick={() => open({ kind: 'transfer' })}>
              Transfer {formatPeso(dueTotal)} to goals
            </Button>
          )}

          {completedGoals.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowCompleted((s) => !s)}
                aria-expanded={showCompleted}
                className="inline-flex min-h-11 items-center gap-1 px-1 text-sm font-semibold text-on-surface-variant"
              >
                Completed ({completedGoals.length})
                <Icon name="keyboard_arrow_down" size={18} className={showCompleted ? 'rotate-180' : ''} />
              </button>
              {showCompleted && <div className="space-y-3">{completedGoals.map(goalCard)}</div>}
            </div>
          )}
        </div>
      </div>

      <GoalEditorSheet
        open={sheet.kind === 'edit'}
        onClose={close}
        goal={last.kind === 'edit' ? (target ?? null) : null}
        balance={targetBalance}
        viewedMonth={selectedMonth}
        onWithdraw={() => target && open({ kind: 'withdraw', goalId: target.id })}
      />

      <RecordMoneySheet
        open={sheet.kind === 'contribute' && !!target}
        onClose={close}
        title="Add Savings"
        name={target?.name ?? ''}
        context={target ? `Saved ${formatPeso(targetBalance)} of ${formatPeso(target.target)}` : ''}
        monthId={selectedMonth}
        defaultAmount={targetMonth ? Math.max(targetMonth.planned - targetMonth.contributed, 0) : 0}
        defaultAccountId={null}
        accounts={lookups.accounts}
        accountLabel="From account"
        submitLabel={(a) => (a ? `Save ${a}` : 'Save')}
        onSubmit={async (v) => {
          await contribute(target!.id, v);
          showToast(`Added ${formatPeso(v.amount)} to ${target!.name}`);
        }}
      />

      <RecordMoneySheet
        open={sheet.kind === 'withdraw' && !!target}
        onClose={close}
        title="Withdraw Savings"
        name={target?.name ?? ''}
        context={target ? `Balance ${formatPeso(targetBalance)} · added to ${monthLabel}'s money` : ''}
        monthId={selectedMonth}
        defaultAmount={0}
        defaultAccountId={null}
        accounts={lookups.accounts}
        accountLabel="Into account"
        submitLabel={(a) => (a ? `Withdraw ${a}` : 'Withdraw')}
        onSubmit={async (v) => {
          await withdraw(target!.id, v);
          showToast(`Withdrew ${formatPeso(v.amount)} from ${target!.name}`);
        }}
      />

      <TransferSheet open={sheet.kind === 'transfer'} onClose={close} monthId={selectedMonth} due={due} accounts={lookups.accounts} />
    </>
  );
}
