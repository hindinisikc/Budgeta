/** CSV export of transactions, for Excel / Google Sheets. */
import type { BudgetItem, Category, Goal, IncomeItem, Account, Transaction } from './types';

export interface CsvLookups {
  categories: Map<string, Category>;
  accounts: Map<string, Account>;
  items: Map<string, BudgetItem>;
  income: Map<string, IncomeItem>;
  goals: Map<string, Goal>;
}

const TYPE_LABEL: Record<Transaction['type'], string> = {
  expense: 'Expense',
  income: 'Income',
  contribution: 'To savings',
  withdrawal: 'From savings',
};

/** Quotes a cell when needed and neutralises spreadsheet formulas (=, +, -, @) in text fields. */
export function csvCell(value: string | number): string {
  if (typeof value === 'number') return String(value);
  let s = value;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Money leaves the account as negative (expense, to savings) and arrives positive (income, from savings). */
function signedPesos(t: Transaction): number {
  const sign = t.type === 'expense' || t.type === 'contribution' ? -1 : 1;
  return (sign * t.amount) / 100;
}

export function transactionsCsv(transactions: Transaction[], l: CsvLookups): string {
  const header = ['Date', 'Type', 'Amount (PHP)', 'Description', 'Category', 'Budget line', 'Income line', 'Savings goal', 'Account', 'Note', 'Receipt ref'];
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map((t) => {
      const item = t.budgetItemId ? l.items.get(t.budgetItemId) : undefined;
      const categoryId = t.categoryId ?? item?.categoryId;
      // The amount is a plain number, so it skips formula neutralising (a leading "-" is a real minus sign).
      return [
        t.date,
        TYPE_LABEL[t.type],
        { raw: signedPesos(t).toFixed(2) },
        t.description,
        categoryId ? (l.categories.get(categoryId)?.name ?? '') : '',
        item?.name ?? (t.type === 'expense' ? 'Unplanned' : ''),
        t.incomeItemId ? (l.income.get(t.incomeItemId)?.name ?? '') : '',
        t.goalId ? (l.goals.get(t.goalId)?.name ?? '') : '',
        t.accountId ? (l.accounts.get(t.accountId)?.name ?? '') : '',
        t.note,
        t.receiptRef,
      ].map((c) => (typeof c === 'object' ? c.raw : csvCell(c)));
    });
  // Leading BOM so Excel reads UTF-8 (names with ñ, ₱) correctly; CRLF line endings for Excel.
  return '﻿' + [header.map(csvCell), ...rows].map((r) => r.join(',')).join('\r\n');
}
