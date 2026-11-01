import type { Centavos } from './money';
import type { DateStr, MonthId } from './dates';

/** ISO timestamp, used only for audit fields (createdAt/updatedAt), never for money logic. */
export type Timestamp = string;
export type Id = string;

export interface Settings {
  id: 'app';
  /** Bills/income due within this many days count as "due soon". */
  dueSoonDays: number;
  /** Remind to back up after this many days without one. */
  backupReminderDays: number;
  lastBackupAt: Timestamp | null;
  /** Budget-item ids whose "adjust your plan" suggestion was dismissed. */
  dismissedSuggestions?: string[];
}

export interface Category {
  id: Id;
  name: string;
  icon: string;
  archived: boolean;
  order: number;
}

export interface Account {
  id: Id;
  name: string;
  icon: string;
  archived: boolean;
  order: number;
}

/** Recurring line copied into each new month. Editing it never changes past months. */
export interface Template {
  id: Id;
  kind: 'bill' | 'flexible' | 'income';
  name: string;
  /** Required for bill/flexible, null for income. */
  categoryId: Id | null;
  defaultAmount: Centavos;
  /** Day of month (1–31, clamped to month length); bills and income only. */
  dueDay: number | null;
  accountId: Id | null;
  autoPay: boolean;
  active: boolean;
  note: string;
  order: number;
}

export type CloseResolution =
  | { kind: 'goal'; amount: Centavos; goalId: Id }
  | { kind: 'carryover'; amount: Centavos }
  | { kind: 'leave'; amount: Centavos };

export interface Month {
  id: MonthId;
  status: 'open' | 'closed';
  createdAt: Timestamp;
  closedAt: Timestamp | null;
  closeResolution: CloseResolution | null;
}

/** A planned expense line for one month: a single bill or a flexible spending pool. */
export interface BudgetItem {
  id: Id;
  monthId: MonthId;
  templateId: Id | null;
  kind: 'bill' | 'flexible';
  name: string;
  categoryId: Id;
  planned: Centavos;
  dueDate: DateStr | null;
  accountId: Id | null;
  autoPay: boolean;
  /** Explicitly closed by the user; whatever wasn't spent goes back to Margin. */
  settled: boolean;
  note: string;
  order: number;
}

/** Expected income for one month (a payroll cutoff, side income, or carry-over from last month). */
export interface IncomeItem {
  id: Id;
  monthId: MonthId;
  templateId: Id | null;
  name: string;
  expected: Centavos;
  expectedDate: DateStr | null;
  accountId: Id | null;
  source: 'regular' | 'carryover';
  order: number;
}

export interface Goal {
  id: Id;
  name: string;
  icon: string;
  target: Centavos;
  monthlyContribution: Centavos;
  startMonth: MonthId;
  status: 'active' | 'queued' | 'completed' | 'archived';
  createdAt: Timestamp;
  order: number;
}

/** Planned contribution to a goal for one month (snapshot, so later goal edits don't rewrite history). */
export interface GoalPlan {
  id: Id;
  monthId: MonthId;
  goalId: Id;
  planned: Centavos;
}

export type TransactionType = 'expense' | 'income' | 'contribution' | 'withdrawal';

export interface Transaction {
  id: Id;
  date: DateStr;
  /** Always derived from `date`; stored for indexing. */
  monthId: MonthId;
  type: TransactionType;
  /** Always positive; `type` decides the direction. */
  amount: Centavos;
  /** expense: the budget line it pays (null = unplanned). */
  budgetItemId: Id | null;
  /** income: the expected income line it fulfils (null = extra income). */
  incomeItemId: Id | null;
  /** contribution / withdrawal: the savings goal. */
  goalId: Id | null;
  /** Required for unplanned expenses; otherwise the budget item's category applies. */
  categoryId: Id | null;
  accountId: Id | null;
  description: string;
  note: string;
  receiptRef: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
