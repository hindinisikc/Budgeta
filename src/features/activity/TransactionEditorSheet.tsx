import { useEffect, useState } from 'react';
import { AmountInput, Button, ChipSelect, DateField, FormError, SelectField, Sheet, TextField, toIconName } from '../../components/ui';
import type { Lookups } from '../../db/hooks';
import { useMonthRecords } from '../../db/hooks';
import { addTransaction, deleteTransaction, updateTransaction } from '../../db/repo/transactions';
import { formatMonthLabel, isValidDateStr, monthOf, todayStr, type MonthId } from '../../domain/dates';
import { parseAmount } from '../../domain/money';
import type { Transaction } from '../../domain/types';
import { DESCRIPTION_MAX, NOTE_MAX } from '../../domain/validate';
import { useAction } from '../../state/useAction';
import { amountToInput, defaultDateIn, labelOptions } from '../budget/helpers';

interface TransactionEditorSheetProps {
  open: boolean;
  onClose: () => void;
  /** null = create a new extra-income entry. */
  tx: Transaction | null;
  /** Month used for the default date when creating. */
  monthId: MonthId;
  lookups: Lookups;
  goalName?: string;
}

const NONE = '';

const TITLES: Record<Transaction['type'], string> = {
  expense: 'Edit Expense',
  income: 'Edit Income',
  contribution: 'Edit Savings',
  withdrawal: 'Edit Withdrawal',
};

export function TransactionEditorSheet({ open, onClose, tx, monthId, lookups, goalName }: TransactionEditorSheetProps) {
  const type = tx?.type ?? 'income';
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState('');
  const [link, setLink] = useState(NONE); // budget item id (expense) or income item id (income)
  const [categoryId, setCategoryId] = useState(NONE);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { busy, error, setError, run } = useAction();

  const dateMonth = isValidDateStr(date) ? monthOf(date) : monthId;
  const records = useMonthRecords(dateMonth);

  useEffect(() => {
    if (!open) return;
    setAmountText(tx ? amountToInput(tx.amount) : '');
    setDate(tx?.date ?? defaultDateIn(monthId, todayStr()));
    setLink(tx?.budgetItemId ?? tx?.incomeItemId ?? NONE);
    setCategoryId(tx?.categoryId ?? NONE);
    setAccountId(tx?.accountId ?? null);
    setDescription(tx?.description ?? '');
    setNote(tx?.note ?? '');
    setReceiptRef(tx?.receiptRef ?? '');
    setConfirmDelete(false);
    setError(null);
  }, [open]);

  // Budget lines / income lines belong to one month; drop the link if the date moves elsewhere.
  useEffect(() => {
    if (!records || !link) return;
    const exists = type === 'expense' ? records.items.some((i) => i.id === link) : records.incomeItems.some((i) => i.id === link);
    // Falls back to unplanned (expense) / extra income; the user then picks a category if needed.
    if (!exists) setLink(NONE);
  }, [records, link, type]);

  const save = () => {
    const amount = parseAmount(amountText);
    if (amount === null || amount <= 0) return setError('Enter an amount greater than ₱0.');
    const draft = {
      date,
      amount,
      budgetItemId: type === 'expense' && link ? link : null,
      incomeItemId: type === 'income' && link ? link : null,
      goalId: tx?.goalId ?? null,
      categoryId: type === 'expense' && !link ? categoryId || null : null,
      accountId,
      description,
      note,
    };
    void run(async () => {
      if (tx) await updateTransaction(tx.id, { ...draft, receiptRef });
      else await addTransaction({ ...draft, type: 'income' }, receiptRef);
      onClose();
    });
  };

  const items = records?.items ?? [];
  const incomeLines = records?.incomeItems ?? [];
  const { categories, accounts } = lookups;
  const monthNote = records && !records.month ? `${formatMonthLabel(dateMonth)} hasn't been started yet.` : undefined;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={tx ? TITLES[type] : 'Add Income'}
      headerAction={
        <Button variant="tonal" disabled={busy} onClick={save}>
          Save
        </Button>
      }
    >
      <div className="space-y-5 pt-1">
        <AmountInput label="Amount" size="lg" value={amountText} onChange={setAmountText} />
        <DateField label="Date" value={date} onChange={(e) => setDate(e.target.value)} hint={monthNote} />

        {type === 'expense' && (
          <>
            <SelectField
              label="Counts toward"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              options={[
                ...items.map((i) => ({ value: i.id, label: `${i.name}${i.settled ? ' (done)' : ''}` })),
                { value: NONE, label: 'Unplanned (not in budget)' },
              ]}
            />
            {!link && (
              <SelectField
                label="Category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                options={[{ value: NONE, label: 'Pick a category' }, ...labelOptions(categories, categoryId || null).map((c) => ({ value: c.id, label: c.name }))]}
              />
            )}
          </>
        )}

        {type === 'income' && (
          <SelectField
            label="Income line"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            options={[...incomeLines.map((i) => ({ value: i.id, label: i.name })), { value: NONE, label: 'Extra income (not expected)' }]}
          />
        )}

        {(type === 'contribution' || type === 'withdrawal') && (
          <p className="rounded-xl bg-surface-container-low px-4 py-3 text-sm">
            Savings goal: <strong>{goalName ?? 'Unknown goal'}</strong>
          </p>
        )}

        <ChipSelect
          label={type === 'income' ? 'Received in' : 'Paid with'}
          value={accountId}
          onChange={setAccountId}
          allowNone
          options={labelOptions(accounts, accountId).map((a) => ({ value: a.id, label: a.name, icon: toIconName(a.icon) }))}
        />
        <TextField label="Description" value={description} maxLength={DESCRIPTION_MAX} placeholder={type === 'income' ? 'e.g. Sold old phone' : 'e.g. Lunch'} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Note" value={note} maxLength={NOTE_MAX} placeholder="Optional" onChange={(e) => setNote(e.target.value)} />
          <TextField label="Receipt ref" value={receiptRef} maxLength={60} placeholder="Optional" onChange={(e) => setReceiptRef(e.target.value)} />
        </div>

        <FormError message={error} />

        {tx && (
          <Button
            variant="danger"
            icon="delete"
            fullWidth
            disabled={busy}
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              void run(async () => {
                await deleteTransaction(tx.id);
                onClose();
              });
            }}
          >
            {confirmDelete ? 'Tap again to delete' : 'Delete transaction'}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
