import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { summarizeMonth } from '../../domain/calc';
import { pesos } from '../../domain/money';
import { addItem, deleteItem, setItemSettled, updateItem, type ItemInput } from './budgetItems';
import { addIncome, deleteIncome } from './incomeItems';
import { startMonth } from './months';
import { addTemplate, type TemplateInput } from './templates';
import { addTransaction, deleteTransaction, recordIncome, recordPayment } from './transactions';

const M = '2026-10';
let food: string;
let housing: string;
let cash: string;

beforeEach(async () => {
  await db.delete();
  await db.open();
  food = (await db.categories.filter((c) => c.name === 'Food').first())!.id;
  housing = (await db.categories.filter((c) => c.name === 'Housing').first())!.id;
  cash = (await db.accounts.filter((a) => a.name === 'Cash').first())!.id;
});

const tpl = (over: Partial<TemplateInput>): TemplateInput => ({
  kind: 'bill', name: 'Rent', categoryId: housing, defaultAmount: pesos(10000), dueDay: 30,
  accountId: cash, autoPay: false, active: true, note: '', ...over,
});
const itemInput = (over: Partial<ItemInput> = {}): ItemInput => ({
  kind: 'bill', name: 'Rent', categoryId: housing, planned: pesos(10000), dueDate: `${M}-30`,
  accountId: cash, autoPay: false, note: '', ...over,
});
async function monthSummary(monthId = M) {
  const [items, incomeItems, goalPlans, transactions] = await Promise.all([
    db.budgetItems.where('monthId').equals(monthId).toArray(),
    db.incomeItems.where('monthId').equals(monthId).toArray(),
    db.goalPlans.where('monthId').equals(monthId).toArray(),
    db.transactions.where('monthId').equals(monthId).toArray(),
  ]);
  return summarizeMonth({ items, incomeItems, goalPlans, transactions });
}

describe('templates', () => {
  it('validates required fields', async () => {
    await expect(addTemplate(tpl({ name: '' }))).rejects.toThrow(/required/);
    await expect(addTemplate(tpl({ defaultAmount: 0 }))).rejects.toThrow(/greater than/);
    await expect(addTemplate(tpl({ categoryId: null }))).rejects.toThrow(/category/);
    await expect(addTemplate(tpl({ dueDay: 32 }))).rejects.toThrow(/between 1 and 31/);
  });
  it('normalizes kind-specific fields', async () => {
    const id = await addTemplate(tpl({ kind: 'income', name: 'Salary', categoryId: housing, autoPay: true }));
    expect(await db.templates.get(id)).toMatchObject({ categoryId: null, autoPay: false });
    const flex = await addTemplate(tpl({ kind: 'flexible', name: 'Groceries', dueDay: 5 }));
    expect((await db.templates.get(flex))!.dueDay).toBeNull();
  });
});

describe('startMonth', () => {
  it('copies active templates with clamped due dates', async () => {
    await addTemplate(tpl({ dueDay: 31 }));
    await addTemplate(tpl({ kind: 'flexible', name: 'Groceries', categoryId: food, defaultAmount: pesos(8000), dueDay: null }));
    await addTemplate(tpl({ kind: 'income', name: 'Salary 15th', categoryId: null, defaultAmount: pesos(42500), dueDay: 15 }));
    await addTemplate(tpl({ name: 'Old gym', active: false }));

    expect(await startMonth('2026-02', { fromTemplates: true })).toEqual({ items: 2, income: 1, goals: 0 });
    const items = await db.budgetItems.where('monthId').equals('2026-02').sortBy('order');
    expect(items.map((i) => [i.name, i.dueDate])).toEqual([['Rent', '2026-02-28'], ['Groceries', null]]);
    expect((await db.incomeItems.where('monthId').equals('2026-02').first())!.expectedDate).toBe('2026-02-15');
  });

  it('plans active goals that have started', async () => {
    await db.goals.bulkAdd([
      { id: 'g1', name: 'Emergency', icon: 'savings', target: pesos(10000), monthlyContribution: pesos(2000), startMonth: '2026-01', status: 'active', createdAt: '', order: 0 },
      { id: 'g2', name: 'Travel', icon: 'flight', target: pesos(5000), monthlyContribution: pesos(1000), startMonth: '2026-11', status: 'active', createdAt: '', order: 1 },
    ]);
    expect((await startMonth(M, { fromTemplates: true })).goals).toBe(1);
    expect((await monthSummary()).savingsTarget).toBe(pesos(2000));
  });

  it('refuses to start the same month twice; empty start ignores templates', async () => {
    await addTemplate(tpl({}));
    expect(await startMonth(M, { fromTemplates: false })).toEqual({ items: 0, income: 0, goals: 0 });
    await expect(startMonth(M, { fromTemplates: true })).rejects.toThrow(/already been started/);
  });

  it('editing a template later does not change the started month', async () => {
    const t = await addTemplate(tpl({}));
    await startMonth(M, { fromTemplates: true });
    await db.templates.update(t, { defaultAmount: pesos(12000) });
    expect((await db.budgetItems.where('monthId').equals(M).first())!.planned).toBe(pesos(10000));
  });
});

