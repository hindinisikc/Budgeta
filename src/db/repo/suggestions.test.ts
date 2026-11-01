import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { pesos } from '../../domain/money';
import { applyPlanSuggestion } from './budgetItems';
import { startMonth } from './months';
import { dismissSuggestion } from './settings';
import { addStarterTemplates } from './templates';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('starter templates', () => {
  it('adds ticked items with the right kind, category and due day', async () => {
    expect(await addStarterTemplates([{ key: 'salary15', amount: pesos(42500) }, { key: 'rent', amount: pesos(10000) }, { key: 'groceries', amount: pesos(8000) }])).toBe(3);
    const t = await db.templates.orderBy('order').toArray();
    const housing = (await db.categories.filter((c) => c.name === 'Housing').first())!.id;
    expect(t.map((x) => [x.name, x.kind, x.dueDay])).toEqual([['Salary (15th)', 'income', 15], ['Rent', 'bill', null], ['Groceries', 'flexible', null]]);
    expect(t[1]!.categoryId).toBe(housing);
    expect(t[0]!.categoryId).toBeNull();
  });

  it('rejects a ticked item without an amount and adds nothing', async () => {
    await expect(addStarterTemplates([{ key: 'rent', amount: pesos(10000) }, { key: 'water', amount: 0 }])).rejects.toThrow(/greater than/);
    expect(await db.templates.count()).toBe(0);
  });
});

describe('applying a plan suggestion', () => {
  it('updates this month and the recurring default', async () => {
    await addStarterTemplates([{ key: 'groceries', amount: pesos(25000) }]);
    await startMonth('2026-10', { fromTemplates: true });
    const item = (await db.budgetItems.toArray())[0]!;
    await applyPlanSuggestion(item.id, pesos(27300));
    expect((await db.budgetItems.get(item.id))!.planned).toBe(pesos(27300));
    expect((await db.templates.get(item.templateId!))!.defaultAmount).toBe(pesos(27300));
  });

  it('remembers dismissed suggestions', async () => {
    await dismissSuggestion('abc');
    await dismissSuggestion('abc');
    expect((await db.settings.get('app'))!.dismissedSuggestions).toEqual(['abc']);
  });
});
