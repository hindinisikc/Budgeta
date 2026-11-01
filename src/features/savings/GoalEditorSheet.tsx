import { useEffect, useState } from 'react';
import { AmountInput, Button, FormError, Icon, SelectField, Sheet, TextField, cx, fieldLabelClass, toIconName, type IconName } from '../../components/ui';
import { addGoal, removeGoal, setGoalCompleted, updateGoal } from '../../db/repo/goals';
import { addMonths, currentMonthId, formatMonthLabel, type MonthId } from '../../domain/dates';
import { formatPeso, parseAmount, type Centavos } from '../../domain/money';
import type { Goal } from '../../domain/types';
import { NAME_MAX } from '../../domain/validate';
import { useUi } from '../../state/ui';
import { useAction } from '../../state/useAction';
import { amountToInput } from '../budget/helpers';

export const GOAL_ICONS: IconName[] = [
  'savings', 'shield', 'flight', 'computer', 'school', 'home', 'directions_car', 'celebration',
  'child_care', 'medical_services', 'redeem', 'pets', 'mobile', 'build', 'spa', 'flag',
];

interface GoalEditorSheetProps {
  open: boolean;
  onClose: () => void;
  goal: Goal | null;
  balance: Centavos;
  /** The month currently being viewed; its plan follows the goal's monthly contribution. */
  viewedMonth: MonthId;
  /** Opens the withdraw sheet (shown when the goal has a balance). */
  onWithdraw: () => void;
}

function monthOptions(around: MonthId, keep: MonthId | null) {
  const ids = Array.from({ length: 37 }, (_, i) => addMonths(around, i - 12));
  if (keep && !ids.includes(keep)) ids.unshift(keep);
  return ids.map((id) => ({ value: id, label: formatMonthLabel(id) }));
}

export function GoalEditorSheet({ open, onClose, goal, balance, viewedMonth, onWithdraw }: GoalEditorSheetProps) {
  const { showToast } = useUi();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>('savings');
  const [targetText, setTargetText] = useState('');
  const [monthlyText, setMonthlyText] = useState('');
  const [startMonth, setStartMonth] = useState(currentMonthId());
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { busy, error, setError, run } = useAction();

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? '');
    setIcon(goal ? toIconName(goal.icon) : 'savings');
    setTargetText(goal ? amountToInput(goal.target) : '');
    setMonthlyText(goal ? amountToInput(goal.monthlyContribution) : '');
    setStartMonth(goal?.startMonth ?? viewedMonth);
    setConfirmRemove(false);
    setError(null);
  }, [open]);

  const save = () => {
    const target = parseAmount(targetText);
    const monthly = monthlyText.trim() ? parseAmount(monthlyText) : 0;
    if (target === null || target <= 0) return setError('Target must be greater than ₱0.');
    if (monthly === null) return setError('Enter a valid monthly amount (or leave it empty).');
    const input = { name, icon, target, monthlyContribution: monthly, startMonth };
    void run(async () => {
      if (goal) await updateGoal(goal.id, input, viewedMonth);
      else await addGoal(input, viewedMonth);
      onClose();
    });
  };

  const monthlyNum = parseAmount(monthlyText) ?? 0;
  const targetNum = parseAmount(targetText) ?? 0;
  const monthsToGo = monthlyNum > 0 && targetNum > balance ? Math.ceil((targetNum - balance) / monthlyNum) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={goal ? 'Edit Goal' : 'New Goal'}
      headerAction={
        <Button variant="tonal" disabled={busy} onClick={save}>
          Save
        </Button>
      }
    >
      <div className="space-y-5 pt-1">
        <TextField label="Name" value={name} maxLength={NAME_MAX} placeholder="e.g. Emergency Fund" onChange={(e) => setName(e.target.value)} />
        <div className="space-y-1.5">
          <span className={fieldLabelClass}>Icon</span>
          <div className="grid grid-cols-8 gap-1.5">
            {GOAL_ICONS.map((opt) => (
              <button
                key={opt}
                type="button"
                aria-label={opt.replace(/_/g, ' ')}
                aria-pressed={opt === icon}
                onClick={() => setIcon(opt)}
                className={cx(
                  'flex aspect-square min-h-10 items-center justify-center rounded-lg',
                  opt === icon ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                <Icon name={opt} size={20} />
              </button>
            ))}
          </div>
        </div>
        <AmountInput label="Target amount" value={targetText} onChange={setTargetText} />
        <AmountInput
          label="Save every month"
          value={monthlyText}
          onChange={setMonthlyText}
          hint={
            monthsToGo
              ? `About ${monthsToGo} month${monthsToGo === 1 ? '' : 's'} to reach the target.`
              : 'Leave empty to save only when you choose.'
          }
        />
        <SelectField label="Start saving in" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} options={monthOptions(currentMonthId(), goal?.startMonth ?? null)} />
        <p className="px-1 text-xs text-on-surface-variant">
          Saving updates {formatMonthLabel(viewedMonth)}'s savings plan (if that month is started and open). Other months keep their own plans.
        </p>

        <FormError message={error} />

        {goal && (
          <div className="space-y-2">
            {balance > 0 && (
              <Button variant="secondary" icon="remove" fullWidth onClick={onWithdraw}>
                Withdraw from this goal ({formatPeso(balance)} saved)
              </Button>
            )}
            {goal.status !== 'archived' && (
              <Button
                variant="secondary"
                icon={goal.status === 'completed' ? 'lock_open' : 'flag'}
                fullWidth
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await setGoalCompleted(goal.id, goal.status !== 'completed', viewedMonth);
                    onClose();
                  })
                }
              >
                {goal.status === 'completed' ? 'Reactivate goal' : 'Mark as completed'}
              </Button>
            )}
            <Button
              variant="danger"
              icon="delete"
              fullWidth
              disabled={busy}
              onClick={() => {
                if (!confirmRemove) return setConfirmRemove(true);
                void run(async () => {
                  const result = await removeGoal(goal.id);
                  onClose();
                  showToast(result === 'archived' ? `${goal.name} archived (its history is kept)` : `${goal.name} deleted`);
                });
              }}
            >
              {confirmRemove ? (balance !== 0 ? `Tap again · ${formatPeso(balance)} stays on record` : 'Tap again to remove') : 'Remove goal'}
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
