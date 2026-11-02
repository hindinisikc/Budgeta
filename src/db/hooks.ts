/** Live (auto-refreshing) reads. Components re-render whenever the underlying records change. */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { fundingFor } from './funding';
import { DEFAULT_SETTINGS } from './seed';
import { summarizeMonth, type Funding, type MonthSummary } from '../domain/calc';
import { addMonths, monthOf, todayStr, type MonthId } from '../domain/dates';
import { dueEntries, type DueEntry } from '../domain/due';
import type { Account, BudgetItem, Category, GoalPlan, IncomeItem, Month, Settings, Template, Transaction } from '../domain/types';

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export interface MonthRecords {
  month: Month | undefined;
  items: BudgetItem[];
  incomeItems: IncomeItem[];
  goalPlans: GoalPlan[];
  transactions: Transaction[];
  /** One month ahead: last month's paydays this month runs on (null for normal months). */
  funding: Funding | null;
}

/** Everything belonging to one month. `undefined` while loading. */
export function useMonthRecords(monthId: MonthId): MonthRecords | undefined {
  return useLiveQuery(async () => {
    const [month, items, incomeItems, goalPlans, transactions] = await Promise.all([
      db.months.get(monthId),
      db.budgetItems.where('monthId').equals(monthId).toArray(),
      db.incomeItems.where('monthId').equals(monthId).toArray(),
      db.goalPlans.where('monthId').equals(monthId).toArray(),
      db.transactions.where('monthId').equals(monthId).toArray(),
    ]);
    const funding = await fundingFor(month);
    return { month, items: items.sort(byOrder), incomeItems: incomeItems.sort(byOrder), goalPlans, transactions, funding };
  }, [monthId]);
}

export interface Lookups {
  categories: Category[];
  accounts: Account[];
  categoryById: Map<string, Category>;
  accountById: Map<string, Account>;
  settings: Settings;
}

/** Categories, accounts (incl. archived, for labelling history) and settings. */
export function useLookups(): Lookups | undefined {
  return useLiveQuery(async () => {
    const [categories, accounts, settings] = await Promise.all([
      db.categories.orderBy('order').toArray(),
      db.accounts.orderBy('order').toArray(),
      db.settings.get('app'),
    ]);
    return {
      categories,
      accounts,
      categoryById: new Map(categories.map((c) => [c.id, c])),
      accountById: new Map(accounts.map((a) => [a.id, a])),
      settings: settings ?? DEFAULT_SETTINGS,
    };
  }, []);
}

export function useTemplates(): Template[] | undefined {
  return useLiveQuery(() => db.templates.orderBy('order').toArray(), []);
}

/**
 * Bills and income due now or soon, relative to today: this month plus last month if it's still open
 * (so unpaid bills from a month you haven't closed keep showing as overdue).
 */
export function useDueEntries(): DueEntry[] | undefined {
  return useLiveQuery(async () => {
    const today = todayStr();
    const current = monthOf(today);
    const settings = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
    const entries: DueEntry[] = [];
    for (const monthId of [addMonths(current, -1), current]) {
      const month = await db.months.get(monthId);
      if (!month || month.status !== 'open') continue;
      const [items, incomeItems, goalPlans, transactions] = await Promise.all([
        db.budgetItems.where('monthId').equals(monthId).toArray(),
        db.incomeItems.where('monthId').equals(monthId).toArray(),
        db.goalPlans.where('monthId').equals(monthId).toArray(),
        db.transactions.where('monthId').equals(monthId).toArray(),
      ]);
      const s = summarizeMonth({ items, incomeItems, goalPlans, transactions });
      entries.push(...dueEntries(s.items, s.income, today, settings.dueSoonDays));
    }
    return entries;
  }, []);
}

export interface MonthPoint {
  monthId: MonthId;
  started: boolean;
  summary: MonthSummary;
}

/** Summaries for the `count` months ending at `endMonth` (oldest first). Unstarted months summarize to zeros. */
export function useMonthRange(endMonth: MonthId, count: number): MonthPoint[] | undefined {
  return useLiveQuery(async () => {
    const months = Array.from({ length: count }, (_, i) => addMonths(endMonth, i - count + 1));
    const start = months[0]!;
    const [monthRows, items, incomeItems, goalPlans, transactions] = await Promise.all([
      db.months.where('id').between(start, endMonth, true, true).toArray(),
      db.budgetItems.where('monthId').between(start, endMonth, true, true).toArray(),
      db.incomeItems.where('monthId').between(start, endMonth, true, true).toArray(),
      db.goalPlans.where('monthId').between(start, endMonth, true, true).toArray(),
      db.transactions.where('monthId').between(start, endMonth, true, true).toArray(),
    ]);
    const fundings = await Promise.all(months.map((m) => fundingFor(monthRows.find((r) => r.id === m))));
    return months.map((m, i) => ({
      monthId: m,
      started: monthRows.some((r) => r.id === m),
      summary: summarizeMonth({
        funding: fundings[i],
        items: items.filter((i) => i.monthId === m),
        incomeItems: incomeItems.filter((i) => i.monthId === m),
        goalPlans: goalPlans.filter((p) => p.monthId === m),
        transactions: transactions.filter((t) => t.monthId === m),
      }),
    }));
  }, [endMonth, count]);
}
