/** Pre-configured payment / income-received sheets, shared by Budget, Dashboard and Notifications. */
import { recordIncome, recordPayment } from '../../db/repo/transactions';
import type { IncomeSummary, ItemSummary } from '../../domain/calc';
import type { MonthId } from '../../domain/dates';
import { formatPeso } from '../../domain/money';
import type { Account } from '../../domain/types';
import { useUi } from '../../state/ui';
import { RecordMoneySheet } from './RecordMoneySheet';

interface PayItemSheetProps {
  open: boolean;
  onClose: () => void;
  target: ItemSummary | null;
  accounts: Account[];
}

export function PayItemSheet({ open, onClose, target, accounts }: PayItemSheetProps) {
  const { showToast } = useUi();
  return (
    <RecordMoneySheet
      open={open && !!target}
      onClose={onClose}
      title="Record Payment"
      name={target?.item.name ?? ''}
      context={
        target ? `Planned ${formatPeso(target.item.planned)} · Paid ${formatPeso(target.paid)}${target.remaining ? ` · ${formatPeso(target.remaining)} left` : ''}` : ''
      }
      monthId={(target?.item.monthId ?? '') as MonthId}
      defaultAmount={target?.remaining ?? 0}
      defaultAccountId={target?.item.accountId ?? null}
      accounts={accounts}
      settle={
        target
          ? {
              remaining: target.remaining,
              // Bills default to settled once paid; pools stay open until the amount covers what's left.
              defaultOn: (amount) => target.item.kind === 'bill' || (amount !== null && amount >= target.remaining),
            }
          : undefined
      }
      submitLabel={(a) => (a ? `Save ${a} Payment` : 'Save Payment')}
      onSubmit={async (v) => {
        await recordPayment(target!.item.id, v);
        showToast(`Paid ${formatPeso(v.amount)} for ${target!.item.name}`);
      }}
    />
  );
}

interface ReceiveIncomeSheetProps {
  open: boolean;
  onClose: () => void;
  target: IncomeSummary | null;
  accounts: Account[];
}

export function ReceiveIncomeSheet({ open, onClose, target, accounts }: ReceiveIncomeSheetProps) {
  const { showToast } = useUi();
  return (
    <RecordMoneySheet
      open={open && !!target}
      onClose={onClose}
      title="Income Received"
      name={target?.income.name ?? ''}
      context={target ? `Expected ${formatPeso(target.income.expected)}${target.isReceived ? ` · Received ${formatPeso(target.received)} so far` : ''}` : ''}
      monthId={(target?.income.monthId ?? '') as MonthId}
      defaultAmount={target ? Math.max(target.income.expected - target.received, 0) : 0}
      defaultAccountId={target?.income.accountId ?? null}
      accounts={accounts}
      accountLabel="Received in"
      submitLabel={(a) => (a ? `Save ${a} Received` : 'Save')}
      onSubmit={async (v) => {
        await recordIncome(target!.income.id, v);
        showToast(`Received ${formatPeso(v.amount)} · ${target!.income.name}`);
      }}
    />
  );
}
