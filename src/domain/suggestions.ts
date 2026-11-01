/**
 * Suggestions Budgeta can offer. Pure functions only; nothing here changes data.
 */
import type { ItemSummary } from './calc';
import type { Centavos } from './money';
import type { BudgetItem, Template } from './types';

// ---- 1. Starter checklist ----------------------------------------------------

export interface StarterItem {
  key: string;
  kind: Template['kind'];
  name: string;
  /** Default category name to look up (null for income). */
  categoryName: string | null;
  dueDay: number | null;
}

/** Common recurring lines for a Filipino household. Amounts are always entered by the user. */
export const STARTER_ITEMS: Array<{ group: string; items: StarterItem[] }> = [
  {
    group: 'Income',
    items: [
      { key: 'salary15', kind: 'income', name: 'Salary (15th)', categoryName: null, dueDay: 15 },
      { key: 'salary30', kind: 'income', name: 'Salary (30th)', categoryName: null, dueDay: 30 },
    ],
  },
  {
    group: 'Bills',
    items: [
      { key: 'rent', kind: 'bill', name: 'Rent', categoryName: 'Housing', dueDay: null },
      { key: 'electricity', kind: 'bill', name: 'Electricity', categoryName: 'Utilities', dueDay: null },
      { key: 'water', kind: 'bill', name: 'Water', categoryName: 'Utilities', dueDay: null },
      { key: 'internet', kind: 'bill', name: 'Internet', categoryName: 'Utilities', dueDay: null },
      { key: 'mobile', kind: 'bill', name: 'Mobile plan / load', categoryName: 'Utilities', dueDay: null },
      { key: 'loan', kind: 'bill', name: 'Loan / credit card', categoryName: 'Debt', dueDay: null },
      { key: 'tuition', kind: 'bill', name: 'Tuition', categoryName: 'Education', dueDay: null },
    ],
  },
  {
    group: 'Spending pools',
    items: [
      { key: 'groceries', kind: 'flexible', name: 'Groceries', categoryName: 'Groceries', dueDay: null },
      { key: 'transport', kind: 'flexible', name: 'Transport', categoryName: 'Transit', dueDay: null },
      { key: 'dining', kind: 'flexible', name: 'Dining out', categoryName: 'Food', dueDay: null },
      { key: 'family', kind: 'flexible', name: 'Family support', categoryName: 'Family', dueDay: null },
      { key: 'personal', kind: 'flexible', name: 'Personal care', categoryName: 'Personal', dueDay: null },
    ],
  },
];

// ---- 2. Savings guideline ------------------------------------------------------

/** Share of income the common 50/30/20 guide puts toward savings. */
export const SAVINGS_GUIDE_SHARE = 0.2;

/** 20% of income, rounded down to the nearest ₱100. */
export function suggestedSavings(income: Centavos): Centavos {
  return Math.floor((income * SAVINGS_GUIDE_SHARE) / 10_000) * 10_000;
}

// ---- 3. Suggestions from history -----------------------------------------------

export interface PlanSuggestion {
  itemId: string;
  name: string;
  planned: Centavos;
  /** Average actually paid over the matched past months. */
  average: Centavos;
  months: number;
  /** Average rounded to the nearest ₱100. */
  suggested: Centavos;
}

/** Minimum past months with spending before a suggestion is made. */
export const MIN_HISTORY = 2;
const MIN_GAP_SHARE = 0.05; // ≥ 5% off plan…
const MIN_GAP = 50_000; // …and at least ₱500

const sameLine = (a: BudgetItem, b: BudgetItem) =>
  a.kind === b.kind && (a.templateId && b.templateId ? a.templateId === b.templateId : a.name.trim().toLowerCase() === b.name.trim().toLowerCase());

/**
 * For each line in `current`, compares its plan with what was actually paid for the same line
 * in past months (most recent first, up to 3). Suggests a new plan when the average is clearly off.
 */
export function planSuggestions(current: BudgetItem[], pastMonths: ItemSummary[][]): PlanSuggestion[] {
  const out: PlanSuggestion[] = [];
  for (const item of current) {
    const paid: Centavos[] = [];
    for (const month of pastMonths.slice(0, 3)) {
      const match = month.find((s) => sameLine(s.item, item));
      if (match && match.paid > 0) paid.push(match.paid);
    }
    if (paid.length < MIN_HISTORY) continue;
    const average = Math.round(paid.reduce((a, b) => a + b, 0) / paid.length);
    const gap = Math.abs(average - item.planned);
    if (gap < MIN_GAP || gap < item.planned * MIN_GAP_SHARE) continue;
    out.push({ itemId: item.id, name: item.name, planned: item.planned, average, months: paid.length, suggested: Math.round(average / 10_000) * 10_000 });
  }
  return out.sort((a, b) => Math.abs(b.average - b.planned) - Math.abs(a.average - a.planned));
}
