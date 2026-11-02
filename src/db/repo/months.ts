import { db } from '../db';
import { plannedContribution, summarizeMonth, type MonthData } from '../../domain/calc';
import { addMonths, daysInMonth, dueDateFor, formatMonthLabel, isValidMonthId, type MonthId } from '../../domain/dates';
import { newId, nowIso } from '../../domain/id';
import type { Centavos } from '../../domain/money';
import type { BudgetItem, CloseResolution, GoalPlan, IncomeItem } from '../../domain/types';
import { fundingFor } from '../funding';
import { DEFAULT_SETTINGS } from '../seed';
import { check } from './guards';
import { TX_TABLES, insertTransaction } from './transactions';

export interface StartMonthResult {
  items: number;
  income: number;
  goals: number;
}

/** Reads one month's records (must run inside a Dexie transaction that includes these tables, or standalone). */
export async function loadMonthData(monthId: MonthId): Promise<MonthData> {
  const [items, incomeItems, goalPlans, transactions, funding] = await Promise.all([
    db.budgetItems.where('monthId').equals(monthId).toArray(),
    db.incomeItems.where('monthId').equals(monthId).toArray(),
    db.goalPlans.where('monthId').equals(monthId).toArray(),
    db.transactions.where('monthId').equals(monthId).toArray(),
    db.months.get(monthId).then(fundingFor),
  ]);
  return { items, incomeItems, goalPlans, transactions, funding };
}

/** A goal's balance from months before `monthId` (contributions − withdrawals). */
export async function goalBalanceBefore(goalId: string, monthId: MonthId): Promise<Centavos> {
  const txs = await db.transactions.where('goalId').equals(goalId).toArray();
  return txs.filter((t) => t.monthId < monthId).reduce((sum, t) => sum + (t.type === 'contribution' ? t.amount : t.type === 'withdrawal' ? -t.amount : 0), 0);
}

function carryoverName(fromMonth: MonthId): string {
  return `Carried over from ${formatMonthLabel(fromMonth)}`;
}

/** Adds (or updates) the single carry-over income line in `monthId`. */
async function upsertCarryover(monthId: MonthId, fromMonth: MonthId, amount: Centavos): Promise<void> {
  const existing = (await db.incomeItems.where('monthId').equals(monthId).toArray()).find((i) => i.source === 'carryover');
  if (existing) {
    await db.incomeItems.update(existing.id, { expected: amount, name: carryoverName(fromMonth) });
    return;
  }
  await db.incomeItems.add({
    id: newId(), monthId, templateId: null, name: carryoverName(fromMonth), expected: amount,
    expectedDate: `${monthId}-01`, accountId: null, source: 'carryover', order: -1,
  });
}

/**
 * Creates a month. With `fromTemplates`, active recurring templates are copied in as that month's
 * budget items / income lines, and active savings goals get their monthly contribution planned.
 * Copies are independent: editing a template later never touches this month.
 * A carry-over from the previous month (chosen when closing it) is always added.
 */
export async function startMonth(monthId: MonthId, { fromTemplates }: { fromTemplates: boolean }): Promise<StartMonthResult> {
  check(isValidMonthId(monthId), 'Invalid month.');
  return db.transaction('rw', [db.months, db.templates, db.budgetItems, db.incomeItems, db.goals, db.goalPlans, db.transactions, db.settings], async () => {
    check(!(await db.months.get(monthId)), `${formatMonthLabel(monthId)} has already been started.`);
    const settings = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
    await db.months.add({
      id: monthId, status: 'open', createdAt: nowIso(), closedAt: null, closeResolution: null,
      // The income-timing setting is captured per month, so turning it off later never rewrites history.
      ...(settings.incomeTiming === 'next-month' ? { fundedBy: 'previous-month' as const } : {}),
    });

    const previousId = addMonths(monthId, -1);
    const previous = await db.months.get(previousId);
    const carry = previous?.closeResolution?.kind === 'carryover' ? previous.closeResolution.amount : 0;
    if (carry > 0) await upsertCarryover(monthId, previousId, carry);

    if (!fromTemplates) return { items: 0, income: carry > 0 ? 1 : 0, goals: 0 };

    const templates = (await db.templates.orderBy('order').toArray()).filter((t) => t.active);
    const items: BudgetItem[] = [];
    const income: IncomeItem[] = [];
    for (const t of templates) {
      if (t.kind === 'income') {
        income.push({
          id: newId(), monthId, templateId: t.id, name: t.name, expected: t.defaultAmount,
          expectedDate: t.dueDay ? dueDateFor(monthId, t.dueDay) : null, accountId: t.accountId, source: 'regular', order: income.length,
        });
      } else if (t.categoryId) {
        items.push({
          id: newId(), monthId, templateId: t.id, kind: t.kind, name: t.name, categoryId: t.categoryId, planned: t.defaultAmount,
          dueDate: t.kind === 'bill' && t.dueDay ? dueDateFor(monthId, t.dueDay) : null, accountId: t.accountId,
          autoPay: t.autoPay, settled: false, note: t.note, order: items.length,
        });
      }
    }

    const goals = (await db.goals.toArray()).filter((g) => g.status === 'active' && g.startMonth <= monthId && g.monthlyContribution > 0);
    const plans: GoalPlan[] = [];
    for (const g of goals) {
      const planned = plannedContribution(g, await goalBalanceBefore(g.id, monthId));
      if (planned > 0) plans.push({ id: newId(), monthId, goalId: g.id, planned });
    }

    await db.budgetItems.bulkAdd(items);
    await db.incomeItems.bulkAdd(income);
    await db.goalPlans.bulkAdd(plans);
    return { items: items.length, income: income.length + (carry > 0 ? 1 : 0), goals: plans.length };
  });
}

