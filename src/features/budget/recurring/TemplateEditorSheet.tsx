import { useEffect, useState } from 'react';
import { AmountInput, Button, FormError, SegmentedControl, SelectField, Sheet, TextField, Toggle } from '../../../components/ui';
import { addTemplate, deleteTemplate, updateTemplate } from '../../../db/repo/templates';
import { parseAmount } from '../../../domain/money';
import type { Account, Category, Template } from '../../../domain/types';
import { NAME_MAX, NOTE_MAX } from '../../../domain/validate';
import { useAction } from '../../../state/useAction';
import { amountToInput, labelOptions } from '../helpers';

interface TemplateEditorSheetProps {
  open: boolean;
  onClose: () => void;
  template: Template | null;
  defaultKind: Template['kind'];
  categories: Category[];
  accounts: Account[];
}

type Kind = Template['kind'];

const DAY_OPTIONS = [{ value: '', label: 'No set day' }, ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: ordinal(i + 1) }))];

function ordinal(n: number): string {
  const suffix = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return `${n}${suffix}${n >= 29 ? ' (or last day)' : ''}`;
}

export function TemplateEditorSheet({ open, onClose, template, defaultKind, categories, accounts }: TemplateEditorSheetProps) {
  const [kind, setKind] = useState<Kind>('bill');
  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [accountId, setAccountId] = useState('');
  const [autoPay, setAutoPay] = useState(false);
  const [active, setActive] = useState(true);
  const [note, setNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { busy, error, setError, run } = useAction();

  useEffect(() => {
    if (!open) return;
    setKind(template?.kind ?? defaultKind);
    setName(template?.name ?? '');
    setAmountText(template ? amountToInput(template.defaultAmount) : '');
    setCategoryId(template?.categoryId ?? categories.find((c) => !c.archived)?.id ?? '');
    setDueDay(template?.dueDay ? String(template.dueDay) : '');
    setAccountId(template?.accountId ?? '');
    setAutoPay(template?.autoPay ?? false);
    setActive(template?.active ?? true);
    setNote(template?.note ?? '');
    setConfirmDelete(false);
    setError(null);
  }, [open]);

  const save = () => {
    const amount = parseAmount(amountText);
    if (amount === null || amount <= 0) {
      setError('Amount must be greater than ₱0.');
      return;
    }
    const input = {
      kind, name, defaultAmount: amount, categoryId: kind === 'income' ? null : categoryId,
      dueDay: dueDay ? Number(dueDay) : null, accountId: accountId || null, autoPay, active, note,
    };
    void run(async () => {
      if (template) await updateTemplate(template.id, input);
      else await addTemplate(input);
      onClose();
    });
  };

  const isIncome = kind === 'income';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={template ? 'Edit Recurring' : 'New Recurring'}
      headerAction={
        <Button variant="tonal" disabled={busy} onClick={save}>
          Save
        </Button>
      }
    >
      <div className="space-y-5 pt-1">
        <SegmentedControl<Kind>
          label="Type"
          className="w-full"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'bill', label: 'Bill' },
            { value: 'flexible', label: 'Spending pool' },
            { value: 'income', label: 'Income' },
          ]}
        />
        <TextField
          label="Name"
          value={name}
          maxLength={NAME_MAX}
          placeholder={isIncome ? 'e.g. Salary (15th cutoff)' : kind === 'bill' ? 'e.g. Rent' : 'e.g. Groceries'}
          onChange={(e) => setName(e.target.value)}
        />
        <AmountInput
          label={isIncome ? 'Usual amount' : 'Usual planned amount'}
          value={amountText}
          onChange={setAmountText}
          hint="For amounts that vary (like electricity), enter a typical figure; adjust it each month."
        />
        {!isIncome && (
          <SelectField
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={labelOptions(categories, categoryId).map((c) => ({ value: c.id, label: c.name }))}
          />
        )}
        {kind !== 'flexible' && (
          <SelectField label={isIncome ? 'Usually arrives on' : 'Due every month on'} value={dueDay} onChange={(e) => setDueDay(e.target.value)} options={DAY_OPTIONS} />
        )}
        <SelectField
          label={isIncome ? 'Goes to account (optional)' : 'Usual account (optional)'}
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          options={[{ value: '', label: 'None' }, ...labelOptions(accounts, accountId || null).map((a) => ({ value: a.id, label: a.name }))]}
        />
        {kind === 'bill' && <Toggle checked={autoPay} onChange={setAutoPay} label="Auto-debit" description="Paid automatically by your bank or e-wallet." />}
        <Toggle checked={active} onChange={setActive} label="Include in new months" description={active ? 'Added when you start a month.' : 'Paused: skipped when you start a month.'} />
        {!isIncome && <TextField label="Note (optional)" value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} />}

        <FormError message={error} />

        {template && (
          <Button
            variant="danger"
            icon="delete"
            fullWidth
            disabled={busy}
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              void run(async () => {
                await deleteTemplate(template.id);
                onClose();
              });
            }}
          >
            {confirmDelete ? 'Tap again to delete' : 'Delete recurring item'}
          </Button>
        )}
        <p className="px-1 text-xs text-on-surface-variant">Changes apply to months you start from now on. Months already started keep their own amounts.</p>
      </div>
    </Sheet>
  );
}
