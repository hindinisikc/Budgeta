import { db } from '../db';
import { isValidDateStr, monthOf, type MonthId } from '../../domain/dates';
import { newId, nowIso } from '../../domain/id';
import type { IncomeItem } from '../../domain/types';
import { check, checkAccount, checkAmount, cleanName } from './guards';

export type IncomeInput = Pick<IncomeItem, 'name' | 'expected' | 'expectedDate' | 'accountId'>;

async function clean(monthId: MonthId, input: IncomeInput): Promise<IncomeInput> {
  checkAmount(input.expected, 'Expected amount');
  await checkAccount(input.accountId);
  if (input.expectedDate) {
    check(isValidDateStr(input.expectedDate), 'Enter a valid date.');
    check(monthOf(input.expectedDate) === monthId, 'The expected date must be in this month.');
  }
  return { name: cleanName(input.name), expected: input.expected, expectedDate: input.expectedDate, accountId: input.accountId };
}

/** source 'opening' = money already in hand for this month (used by "one month ahead" months). */
export async function addIncome(monthId: MonthId, input: IncomeInput, source: 'regular' | 'opening' = 'regular'): Promise<string> {
  return db.transaction('rw', [db.months, db.incomeItems, db.accounts], async () => {
    check(await db.months.get(monthId), 'Start this month before adding income.');
    const data = await clean(monthId, input);
    const existing = await db.incomeItems.where('monthId').equals(monthId).toArray();
    const order = existing.reduce((max, i) => Math.max(max, i.order), -1) + 1;
    const id = newId();
    await db.incomeItems.add({ id, monthId, templateId: null, source, order, ...data });
    return id;
  });
}

export async function updateIncome(id: string, input: IncomeInput): Promise<void> {
  await db.transaction('rw', [db.incomeItems, db.accounts], async () => {
    const income = await db.incomeItems.get(id);
    check(income, 'That income line no longer exists.');
    await db.incomeItems.update(id, await clean(income.monthId, input));
  });
}

/** Deletes an income line; money already received is either deleted or kept as extra income. */
export async function deleteIncome(id: string, receipts: 'delete' | 'keep-extra'): Promise<void> {
  await db.transaction('rw', [db.incomeItems, db.transactions], async () => {
    const linked = db.transactions.where('incomeItemId').equals(id);
    if (receipts === 'delete') await linked.delete();
    else await linked.modify({ incomeItemId: null, updatedAt: nowIso() });
    await db.incomeItems.delete(id);
  });
}
