import { describe, expect, it } from 'vitest';
import { backupCounts, checkBackup, makeBackup, type BackupData } from './backup';
import { csvCell, transactionsCsv } from './csv';
import type { Transaction } from './types';

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: 't1', date: '2026-10-05', monthId: '2026-10', type: 'expense', amount: 18000, budgetItemId: null, incomeItemId: null, goalId: null,
  categoryId: 'food', accountId: 'cash', description: 'Lunch', note: '', receiptRef: '', createdAt: '2026-10-05T01:00:00Z', updatedAt: '', ...over,
});

function sample(): BackupData {
  return {
    settings: [{ id: 'app', dueSoonDays: 5, backupReminderDays: 14, lastBackupAt: null }],
    categories: [{ id: 'food', name: 'Food', icon: 'restaurant', archived: false, order: 0 }],
    accounts: [{ id: 'cash', name: 'Cash', icon: 'payments', archived: false, order: 0 }],
    templates: [],
    months: [{ id: '2026-10', status: 'open', createdAt: '', closedAt: null, closeResolution: null }],
    budgetItems: [{ id: 'b1', monthId: '2026-10', templateId: null, kind: 'flexible', name: 'Groceries', categoryId: 'food', planned: 800000, dueDate: null, accountId: null, autoPay: false, settled: false, note: '', order: 0 }],
    incomeItems: [],
    goals: [],
    goalPlans: [],
    transactions: [tx(), tx({ id: 't2', budgetItemId: 'b1', categoryId: null, description: 'SM, weekly' })],
  };
}
const text = (d: BackupData) => JSON.stringify(makeBackup(d, '2026-10-31T10:00:00.000Z'));

describe('checkBackup', () => {
  it('accepts a valid backup and counts it', () => {
    const r = checkBackup(text(sample()));
    expect(r.ok).toBe(true);
    expect(backupCounts(r.backup!.data)).toEqual({ months: 1, transactions: 2, goals: 0, recurring: 0 });
  });

  it('rejects junk, other apps and newer formats', () => {
    expect(checkBackup('not json').errors[0]).toMatch(/valid JSON/);
    expect(checkBackup('{"app":"other"}').errors[0]).toMatch(/isn't a Budgeta backup/);
    expect(checkBackup(JSON.stringify({ ...makeBackup(sample(), ''), format: 99 })).errors[0]).toMatch(/newer version/);
  });

  it('rejects missing tables, damaged records and broken links', () => {
    const noTx = JSON.parse(text(sample()));
    delete noTx.data.transactions;
    expect(checkBackup(JSON.stringify(noTx)).errors[0]).toMatch(/missing "transactions"/);

    const badAmount = sample();
    badAmount.transactions[0]!.amount = 1.5;
    expect(checkBackup(text(badAmount)).ok).toBe(false);

    const brokenLink = sample();
    brokenLink.transactions[1]!.budgetItemId = 'gone';
    expect(checkBackup(text(brokenLink)).errors[0]).toMatch(/Transaction #2/);

    const wrongMonth = sample();
    wrongMonth.transactions[0]!.monthId = '2026-11';
    expect(checkBackup(text(wrongMonth)).ok).toBe(false);
  });
});

describe('CSV export', () => {
  it('escapes text and neutralises formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('-5 off')).toBe("'-5 off");
  });

  it('writes signed amounts and resolved names', () => {
    const d = sample();
    const csv = transactionsCsv([...d.transactions, tx({ id: 't3', type: 'income', amount: 4250000, categoryId: null, description: 'Salary', date: '2026-10-15' })], {
      categories: new Map(d.categories.map((c) => [c.id, c])),
      accounts: new Map(d.accounts.map((a) => [a.id, a])),
      items: new Map(d.budgetItems.map((i) => [i.id, i])),
      income: new Map(),
      goals: new Map(),
    });
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[0]).toBe('Date,Type,Amount (PHP),Description,Category,Budget line,Income line,Savings goal,Account,Note,Receipt ref');
    expect(lines[1]).toBe('2026-10-05,Expense,-180.00,Lunch,Food,Unplanned,,,Cash,,');
    expect(lines[2]).toBe('2026-10-05,Expense,-180.00,"SM, weekly",Food,Groceries,,,Cash,,');
    expect(lines[3]).toBe('2026-10-15,Income,42500.00,Salary,,,,,Cash,,');
  });
});
