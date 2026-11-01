/**
 * Input rules shared by every write path. Pure functions returning human-readable errors,
 * so the same rules back the database layer and the forms.
 */
import { isValidDateStr, monthOf } from './dates';
import { isValidAmount } from './money';
import type { BudgetItem, IncomeItem, TransactionType } from './types';

export const NAME_MAX = 40;
export const DESCRIPTION_MAX = 80;
export const NOTE_MAX = 200;

export function validateName(name: string, label = 'Name'): string | null {
  const trimmed = name.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length > NAME_MAX) return `${label} must be ${NAME_MAX} characters or fewer.`;
  return null;
}

export interface TransactionDraft {
  type: TransactionType;
  date: string;
  amount: number;
  budgetItemId: string | null;
  incomeItemId: string | null;
  goalId: string | null;
  categoryId: string | null;
  accountId: string | null;
  description: string;
  note: string;
}

/** Looked-up records the draft points at (undefined = id given but not found). */
export interface TransactionRefs {
  budgetItem?: BudgetItem;
  incomeItem?: IncomeItem;
  goalExists?: boolean;
  categoryExists?: boolean;
  accountExists?: boolean;
}

export function validateTransaction(d: TransactionDraft, refs: TransactionRefs): string[] {
  const errors: string[] = [];
  if (!isValidAmount(d.amount)) errors.push('Enter an amount greater than ₱0.');
  if (!isValidDateStr(d.date)) {
    errors.push('Enter a valid date.');
    return errors; // month checks below depend on a valid date
  }
  const month = monthOf(d.date);

  if (d.accountId && !refs.accountExists) errors.push('Selected account no longer exists.');
  if (d.description.length > DESCRIPTION_MAX) errors.push(`Description must be ${DESCRIPTION_MAX} characters or fewer.`);
  if (d.note.length > NOTE_MAX) errors.push(`Note must be ${NOTE_MAX} characters or fewer.`);

  const onlyAllowed = (allowed: Array<keyof TransactionDraft>) => {
    const links: Array<keyof TransactionDraft> = ['budgetItemId', 'incomeItemId', 'goalId', 'categoryId'];
    for (const key of links) if (d[key] && !allowed.includes(key)) errors.push(`A ${d.type} can't have ${key}.`);
  };

  switch (d.type) {
    case 'expense':
      onlyAllowed(['budgetItemId', 'categoryId']);
      if (d.budgetItemId) {
        if (!refs.budgetItem) errors.push('Selected budget item no longer exists.');
        else if (refs.budgetItem.monthId !== month) errors.push("The date must fall in the budget item's month.");
      } else if (!d.categoryId) {
        errors.push('Pick a budget item, or a category for an unplanned expense.');
      } else if (!refs.categoryExists) {
        errors.push('Selected category no longer exists.');
      }
      break;
    case 'income':
      onlyAllowed(['incomeItemId']);
      if (d.incomeItemId) {
        if (!refs.incomeItem) errors.push('Selected income line no longer exists.');
        else if (refs.incomeItem.monthId !== month) errors.push("The date must fall in the income line's month.");
      }
      break;
    case 'contribution':
    case 'withdrawal':
      onlyAllowed(['goalId']);
      if (!d.goalId) errors.push('Pick a savings goal.');
      else if (!refs.goalExists) errors.push('Selected savings goal no longer exists.');
      break;
  }
  return errors;
}
