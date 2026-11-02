import { beforeEach, describe, expect, it } from 'vitest';
import { dailySafePace, earningsFunding, goalBalances, summarizeItem, summarizeMonth, type MonthData } from './calc';
import { pesos } from './money';
import { paceStatus } from './status';
import type { BudgetItem, GoalPlan, IncomeItem, Transaction, TransactionType } from './types';

const M = '2026-10';

function item(id: string, planned: number, kind: BudgetItem['kind'] = 'bill', extra: Partial<BudgetItem> = {}): BudgetItem {
  return {
    id, monthId: M, templateId: null, kind, name: id, categoryId: 'cat', planned: pesos(planned),
    dueDate: null, accountId: null, autoPay: false, settled: false, note: '', order: 0, ...extra,
  };
}
function income(id: string, expected: number): IncomeItem {
  return { id, monthId: M, templateId: null, name: id, expected: pesos(expected), expectedDate: null, accountId: null, source: 'regular', order: 0 };
}
function plan(goalId: string, planned: number): GoalPlan {
  return { id: `plan-${goalId}`, monthId: M, goalId, planned: pesos(planned) };
}
let seq = 0;
function tx(type: TransactionType, amount: number, links: Partial<Transaction> = {}): Transaction {
  seq += 1;
  return {
    id: `t${seq}`, date: `${M}-15`, monthId: M, type, amount: pesos(amount), budgetItemId: null, incomeItemId: null,
    goalId: null, categoryId: null, accountId: null, description: '', note: '', receiptRef: '',
    createdAt: '', updatedAt: '', ...links,
  };
}

/** The Stitch mockup's October: ₱85k income, ₱64k planned across 8 lines, ₱12k savings → ₱9k margin. */
function mockupMonth(): MonthData {
  return {
    incomeItems: [income('cutoff15', 42500), income('cutoff30', 42500)],
    items: [
      item('rent', 10000),
      item('grocery', 25000, 'flexible'),
      item('electricity', 10000),
      item('tuition', 8000),
      item('allowance', 5000),
      item('gloan', 2701),
      item('internet', 1799),
      item('laundry', 1500, 'flexible'),
    ],
    goalPlans: [plan('emergency', 10000), plan('tech', 2000)],
    transactions: [],
  };
}

let data: MonthData;
beforeEach(() => {
  data = mockupMonth();
});

describe('plan on paper', () => {
  it('matches the mockup figures before anything is paid', () => {
    const s = summarizeMonth(data);
    expect(s.plannedIncome).toBe(pesos(85000));
    expect(s.plannedExpenses).toBe(pesos(64000));
    expect(s.savingsTarget).toBe(pesos(12000));
    expect(s.plannedMargin).toBe(pesos(9000));
    expect(s.margin).toBe(pesos(9000));
    expect(s.remainingToSettle).toBe(pesos(64000));
    expect(s.counts).toEqual({ total: 8, settled: 0, partial: 0, unpaid: 8 });
  });
});

