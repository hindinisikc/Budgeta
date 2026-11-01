import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { pesos } from '../../domain/money';
import { addItem } from './budgetItems';
import { addIncome } from './incomeItems';
import { startMonth } from './months';
import { addTransaction, quickAddExpense, recordPayment, updateTransaction } from './transactions';

const M = '2026-10';
let food: string;
let cash: string;
let bill: string;
let pool: string;

beforeEach(async () => {
  await db.delete();
  await db.open();
  food = (await db.categories.filter((c) => c.name === 'Food').first())!.id;
  cash = (await db.accounts.filter((a) => a.name === 'Cash').first())!.id;
  await startMonth(M, { fromTemplates: false });
  await startMonth('2026-11', { fromTemplates: false });
  const base = { categoryId: food, accountId: null, autoPay: false, note: '' };
  bill = await addItem(M, { ...base, kind: 'bill', name: 'Internet', planned: pesos(1799), dueDate: null });
  pool = await addItem(M, { ...base, kind: 'flexible', name: 'Groceries', planned: pesos(8000), dueDate: null });
});

const quick = (over: Partial<Parameters<typeof quickAddExpense>[0]> = {}) =>
  quickAddExpense({ amount: pesos(100), date: `${M}-10`, budgetItemId: null, categoryId: food, accountId: cash, description: '', note: '', ...over });

describe('quickAddExpense', () => {
  it('settles a bill once payments cover the plan, never a pool', async () => {
    await quick({ budgetItemId: bill, amount: pesos(1000) });
    expect((await db.budgetItems.get(bill))!.settled).toBe(false);
    await quick({ budgetItemId: bill, amount: pesos(799) });
    expect((await db.budgetItems.get(bill))!.settled).toBe(true);
    await quick({ budgetItemId: pool, amount: pesos(9000) });
    expect((await db.budgetItems.get(pool))!.settled).toBe(false);
  });

  it('fills a blank description from the item or category and drops the category for linked items', async () => {
    const a = await quick({ budgetItemId: pool });
    const b = await quick();
    expect(await db.transactions.get(a)).toMatchObject({ description: 'Groceries', categoryId: null });
    expect(await db.transactions.get(b)).toMatchObject({ description: 'Food', categoryId: food });
  });

  it('requires a category when unplanned and a date in the item month', async () => {
    await expect(quick({ categoryId: null })).rejects.toThrow(/category/);
    await expect(quick({ budgetItemId: pool, date: '2026-11-01' })).rejects.toThrow(/month/);
  });
});

describe('updateTransaction', () => {
  it('moves an expense to another month only when unlinked', async () => {
    const id = await recordPayment(pool, { amount: pesos(500), date: `${M}-05`, accountId: cash, note: '', settle: false });
    const tx = (await db.transactions.get(id))!;
    const edit = { ...tx, receiptRef: '' };
    await expect(updateTransaction(id, { ...edit, date: '2026-11-02' })).rejects.toThrow(/month/);
    await updateTransaction(id, { ...edit, date: '2026-11-02', budgetItemId: null, categoryId: food });
    expect(await db.transactions.get(id)).toMatchObject({ monthId: '2026-11', budgetItemId: null, categoryId: food });
  });

  it('keeps the type and validates amounts', async () => {
    const line = await addIncome(M, { name: 'Salary', expected: pesos(1000), expectedDate: null, accountId: null });
    const id = await addTransaction({ type: 'income', date: `${M}-15`, amount: pesos(1000), budgetItemId: null, incomeItemId: line, goalId: null, categoryId: null, accountId: cash, description: 'Salary', note: '' });
    const tx = (await db.transactions.get(id))!;
    await expect(updateTransaction(id, { ...tx, amount: 0, receiptRef: '' })).rejects.toThrow(/greater than/);
    await updateTransaction(id, { ...tx, amount: pesos(950), incomeItemId: null, receiptRef: 'OR-1' });
    expect(await db.transactions.get(id)).toMatchObject({ type: 'income', amount: pesos(950), incomeItemId: null, receiptRef: 'OR-1' });
  });
});
