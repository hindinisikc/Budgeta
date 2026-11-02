import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, FormError, Icon, SelectField, Sheet, cx } from '../../components/ui';
import { closeMonth, isSwitchMonth } from '../../db/repo/months';
import { addMonths, daysLeftInMonth, formatMonthLabel, todayStr, type MonthId } from '../../domain/dates';
import { formatPeso, type Centavos } from '../../domain/money';
import type { Goal } from '../../domain/types';
import { useUi } from '../../state/ui';
import { useAction } from '../../state/useAction';

interface CloseMonthSheetProps {
  open: boolean;
  onClose: () => void;
  monthId: MonthId;
  margin: Centavos;
  goals: Goal[];
}

type Choice = 'goal' | 'carryover' | 'leave';

/** Close the month and decide where leftover Margin goes. */
export function CloseMonthSheet({ open, onClose, monthId, margin, goals }: CloseMonthSheetProps) {
  const { showToast } = useUi();
  const [choice, setChoice] = useState<Choice>('carryover');
  const [goalId, setGoalId] = useState('');
  const { busy, error, setError, run } = useAction();
  const activeGoals = goals.filter((g) => g.status === 'active');
  const leftover = Math.max(margin, 0);
  const next = formatMonthLabel(addMonths(monthId, 1));
  const daysLeft = daysLeftInMonth(monthId, todayStr());
  const nextName = next.split(' ')[0];
  // The switch month into "one month ahead": next month already runs on this month's paydays, so this
  // month's "leftover" is that same money — it can only be left as is.
  const switchMonth = useLiveQuery(() => isSwitchMonth(monthId), [monthId]) ?? false;
  const switchText = `Not this month: ${nextName} already runs on this month's paydays, so it would count twice. Put any truly extra money into savings from the Savings screen.`;

  useEffect(() => {
    if (!open) return;
    setChoice(switchMonth ? 'leave' : activeGoals.length > 0 ? 'goal' : 'carryover');
    setGoalId(activeGoals[0]?.id ?? '');
    setError(null);
  }, [open]);

  const options: Array<{ value: Choice; title: string; text: string; disabledText?: string }> = [
    {
      value: 'goal',
      title: 'Move it to a savings goal',
      text: 'Recorded as a contribution on the last day of the month.',
      disabledText: switchMonth ? switchText : activeGoals.length === 0 ? 'Add a savings goal first.' : undefined,
    },
    {
      value: 'carryover',
      title: `Carry it over to ${next}`,
      text: `Added as "Carried over" income in ${next}.`,
      disabledText: switchMonth ? switchText : undefined,
    },
    { value: 'leave', title: 'Leave it', text: 'Nothing moves; the month just closes.' },
  ];

  const confirm = () =>
    void run(async () => {
      const r = await closeMonth(monthId, leftover > 0 && choice === 'goal' ? { kind: 'goal', goalId } : leftover > 0 ? { kind: choice as 'carryover' | 'leave' } : { kind: 'leave' });
      onClose();
      const goalName = r.kind === 'goal' ? goals.find((g) => g.id === r.goalId)?.name : '';
      showToast(
        r.amount === 0
          ? `${formatMonthLabel(monthId)} closed`
          : r.kind === 'goal'
            ? `${formatPeso(r.amount)} moved to ${goalName}`
            : r.kind === 'carryover'
              ? `${formatPeso(r.amount)} will carry over to ${next}`
              : `${formatMonthLabel(monthId)} closed`,
      );
    });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Close Month"
      footer={
        <Button size="lg" icon="lock" fullWidth disabled={busy} onClick={confirm}>
          Close {formatMonthLabel(monthId)}
        </Button>
      }
    >
      <div className="space-y-5 pt-1">
        {daysLeft > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-tertiary-fixed/60 px-3 py-2 text-sm text-on-tertiary-fixed">
            <Icon name="info" size={18} className="mt-0.5" />
            {formatMonthLabel(monthId)} still has {daysLeft} day{daysLeft === 1 ? '' : 's'} left. You can close it now, but anything you log afterwards won't be included.
          </p>
        )}

        <div className={cx('rounded-xl p-4', margin < 0 ? 'bg-error-container' : 'bg-primary-fixed')}>
          <p className="text-xs font-bold uppercase tracking-wider text-on-primary-fixed-variant">{margin < 0 ? 'Over plan by' : 'Leftover margin'}</p>
          <p className="font-headline text-3xl font-bold">{formatPeso(Math.abs(margin))}</p>
          {margin <= 0 && <p className="mt-1 text-sm">There's nothing left over to move.</p>}
        </div>

        {leftover > 0 && (
          <fieldset className="space-y-2">
            <legend className="sr-only">What should happen to the leftover?</legend>
            {options.map((o) => (
              <label
                key={o.value}
                className={cx(
                  'flex cursor-pointer items-start gap-3 rounded-xl p-3.5 ring-1 transition-colors',
                  choice === o.value ? 'bg-primary-fixed/50 ring-primary' : 'bg-surface-container-low ring-transparent',
                  o.disabledText && 'cursor-not-allowed opacity-60',
                )}
              >
                <input type="radio" name="close-choice" className="mt-1 accent-primary" checked={choice === o.value} disabled={!!o.disabledText} onChange={() => setChoice(o.value)} />
                <span>
                  <span className="block font-semibold">{o.title}</span>
                  <span className="block text-sm text-on-surface-variant">{o.disabledText ?? o.text}</span>
                </span>
              </label>
            ))}
            {choice === 'goal' && activeGoals.length > 0 && (
              <SelectField label="Goal" value={goalId} onChange={(e) => setGoalId(e.target.value)} options={activeGoals.map((g) => ({ value: g.id, label: g.name }))} />
            )}
          </fieldset>
        )}

        <p className="px-1 text-xs text-on-surface-variant">You can reopen the month later. Money already moved stays where it is.</p>
        <FormError message={error} />
      </div>
    </Sheet>
  );
}