describe('paying budget items', () => {
  it('paying exactly the plan moves money from remaining to paid without changing margin', () => {
    data.items[0] = { ...data.items[0]!, settled: true };
    data.transactions.push(tx('expense', 10000, { budgetItemId: 'rent' }));
    const s = summarizeMonth(data);
    expect(s.paidToDate).toBe(pesos(10000));
    expect(s.remainingToSettle).toBe(pesos(54000));
    expect(s.margin).toBe(pesos(9000));
  });

  it('settling under plan returns the difference to margin', () => {
    data.items[2] = { ...data.items[2]!, settled: true };
    data.transactions.push(tx('expense', 9650, { budgetItemId: 'electricity' }));
    const s = summarizeMonth(data);
    expect(s.margin).toBe(pesos(9350));
    expect(s.items[2]!.underspent).toBe(pesos(350));
    expect(s.items[2]!.state).toBe('settled');
  });

  it('a partial payment keeps the rest reserved', () => {
    data.transactions.push(tx('expense', 16400, { budgetItemId: 'grocery' }));
    const s = summarizeMonth(data);
    const g = s.items[1]!;
    expect(g.state).toBe('partial');
    expect(g.remaining).toBe(pesos(8600));
    expect(s.margin).toBe(pesos(9000));
    expect(s.flexibleRemaining).toBe(pesos(8600 + 1500));
  });

  it('overpaying an item eats into margin', () => {
    data.transactions.push(tx('expense', 2000, { budgetItemId: 'internet' }));
    const s = summarizeMonth(data);
    expect(s.items[6]!.overspent).toBe(pesos(201));
    expect(s.margin).toBe(pesos(9000 - 201));
  });

  it('a settled item with no payments frees its whole plan', () => {
    data.items[7] = { ...data.items[7]!, settled: true };
    const s = summarizeMonth(data);
    expect(s.margin).toBe(pesos(10500));
    expect(s.remainingToSettle).toBe(pesos(62500));
  });

  it('a bill paid in full counts as settled even if never ticked; a pool does not', () => {
    data.transactions.push(tx('expense', 10000, { budgetItemId: 'rent' }), tx('expense', 25000, { budgetItemId: 'grocery' }));
    const s = summarizeMonth(data);
    expect(s.items[0]).toMatchObject({ state: 'settled', remaining: 0 });
    expect(s.items[1]).toMatchObject({ state: 'partial', remaining: 0 });
    expect(s.counts.settled).toBe(1);
    expect(s.margin).toBe(pesos(9000));
  });

  it('multiple payments on one item add up (cutoffs)', () => {
    data.transactions.push(tx('expense', 2500, { budgetItemId: 'allowance' }), tx('expense', 2500, { budgetItemId: 'allowance' }));
    const a = summarizeItem(data.items[4]!, data.transactions);
    expect(a.paid).toBe(pesos(5000));
    expect(a.remaining).toBe(0);
    expect(a.progress).toBe(1);
  });
});

describe('unplanned spending and income', () => {
  it('unplanned expenses reduce margin directly', () => {
    data.transactions.push(tx('expense', 1000, { categoryId: 'food' }));
    const s = summarizeMonth(data);
    expect(s.unplannedSpent).toBe(pesos(1000));
    expect(s.spentToDate).toBe(pesos(1000));
    expect(s.paidToDate).toBe(0);
    expect(s.margin).toBe(pesos(8000));
  });

  it('income received replaces the expectation (less or more)', () => {
    data.transactions.push(tx('income', 42000, { incomeItemId: 'cutoff15' }));
    const s = summarizeMonth(data);
    expect(s.availableFunds).toBe(pesos(84500));
    expect(s.margin).toBe(pesos(8500));
    expect(s.income[0]!.isReceived).toBe(true);
  });

  it('extra income raises margin', () => {
    data.transactions.push(tx('income', 5000));
    const s = summarizeMonth(data);
    expect(s.extraIncome).toBe(pesos(5000));
    expect(s.margin).toBe(pesos(14000));
  });
});

describe('savings', () => {
  it('contributing up to plan does not change margin; extra does', () => {
    data.transactions.push(tx('contribution', 10000, { goalId: 'emergency' }));
    expect(summarizeMonth(data).margin).toBe(pesos(9000));
    data.transactions.push(tx('contribution', 1000, { goalId: 'emergency' }));
    expect(summarizeMonth(data).margin).toBe(pesos(8000));
  });

  it('an unplanned contribution to another goal reduces margin', () => {
    data.transactions.push(tx('contribution', 500, { goalId: 'travel' }));
    const s = summarizeMonth(data);
    expect(s.savingsCommitted).toBe(pesos(12500));
    expect(s.margin).toBe(pesos(8500));
  });

  it('a withdrawal adds funds to the month and lowers the goal balance', () => {
    data.transactions.push(tx('contribution', 8000, { goalId: 'emergency', monthId: '2026-09', date: '2026-09-15' }));
    data.transactions.push(tx('withdrawal', 5000, { goalId: 'emergency' }));
    data.transactions.push(tx('expense', 5000, { categoryId: 'car' }));
    const month = { ...data, transactions: data.transactions.filter((t) => t.monthId === M) };
    const s = summarizeMonth(month);
    expect(s.withdrawals).toBe(pesos(5000));
    expect(s.margin).toBe(pesos(9000)); // repair fully covered by the withdrawal
    expect(goalBalances(data.transactions).get('emergency')).toBe(pesos(3000));
  });
});

