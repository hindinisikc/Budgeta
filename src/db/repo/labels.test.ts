import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { addLabel, removeLabel, restoreLabel, updateLabel } from './labels';

beforeEach(async () => {
  await db.delete();
  await db.open(); // re-runs the first-launch seed
});

describe('seed', () => {
  it('creates default settings, categories and accounts once', async () => {
    expect(await db.settings.get('app')).toMatchObject({ dueSoonDays: 5 });
    expect(await db.categories.count()).toBe(12);
    expect((await db.accounts.orderBy('order').toArray()).map((a) => a.name)).toEqual(['Cash', 'GCash', 'Maya', 'BPI', 'BDO']);
  });
});

describe('labels', () => {
  it('adds with trimmed name at the end of the list', async () => {
    const id = await addLabel('account', { name: '  Union   Bank ', icon: 'account_balance' });
    const acc = await db.accounts.get(id);
    expect(acc).toMatchObject({ name: 'Union Bank', archived: false, order: 5 });
  });

  it('rejects empty and duplicate names (case-insensitive)', async () => {
    await expect(addLabel('category', { name: ' ', icon: 'category' })).rejects.toThrow(/required/);
    await expect(addLabel('category', { name: 'food', icon: 'category' })).rejects.toThrow(/already exists/);
  });

  it('renaming to its own name is fine; to another existing name is not', async () => {
    const food = (await db.categories.filter((c) => c.name === 'Food').first())!;
    await updateLabel('category', food.id, { name: 'FOOD', icon: 'restaurant' });
    expect((await db.categories.get(food.id))!.name).toBe('FOOD');
    await expect(updateLabel('category', food.id, { name: 'Groceries', icon: 'restaurant' })).rejects.toThrow(/already exists/);
  });

  it('deletes unused labels but archives used ones', async () => {
    const [cash, gcash] = await db.accounts.orderBy('order').limit(2).toArray();
    expect(await removeLabel('account', gcash!.id)).toBe('deleted');
    expect(await db.accounts.get(gcash!.id)).toBeUndefined();

    await db.transactions.add({
      id: 't1', date: '2026-10-01', monthId: '2026-10', type: 'income', amount: 100, budgetItemId: null, incomeItemId: null,
      goalId: null, categoryId: null, accountId: cash!.id, description: '', note: '', receiptRef: '', createdAt: '', updatedAt: '',
    });
    expect(await removeLabel('account', cash!.id)).toBe('archived');
    expect((await db.accounts.get(cash!.id))!.archived).toBe(true);

    // Archived names still block duplicates, with a hint to restore.
    await expect(addLabel('account', { name: 'cash', icon: 'payments' })).rejects.toThrow(/Restore it/);
    await restoreLabel('account', cash!.id);
    expect((await db.accounts.get(cash!.id))!.archived).toBe(false);
  });
});
