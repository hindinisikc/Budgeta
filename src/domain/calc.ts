/**
 * Every derived money figure in Budgeta comes from this file. Functions are pure: give them a
 * month's records, get numbers back. Nothing derived is ever stored, so editing or deleting a
 * transaction can't leave a stale total behind.
 */
import { sum, type Centavos } from './money';
import type { MonthId } from './dates';
import type { BudgetItem, GoalPlan, Id, IncomeItem, Transaction } from './types';

/** What a "one month ahead" month runs on: last month's paydays. */
export interface Funding {
  fromMonth: MonthId;
  /** Σ expected of last month's paydays. */
  expected: Centavos;
  /** Σ actually received from them so far. */
  received: Centavos;
  /** The amount this month runs on: actual for paydays received, expected for the rest. */
  funds: Centavos;
}

export interface MonthData {
  items: BudgetItem[];
  incomeItems: IncomeItem[];
  goalPlans: GoalPlan[];
  /** Transactions dated in this month. */
  transactions: Transaction[];
  /** Present only for months funded by the previous month's paydays. */
  funding?: Funding | null;
}

// ---- Budget items -----------------------------------------------------------

export type ItemState = 'unpaid' | 'partial' | 'settled';

export interface ItemSummary {
  item: BudgetItem;
  paid: Centavos;
  /** Still expected to be paid; 0 once settled. */
  remaining: Centavos;
  /** Money this item takes out of the month: the planned amount, or what was paid if higher / if settled. */
  committed: Centavos;
  /** Paid beyond plan. */
  overspent: Centavos;
  /** Settled below plan ("saved ₱350 vs plan"). */
  underspent: Centavos;
  /** paid / planned, 0..1+ (can exceed 1 when overspent). */
  progress: number;
  state: ItemState;
  lastPaymentDate: string | null;
}

export function summarizeItem(item: BudgetItem, transactions: Transaction[]): ItemSummary {
  const payments = transactions.filter((t) => t.type === 'expense' && t.budgetItemId === item.id);
  const paid = sum(payments.map((t) => t.amount));
  // A bill paid in full is done even if it was never ticked. Pools stay open until settled explicitly,
  // since more purchases can still come in. (Money figures are identical either way when paid ≥ planned.)
  const settled = item.settled || (item.kind === 'bill' && item.planned > 0 && paid >= item.planned);
  const remaining = settled ? 0 : Math.max(item.planned - paid, 0);
  const committed = settled ? paid : Math.max(item.planned, paid);
  const lastPaymentDate = payments.reduce<string | null>((latest, t) => (latest === null || t.date > latest ? t.date : latest), null);
  return {
    item,
    paid,
    remaining,
    committed,
    overspent: Math.max(paid - item.planned, 0),
    underspent: settled ? Math.max(item.planned - paid, 0) : 0,
    progress: item.planned > 0 ? paid / item.planned : paid > 0 ? 1 : 0,
    state: settled ? 'settled' : paid > 0 ? 'partial' : 'unpaid',
    lastPaymentDate,
  };
}

// ---- Income -----------------------------------------------------------------

export interface IncomeSummary {
  income: IncomeItem;
  received: Centavos;
  /** Counts toward available funds: what actually arrived once anything was recorded, otherwise the expectation. */
  funds: Centavos;
  isReceived: boolean;
}

export function summarizeIncome(income: IncomeItem, transactions: Transaction[]): IncomeSummary {
  const receipts = transactions.filter((t) => t.type === 'income' && t.incomeItemId === income.id);
  const received = sum(receipts.map((t) => t.amount));
  const isReceived = receipts.length > 0;
  return { income, received, funds: isReceived ? received : income.expected, isReceived };
}

/** Last month's paydays, as the funding for a "one month ahead" month. Extra one-off income stays in its own month. */
export function earningsFunding(fromMonth: MonthId, incomeItems: IncomeItem[], transactions: Transaction[]): Funding {
  const paydays = incomeItems.filter((i) => i.source === 'regular').map((i) => summarizeIncome(i, transactions));
  return {
    fromMonth,
    expected: sum(paydays.map((s) => s.income.expected)),
    received: sum(paydays.map((s) => s.received)),
    funds: sum(paydays.map((s) => s.funds)),
  };
}

