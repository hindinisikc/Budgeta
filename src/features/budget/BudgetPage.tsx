import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { Button, Icon, PageHeading, SegmentedControl } from '../../components/ui';
import { db } from '../../db/db';
import { useLookups, useMonthRecords, useTemplates } from '../../db/hooks';
import { reopenMonth } from '../../db/repo/months';
import { setItemSettled } from '../../db/repo/budgetItems';
import { summarizeMonth, type IncomeSummary, type ItemSummary } from '../../domain/calc';
import { addMonths, formatMonthLabel, todayStr, type MonthId } from '../../domain/dates';
import { formatPeso, sum } from '../../domain/money';
import type { CloseResolution, Goal } from '../../domain/types';
import { useUi } from '../../state/ui';
import { BudgetItemCard } from './BudgetItemCard';
import { BudgetSummaryCard } from './BudgetSummaryCard';
import { CloseMonthSheet } from './CloseMonthSheet';
import { IncomeEditorSheet } from './IncomeEditorSheet';
import { IncomeSection } from './IncomeSection';
import { ItemEditorSheet } from './ItemEditorSheet';
import { PaymentsSheet } from './PaymentsSheet';
import { PlanSuggestions } from './PlanSuggestions';
import { PayItemSheet, ReceiveIncomeSheet } from './MoneySheets';
import { StartMonthCard } from './StartMonthCard';

type Filter = 'all' | 'unpaid' | 'paid';

// Which sheet is open. Ids (not objects) are stored so sheets always show live data.
type SheetState =
  | { kind: 'none' }
  | { kind: 'editItem'; itemId: string | null }
  | { kind: 'pay'; itemId: string }
  | { kind: 'payments'; itemId: string }
  | { kind: 'editIncome'; incomeId: string | null }
  | { kind: 'receive'; incomeId: string }
  | { kind: 'close' };