describe('budget items', () => {
  beforeEach(async () => {
    await startMonth(M, { fromTemplates: false });
  });

  it('requires the month to exist and due date inside it', async () => {
    await expect(addItem('2026-11', itemInput())).rejects.toThrow(/Start this month/);
    await expect(addItem(M, itemInput({ dueDate: '2026-11-01' }))).rejects.toThrow(/in this month/);
  });

  it('records a payment and settles atomically', async () => {
    const id = await addItem(M, itemInput({ name: 'Electricity', planned: pesos(10000) }));
    await recordPayment(id, { amount: pesos(9650), date: `${M}-12`, accountId: cash, note: '', settle: true });
    const s = await monthSummary();
    expect(s.items[0]).toMatchObject({ paid: pesos(9650), state: 'settled', underspent: pesos(350) });
    expect((await db.transactions.toArray())[0]).toMatchObject({ description: 'Electricity', type: 'expense', budgetItemId: id });
  });

  it('rejects a payment dated outside the item month and leaves nothing behind', async () => {
    const id = await addItem(M, itemInput());
    await expect(recordPayment(id, { amount: 100, date: '2026-11-01', accountId: cash, note: '', settle: true })).rejects.toThrow(/month/);
    expect(await db.transactions.count()).toBe(0);
    expect((await db.budgetItems.get(id))!.settled).toBe(false);
  });

  it('partial payments, reopen and edit plan recompute totals', async () => {
    const id = await addItem(M, itemInput({ kind: 'flexible', name: 'Grocery', planned: pesos(25000), dueDate: null }));
    await recordPayment(id, { amount: pesos(16400), date: `${M}-05`, accountId: cash, note: '', settle: false });
    expect((await monthSummary()).remainingToSettle).toBe(pesos(8600));
    await updateItem(id, itemInput({ kind: 'flexible', name: 'Grocery', planned: pesos(20000), dueDate: null }));
    expect((await monthSummary()).remainingToSettle).toBe(pesos(3600));
    await setItemSettled(id, true);
    expect((await monthSummary()).remainingToSettle).toBe(0);
    await setItemSettled(id, false);
    expect((await monthSummary()).remainingToSettle).toBe(pesos(3600));
  });

  it('deleting an item either removes its payments or keeps them as unplanned', async () => {
    const a = await addItem(M, itemInput({ name: 'A' }));
    const b = await addItem(M, itemInput({ name: 'B', categoryId: food }));
    await recordPayment(a, { amount: pesos(100), date: `${M}-01`, accountId: cash, note: '', settle: false });
    await recordPayment(b, { amount: pesos(200), date: `${M}-01`, accountId: cash, note: '', settle: false });

    await deleteItem(a, 'delete');
    await deleteItem(b, 'keep-unplanned');
    const txs = await db.transactions.toArray();
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({ budgetItemId: null, categoryId: food, amount: pesos(200) });
    const s = await monthSummary();
    expect(s.unplannedSpent).toBe(pesos(200));
    expect(s.plannedExpenses).toBe(0);
  });

  it('deleting a payment restores the remaining amount', async () => {
    const id = await addItem(M, itemInput());
    const tx = await recordPayment(id, { amount: pesos(4000), date: `${M}-02`, accountId: cash, note: '', settle: false });
    await deleteTransaction(tx);
    expect((await monthSummary()).remainingToSettle).toBe(pesos(10000));
  });
});

describe('income lines', () => {
  beforeEach(async () => {
    await startMonth(M, { fromTemplates: false });
  });

  it('received amounts replace the expectation; deletion modes', async () => {
    const a = await addIncome(M, { name: 'Salary 15th', expected: pesos(42500), expectedDate: `${M}-15`, accountId: cash });
    const b = await addIncome(M, { name: 'Salary 30th', expected: pesos(42500), expectedDate: null, accountId: null });
    await recordIncome(a, { amount: pesos(42000), date: `${M}-15`, accountId: cash, note: '' });
    expect((await monthSummary()).availableFunds).toBe(pesos(84500));

    await recordIncome(b, { amount: pesos(1000), date: `${M}-30`, accountId: cash, note: '' });
    await deleteIncome(b, 'keep-extra');
    let s = await monthSummary();
    expect(s.extraIncome).toBe(pesos(1000));
    expect(s.availableFunds).toBe(pesos(43000));

    await deleteIncome(a, 'delete');
    s = await monthSummary();
    expect(s.availableFunds).toBe(pesos(1000));
  });

  it('extra income without a line is allowed', async () => {
    await addTransaction({ type: 'income', date: `${M}-20`, amount: pesos(500), budgetItemId: null, incomeItemId: null, goalId: null, categoryId: null, accountId: cash, description: 'Sold old phone', note: '' });
    expect((await monthSummary()).extraIncome).toBe(pesos(500));
  });
});