// ---- Savings ----------------------------------------------------------------

export interface GoalMonthSummary {
  goalId: Id;
  planned: Centavos;
  contributed: Centavos;
  withdrawn: Centavos;
  /** Savings set aside this month for the goal: plan, or more if you contributed extra. */
  committed: Centavos;
}

export function summarizeGoalsForMonth(goalPlans: GoalPlan[], transactions: Transaction[]): GoalMonthSummary[] {
  const byGoal = new Map<Id, GoalMonthSummary>();
  const entry = (goalId: Id) => {
    let e = byGoal.get(goalId);
    if (!e) {
      e = { goalId, planned: 0, contributed: 0, withdrawn: 0, committed: 0 };
      byGoal.set(goalId, e);
    }
    return e;
  };
  for (const p of goalPlans) entry(p.goalId).planned += p.planned;
  for (const t of transactions) {
    if (!t.goalId) continue;
    if (t.type === 'contribution') entry(t.goalId).contributed += t.amount;
    else if (t.type === 'withdrawal') entry(t.goalId).withdrawn += t.amount;
  }
  for (const e of byGoal.values()) e.committed = Math.max(e.planned, e.contributed);
  return [...byGoal.values()];
}

/** All-time balance of each goal (contributions − withdrawals across every month). */
export function goalBalances(allTransactions: Transaction[]): Map<Id, Centavos> {
  const balances = new Map<Id, Centavos>();
  for (const t of allTransactions) {
    if (!t.goalId) continue;
    const delta = t.type === 'contribution' ? t.amount : t.type === 'withdrawal' ? -t.amount : 0;
    balances.set(t.goalId, (balances.get(t.goalId) ?? 0) + delta);
  }
  return balances;
}

// ---- Month ------------------------------------------------------------------

export interface MonthSummary {
  items: ItemSummary[];
  income: IncomeSummary[];
  goals: GoalMonthSummary[];

  /** Money this month is planned on: Σ expected income lines, or (one month ahead) last month's paydays + money in hand. */
  plannedIncome: Centavos;
  /** Σ planned budget items. */
  plannedExpenses: Centavos;
  /** Σ planned goal contributions. */
  savingsTarget: Centavos;
  /** The plan on paper: plannedIncome − plannedExpenses − savingsTarget. */
  plannedMargin: Centavos;

  /** Income lines (received or expected) + extra income + withdrawals from savings. */
  availableFunds: Centavos;
  /** Income actually received (linked and extra). */
  incomeReceived: Centavos;
  extraIncome: Centavos;
  withdrawals: Centavos;

  /** Expenses paid against budget items. */
  paidToDate: Centavos;
  /** Expenses with no budget item. */
  unplannedSpent: Centavos;
  /** All expenses this month. */
  spentToDate: Centavos;
  /** Σ unpaid parts of open budget items. */
  remainingToSettle: Centavos;

  savingsContributed: Centavos;
  savingsCommitted: Centavos;

  /**
   * Safe to spend: funds not already promised to a budget item or savings.
   * availableFunds − Σ item.committed − unplannedSpent − savingsCommitted.
   */
  margin: Centavos;

  flexiblePlanned: Centavos;
  flexibleSpent: Centavos;
  flexibleRemaining: Centavos;

  /** paidToDate / plannedExpenses, clamped to 0..1. */
  completion: number;
  counts: { total: number; settled: number; partial: number; unpaid: number };

  /** One month ahead: what this month runs on (null for normal months). */
  funding: Funding | null;
  /** One month ahead: this month's paydays, which fund next month (null for normal months). */
  earnings: { expected: Centavos; received: Centavos } | null;
}

