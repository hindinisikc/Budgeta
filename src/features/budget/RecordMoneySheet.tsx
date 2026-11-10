import { useEffect, useState } from 'react';
import { AmountInput, Button, ChipSelect, DateField, FormError, Sheet, TextField, Toggle, toIconName } from '../../components/ui';
import { todayStr, type MonthId } from '../../domain/dates';
import { formatPeso, parseAmount, type Centavos } from '../../domain/money';
import type { Account } from '../../domain/types';
import { NOTE_MAX } from '../../domain/validate';
import { useAction } from '../../state/useAction';
import { amountToInput, defaultDateIn, labelOptions, monthBounds } from './helpers';

export interface RecordMoneyValues {
  amount: Centavos;
  date: string;
  accountId: string | null;
  note: string;
  settle: boolean;
}

interface RecordMoneySheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** What is being paid / received, e.g. "Rent". */
  name: string;
  /** Context lines under the name, e.g. "Planned ₱10,000 · Paid ₱0". */
  context: string;
  monthId: MonthId;
  defaultAmount: Centavos;
  defaultAccountId: string | null;
  accounts: Account[];
  /** Shows the "Mark as settled" switch (budget items only). */
  settle?: { remaining: Centavos; defaultOn: (amount: Centavos | null) => boolean };
  accountLabel?: string;
  submitLabel: (amount: string) => string;
  onSubmit: (values: RecordMoneyValues) => Promise<void>;
}

export function RecordMoneySheet(props: RecordMoneySheetProps) {
  const { open, onClose, title, name, context, monthId, defaultAmount, defaultAccountId, accounts, settle, accountLabel = 'Paid with', submitLabel, onSubmit } = props;
  const [amountText, setAmountText] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [settleOn, setSettleOn] = useState(false);
  const [settleTouched, setSettleTouched] = useState(false);
  const { busy, error, setError, run } = useAction();

  useEffect(() => {
    if (!open) return;
    setAmountText(amountToInput(defaultAmount));
    setAccountId(defaultAccountId ?? accounts.find((a) => !a.archived)?.id ?? null);
    setDate(defaultDateIn(monthId, todayStr()));
    setNote('');
    setSettleOn(settle ? settle.defaultOn(defaultAmount || null) : false);
    setSettleTouched(false);
    setError(null);
    // Only re-initialise when the sheet opens, not when live data refreshes underneath it.
  }, [open]);

  const amount = parseAmount(amountText);

  const onAmountChange = (text: string) => {
    setAmountText(text);
    if (settle && !settleTouched) setSettleOn(settle.defaultOn(parseAmount(text)));
  };

  const submit = () => {
    if (amount === null || amount <= 0) {
      setError('Enter an amount greater than ₱0.');
      return;
    }
    void run(async () => {
      await onSubmit({ amount, date, accountId, note, settle: settle ? settleOn : false });
      onClose();
    });
  };

  const bounds = monthBounds(monthId);
  const leftover = settle && settleOn && amount !== null ? settle.remaining - amount : 0;
  const shown = amount !== null && amount > 0 ? formatPeso(amount, { cents: 'always' }) : '';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button size="lg" icon="check_circle" fullWidth disabled={busy} onClick={submit}>
          {submitLabel(shown)}
        </Button>
      }
    >
      <div className="space-y-5 pt-1">
        <div className="rounded-xl bg-surface-container-low px-4 py-3">
          <p className="text-lg font-semibold">{name}</p>
          <p className="text-sm text-on-surface-variant">{context}</p>
        </div>

        <AmountInput label="Amount" size="lg" value={amountText} onChange={onAmountChange} />

        <ChipSelect
          label={accountLabel}
          value={accountId}
          onChange={setAccountId}
          allowNone
          options={labelOptions(accounts, accountId).map((a) => ({ value: a.id, label: a.name, icon: toIconName(a.icon) }))}
        />

        <DateField label="Date" value={date} min={bounds.min} max={bounds.max} onChange={(e) => setDate(e.target.value)} />

        {settle && (
          <Toggle
            checked={settleOn}
            onChange={(v) => {
              setSettleOn(v);
              setSettleTouched(true);
            }}
            label="Mark as done"
            description={
              settleOn
                ? leftover > 0
                  ? `Closes this item. The unspent ${formatPeso(leftover)} goes back to Safe to spend.`
                  : 'Closes this item.'
                : 'Keep it open for more payments (e.g. next cutoff).'
            }
          />
        )}

        <TextField label="Note (optional)" value={note} maxLength={NOTE_MAX} placeholder="e.g. Receipt #MY-8823" onChange={(e) => setNote(e.target.value)} />

        <FormError message={error} />
      </div>
    </Sheet>
  );
}
