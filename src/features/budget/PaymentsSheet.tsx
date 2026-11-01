import { useState } from 'react';
import { Button, FormError, Icon, Sheet } from '../../components/ui';
import { setItemSettled } from '../../db/repo/budgetItems';
import { deleteTransaction } from '../../db/repo/transactions';
import type { ItemSummary } from '../../domain/calc';
import { formatShortDate } from '../../domain/dates';
import { formatPeso } from '../../domain/money';
import type { Account, Transaction } from '../../domain/types';
import { useAction } from '../../state/useAction';

interface PaymentsSheetProps {
  open: boolean;
  onClose: () => void;
  summary: ItemSummary | null;
  payments: Transaction[];
  accountById: Map<string, Account>;
  onRecordAnother: () => void;
  onEdit: () => void;
}

/** An item's details: its payments (remove a wrong one), record another, settle / reopen, or edit. */
export function PaymentsSheet({ open, onClose, summary, payments, accountById, onRecordAnother, onEdit }: PaymentsSheetProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const { busy, error, run } = useAction();
  if (!summary) return <Sheet open={false} onClose={onClose} title="Details">{null}</Sheet>;
  const { item } = summary;

  return (
    <Sheet open={open} onClose={onClose} title="Details">
      <div className="space-y-4 pt-1">
        <div className="rounded-xl bg-surface-container-low px-4 py-3">
          <p className="font-headline text-lg font-bold">{item.name}</p>
          <p className="text-sm text-on-surface-variant">
            Planned {formatPeso(item.planned)} · Paid {formatPeso(summary.paid)}
            {item.settled ? ' · Settled' : summary.remaining > 0 ? ` · ${formatPeso(summary.remaining)} left` : ''}
          </p>
        </div>

        {payments.length === 0 ? (
          <p className="px-1 text-sm text-on-surface-variant">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-surface-container overflow-hidden rounded-xl bg-surface-container-low">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-headline text-sm font-bold">{formatPeso(p.amount, { cents: 'always' })}</p>
                  <p className="truncate text-xs text-on-surface-variant">
                    {formatShortDate(p.date)}
                    {p.accountId && accountById.get(p.accountId) ? ` · ${accountById.get(p.accountId)!.name}` : ''}
                    {p.note ? ` · ${p.note}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (pendingDelete !== p.id) return setPendingDelete(p.id);
                    void run(() => deleteTransaction(p.id)).then(() => setPendingDelete(null));
                  }}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-error hover:bg-error-container/50"
                >
                  <Icon name="delete" size={18} />
                  {pendingDelete === p.id ? 'Tap to confirm' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}

        <FormError message={error} />

        <div className="grid gap-2 sm:grid-cols-3">
          <Button icon="payments" onClick={onRecordAnother}>
            Record payment
          </Button>
          <Button variant="secondary" icon="edit" onClick={onEdit}>
            Edit item
          </Button>
          <Button variant="tonal" icon={item.settled ? 'lock_open' : 'check'} disabled={busy} onClick={() => void run(() => setItemSettled(item.id, !item.settled))}>
            {item.settled ? 'Reopen' : 'Mark settled'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
