import { describe, expect, it } from 'vitest';
import { validateName, validateTransaction, type TransactionDraft } from './validate';
import type { BudgetItem } from './types';

const base: TransactionDraft = {
  type: 'expense',
  date: '2026-10-15',
  amount: 18000,
  budgetItemId: null,
  incomeItemId: null,
  goalId: null,
  categoryId: 'food',
  accountId: 'cash',
  description: 'Lunch',
  note: '',
};
const octItem = { id: 'rent', monthId: '2026-10' } as BudgetItem;

describe('validateTransaction', () => {
  it('accepts a valid unplanned expense', () => {
    expect(validateTransaction(base, { categoryExists: true, accountExists: true })).toEqual([]);
  });

  it('rejects zero/negative/fractional amounts and bad dates', () => {
    expect(validateTransaction({ ...base, amount: 0 }, { categoryExists: true, accountExists: true })).toHaveLength(1);
    expect(validateTransaction({ ...base, amount: 1.5 }, { categoryExists: true, accountExists: true })).toHaveLength(1);
    expect(validateTransaction({ ...base, date: '2026-02-30' }, { categoryExists: true, accountExists: true })).toEqual(['Enter a valid date.']);
  });

  it('requires an item or a category for expenses', () => {
    expect(validateTransaction({ ...base, categoryId: null }, { accountExists: true })[0]).toMatch(/budget item, or a category/);
  });

  it('rejects linking to an item from another month', () => {
    const errors = validateTransaction({ ...base, categoryId: null, budgetItemId: 'rent', date: '2026-11-01' }, { budgetItem: octItem, accountExists: true });
    expect(errors[0]).toMatch(/month/);
  });

  it('rejects missing references', () => {
    expect(validateTransaction({ ...base, categoryId: null, budgetItemId: 'x' }, { accountExists: true })[0]).toMatch(/no longer exists/);
    expect(validateTransaction(base, { categoryExists: true, accountExists: false })[0]).toMatch(/account/);
  });

  it('requires a goal for contributions and forbids unrelated links', () => {
    expect(validateTransaction({ ...base, type: 'contribution', categoryId: null }, { accountExists: true })).toContain('Pick a savings goal.');
    expect(validateTransaction({ ...base, type: 'income' }, { accountExists: true }).length).toBeGreaterThan(0);
  });
});

describe('validateName', () => {
  it('trims and limits length', () => {
    expect(validateName('  ')).toMatch(/required/);
    expect(validateName('x'.repeat(41))).toMatch(/40/);
    expect(validateName(' Food ')).toBeNull();
  });
});
