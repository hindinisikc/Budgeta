import { db } from '../db';
import { isValidDateStr, monthOf, type MonthId } from '../../domain/dates';
import { newId, nowIso } from '../../domain/id';
import type { BudgetItem } from '../../domain/types';
import { check, checkAccount, checkAmount, checkCategory, cleanName, cleanNote } from './guards';

export type ItemInput = Pick<BudgetItem, 'kind' | 'name' | 'categoryId' | 'planned' | 'dueDate' | 'accountId' | 'autoPay' | 'note'>;

async function clean(monthId: MonthId, input: ItemInput): Promise<ItemInput> {
  checkAmount(input.planned, 'Planned amount');
  await checkCategory(input.categoryId, { required: true });
  await checkAccount(input.accountId);
  const dueDate = input.kind === 'bill' ? input.dueDate : null;
  if (dueDate) {
    check(isValidDateStr(dueDate), 'Enter a valid due date.');
    check(monthOf(dueDate) === monthId, 'The due date must be in this month.');
  }
  return {
    kind: input.kind,
    name: cleanName(input.name),
    categoryId: input.categoryId,
    planned: input.planned,
    dueDate,
    accountId: input.accountId,
    autoPay: input.kind === 'bill' ? input.autoPay : false,
    note: cleanNote(input.note),
  };
}

const TABLES = [db.months, db.budgetItems, db.categories, db.accounts];

export async function addItem(monthId: MonthId, input: ItemInput): Promise<string> {
  return db.transaction('rw', TABLES, async () => {
    check(await db.months.get(monthId), 'Start this month before adding items.');
    const data = await clean(monthId, input);
    const existing = await db.budgetItems.where('monthId').equals(monthId).toArray();
    const order = existing.reduce((max, i) => Math.max(max, i.order), -1) + 1;
    const id = newId();
    await db.budgetItems.add({ id, monthId, templateId: null, settled: false, order, ...data });
    return id;
  });
}

export async function updateItem(id: string, input: ItemInput): Promise<void> {
  await db.transaction('rw', TABLES, async () => {
    const item = await db.budgetItems.get(id);
    check(item, 'That budget item no longer exists.');
    await db.budgetItems.update(id, await clean(item.monthId, input));
  });
}

export async function setItemSettled(id: string, settled: boolean): Promise<void> {
  const updated = await db.budgetItems.update(id, { settled });
  check(updated, 'That budget item no longer exists.');
}

/** Unticks an item: removes all its payments and reopens it, in one step. Returns how many were removed. */
export async function markUnpaid(id: string): Promise<number> {
  return db.transaction('rw', [db.budgetItems, db.transactions], async () => {
    const item = await db.budgetItems.get(id);
    check(item, 'That budget item no longer exists.');
    const removed = await db.transactions.where('budgetItemId').equals(id).delete();
    await db.budgetItems.update(id, { settled: false });
    return removed;
  });
}

/**
 * Applies a plan suggestion: sets this month's planned amount and, when the line comes from a recurring
 * item, that item's default too, so future months start with the better number.
 */
export async function applyPlanSuggestion(itemId: string, amount: number): Promise<void> {
  checkAmount(amount, 'Planned amount');
  await db.transaction('rw', [db.budgetItems, db.templates], async () => {
    const item = await db.budgetItems.get(itemId);
    check(item, 'That budget item no longer exists.');
    await db.budgetItems.update(itemId, { planned: amount });
    if (item.templateId && (await db.templates.get(item.templateId))) await db.templates.update(item.templateId, { defaultAmount: amount });
  });
}

/**
 * Deletes a budget item. Its payments are either deleted too, or kept as unplanned expenses
 * (in the item's category) so the money spent is still on record.
 */
export async function deleteItem(id: string, payments: 'delete' | 'keep-unplanned'): Promise<void> {
  await db.transaction('rw', [db.budgetItems, db.transactions], async () => {
    const item = await db.budgetItems.get(id);
    if (!item) return;
    const linked = db.transactions.where('budgetItemId').equals(id);
    if (payments === 'delete') await linked.delete();
    else await linked.modify({ budgetItemId: null, categoryId: item.categoryId, updatedAt: nowIso() });
    await db.budgetItems.delete(id);
  });
}
