/**
 * Backup file format and validation. A backup is the complete contents of every table, so restoring
 * one recreates Budgeta exactly. Validation runs before anything is replaced.
 */
import { isValidDateStr, isValidMonthId, monthOf } from './dates';
import type { Account, BudgetItem, Category, Goal, GoalPlan, IncomeItem, Month, Settings, Template, Transaction } from './types';

export const BACKUP_APP = 'budgeta';
/** Bump when the backup layout changes; older formats get a migration in `migrateBackup`. */
export const BACKUP_FORMAT = 1;

export interface BackupData {
  settings: Settings[];
  categories: Category[];
  accounts: Account[];
  templates: Template[];
  months: Month[];
  budgetItems: BudgetItem[];
  incomeItems: IncomeItem[];
  goals: Goal[];
  goalPlans: GoalPlan[];
  transactions: Transaction[];
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  format: number;
  exportedAt: string;
  data: BackupData;
}

export const BACKUP_TABLES = [
  'settings', 'categories', 'accounts', 'templates', 'months', 'budgetItems', 'incomeItems', 'goals', 'goalPlans', 'transactions',
] as const satisfies ReadonlyArray<keyof BackupData>;

export function makeBackup(data: BackupData, exportedAt: string): BackupFile {
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt, data };
}

export function backupFileName(exportedAt: string): string {
  return `budgeta-backup-${exportedAt.slice(0, 10)}.json`;
}

export interface BackupCheck {
  ok: boolean;
  /** Human-readable problems (first few only). */
  errors: string[];
  backup?: BackupFile;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown) => typeof v === 'string' && v.length > 0;
const isMoney = (v: unknown, allowZero = false) => typeof v === 'number' && Number.isSafeInteger(v) && (allowZero ? v >= 0 : v > 0);
const isNullableId = (v: unknown) => v === null || isId(v);

/**
 * Parses and checks a backup file's text. Checks the envelope, every record's essential fields,
 * and that every link (category, account, budget line, goal…) points at a record in the same file.
 */
export function checkBackup(text: string): BackupCheck {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["This file isn't valid JSON."] };
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) return { ok: false, errors: ["This isn't a Budgeta backup file."] };
  if (typeof raw.format !== 'number' || raw.format > BACKUP_FORMAT) {
    return { ok: false, errors: ['This backup was made by a newer version of Budgeta. Update the app first.'] };
  }
  if (!isObj(raw.data)) return { ok: false, errors: ['The backup has no data section.'] };
  const data = raw.data as Record<string, unknown>;
  for (const t of BACKUP_TABLES) if (!Array.isArray(data[t])) return { ok: false, errors: [`The backup is missing "${t}".`] };
  const d = data as unknown as BackupData;

  const errors: string[] = [];
  const fail = (msg: string) => errors.length < 5 && errors.push(msg);
  const ids = (rows: Array<{ id: string }>) => new Set(rows.map((r) => r.id));

  const every = <T>(rows: T[], label: string, test: (r: T) => boolean) => {
    const bad = rows.findIndex((r) => !isObj(r) || !test(r));
    if (bad >= 0) fail(`${label} #${bad + 1} is damaged or incomplete.`);
  };

  every(d.categories, 'Category', (r) => isId(r.id) && typeof r.name === 'string');
  every(d.accounts, 'Account', (r) => isId(r.id) && typeof r.name === 'string');
  const categoryIds = ids(d.categories);
  const accountIds = ids(d.accounts);
  every(d.months, 'Month', (r) => isValidMonthId(r.id) && (r.status === 'open' || r.status === 'closed'));
  every(d.templates, 'Recurring item', (r) => isId(r.id) && isMoney(r.defaultAmount) && (r.categoryId === null || categoryIds.has(r.categoryId)));
  every(d.budgetItems, 'Budget line', (r) => isId(r.id) && isValidMonthId(r.monthId) && isMoney(r.planned) && categoryIds.has(r.categoryId));
  every(d.incomeItems, 'Income line', (r) => isId(r.id) && isValidMonthId(r.monthId) && isMoney(r.expected));
  every(d.goals, 'Goal', (r) => isId(r.id) && isMoney(r.target) && isMoney(r.monthlyContribution, true));
  const goalIds = ids(d.goals);
  every(d.goalPlans, 'Savings plan', (r) => isId(r.id) && isValidMonthId(r.monthId) && goalIds.has(r.goalId) && isMoney(r.planned));

  const itemIds = ids(d.budgetItems);
  const incomeIds = ids(d.incomeItems);
  every(
    d.transactions,
    'Transaction',
    (t) =>
      isId(t.id) &&
      isValidDateStr(t.date) &&
      t.monthId === monthOf(t.date) &&
      isMoney(t.amount) &&
      ['expense', 'income', 'contribution', 'withdrawal'].includes(t.type) &&
      isNullableId(t.accountId) &&
      (!t.budgetItemId || itemIds.has(t.budgetItemId)) &&
      (!t.incomeItemId || incomeIds.has(t.incomeItemId)) &&
      (!t.goalId || goalIds.has(t.goalId)) &&
      (!t.categoryId || categoryIds.has(t.categoryId)) &&
      (!t.accountId || accountIds.has(t.accountId)),
  );

  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], backup: { app: BACKUP_APP, format: raw.format as number, exportedAt: String(raw.exportedAt ?? ''), data: d } };
}

export interface BackupCounts {
  months: number;
  transactions: number;
  goals: number;
  recurring: number;
}

export function backupCounts(d: BackupData): BackupCounts {
  return { months: d.months.length, transactions: d.transactions.length, goals: d.goals.length, recurring: d.templates.length };
}
