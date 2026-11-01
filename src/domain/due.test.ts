import { describe, expect, it } from 'vitest';
import { summarizeMonth } from './calc';
import { dueEntries, dueLabel } from './due';
import type { BudgetItem, IncomeItem, Transaction } from './types';

const M = '2026-10';
const bill = (id: string, dueDate: string | null, extra: Partial<BudgetItem> = {}): BudgetItem => ({
  id, monthId: M, templateId: null, kind: 'bill', name: id, categoryId: 'c', planned: 1000, dueDate,
  accountId: null, autoPay: false, settled: false, note: '', order: 0, ...extra,
});
const income = (id: string, expectedDate: string | null): IncomeItem => ({
  id, monthId: M, templateId: null, name: id, expected: 5000, expectedDate, accountId: null, source: 'regular', order: 0,
});
const pay = (budgetItemId: string, amount: number): Transaction => ({
  id: `t-${budgetItemId}`, date: `${M}-01`, monthId: M, type: 'expense', amount, budgetItemId, incomeItemId: null, goalId: null,
  categoryId: null, accountId: null, description: '', note: '', receiptRef: '', createdAt: '', updatedAt: '',
});

describe('dueEntries', () => {
  it('lists overdue and due-soon bills and expected income, sorted by date', () => {
    const s = summarizeMonth({
      items: [
        bill('rent', `${M}-30`),
        bill('far', `${M}-31`),
        bill('late', `${M}-20`),
        bill('paid', `${M}-26`, { settled: true }),
        bill('partial', `${M}-27`),
        bill('pool', null, { kind: 'flexible' }),
      ],
      incomeItems: [income('salary', `${M}-25`), income('noDate', null)],
      goalPlans: [],
      transactions: [pay('partial', 400)],
    });
    const due = dueEntries(s.items, s.income, `${M}-25`, 5);
    expect(due.map((d) => [d.name, d.daysUntil, d.amount])).toEqual([
      ['late', -5, 1000],
      ['salary', 0, 5000],
      ['partial', 2, 600],
      ['rent', 5, 1000],
    ]);
  });
});

describe('dueLabel', () => {
  it('words bills and income', () => {
    expect(dueLabel({ kind: 'bill', daysUntil: 0 })).toBe('Due today');
    expect(dueLabel({ kind: 'bill', daysUntil: 1 })).toBe('Due in 1 day');
    expect(dueLabel({ kind: 'bill', daysUntil: -3 })).toBe('3 days overdue');
    expect(dueLabel({ kind: 'income', daysUntil: -2 })).toBe('2 days late');
  });
});
