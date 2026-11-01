import { db } from '../db';
import { monthOf, type DateStr } from '../../domain/dates';
import { newId, nowIso } from '../../domain/id';
import type { Centavos } from '../../domain/money';
import type { Transaction } from '../../domain/types';
import { validateTransaction, type TransactionDraft } from '../../domain/validate';
import { ValidationError } from './errors';
import { check } from './guards';

export const TX_TABLES = [db.transactions, db.budgetItems, db.incomeItems, db.goals, db.categories, db.accounts];

async function validated(draft: TransactionDraft): Promise<void> {
  const [budgetItem, incomeItem, goal, category, account] = await Promise.all([
    draft.budgetItemId ? db.budgetItems.get(draft.budgetItemId) : undefined,
    draft.incomeItemId ? db.incomeItems.get(draft.incomeItemId) : undefined,
    draft.goalId ? db.goals.get(draft.goalId) : undefined,
    draft.categoryId ? db.categories.get(draft.categoryId) : undefined,
    draft.accountId ? db.accounts.get(draft.accountId) : undefined,
  ]);
  const errors = validateTransaction(draft, {
    budgetItem,
    incomeItem,
    goalExists: !!goal,
    categoryExists: !!category,
    accountExists: !!account,
  });
  if (errors.length) throw new ValidationError(errors[0]!);
}

/** Validates and stores a transaction. Must run inside a Dexie transaction covering TX_TABLES. */
export async function insertTransaction(draft: TransactionDraft, receiptRef = ''): Promise<string> {
  const clean: TransactionDraft = { ...draft, description: draft.description.trim(), note: draft.note.trim() };
  await validated(clean);
  const now = nowIso();
  const tx: Transaction = { id: newId(), monthId: monthOf(clean.date), receiptRef: receiptRef.trim(), createdAt: now, updatedAt: now, ...clean };
  await db.transactions.add(tx);
  return tx.id;
}

export async function addTransaction(draft: TransactionDraft, receiptRef = ''): Promise<string> {
  return db.transaction('rw', TX_TABLES, () => insertTransaction(draft, receiptRef));
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

export interface PaymentInput {
  amount: Centavos;
  date: DateStr;
  accountId: string | null;
  note: string;
  /** Close the item after this payment (unspent remainder returns to Margin). */
  settle: boolean;
}

/** Records a payment against a budget item and updates its settled flag, atomically. */
export async function recordPayment(itemId: string, input: PaymentInput): Promise<string> {
  return db.transaction('rw', TX_TABLES, async () => {
    const item = await db.budgetItems.get(itemId);
    check(item, 'That budget item no longer exists.');
    const id = await insertTransaction({
      type: 'expense', date: input.date, amount: input.amount, budgetItemId: itemId, incomeItemId: null, goalId: null,
      categoryId: null, accountId: input.accountId, description: item.name, note: input.note,
    });
    if (item.settled !== input.settle) await db.budgetItems.update(itemId, { settled: input.settle });
    return id;
  });
}

export type ReceiptInput = Omit<PaymentInput, 'settle'>;

/** Records money received for an expected income line. */
export async function recordIncome(incomeItemId: string, input: ReceiptInput): Promise<string> {
  return db.transaction('rw', TX_TABLES, async () => {
    const income = await db.incomeItems.get(incomeItemId);
    check(income, 'That income line no longer exists.');
    return insertTransaction({
      type: 'income', date: input.date, amount: input.amount, budgetItemId: null, incomeItemId, goalId: null,
      categoryId: null, accountId: input.accountId, description: income.name, note: input.note,
    });
  });
}

/** Fields a user can change on an existing transaction. The type itself never changes. */
export type TransactionEdit = Omit<TransactionDraft, 'type'> & { receiptRef: string };

/** Edits a transaction, re-validating its links against the (possibly new) date's month. */
export async function updateTransaction(id: string, edit: TransactionEdit): Promise<void> {
  await db.transaction('rw', TX_TABLES, async () => {
    const existing = await db.transactions.get(id);
    check(existing, 'That transaction no longer exists.');
    const { receiptRef, ...rest } = edit;
    const clean: TransactionDraft = { ...rest, type: existing.type, description: rest.description.trim(), note: rest.note.trim() };
    await validated(clean);
    check(receiptRef.trim().length <= 60, 'Receipt reference must be 60 characters or fewer.');
    await db.transactions.update(id, { ...clean, monthId: monthOf(clean.date), receiptRef: receiptRef.trim(), updatedAt: nowIso() });
  });
}

export interface QuickExpenseInput {
  amount: Centavos;
  date: DateStr;
  /** Budget line it counts toward; null = unplanned (then categoryId is required). */
  budgetItemId: string | null;
  categoryId: string | null;
  accountId: string | null;
  description: string;
  note: string;
}

/**
 * Quick Add. A bill is settled automatically once its payments cover the planned amount;
 * spending pools stay open (they're closed from the Budget screen).
 */
export async function quickAddExpense(input: QuickExpenseInput): Promise<string> {
  return db.transaction('rw', TX_TABLES, async () => {
    const item = input.budgetItemId ? await db.budgetItems.get(input.budgetItemId) : undefined;
    const fallbackName = item?.name ?? (input.categoryId ? (await db.categories.get(input.categoryId))?.name : undefined) ?? 'Expense';
    const id = await insertTransaction({
      type: 'expense', date: input.date, amount: input.amount, budgetItemId: input.budgetItemId, incomeItemId: null, goalId: null,
      categoryId: input.budgetItemId ? null : input.categoryId, accountId: input.accountId,
      description: input.description.trim() || fallbackName, note: input.note,
    });
    if (item && item.kind === 'bill' && !item.settled) {
      const paid = (await db.transactions.where('budgetItemId').equals(item.id).toArray()).reduce((s, t) => s + t.amount, 0);
      if (paid >= item.planned) await db.budgetItems.update(item.id, { settled: true });
    }
    return id;
  });
}