export function BudgetPage() {
  const { selectedMonth } = useUi();
  const records = useMonthRecords(selectedMonth);
  const lookups = useLookups();
  const templates = useTemplates();
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const [filter, setFilter] = useState<Filter>('all');
  const [sheet, setSheet] = useState<SheetState>({ kind: 'none' });
  // Keep the last opened target so a closing sheet doesn't lose its content mid-animation.
  const [lastSheet, setLastSheet] = useState<SheetState>({ kind: 'none' });
  const open = (s: SheetState) => {
    setSheet(s);
    setLastSheet(s);
  };
  const close = () => setSheet({ kind: 'none' });

  const summary = useMemo(() => (records ? summarizeMonth(records) : null), [records]);
  const today = todayStr();

  const heading = (
    <PageHeading
     
      title="Budget"
      trailing={
        <Link to="/budget/recurring" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface-container-low px-3 text-sm font-semibold text-primary hover:bg-surface-container">
          <Icon name="event_repeat" size={18} /> Recurring
        </Link>
      }
    />
  );

  if (!records || !lookups || !templates || !goals || !summary) return heading;
  if (!records.month) {
    return (
      <>
        {heading}
        <StartMonthCard monthId={selectedMonth} templates={templates} />
      </>
    );
  }

  const { accountById, accounts, categories, settings } = lookups;
  const itemSummary = (id: string | null | undefined): ItemSummary | null => summary.items.find((s) => s.item.id === id) ?? null;
  const incomeSummary = (id: string | null | undefined): IncomeSummary | null => summary.income.find((s) => s.income.id === id) ?? null;
  const paymentsOf = (itemId: string) => records.transactions.filter((t) => t.type === 'expense' && t.budgetItemId === itemId).sort((a, b) => b.date.localeCompare(a.date));
  const receiptsOf = (incomeId: string) => records.transactions.filter((t) => t.type === 'income' && t.incomeItemId === incomeId);

  const visible = summary.items.filter((s) => (filter === 'all' ? true : filter === 'paid' ? s.state === 'settled' : s.state !== 'settled'));
  const unpaidCount = summary.counts.total - summary.counts.settled;

  // Targets for each sheet, resolved from live data.
  const editItemId = lastSheet.kind === 'editItem' ? lastSheet.itemId : null;
  const editItem = itemSummary(editItemId);
  const payTarget = itemSummary(lastSheet.kind === 'pay' || lastSheet.kind === 'payments' ? lastSheet.itemId : null);
  const incomeTarget = incomeSummary(lastSheet.kind === 'editIncome' || lastSheet.kind === 'receive' ? lastSheet.incomeId : null);

  return (
    <>
      {heading}
      <BudgetSummaryCard
        monthId={selectedMonth}
        summary={summary}
        closed={records.month.status === 'closed'}
        closedText={closedText(records.month.closeResolution, goals, selectedMonth)}
        onClose={() => open({ kind: 'close' })}
        onReopen={() => void reopenMonth(selectedMonth)}
      />

      {records.month.status === 'open' && <PlanSuggestions monthId={selectedMonth} items={records.items} />}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section className="min-w-0 space-y-3 lg:order-1">
          <div className="flex items-center justify-between gap-2">
            <SegmentedControl<Filter>
              label="Filter items"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `All (${summary.counts.total})` },
                { value: 'unpaid', label: `Unpaid (${unpaidCount})` },
                { value: 'paid', label: `Paid (${summary.counts.settled})` },
              ]}
            />
            <Button icon="add" onClick={() => open({ kind: 'editItem', itemId: null })} className="shrink-0 rounded-full">
              Add
            </Button>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-xl bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
              {summary.counts.total === 0 ? 'No budget items yet. Add your bills and spending pools.' : 'Nothing here.'}
            </p>
          ) : (
            <div className="space-y-3">
              {visible.map((s) => (
                <BudgetItemCard
                  key={s.item.id}
                  summary={s}
                  account={s.item.accountId ? accountById.get(s.item.accountId) : undefined}
                  today={today}
                  dueSoonDays={settings.dueSoonDays}
                  onCheck={() => (s.state === 'settled' ? void setItemSettled(s.item.id, false) : open({ kind: 'pay', itemId: s.item.id }))}
                  onOpen={() => open({ kind: 'payments', itemId: s.item.id })}
                />
              ))}
            </div>
          )}

        </section>

        <div className="min-w-0 lg:sticky lg:top-24 lg:order-2">
          <IncomeSection
            summary={summary}
            accountById={accountById}
            onAdd={() => open({ kind: 'editIncome', incomeId: null })}
            onEdit={(s) => open({ kind: 'editIncome', incomeId: s.income.id })}
            onReceive={(s) => open({ kind: 'receive', incomeId: s.income.id })}
          />
        </div>
      </div>

      <ItemEditorSheet
        open={sheet.kind === 'editItem'}
        onClose={close}
        monthId={selectedMonth}
        item={editItem?.item ?? null}
        payments={{ count: editItemId ? paymentsOf(editItemId).length : 0, total: editItem?.paid ?? 0 }}
        categories={categories}
        accounts={accounts}
      />

      <PayItemSheet open={sheet.kind === 'pay'} onClose={close} target={payTarget} accounts={accounts} />

      <PaymentsSheet
        open={sheet.kind === 'payments'}
        onClose={close}
        summary={payTarget}
        payments={payTarget ? paymentsOf(payTarget.item.id) : []}
        accountById={accountById}
        onRecordAnother={() => payTarget && open({ kind: 'pay', itemId: payTarget.item.id })}
        onEdit={() => payTarget && open({ kind: 'editItem', itemId: payTarget.item.id })}
      />

      <IncomeEditorSheet
        open={sheet.kind === 'editIncome'}
        onClose={close}
        monthId={selectedMonth}
        income={lastSheet.kind === 'editIncome' ? (incomeTarget?.income ?? null) : null}
        received={{
          count: incomeTarget ? receiptsOf(incomeTarget.income.id).length : 0,
          total: incomeTarget ? sum(receiptsOf(incomeTarget.income.id).map((t) => t.amount)) : 0,
        }}
        accounts={accounts}
      />

      <CloseMonthSheet open={sheet.kind === 'close'} onClose={close} monthId={selectedMonth} margin={summary.margin} goals={goals} />

      <ReceiveIncomeSheet open={sheet.kind === 'receive'} onClose={close} target={incomeTarget} accounts={accounts} />
    </>
  );
}

function closedText(r: CloseResolution | null, goals: Goal[], monthId: MonthId): string {
  if (!r || r.amount === 0) return 'No leftover was moved.';
  if (r.kind === 'goal') return `${formatPeso(r.amount)} was moved to ${goals.find((g) => g.id === r.goalId)?.name ?? 'a goal'}.`;
  if (r.kind === 'carryover') return `${formatPeso(r.amount)} carries over to ${formatMonthLabel(addMonths(monthId, 1))}.`;
  return `${formatPeso(r.amount)} leftover was left as is.`;
}
