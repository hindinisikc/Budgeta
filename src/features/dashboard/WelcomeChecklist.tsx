import { Link } from 'react-router';
import { Icon, cx } from '../../components/ui';
import { formatMonthLabel, type MonthId } from '../../domain/dates';

interface Step {
  done: boolean;
  title: string;
  text: string;
  to: string;
}

interface WelcomeChecklistProps {
  hasTemplates: boolean;
  monthStarted: boolean;
  hasGoals: boolean;
  hasTransactions: boolean;
  monthId: MonthId;
  onQuickAdd: () => void;
}

/** First-run guide; disappears once every step is done. */
export function WelcomeChecklist({ hasTemplates, monthStarted, hasGoals, hasTransactions, monthId, onQuickAdd }: WelcomeChecklistProps) {
  const steps: Step[] = [
    { done: hasTemplates, title: 'Add your recurring items', text: 'Salary, bills and budgets — once.', to: '/budget/recurring' },
    { done: monthStarted, title: `Start ${formatMonthLabel(monthId)}`, text: 'Copies your recurring items into the month.', to: '/budget' },
    { done: hasGoals, title: 'Create a savings goal', text: 'An emergency fund is a great first one.', to: '/savings' },
    { done: hasTransactions, title: 'Log your first expense', text: 'Tap + whenever you spend.', to: '' },
  ];
  if (steps.every((s) => s.done)) return null;
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section className="rounded-xl bg-primary-fixed/60 p-5 shadow-soft">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-on-primary-fixed">Welcome to Budgeta</h3>
        <span className="text-sm font-semibold text-on-primary-fixed-variant">
          {doneCount} of {steps.length}
        </span>
      </div>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => {
          const body = (
            <>
              <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold', s.done ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-primary')}>
                {s.done ? <Icon name="check" size={18} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx('block text-sm font-semibold', s.done && 'text-on-surface-variant line-through')}>{s.title}</span>
                <span className="block text-xs text-on-surface-variant">{s.text}</span>
              </span>
              {!s.done && <Icon name="chevron_right" size={20} className="text-primary" />}
            </>
          );
          const cls = 'flex min-h-14 w-full items-center gap-3 rounded-lg bg-surface-container-lowest/70 px-3 py-2 text-left';
          return (
            <li key={s.title}>
              {s.done ? (
                <div className={cls}>{body}</div>
              ) : s.to ? (
                <Link to={s.to} className={cx(cls, 'hover:bg-surface-container-lowest')}>
                  {body}
                </Link>
              ) : (
                <button type="button" onClick={onQuickAdd} className={cls}>
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
