import { useEffect, useState } from 'react';
import { AmountInput, Button, DateField, FormError, SegmentedControl, SelectField, Sheet, TextField, Toggle } from '../../components/ui';
import { addItem, deleteItem, updateItem } from '../../db/repo/budgetItems';
import type { MonthId } from '../../domain/dates';
import { formatPeso, parseAmount } from '../../domain/money';
import type { Account, BudgetItem, Category } from '../../domain/types';
import { NAME_MAX, NOTE_MAX } from '../../domain/validate';
import { useAction } from '../../state/useAction';
import { amountToInput, labelOptions, monthBounds } from './helpers';

interface ItemEditorSheetProps {
  open: boolean;
  onClose: () => void;
  monthId: MonthId;
  /** null = new item. */
  item: BudgetItem | null;
  /** Payments already recorded against the item (for the delete prompt). */
  payments: { count: number; total: number };
  categories: Category[];
  accounts: Account[];
}

type Kind = BudgetItem['kind'];

export function ItemEditorSheet({ open, onClose, monthId, item, payments, categories, accounts }: ItemEditorSheetProps) {
  const [kind, setKind] = useState<Kind>('bill');
  const [name, setName] = useState('');
  const [plannedText, setPlannedText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [autoPay, setAutoPay] = useState(false);
  const [note, setNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { busy, error, setError, run } = useAction();

  useEffect(() => {
    if (!open) return;
    setKind(item?.kind ?? 'bill');
    setName(item?.name ?? '');
    setPlannedText(item ? amountToInput(item.planned) : '');
    setCategoryId(item?.categoryId ?? categories.find((c) => !c.archived)?.id ?? '');
    setDueDate(item?.dueDate ?? '');
    setAccountId(item?.accountId ?? '');
    setAutoPay(item?.autoPay ?? false);
    setNote(item?.note ?? '');
    setConfirmDelete(false);
    setError(null);
    // Re-initialise only when the sheet opens.
  }, [open]);

  const save = () => {
    const planned = parseAmount(plannedText);
    if (planned === null || planned <= 0) {
      setError('Planned amount must be greater than ₱0.');
      return;
    }
    const input = { kind, name, categoryId, planned, dueDate: dueDate || null, accountId: accountId || null, autoPay, note };
    void run(async () => {
      if (item) await updateItem(item.id, input);
      else await addItem(monthId, input);
      onClose();
    });
  };

  const remove = (mode: 'delete' | 'keep-unplanned') => {
    if (!item) return;
    void run(async () => {
      await deleteItem(item.id, mode);
      onClose();
    });
  };

  const bounds = monthBounds(monthId);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? 'Edit Item' : 'New Item'}
      headerAction={
        <Button variant="tonal" disabled={busy} onClick={save}>
          Save
        </Button>
      }
    >
      <div className="space-y-5 pt-1">
        <SegmentedControl<Kind>
          label="Item type"
          className="w-full"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'bill', label: 'Bill' },
            { value: 'flexible', label: 'Spending pool' },
          ]}
        />
        <p className="-mt-3 px-1 text-xs text-on-surface-variant">
          {kind === 'bill'
            ? 'A fixed payment, usually paid once (rent, internet, a loan).'
            : 'A budget you spend from many times (groceries, school, transport).'}
        </p>

        <TextField label="Name" value={name} maxLength={NAME_MAX} placeholder={kind === 'bill' ? 'e.g. Rent' : 'e.g. Groceries'} onChange={(e) => setName(e.target.value)} />
        <AmountInput label="Planned amount" value={plannedText} onChange={setPlannedText} />
        <SelectField
          label="Category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={labelOptions(categories, categoryId).map((c) => ({ value: c.id, label: c.name }))}
        />
        {kind === 'bill' && (
          <DateField label="Due date (optional)" value={dueDate} min={bounds.min} max={bounds.max} onChange={(e) => setDueDate(e.target.value)} />
        )}
        <SelectField
          label="Usual account (optional)"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          options={[{ value: '', label: 'None' }, ...labelOptions(accounts, accountId || null).map((a) => ({ value: a.id, label: a.name }))]}
        />
        {kind === 'bill' && <Toggle checked={autoPay} onChange={setAutoPay} label="Auto-debit" description="Paid automatically by your bank or e-wallet." />}
        <TextField label="Note (optional)" value={note} maxLength={NOTE_MAX} placeholder="e.g. Fiber 100Mbps" onChange={(e) => setNote(e.target.value)} />

        <FormError message={error} />

        {item &&
          (!confirmDelete ? (
            <Button variant="danger" icon="delete" fullWidth onClick={() => setConfirmDelete(true)}>
              Delete item
            </Button>
          ) : (
            <div className="space-y-2 rounded-xl bg-error-container/40 p-3">
              {payments.count > 0 ? (
                <>
                  <p className="text-sm font-semibold text-on-error-container">
                    This item has {payments.count} payment{payments.count === 1 ? '' : 's'} ({formatPeso(payments.total)}). What should happen to them?
                  </p>
                  <Button variant="secondary" fullWidth disabled={busy} onClick={() => remove('keep-unplanned')}>
                    Keep them as unplanned spending
                  </Button>
                  <Button variant="danger" fullWidth disabled={busy} onClick={() => remove('delete')}>
                    Delete the payments too
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
