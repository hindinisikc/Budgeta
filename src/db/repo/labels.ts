/**
 * Categories and accounts share the same shape and rules ("labels"):
 * - names are trimmed, required, and unique (case-insensitive, archived ones included);
 * - removing a label that any record still uses archives it instead, so history keeps its label.
 */
import type { EntityTable } from 'dexie';
import { db } from '../db';
import { newId } from '../../domain/id';
import { validateName } from '../../domain/validate';
import type { Account, Category } from '../../domain/types';
import { ValidationError } from './errors';

type Label = Category | Account;
export type LabelKind = 'category' | 'account';
export interface LabelInput {
  name: string;
  icon: string;
}

function table(kind: LabelKind): EntityTable<Label, 'id'> {
  return (kind === 'category' ? db.categories : db.accounts) as EntityTable<Label, 'id'>;
}

const noun = (kind: LabelKind) => (kind === 'category' ? 'category' : 'account');

async function checkInput(kind: LabelKind, input: LabelInput, selfId?: string): Promise<LabelInput> {
  const name = input.name.trim().replace(/\s+/g, ' ');
  const error = validateName(name);
  if (error) throw new ValidationError(error);
  if (!input.icon) throw new ValidationError('Pick an icon.');
  const clash = await table(kind)
    .filter((l) => l.id !== selfId && l.name.toLowerCase() === name.toLowerCase())
    .first();
  if (clash) {
    throw new ValidationError(
      clash.archived
        ? `An archived ${noun(kind)} named "${clash.name}" exists. Restore it instead.`
        : `A ${noun(kind)} named "${clash.name}" already exists.`,
    );
  }
  return { name, icon: input.icon };
}

export async function addLabel(kind: LabelKind, input: LabelInput): Promise<string> {
  return db.transaction('rw', table(kind), async () => {
    const clean = await checkInput(kind, input);
    const last = await table(kind).orderBy('order').last();
    const id = newId();
    await table(kind).add({ id, ...clean, archived: false, order: (last?.order ?? -1) + 1 });
    return id;
  });
}

export async function updateLabel(kind: LabelKind, id: string, input: LabelInput): Promise<void> {
  await db.transaction('rw', table(kind), async () => {
    if (!(await table(kind).get(id))) throw new ValidationError(`That ${noun(kind)} no longer exists.`);
    const clean = await checkInput(kind, input, id);
    await table(kind).update(id, clean);
  });
}

/** Number of records (templates, budget items, income lines, transactions) pointing at the label. */
export async function countLabelUsage(kind: LabelKind, id: string): Promise<number> {
  if (kind === 'category') {
    const counts = await Promise.all([
      db.templates.where('categoryId').equals(id).count(),
      db.budgetItems.where('categoryId').equals(id).count(),
      db.transactions.where('categoryId').equals(id).count(),
    ]);
    return counts.reduce((a, b) => a + b, 0);
  }
  const counts = await Promise.all([
    db.templates.where('accountId').equals(id).count(),
    db.budgetItems.where('accountId').equals(id).count(),
    db.incomeItems.where('accountId').equals(id).count(),
    db.transactions.where('accountId').equals(id).count(),
  ]);
  return counts.reduce((a, b) => a + b, 0);
}

/** Deletes an unused label; archives one that is in use. */
export async function removeLabel(kind: LabelKind, id: string): Promise<'deleted' | 'archived'> {
  return db.transaction('rw', [table(kind), db.templates, db.budgetItems, db.incomeItems, db.transactions], async () => {
    if ((await countLabelUsage(kind, id)) > 0) {
      await table(kind).update(id, { archived: true });
      return 'archived';
    }
    await table(kind).delete(id);
    return 'deleted';
  });
}

export async function restoreLabel(kind: LabelKind, id: string): Promise<void> {
  await table(kind).update(id, { archived: false });
}