describe('editing and deleting', () => {
  it('removing a transaction restores every figure (nothing derived is stored)', () => {
    const before = summarizeMonth(data);
    const t = tx('expense', 1234.56, { budgetItemId: 'grocery' });
    data.transactions.push(t);
    expect(summarizeMonth(data).paidToDate).toBe(123456);
    data.transactions = data.transactions.filter((x) => x.id !== t.id);
    expect(summarizeMonth(data)).toEqual(before);
  });

  it('changing an amount re-derives totals', () => {
    data.transactions.push(tx('expense', 100, { budgetItemId: 'grocery' }));
    data.transactions[0] = { ...data.transactions[0]!, amount: pesos(300) };
    expect(summarizeMonth(data).paidToDate).toBe(pesos(300));
  });

  it('ignores transactions linked to items that are not in this month', () => {
    data.transactions.push(tx('expense', 100, { budgetItemId: 'gone' }));
    const s = summarizeMonth(data);
    // Still counted as spent (money left the wallet) but not attributed to any item.
    expect(s.spentToDate).toBe(pesos(100));
    expect(s.items.every((i) => i.paid === 0)).toBe(true);
  });
});

describe('daily pace and status', () => {
  it('excludes unpaid bills from the daily pace', () => {
    data.transactions.push(tx('expense', 16400, { budgetItemId: 'grocery' }));
    const s = summarizeMonth(data);
    // (8,600 grocery + 1,500 laundry + 9,000 margin) / 14 days
    expect(dailySafePace(s, 14)).toBe(Math.floor(pesos(19100) / 14));
    expect(dailySafePace(s, 0)).toBeNull();
  });

  it('pace status', () => {
    expect(paceStatus(summarizeMonth(data), 0.5)).toBe('on_track');
    data.transactions.push(tx('expense', 20000, { budgetItemId: 'grocery' })); // 20k of 26.5k flexible = 75%
    expect(paceStatus(summarizeMonth(data), 0.5)).toBe('watch');
    expect(paceStatus(summarizeMonth(data), 0.7)).toBe('on_track');
    data.transactions.push(tx('expense', 9500, { categoryId: 'x' }));
    expect(paceStatus(summarizeMonth(data), 0.9)).toBe('over');
  });

  it('handles an empty month without dividing by zero', () => {
    const s = summarizeMonth({ items: [], incomeItems: [], goalPlans: [], transactions: [] });
    expect(s.margin).toBe(0);
    expect(s.completion).toBe(0);
    expect(paceStatus(s, 0.5)).toBe('on_track');
  });
});

describe('one month ahead (funded by last month\'s paydays)', () => {
  // December runs on November's paydays: ₱13,000 + ₱78,000 received, ₱13,000 (30th) not marked yet.
  const nov: IncomeItem[] = [
    { ...income('n15', 13000), monthId: '2026-11' },
    { ...income('n27', 70000), monthId: '2026-11' },
    { ...income('n30', 13000), monthId: '2026-11' },
  ];
  const novTx = [tx('income', 13000, { incomeItemId: 'n15', monthId: '2026-11' }), tx('income', 78000, { incomeItemId: 'n27', monthId: '2026-11' })];

  it('funds the month with last month\'s paydays (actual where received)', () => {
    const f = earningsFunding('2026-11', nov, novTx);
    expect(f).toEqual({ fromMonth: '2026-11', expected: pesos(96000), received: pesos(91000), funds: pesos(104000) });
  });

  it('this month\'s paydays do not count now; carry-over, opening money and extra income do', () => {
    const funding = earningsFunding('2026-11', nov, novTx);
    // mockupMonth(): ₱85k of paydays this month (would fund next month), ₱64k planned, ₱12k savings.
    data.incomeItems.push({ ...income('carry', 2000), source: 'carryover' }, { ...income('cash', 1000), source: 'opening' });
    data.transactions.push(tx('income', 42500, { incomeItemId: 'cutoff15' }), tx('income', 500));
    const s = summarizeMonth({ ...data, funding });
    expect(s.plannedIncome).toBe(pesos(104000 + 2000 + 1000));
    expect(s.availableFunds).toBe(pesos(104000 + 2000 + 1000 + 500));
    expect(s.margin).toBe(pesos(107500 - 64000 - 12000));
    expect(s.earnings).toEqual({ expected: pesos(85000), received: pesos(42500) });
    expect(s.funding?.funds).toBe(pesos(104000));
  });

  it('normal months are unchanged', () => {
    const s = summarizeMonth(data);
    expect(s.funding).toBeNull();
    expect(s.earnings).toBeNull();
    expect(s.margin).toBe(pesos(9000));
  });
});