/**
 * True in the one "switch" month: this month counts its own paydays (normal month) but next month will
 * run on those same paydays. Its "leftover" is that same money, so moving it anywhere (next month or a goal)
 * would count it twice — the switch month can only be closed with "Leave it".
 */
export async function isSwitchMonth(monthId: MonthId): Promise<boolean> {
  const [month, next, settings] = await Promise.all([db.months.get(monthId), db.months.get(addMonths(monthId, 1)), db.settings.get('app')]);
  if (!month || month.fundedBy === 'previous-month') return false;
  return next ? next.fundedBy === 'previous-month' : settings?.incomeTiming === 'next-month';
}

export type CloseChoice = { kind: 'goal'; goalId: string } | { kind: 'carryover' } | { kind: 'leave' };

/**
 * Closes a month and decides what happens to any leftover Margin:
 * - goal: recorded as a contribution on the month's last day (so Margin ends at ₱0);
 * - carryover: becomes a "Carried over" income line in the next month (now, or when it's started);
 * - leave: nothing moves.
 * The leftover is computed here from stored data, never trusted from the UI.
 */
export async function closeMonth(monthId: MonthId, choice: CloseChoice): Promise<CloseResolution> {
  return db.transaction('rw', [...TX_TABLES, db.months, db.goalPlans, db.settings], async () => {
    const month = await db.months.get(monthId);
    check(month, `${formatMonthLabel(monthId)} hasn't been started.`);
    check(month.status === 'open', `${formatMonthLabel(monthId)} is already closed.`);
    if (choice.kind !== 'leave') {
      const next = formatMonthLabel(addMonths(monthId, 1)).split(' ')[0];
      const name = formatMonthLabel(monthId).split(' ')[0];
      check(!(await isSwitchMonth(monthId)), `${next} already runs on ${name}'s paydays, so moving this leftover would count it twice. Choose "Leave it".`);
    }

    const leftover = Math.max(summarizeMonth(await loadMonthData(monthId)).margin, 0);
    let resolution: CloseResolution;

    if (choice.kind === 'goal') {
      const goal = await db.goals.get(choice.goalId);
      check(goal && goal.status !== 'archived', 'Pick an existing savings goal.');
      if (leftover > 0) {
        await insertTransaction({
          type: 'contribution', date: `${monthId}-${String(daysInMonth(monthId)).padStart(2, '0')}`, amount: leftover,
          budgetItemId: null, incomeItemId: null, goalId: goal.id, categoryId: null, accountId: null,
          description: `Leftover from ${formatMonthLabel(monthId)}`, note: '',
        });
      }
      resolution = { kind: 'goal', amount: leftover, goalId: goal.id };
    } else if (choice.kind === 'carryover') {
      const nextId = addMonths(monthId, 1);
      if (leftover > 0 && (await db.months.get(nextId))) await upsertCarryover(nextId, monthId, leftover);
      resolution = { kind: 'carryover', amount: leftover };
    } else {
      resolution = { kind: 'leave', amount: leftover };
    }

    await db.months.update(monthId, { status: 'closed', closedAt: nowIso(), closeResolution: resolution });
    return resolution;
  });
}

/** Reopens a closed month. Money already moved (goal contribution / carry-over line) stays where it is. */
export async function reopenMonth(monthId: MonthId): Promise<void> {
  const month = await db.months.get(monthId);
  check(month, `${formatMonthLabel(monthId)} hasn't been started.`);
  await db.months.update(monthId, { status: 'open', closedAt: null, closeResolution: null });
}
