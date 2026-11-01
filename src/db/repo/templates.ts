import { db } from '../db';
import { newId } from '../../domain/id';
import { STARTER_ITEMS } from '../../domain/suggestions';
import type { Template } from '../../domain/types';
import { check, checkAccount, checkAmount, checkCategory, cleanName, cleanNote } from './guards';

export type TemplateInput = Omit<Template, 'id' | 'order'>;

async function clean(input: TemplateInput): Promise<TemplateInput> {
  const isIncome = input.kind === 'income';
  checkAmount(input.defaultAmount, isIncome ? 'Expected amount' : 'Planned amount');
  await checkCategory(isIncome ? null : input.categoryId, { required: !isIncome });
  await checkAccount(input.accountId);
  const dueDay = input.kind === 'flexible' ? null : input.dueDay;
  check(dueDay === null || (Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31), 'Day of month must be between 1 and 31.');
  return {
    kind: input.kind,
    name: cleanName(input.name),
    categoryId: isIncome ? null : input.categoryId,
    defaultAmount: input.defaultAmount,
    dueDay,
    accountId: input.accountId,
    autoPay: input.kind === 'bill' ? input.autoPay : false,
    active: input.active,
    note: cleanNote(input.note),
  };
}

export async function addTemplate(input: TemplateInput): Promise<string> {
  return db.transaction('rw', [db.templates, db.categories, db.accounts], async () => {
    const data = await clean(input);
    const last = await db.templates.orderBy('order').last();
    const id = newId();
    await db.templates.add({ id, ...data, order: (last?.order ?? -1) + 1 });
    return id;
  });
}

export async function updateTemplate(id: string, input: TemplateInput): Promise<void> {
  await db.transaction('rw', [db.templates, db.categories, db.accounts], async () => {
    check(await db.templates.get(id), 'That recurring item no longer exists.');
    await db.templates.update(id, await clean(input));
  });
}

/** Adds the ticked starter items (with the user's amounts) to the recurring list in one go. */
export async function addStarterTemplates(selections: Array<{ key: string; amount: number }>): Promise<number> {
  return db.transaction('rw', [db.templates, db.categories, db.accounts], async () => {
    const starters = new Map(STARTER_ITEMS.flatMap((g) => g.items).map((i) => [i.key, i]));
    const categories = (await db.categories.toArray()).filter((c) => !c.archived);
    const fallback = categories.find((c) => c.name === 'Others') ?? categories[0];
    let order = ((await db.templates.orderBy('order').last())?.order ?? -1) + 1;
    let added = 0;
    for (const { key, amount } of selections) {
      const s = starters.get(key);
      check(s, 'Unknown starter item.');
      const categoryId = s.categoryName ? (categories.find((c) => c.name.toLowerCase() === s.categoryName!.toLowerCase()) ?? fallback)?.id ?? null : null;
      const data = await clean({ kind: s.kind, name: s.name, categoryId, defaultAmount: amount, dueDay: s.dueDay, accountId: null, autoPay: false, active: true, note: '' });
      await db.templates.add({ id: newId(), ...data, order: order++ });
      added += 1;
    }
    return added;
  });
}

/** Removes the template only. Months already started keep their copies. */
export async function deleteTemplate(id: string): Promise<void> {
  await db.templates.delete(id);
}
