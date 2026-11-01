import { Badge, IconChip, cx, toIconName, type IconName, type Tone } from '../../components/ui';
import type { Lookups } from '../../db/hooks';
import { formatPeso } from '../../domain/money';
import type { BudgetItem, Goal, IncomeItem, Transaction } from '../../domain/types';

export interface TxContext {
  lookups: Lookups;
  itemById: Map<string, BudgetItem>;
  incomeById: Map<string, IncomeItem>;
  goalById: Map<string, Goal>;
}

/** An expense's category: its own (unplanned) or its budget line's. */
export function categoryOf(t: Transaction, itemById: Map<string, BudgetItem>): string | null {
  return t.categoryId ?? (t.budgetItemId ? itemById.get(t.budgetItemId)?.categoryId : undefined) ?? null;
}

function describe(t: Transaction, ctx: TxContext): { icon: IconName; tone: Tone; sub: string; sign: string; amountTone: string } {
  const { categoryById, accountById } = ctx.lookups;
  const account = t.accountId ? accountById.get(t.accountId)?.name : undefined;
  // Skip parts that just repeat the description (e.g. a payment named after its budget line).
  const same = (p: string | undefined) => !!p && p.trim().toLowerCase() === t.description.trim().toLowerCase();
  const join = (...parts: Array<string | undefined>) => parts.filter((p) => p && !same(p)).join(' • ');
  switch (t.type) {
    case 'expense': {
      const cat = categoryById.get(categoryOf(t, ctx.itemById) ?? '');
      // Linked: show the budget line. Unplanned already has a badge, so show its category instead.
      const line = t.budgetItemId ? ctx.itemById.get(t.budgetItemId)?.name : undefined;
      const where = line && !same(line) ? line : cat?.name;
      return { icon: toIconName(cat?.icon ?? 'category'), tone: t.budgetItemId ? 'primary' : 'tertiary', sub: join(account, where), sign: '-', amountTone: '' };
    }
    case 'income':
      return { icon: 'payments', tone: 'primary', sub: join(account, t.incomeItemId ? ctx.incomeById.get(t.incomeItemId)?.name : 'Extra income'), sign: '+', amountTone: 'text-primary' };
    case 'contribution':
      return { icon: 'savings', tone: 'tertiary', sub: join(account, `To ${ctx.goalById.get(t.goalId ?? '')?.name ?? 'savings'}`), sign: '', amountTone: 'text-tertiary' };
    case 'withdrawal':
      return { icon: 'savings', tone: 'secondary', sub: join(account, `From ${ctx.goalById.get(t.goalId ?? '')?.name ?? 'savings'}`), sign: '+', amountTone: 'text-tertiary' };
  }
}

interface TransactionRowProps {
  tx: Transaction;
  ctx: TxContext;
  /** Extra text after the subtitle, e.g. the date on the Dashboard. */
  suffix?: string;
  onClick: () => void;
}

export function TransactionRow({ tx, ctx, suffix, onClick }: TransactionRowProps) {
  const d = describe(tx, ctx);
  const sub = [d.sub, suffix].filter(Boolean).join(' • ');
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 p-3.5 text-left transition-colors hover:bg-surface-container/40">
      <span className="flex min-w-0 items-center gap-3">
        <IconChip icon={d.icon} tone={d.tone} />
        <span className="min-w-0">
          <span className="block truncate font-headline text-sm font-semibold">{tx.description || '(no description)'}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-on-surface-variant">
            {tx.type === 'expense' && !tx.budgetItemId && <Badge tone="tertiary" className="shrink-0 py-0">Unplanned</Badge>}
            <span className="truncate">{sub || ' '}</span>
          </span>
        </span>
      </span>
      <span className={cx('shrink-0 font-headline text-sm font-bold', d.amountTone)}>
        {d.sign}
        {formatPeso(tx.amount, { cents: 'always' })}
      </span>
    </button>
  );
}
