import { Button, FormError, Sheet } from '../../components/ui';
import { markUnpaid, setItemSettled } from '../../db/repo/budgetItems';
import type { ItemSummary } from '../../domain/calc';
import { formatPeso } from '../../domain/money';
import { useUi } from '../../state/ui';
import { useAction } from '../../state/useAction';

interface UnpaySheetProps {
  open: boolean;
  onClose: () => void;
  target: ItemSummary | null;
  paymentCount: number;
}

/** Unticking a paid item: undo its payments (the tick matches reality), or for a pool just reopen it. */
export function UnpaySheet({ open, onClose, target, paymentCount }: UnpaySheetProps) {
  const { showToast } = useUi();
  const { busy, error, run } = useAction();
  const item = target?.item;
  const pool = item?.kind === 'flexible';

  return (
    <Sheet open={open && !!target} onClose={onClose} title="Mark as Unpaid?">
      {target && item && (
        <div className="space-y-4 pt-1">
          <p className="text-sm">
            {paymentCount > 0 ? (
              <>
                This removes <strong>{item.name}</strong>'s {paymentCount === 1 ? 'payment' : `${paymentCount} payments`} of{' '}
                <strong>{formatPeso(target.paid)}</strong> and moves it back to Unpaid.
              </>
            ) : (
              <>
                This moves <strong>{item.name}</strong> back to Unpaid.
              </>
            )}
          </p>
          <FormError message={error} />
          <div className="space-y-2">
            <Button
              variant="danger"
              fullWidth
              disabled={busy}
              className="bg-error-container/60"
              onClick={() =>
                void run(async () => {
                  await markUnpaid(item.id);
                  onClose();
                  showToast(`${item.name} marked as unpaid`);
                })
              }
            >
              Mark as unpaid
            </Button>
            {pool && paymentCount > 0 && (
              <Button
                variant="secondary"
                fullWidth
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await setItemSettled(item.id, false);
                    onClose();
                  })
                }
              >
                Just reopen it (keep the {formatPeso(target.paid)} of purchases)
              </Button>
            )}
            <Button variant="ghost" fullWidth onClick={onClose}>
              Keep it paid
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
