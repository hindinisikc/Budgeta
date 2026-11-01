import { useEffect, useState } from 'react';
import { AmountInput, Button, DateField, FormError, SelectField, Sheet, TextField } from '../../components/ui';
import { addIncome, deleteIncome, updateIncome } from '../../db/repo/incomeItems';
import type { MonthId } from '../../domain/dates';
import { formatPeso, parseAmount } from '../../domain/money';
import type { Account, IncomeItem } from '../../domain/types';
import { NAME_MAX } from '../../domain/validate';
import { useAction } from '../../state/useAction';
import { amountToInput, labelOptions, monthBounds } from './helpers';

interface IncomeEditorSheetProps {
  open: boolean;
  onClose: () => void;
  monthId: MonthId;
  income: IncomeItem | null;
  received: { count: number; total: number };
  accounts: Account[];
}

export function IncomeEditorSheet({ open, onClose, monthId, income, received, accounts }: IncomeEditorSheetProps) {
  const [name, setName] = useState('');
  const [expectedText, setExpectedText] = useState('');
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { busy, error, setError, run } = useAction();

  useEffect(() => {
    if (!open) return;
    setName(income?.name ?? '');
    setExpectedText(income ? amountToInput(income.expected) : '');
    setDate(income?.expectedDate ?? '');
    setAccountId(income?.accountId ?? '');
    setConfirmDelete(false);
    setError(null);
  }, [open]);

  const save = () => {
    const expected = parseAmount(expectedText);
    if (expected === null || expected <= 0) {
      setError('Expected amount must be greater than ₱0.');
      return;
    }
    const input = { name, expected, expectedDate: date || null, accountId: accountId || null };
    void run(async () => {
      if (income) await updateIncome(income.id, input);
      else await addIncome(monthId, input);
      onClose();
    });
  };

  const remove = (mode: 'delete' | 'keep-extra') => {
    if (!income) return;
    void run(async () => {
      await deleteIncome(income.id, mode);
      onClose();
    });
  };

  const bounds = monthBounds(monthId);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={income ? 'Edit Income' : 'New Income'}
      headerAction={
        <Button variant="tonal" disabled={busy} onClick={save}>
          Save
        </Button>
      }
    >
      <div className="space-y-5 pt-1">
        <TextField label="Name" value={name} maxLength={NAME_MAX} placeholder="e.g. Salary (15th cutoff)" onChange={(e) => setName(e.target.value)} />
        <AmountInput label="Expected amount" value={expectedText} onChange={setExpectedText} />
        <DateField label="Expected date (optional)" value={date} min={bounds.min} max={bounds.max} onChange={(e) => setDate(e.target.value)} />
        <SelectField
          label="Goes to account (optional)"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          options={[{ value: '', label: 'None' }, ...labelOptions(accounts, accountId || null).map((a) => ({ value: a.id, label: a.name }))]}
        />
        <FormError message={error} />

        {income &&
          (!confirmDelete ? (
            <Button variant="danger" icon="delete" fullWidth onClick={() => setConfirmDelete(true)}>
              Delete income line
            </Button>
          ) : (
            <div className="space-y-2 rounded-xl bg-error-container/40 p-3">
              {received.count > 0 ? (
                <>
                  <p className="text-sm font-semibold text-on-error-container">
                    {formatPeso(received.total)} was already received on this line. What should happen to it?
                  </p>
                  <Button variant="secondary" fullWidth disabled={busy} onClick={() => remove('keep-extra')}>
                    Keep it as extra income
                  </Button>
                  <Button variant="danger" fullWidth disabled={busy} onClick={() => remove('delete')}>
                    Delete it too
                  </Button>
                </>
              ) : (
                <Button variant="danger" fullWidth disabled={busy} onClick={() => remove('delete')}>
                  Tap to confirm delete
                </Button>
              )}
              <Button variant="ghost" fullWidth onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ))}
      </div>
    </Sheet>
  );
}
