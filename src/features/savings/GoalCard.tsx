import { Badge, Icon, RingChart, toIconName, type Tone } from '../../components/ui';
import type { GoalMonthSummary } from '../../domain/calc';
import { formatMonthLabel, type MonthId } from '../../domain/dates';
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

/** Goal: progress ring, saved of target, one status, one action. */
export function GoalCard({ goal, balance, month, viewedMonth, onContribute, onOpen }: GoalCardProps) {
  const progress = goal.target > 0 ? balance / goal.target : 0;
  const completed = goal.status === 'completed';
  const achieved = balance >= goal.target;
  const queued = goal.status === 'active' && goal.startMonth > viewedMonth;
  const dueThisMonth = month ? Math.max(month.planned - month.contributed, 0) : 0;

  const badge: { text: string; tone: Tone } = completed
    ? { text: 'Completed', tone: 'primary' }
    : achieved
      ? { text: 'Target reached', tone: 'primary' }
      : queued
        ? { text: `Starts ${formatMonthLabel(goal.startMonth)}`, tone: 'secondary' }
        : dueThisMonth > 0
          ? { text: `${formatPeso(dueThisMonth)} due this month`, tone: 'tertiary' }
          : { text: `${formatPeso(goal.target - balance)} to go`, tone: 'neutral' };

  return (
    <article className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4 shadow-soft">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-4 text-left" aria-label={`${goal.name} details`}>
        <RingChart size={56} stroke={12} rings={[{ value: progress, color: 'var(--color-primary)', label: `${goal.name} progress` }]}>
          {achieved || completed ? <Icon name="check" size={20} className="text-primary" /> : <Icon name={toIconName(goal.icon)} size={20} className="text-on-surface-variant" />}
        </RingChart>
        <span className="min-w-0">
          <span className="block break-words font-headline text-base font-bold">{goal.name}</span>
          <span className="block text-sm text-on-surface-variant">
            {formatPeso(balance)} of {formatPeso(goal.target)}
          </span>
          <Badge tone={badge.tone} className="mt-1">
            {badge.text}
          </Badge>
        </span>
      </button>
      {!completed && (
        <button
          type="button"
          onClick={onContribute}
          aria-label={`Add savings to ${goal.name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim"
        >
          <Icon name="add" size={22} />
        </button>
      )}
    </article>
  );
}
