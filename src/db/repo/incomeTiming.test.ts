import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { summarizeMonth } from '../../domain/calc';
import { pesos } from '../../domain/money';
import { addIncome } from './incomeItems';
import { closeMonth, loadMonthData, startMonth } from './months';
import { setIncomeTiming } from './settings';
import { addTemplate } from './templates';
import { recordIncome } from './transactions';

const NOV = '2026-11';
const DEC = '2026-12';
const summary = async (m: string) => summarizeMonth(await loadMonthData(m));

beforeEach(async () => {
  await db.delete();
  await db.open();
  const base = { categoryId: null, accountId: null, autoPay: false, active: true, note: '' };
  await addTemplate({ ...base, kind: 'income', name: 'Salary (15th)', defaultAmount: pesos(13000), dueDay: 15 });
  await addTemplate({ ...base, kind: 'income', name: 'Sideline', defaultAmount: pesos(70000), dueDay: 27 });
  await addTemplate({ ...base, kind: 'income', name: 'Salary (30th)', defaultAmount: pesos(13000), dueDay: 30 });
  const rent = (await db.categories.filter((c) => c.name === 'Housing').first())!.id;
  await addTemplate({ ...base, kind: 'bill', name: 'Rent', categoryId: rent, defaultAmount: pesos(10000), dueDay: 30 });
});

async function receiveAll(monthId: string, amounts: Record<string, number>) {
  for (const line of await db.incomeItems.where('monthId').equals(monthId).toArray()) {
    const amt = amounts[line.name];
    if (amt) await recordIncome(line.id, { amount: pesos(amt), date: line.expectedDate!, accountId: null, note: '' });
  }
}

describe('live one month ahead', () => {
  it('November stays a normal month; December runs on what November actually paid', async () => {
    await startMonth(NOV, { fromTemplates: true }); // started before the setting: normal month
    await setIncomeTiming('next-month', NOV);
    expect((await summary(NOV)).funding).toBeNull();
    expect((await summary(NOV)).availableFunds).toBe(pesos(96000));

    await receiveAll(NOV, { 'Salary (15th)': 13000, Sideline: 78000 }); // the 30th not marked yet
    await startMonth(DEC, { fromTemplates: true });
    expect((await db.months.get(DEC))!.fundedBy).toBe('previous-month');

    let dec = await summary(DEC);
    expect(dec.funding).toEqual({ fromMonth: NOV, expected: pesos(96000), received: pesos(91000), funds: pesos(104000) });
    expect(dec.availableFunds).toBe(pesos(104000));
    expect(dec.margin).toBe(pesos(104000 - 10000));
    expect(dec.earnings).toEqual({ expected: pesos(96000), received: 0 }); // December's paydays → January

    // Marking November's 30th late updates December live.
    await receiveAll(NOV, { 'Salary (30th)': 12500 });
    dec = await summary(DEC);
    expect(dec.funding!.funds).toBe(pesos(103500));

    // December's own paydays don't change December's money.
    await receiveAll(DEC, { 'Salary (15th)': 13000 });
    expect((await summary(DEC)).availableFunds).toBe(pesos(103500));
  });

  it('money already in hand and carry-overs fund the month itself', async () => {
    await startMonth(NOV, { fromTemplates: true });
    await setIncomeTiming('next-month', NOV);
    await startMonth(DEC, { fromTemplates: true });
    await addIncome(DEC, { name: 'Cash on hand', expected: pesos(2000), expectedDate: null, accountId: null }, 'opening');
    const dec = await summary(DEC);
    expect(dec.availableFunds).toBe(pesos(96000 + 2000));
  });

  it('closing a funded month uses its real margin', async () => {
    await startMonth(NOV, { fromTemplates: true });
    await setIncomeTiming('next-month', NOV);
    await startMonth(DEC, { fromTemplates: true });
    const r = await closeMonth(DEC, { kind: 'carryover' });
    expect(r.amount).toBe(pesos(96000 - 10000));
  });

  it('the switch month cannot carry over into a month funded by its own paydays (no double count)', async () => {
    await startMonth(NOV, { fromTemplates: true }); // normal month
    await setIncomeTiming('next-month', NOV); // December will run on November's paydays
    await expect(closeMonth(NOV, { kind: 'carryover' })).rejects.toThrow(/already runs on November's paydays/);
    const goal = await db.goals.add({ id: 'g', name: 'Emergency Fund', icon: 'shield', target: pesos(200000), monthlyContribution: 0, startMonth: NOV, status: 'active', createdAt: '', order: 0 });
    await expect(closeMonth(NOV, { kind: 'goal', goalId: goal })).rejects.toThrow(/count it twice/);
    expect((await db.months.get(NOV))!.status).toBe('open');
    await closeMonth(NOV, { kind: 'leave' }); // "Leave it" still works
    expect((await db.months.get(NOV))!.status).toBe('closed');
  });

  it('once both months run one month ahead, carry-over works normally', async () => {
    await setIncomeTiming('next-month', '2026-10');
    await startMonth(NOV, { fromTemplates: true });
    await startMonth(DEC, { fromTemplates: true });
    const r = await closeMonth(NOV, { kind: 'carryover' });
    expect(r.kind).toBe('carryover');
  });

  it('turning it off applies to future months only', async () => {
    await setIncomeTiming('next-month', NOV);
    await startMonth(NOV, { fromTemplates: true }); // started after turning on → funded
    await startMonth(DEC, { fromTemplates: true });
    await setIncomeTiming('same-month', NOV);
    expect((await db.months.get(NOV))!.fundedBy).toBe('previous-month'); // current month untouched
    expect((await db.months.get(DEC))!.fundedBy).toBeUndefined(); // future month follows the setting
  });
});
