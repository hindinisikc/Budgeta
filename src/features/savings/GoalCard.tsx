import { Icon, ProgressBar, cx } from '../../components/ui';
import type { GoalMonthSummary } from '../../domain/calc';
import { monthName, parseMonthId, type MonthId } from '../../domain/dates';
import { formatPeso, type Centavos } from '../../domain/money';
import type { Goal } from '../../domain/types';

interface GoalCardProps {
  goal: Goal;
  balance: Centavos;
  month: GoalMonthSummary | undefined;
  viewedMonth: MonthId;
  onContribute: () => void;
  /** Card body: open the goal (edit, withdraw, complete). */
  onOpen: () => void;
}

/** Goal: name, saved of target with one status, progress bar, one action. */
export function GoalCard({ goal, balance, month, viewedMonth, onContribute, onOpen }: GoalCardProps) {
  const progress = goal.target > 0 ? balance / goal.target : 0;
  const completed = goal.status === 'completed';
  const achieved = balance >= goal.target;
  const queued = goal.status === 'active' && goal.startMonth > viewedMonth;
  const dueThisMonth = month ? Math.max(month.planned - month.contributed, 0) : 0;

  const status: { text: string; cls: string } = completed
    ? { text: 'Completed', cls: 'text-primary' }
    : achieved
      ? { text: 'Target reached', cls: 'text-primary' }
      : queued
        ? { text: `Starts ${monthName(parseMonthId(goal.startMonth).monthIndex, true)} ${parseMonthId(goal.startMonth).year}`, cls: '' }
        : dueThisMonth > 0
          ? { text: `${formatPeso(dueThisMonth)} to save this month`, cls: 'text-tertiary' }
          : { text: `${formatPeso(goal.target - balance)} to go`, cls: '' };

  return (
    <article className="flex animate-item-in items-center gap-2 rounded-xl bg-surface-container-low py-3 pl-4 pr-2 shadow-soft transition-transform active:scale-[0.99]">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left" aria-label={`${goal.name} details`}>
        <span className="block truncate font-medium">{goal.name}</span>
        <span className="block text-sm text-on-surface-variant">
          {formatPeso(balance)} of {formatPeso(goal.target)}
        </span>
        <ProgressBar value={progress} size="sm" className="my-2" label={`${goal.name} progress`} />
        <span className={cx('block text-sm font-medium text-on-surface-variant', status.cls)}>{status.text}</span>
      </button>
      {!completed && (
        <button
          type="button"
          onClick={onContribute}
          aria-label={`Add savings to ${goal.name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary-fixed"
        >
          <Icon name="add_circle" size={26} />
        </button>
      )}
    </article>
  );
}
