import { useEffect, useState } from 'react';
import { Button, ChipSelect, DateField, FormError, Sheet, toIconName } from '../../components/ui';
import { transferPlanned } from '../../db/repo/goals';
import { todayStr, type MonthId } from '../../domain/dates';
import { formatPeso, sum, type Centavos } from '../../domain/money';
import type { Account, Goal } from '../../domain/types';
import { useUi } from '../../state/ui';
import { useAction } from '../../state/useAction';
import { defaultDateIn, labelOptions, monthBounds } from '../budget/helpers';

interface TransferSheetProps {
  open: boolean;
  onClose: () => void;
  monthId: MonthId;
  due: Array<{ goal: Goal; amount: Centavos }>;
  accounts: Account[];
}

/** Confirms moving every goal's remaining planned contribution for the month. */
export function TransferSheet({ open, onClose, monthId, due, accounts }: TransferSheetProps) {
  const { showToast } = useUi();
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const { busy, error, setError, run } = useAction();
  const total = sum(due.map((d) => d.amount));

  useEffect(() => {
    if (!open) return;
    setDate(defaultDateIn(monthId, todayStr()));
    setAccountId(null);
    setError(null);
  }, [open]);

  const bounds = monthBounds(monthId);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Transfer Savings"
      footer={
        <Button
          size="lg"
          icon="savings"
          fullWidth
          disabled={busy || total === 0}
          onClick={() =>
            void run(async () => {
              const r = await transferPlanned(monthId, { date, accountId, note: '' });
              onClose();
              showToast(`Moved ${formatPeso(r.total)} into ${r.count} goal${r.count === 1 ? '' : 's'}`);
            })
          }
        >
          Transfer {formatPeso(total)}
        </Button>
      }
    >
      <div className="space-y-5 pt-1">
        <ul className="divide-y divide-surface-container overflow-hidden rounded-xl bg-surface-container-low">
          {due.map(({ goal, amount }) => (
            <li key={goal.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold">{goal.name}</span>
              <span className="text-sm font-semibold">{formatPeso(amount)}</span>
            </li>
          ))}
        </ul>
        <ChipSelect
          label="From account"
          value={accountId}
          onChange={setAccountId}
          allowNone
          options={labelOptions(accounts, accountId).map((a) => ({ value: a.id, label: a.name, icon: toIconName(a.icon) }))}
        />
        <DateField label="Date" value={date} min={bounds.min} max={bounds.max} onChange={(e) => setDate(e.target.value)} />
        <p className="px-1 text-xs text-on-surface-variant">This records each planned contribution. It doesn't move money in your bank — do that yourself, then log it here.</p>
        <FormError message={error} />
      </div>
    </Sheet>
  );
}
