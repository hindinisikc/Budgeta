import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { checkBackup } from '../../domain/backup';
import { pesos } from '../../domain/money';
import { exportBackup, markBackedUp, restoreBackup } from './backup';
import { addGoal, contribute } from './goals';
import { startMonth } from './months';
import { addStarterTemplates } from './templates';
import { quickAddExpense } from './transactions';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function makeSomeData() {
  await addStarterTemplates([{ key: 'salary15', amount: pesos(42500) }, { key: 'groceries', amount: pesos(8000) }]);
  await startMonth('2026-10', { fromTemplates: true });
  const item = (await db.budgetItems.toArray())[0]!;
  await quickAddExpense({ amount: pesos(1234.5), date: '2026-10-05', budgetItemId: item.id, categoryId: null, accountId: null, description: 'SM', note: '' });
  const g = await addGoal({ name: 'Emergency', icon: 'shield', target: pesos(10000), monthlyContribution: pesos(1000), startMonth: '2026-10' }, '2026-10');
  await contribute(g, { amount: pesos(500), date: '2026-10-06', accountId: null, note: '' });
}

describe('backup round trip', () => {
  it('export → wipe → restore gives back identical data', async () => {
    await makeSomeData();
    const before = await exportBackup();
    const text = JSON.stringify(before);

    await db.delete();
    await db.open(); // fresh database with only the defaults
    expect(await db.transactions.count()).toBe(0);

    const check = checkBackup(text);
    expect(check.ok).toBe(true);
    await restoreBackup(check.backup!);

    const after = await exportBackup();
    expect(after.data).toEqual(before.data);
  });

  it('a failing restore leaves current data untouched', async () => {
    await makeSomeData();
    const good = await exportBackup();
    const countBefore = await db.transactions.count();
    // Duplicate ids make bulkAdd fail midway.
    const bad = { ...good, data: { ...good.data, transactions: [...good.data.transactions, good.data.transactions[0]!] } };
    await expect(restoreBackup(bad)).rejects.toThrow();
    expect(await db.transactions.count()).toBe(countBefore);
    expect(await db.categories.count()).toBe(good.data.categories.length);
  });

  it('records when the last backup happened', async () => {
    await markBackedUp('2026-10-31T00:00:00.000Z');
    expect((await db.settings.get('app'))!.lastBackupAt).toBe('2026-10-31T00:00:00.000Z');
  });
});