export function summarizeMonth({ items, incomeItems, goalPlans, transactions, funding = null }: MonthData): MonthSummary {
  const itemSummaries = items.map((i) => summarizeItem(i, transactions));
  const incomeSummaries = incomeItems.map((i) => summarizeIncome(i, transactions));
  const goalSummaries = summarizeGoalsForMonth(goalPlans, transactions);

  // One month ahead: this month's paydays are earnings for next month, so only money already in hand
  // (last month's paydays, carry-over/opening lines, extra income, withdrawals) funds this month.
  const countsNow = (i: IncomeItem) => !funding || i.source !== 'regular';
  const nowLines = incomeSummaries.filter((s) => countsNow(s.income));
  const paydays = funding ? incomeSummaries.filter((s) => !countsNow(s.income)) : [];
  const plannedIncome = (funding?.funds ?? 0) + sum(nowLines.map((s) => s.income.expected));
  const plannedExpenses = sum(items.map((i) => i.planned));
  const savingsTarget = sum(goalPlans.map((p) => p.planned));

  const incomeTx = transactions.filter((t) => t.type === 'income');
  const extraIncome = sum(incomeTx.filter((t) => !t.incomeItemId).map((t) => t.amount));
  const incomeReceived = sum(incomeTx.map((t) => t.amount));
  const withdrawals = sum(transactions.filter((t) => t.type === 'withdrawal').map((t) => t.amount));
  const availableFunds = (funding?.funds ?? 0) + sum(nowLines.map((s) => s.funds)) + extraIncome + withdrawals;

  const expenses = transactions.filter((t) => t.type === 'expense');
  const spentToDate = sum(expenses.map((t) => t.amount));
  const unplannedSpent = sum(expenses.filter((t) => !t.budgetItemId).map((t) => t.amount));
  const paidToDate = spentToDate - unplannedSpent;

  const savingsContributed = sum(goalSummaries.map((g) => g.contributed));
  const savingsCommitted = sum(goalSummaries.map((g) => g.committed));

  const margin = availableFunds - sum(itemSummaries.map((s) => s.committed)) - unplannedSpent - savingsCommitted;

  const flexible = itemSummaries.filter((s) => s.item.kind === 'flexible');

  return {
    items: itemSummaries,
    income: incomeSummaries,
    goals: goalSummaries,
    plannedIncome,
    plannedExpenses,
    savingsTarget,
    plannedMargin: plannedIncome - plannedExpenses - savingsTarget,
    availableFunds,
    incomeReceived,
    extraIncome,
    withdrawals,
    paidToDate,
    unplannedSpent,
    spentToDate,
    remainingToSettle: sum(itemSummaries.map((s) => s.remaining)),
    savingsContributed,
    savingsCommitted,
    margin,
    flexiblePlanned: sum(flexible.map((s) => s.item.planned)),
    flexibleSpent: sum(flexible.map((s) => s.paid)),
    flexibleRemaining: sum(flexible.map((s) => s.remaining)),
    completion: plannedExpenses > 0 ? Math.min(1, paidToDate / plannedExpenses) : 0,
    counts: {
      total: itemSummaries.length,
      settled: itemSummaries.filter((s) => s.state === 'settled').length,
      partial: itemSummaries.filter((s) => s.state === 'partial').length,
      unpaid: itemSummaries.filter((s) => s.state === 'unpaid').length,
    },
    funding,
    earnings: funding ? { expected: sum(paydays.map((s) => s.income.expected)), received: sum(paydays.map((s) => s.received)) } : null,
  };
}

/**
 * Daily safe pace: open flexible pools + positive Margin, spread over the days left (today included).
 * Unpaid bills are excluded on purpose — that money is already spoken for.
 * Returns null when no days are left (past month).
 */
export function dailySafePace(summary: MonthSummary, daysLeft: number): Centavos | null {
  if (daysLeft <= 0) return null;
  return Math.floor((summary.flexibleRemaining + Math.max(summary.margin, 0)) / daysLeft);
}

/**
 * What to plan for a goal in a month: its monthly contribution, but never more than what's still
 * needed to reach the target (given the balance saved before that month). 0 = nothing to plan.
 */
export function plannedContribution(goal: { target: Centavos; monthlyContribution: Centavos }, balanceBefore: Centavos): Centavos {
  return Math.max(Math.min(goal.monthlyContribution, goal.target - balanceBefore), 0);
}
