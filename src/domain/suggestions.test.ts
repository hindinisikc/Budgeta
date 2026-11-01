import { describe, expect, it } from 'vitest';
import { summarizeItem } from './calc';
import { pesos } from './money';
import { planSuggestions, suggestedSavings } from './suggestions';
import type { BudgetItem, Transaction } from './types';

const item = (id: string, monthId: string, planned: number, extra: Partial<BudgetItem> = {}): BudgetItem => ({
  id, monthId, templateId: 'tpl-' + (extra.name ?? 'groceries'), kind: 'flexible', name: 'Groceries', categoryId: 'c', planned: pesos(planned),
  dueDate: null, accountId: null, autoPay: false, settled: true, note: '', order: 0, ...extra,
});
const paid = (itemId: string, amount: number): Transaction => ({
  id: 't' + itemId, date: '2026-01-01', monthId: '2026-01', type: 'expense', amount: pesos(amount), budgetItemId: itemId, incomeItemId: null,
  goalId: null, categoryId: null, accountId: null, description: '', note: '', receiptRef: '', createdAt: '', updatedAt: '',
});
const month = (it: BudgetItem, amount: number) => [summarizeItem(it, amount ? [paid(it.id, amount)] : [])];

describe('suggestedSavings', () => {
  it('is 20% of income, rounded down to ₱100', () => {
    expect(suggestedSavings(pesos(85000))).toBe(pesos(17000));
    expect(suggestedSavings(pesos(12345))).toBe(pesos(2400));
    expect(suggestedSavings(0)).toBe(0);
  });
});

describe('planSuggestions', () => {
  const current = item('now', '2026-10', 25000, { settled: false });

  it('suggests the rounded average when clearly off plan', () => {
    const past = [month(item('sep', '2026-09', 25000), 27800), month(item('aug', '2026-08', 25000), 26900), month(item('jul', '2026-07', 25000), 27200)];
    expect(planSuggestions([current], past)).toEqual([
      { itemId: 'now', name: 'Groceries', planned: pesos(25000), average: pesos(27300), months: 3, suggested: pesos(27300) },
    ]);
  });

  it('needs at least two months with spending', () => {
    expect(planSuggestions([current], [month(item('sep', '2026-09', 25000), 30000), month(item('aug', '2026-08', 25000), 0)])).toEqual([]);
  });

  it('ignores small differences', () => {
    const past = [month(item('sep', '2026-09', 25000), 25400), month(item('aug', '2026-08', 25000), 24800)];
    expect(planSuggestions([current], past)).toEqual([]);
  });

  it('matches by name when there is no template, and also suggests lowering', () => {
    const noTpl = item('now2', '2026-10', 5000, { name: 'Electricity', kind: 'bill', templateId: null, settled: false });
    const past = [
      month(item('s', '2026-09', 5000, { name: 'electricity', kind: 'bill', templateId: null }), 3900),
      month(item('a', '2026-08', 5000, { name: 'Electricity', kind: 'bill', templateId: null }), 4100),
    ];
    expect(planSuggestions([noTpl], past)[0]).toMatchObject({ average: pesos(4000), suggested: pesos(4000) });
  });
});
