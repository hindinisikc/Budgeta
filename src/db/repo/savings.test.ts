import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { goalBalances, summarizeMonth } from '../../domain/calc';
import { pesos } from '../../domain/money';
import { addGoal, contribute, removeGoal, setGoalCompleted, transferPlanned, updateGoal, withdraw, type GoalInput } from './goals';
import { addIncome } from './incomeItems';
import { closeMonth, loadMonthData, reopenMonth, startMonth } from './months';
import { addItem } from './budgetItems';

const OCT = '2026-10';
const NOV = '2026-11';
let food: string;

beforeEach(async () => {
  await db.delete();
  await db.open();
  food = (await db.categories.filter((c) => c.name === 'Food').first())!.id;
});

const goalInput = (over: Partial<GoalInput> = {}): GoalInput => ({
  name: 'Emergency Fund', icon: 'savings', target: pesos(10000), monthlyContribution: pesos(2000), startMonth: OCT, ...over,
});
const summary = async (m = OCT) => summarizeMonth(await loadMonthData(m));
const move = (amount: number, date = `${OCT}-20`) => ({ amount: pesos(amount), date, accountId: null, note: '' });

/** October: ₱20k income, ₱12k planned spending. */
async function setupOctober() {
  await startMonth(OCT, { fromTemplates: false });
  await addIncome(OCT, { name: 'Salary', expected: pesos(20000), expectedDate: null, accountId: null });
  await addItem(OCT, { kind: 'flexible', name: 'Food', categoryId: food, planned: pesos(12000), dueDate: null, accountId: null, autoPay: false, note: '' });
}

describe('goals and plans', () => {
  it('plans the contribution in the open month it is applied to', async () => {
    await setupOctober();
    const id = await addGoal(goalInput(), OCT);
    expect((await summary()).savingsTarget).toBe(pesos(2000));
    expect((await summary()).margin).toBe(pesos(6000));

    await updateGoal(id, goalInput({ monthlyContribution: pesos(3000) }), OCT);
    expect((await summary()).savingsTarget).toBe(pesos(3000));

    // A goal starting later isn't planned yet.
    await updateGoal(id, goalInput({ startMonth: NOV }), OCT);
    expect((await summary()).savingsTarget).toBe(0);
  });

  it('validates input', async () => {
    await expect(addGoal(goalInput({ target: 0 }))).rejects.toThrow(/Target/);
    await expect(addGoal(goalInput({ monthlyContribution: pesos(20000) }))).rejects.toThrow(/more than the target/);
    await expect(addGoal(goalInput({ name: ' ' }))).rejects.toThrow(/required/);
  });

  it('new months plan active goals; completed ones stop', async () => {
    const id = await addGoal(goalInput());
    await startMonth(OCT, { fromTemplates: true });
    expect((await summary()).savingsTarget).toBe(pesos(2000));
    await setGoalCompleted(id, true);
    expect((await summary()).savingsTarget).toBe(0);
    await startMonth(NOV, { fromTemplates: true });
    expect((await summary(NOV)).savingsTarget).toBe(0);
  });

  it('plans only what is still needed to reach the target', async () => {
    const id = await addGoal(goalInput({ target: pesos(5000), monthlyContribution: pesos(2000) }));
    await startMonth(OCT, { fromTemplates: true });
    await contribute(id, move(4000));
    await startMonth(NOV, { fromTemplates: true });
    expect((await summary(NOV)).savingsTarget).toBe(pesos(1000));
    await contribute(id, move(1000, `${NOV}-05`));
    await startMonth('2026-12', { fromTemplates: true });
    expect((await summary('2026-12')).savingsTarget).toBe(0);
  });

  it('removing a goal with history archives it', async () => {
    await setupOctober();
    const a = await addGoal(goalInput(), OCT);
    const b = await addGoal(goalInput({ name: 'Travel' }), OCT);
    await contribute(a, move(500));
    expect(await removeGoal(a)).toBe('archived');
    expect(await removeGoal(b)).toBe('deleted');
    expect((await db.goals.get(a))!.status).toBe('archived');
    expect(await db.goals.get(b)).toBeUndefined();
  });
});

describe('contributions and withdrawals', () => {
  it('transfers all remaining planned savings at once', async () => {
    await setupOctober();
    const a = await addGoal(goalInput(), OCT);
    await addGoal(goalInput({ name: 'Tech', monthlyContribution: pesos(1000) }), OCT);
    await contribute(a, move(500));
    expect(await transferPlanned(OCT, { date: `${OCT}-25`, accountId: null, note: '' })).toEqual({ count: 2, total: pesos(2500) });
    const s = await summary();
    expect(s.savingsContributed).toBe(pesos(3000));
    expect(s.margin).toBe(pesos(5000));
    await expect(transferPlanned(OCT, { date: `${OCT}-25`, accountId: null, note: '' })).rejects.toThrow(/already transferred/);
  });

  it('withdrawal adds to the month and cannot exceed the balance', async () => {
    await setupOctober();
    const a = await addGoal(goalInput(), OCT);
    await contribute(a, move(2000));
    await expect(withdraw(a, move(2500))).rejects.toThrow(/at most ₱2,000/);
    await withdraw(a, move(1500));
    expect(goalBalances(await db.transactions.toArray()).get(a)).toBe(pesos(500));
    expect((await summary()).availableFunds).toBe(pesos(21500));
  });
});

describe('closing a month', () => {
  it('moves leftover margin to a goal', async () => {
    await setupOctober();
    const a = await addGoal(goalInput({ monthlyContribution: 0 }));
    const r = await closeMonth(OCT, { kind: 'goal', goalId: a });
    expect(r).toEqual({ kind: 'goal', amount: pesos(8000), goalId: a });
    expect((await summary()).margin).toBe(0);
    expect((await db.transactions.toArray())[0]).toMatchObject({ type: 'contribution', date: `${OCT}-31`, amount: pesos(8000) });
    expect((await db.months.get(OCT))!.status).toBe('closed');
    await expect(closeMonth(OCT, { kind: 'leave' })).rejects.toThrow(/already closed/);
  });

  it('carries leftover into next month — now if started, otherwise when it starts', async () => {
    await setupOctober();
    await closeMonth(OCT, { kind: 'carryover' });
    await startMonth(NOV, { fromTemplates: false });
    const nov = await summary(NOV);
    expect(nov.plannedIncome).toBe(pesos(8000));
    expect((await db.incomeItems.where('monthId').equals(NOV).first())).toMatchObject({ source: 'carryover', name: 'Carried over from October 2026' });

    // Reopen, spend more, close again: the carry-over line is updated, not duplicated.
    await reopenMonth(OCT);
    await addItem(OCT, { kind: 'bill', name: 'Repair', categoryId: food, planned: pesos(3000), dueDate: null, accountId: null, autoPay: false, note: '' });
    await closeMonth(OCT, { kind: 'carryover' });
    const lines = await db.incomeItems.where('monthId').equals(NOV).toArray();
    expect(lines).toHaveLength(1);
    expect(lines[0]!.expected).toBe(pesos(5000));
  });

  it('a negative margin closes with nothing to move', async () => {
    await setupOctober();
    await addItem(OCT, { kind: 'bill', name: 'Big', categoryId: food, planned: pesos(10000), dueDate: null, accountId: null, autoPay: false, note: '' });
    expect(await closeMonth(OCT, { kind: 'carryover' })).toEqual({ kind: 'carryover', amount: 0 });
    await startMonth(NOV, { fromTemplates: false });
    expect(await db.incomeItems.where('monthId').equals(NOV).count()).toBe(0);
  });
});
