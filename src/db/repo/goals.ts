import { db } from '../db';
import { goalBalances, plannedContribution, summarizeGoalsForMonth } from '../../domain/calc';
import { isValidMonthId, type DateStr, type MonthId } from '../../domain/dates';
import { newId, nowIso } from '../../domain/id';
import { formatPeso, isValidAmount, type Centavos } from '../../domain/money';
import type { Goal } from '../../domain/types';
import { check, checkAmount, cleanName } from './guards';
import { goalBalanceBefore } from './months';
import { TX_TABLES, insertTransaction } from './transactions';

export type GoalInput = Pick<Goal, 'name' | 'icon' | 'target' | 'monthlyContribution' | 'startMonth'>;

const GOAL_TABLES = [db.goals, db.goalPlans, db.months, db.transactions];

function clean(input: GoalInput): GoalInput {
  checkAmount(input.target, 'Target');
  check(input.monthlyContribution === 0 || isValidAmount(input.monthlyContribution), 'Monthly contribution must be ₱0 or more.');
  check(input.monthlyContribution <= input.target, 'Monthly contribution cannot be more than the target.');
  check(isValidMonthId(input.startMonth), 'Pick a start month.');
  check(!!input.icon, 'Pick an icon.');
  return { name: cleanName(input.name), icon: input.icon, target: input.target, monthlyContribution: input.monthlyContribution, startMonth: input.startMonth };
}

/**
 * Keeps `monthId`'s plan for the goal in line with its monthly contribution — only when that month
 * is started and open and the goal is active and has begun. Other months are never touched.
 */
async function syncPlan(goal: Goal, monthId: MonthId | undefined): Promise<void> {
  if (!monthId) return;
  const month = await db.months.get(monthId);
  if (!month || month.status !== 'open') return;
  const existing = await db.goalPlans.where('[monthId+goalId]').equals([monthId, goal.id]).first();
  const active = goal.status === 'active' && goal.startMonth <= monthId;
  const planned = active ? plannedContribution(goal, await goalBalanceBefore(goal.id, monthId)) : 0;
  if (planned <= 0) {
    if (existing) await db.goalPlans.delete(existing.id);
  } else if (existing) {
    await db.goalPlans.update(existing.id, { planned });
  } else {
    await db.goalPlans.add({ id: newId(), monthId, goalId: goal.id, planned });
  }
}

/** Creates a goal; if `applyTo` is an open month the goal applies to, its contribution is planned there too. */
export async function addGoal(input: GoalInput, applyTo?: MonthId): Promise<string> {
  return db.transaction('rw', GOAL_TABLES, async () => {
    const data = clean(input);
    const last = await db.goals.orderBy('order').last();
    const goal: Goal = { id: newId(), ...data, status: 'active', createdAt: nowIso(), order: (last?.order ?? -1) + 1 };
    await db.goals.add(goal);
    await syncPlan(goal, applyTo);
    return goal.id;
  });
}

export async function updateGoal(id: string, input: GoalInput, applyTo?: MonthId): Promise<void> {
  await db.transaction('rw', GOAL_TABLES, async () => {
    const goal = await db.goals.get(id);
    check(goal, 'That goal no longer exists.');
    const updated = { ...goal, ...clean(input) };
    await db.goals.put(updated);
    await syncPlan(updated, applyTo);
  });
}

/** Removes the goal's plans in open months (contributions already made stay). */
async function dropOpenPlans(goalId: string): Promise<void> {
  const plans = await db.goalPlans.where('goalId').equals(goalId).toArray();
  for (const p of plans) {
    const month = await db.months.get(p.monthId);
    if (month?.status === 'open') await db.goalPlans.delete(p.id);
  }
}

/** Marks a goal completed (or active again). Completed goals stop getting monthly plans. */
export async function setGoalCompleted(id: string, completed: boolean, applyTo?: MonthId): Promise<void> {
  await db.transaction('rw', GOAL_TABLES, async () => {
    const goal = await db.goals.get(id);
    check(goal, 'That goal no longer exists.');
    const status = completed ? 'completed' : 'active';
    await db.goals.update(id, { status });
    if (completed) await dropOpenPlans(id);
    else await syncPlan({ ...goal, status }, applyTo);
  });
}

/** Deletes a goal with no history; archives one that has contributions so past records stay intact. */
export async function removeGoal(id: string): Promise<'deleted' | 'archived'> {
  return db.transaction('rw', GOAL_TABLES, async () => {
    const used = await db.transactions.where('goalId').equals(id).count();
    if (used > 0) {
      await db.goals.update(id, { status: 'archived' });
      await dropOpenPlans(id);
      return 'archived';
    }
    await db.goalPlans.where('goalId').equals(id).delete();
    await db.goals.delete(id);
    return 'deleted';
  });
}

export interface SavingsMoveInput {
  amount: Centavos;
  date: DateStr;
  accountId: string | null;
  note: string;
}

export async function contribute(goalId: string, input: SavingsMoveInput): Promise<string> {
  return db.transaction('rw', TX_TABLES, async () => {
    const goal = await db.goals.get(goalId);
    check(goal, 'That goal no longer exists.');
    return insertTransaction({ type: 'contribution', ...input, budgetItemId: null, incomeItemId: null, goalId, categoryId: null, description: `To ${goal.name}` });
  });
}

/** Takes money out of a goal into the month's available funds. Can't exceed the goal's balance. */
export async function withdraw(goalId: string, input: SavingsMoveInput): Promise<string> {
  return db.transaction('rw', TX_TABLES, async () => {
    const goal = await db.goals.get(goalId);
    check(goal, 'That goal no longer exists.');
    const balance = goalBalances(await db.transactions.where('goalId').equals(goalId).toArray()).get(goalId) ?? 0;
    check(input.amount <= balance, `You can withdraw at most ${formatPeso(balance)} from ${goal.name}.`);
    return insertTransaction({ type: 'withdrawal', ...input, budgetItemId: null, incomeItemId: null, goalId, categoryId: null, description: `From ${goal.name}` });
  });
}

/** Records every goal's unfulfilled planned contribution for the month in one go. */
export async function transferPlanned(monthId: MonthId, input: Omit<SavingsMoveInput, 'amount'>): Promise<{ count: number; total: Centavos }> {
  return db.transaction('rw', [...TX_TABLES, db.goalPlans], async () => {
    const [plans, txs] = await Promise.all([db.goalPlans.where('monthId').equals(monthId).toArray(), db.transactions.where('monthId').equals(monthId).toArray()]);
    let count = 0;
    let total = 0;
    for (const g of summarizeGoalsForMonth(plans, txs)) {
      const due = g.planned - g.contributed;
      if (due <= 0) continue;
      const goal = await db.goals.get(g.goalId);
      if (!goal) continue;
      await insertTransaction({ type: 'contribution', ...input, amount: due, budgetItemId: null, incomeItemId: null, goalId: goal.id, categoryId: null, description: `To ${goal.name}` });
      count += 1;
      total += due;
    }
    check(count > 0, 'All planned savings for this month are already transferred.');
    return { count, total };
  });
}
