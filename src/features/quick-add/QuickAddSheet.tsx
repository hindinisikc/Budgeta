import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, ChipSelect, DateField, FormError, Icon, Sheet, TextField, cx, fieldLabelClass, toIconName } from '../../components/ui';
import { db } from '../../db/db';
import { useLookups, useMonthRecords } from '../../db/hooks';
import { quickAddExpense } from '../../db/repo/transactions';
import { summarizeMonth } from '../../domain/calc';
import { formatMonthLabel, formatShortDate, isValidDateStr, monthOf, todayStr } from '../../domain/dates';
import { formatPeso, parseAmount } from '../../domain/money';
import type { Transaction } from '../../domain/types';
import { DESCRIPTION_MAX, NOTE_MAX } from '../../domain/validate';
import { useUi } from '../../state/ui';
import { useAction } from '../../state/useAction';
import { labelOptions } from '../budget/helpers';

const UNPLANNED = 'unplanned';
const LAST_ACCOUNT_KEY = 'budgeta.quickAdd.lastAccount';

/** The account used last time (e.g. Credit card), so it doesn't need picking every time. */
function lastAccount(): string | null {
  try {
    return localStorage.getItem(LAST_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

function rememberAccount(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_ACCOUNT_KEY, id);
    else localStorage.removeItem(LAST_ACCOUNT_KEY);
  } catch {
    // Storage blocked: falls back to the most recent expense's account.
  }
}

/** The FAB's "Quick Expense" sheet. Every expense lands on a budget line or is marked unplanned. */
export function QuickAddSheet() {
  const { quickAddOpen, closeQuickAdd, showToast } = useUi();
  const lookups = useLookups();
  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState<string | null>(null); // budget item id or UNPLANNED
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [showMore, setShowMore] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const { busy, error, setError, run } = useAction();

  const monthId = isValidDateStr(date) ? monthOf(date) : monthOf(todayStr());
  const records = useMonthRecords(monthId);
  const summary = useMemo(() => (records ? summarizeMonth(records) : null), [records]);
  const recent = useLiveQuery(() => db.transactions.orderBy('date').reverse().filter((t) => t.type === 'expense').limit(300).toArray(), []);

  useEffect(() => {
    if (!quickAddOpen) return;
    setAmountText('');
    setDescription('');
    setTarget(null);
    setCategoryId(null);
    const remembered = lastAccount();
    const recentAccount = recent?.[0]?.accountId ?? null;
    const usable = (id: string | null) => !!id && !!lookups?.accounts.some((a) => a.id === id && !a.archived);
    setAccountId(usable(remembered) ? remembered : usable(recentAccount) ? recentAccount : (lookups?.accounts.find((a) => !a.archived)?.id ?? null));
    setDate(todayStr());
    setNote('');
    setShowMore(false);
    setError(null);
    requestAnimationFrame(() => amountRef.current?.focus());
  }, [quickAddOpen]);

  const openItems = summary?.items.filter((s) => s.state !== 'settled') ?? [];
  const monthStarted = !!records?.month;

  // If the date moves to another month, a previously picked budget line no longer applies.
  useEffect(() => {
    if (target && target !== UNPLANNED && records && !records.items.some((i) => i.id === target)) setTarget(null);
  }, [records, target]);

  const suggestions = useMemo(() => {
    const seen = new Map<string, Transaction>();
    for (const t of recent ?? []) {
      const key = t.description.trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, t);
    }
    const q = description.trim().toLowerCase();
    return [...seen.values()].filter((t) => !q || (t.description.toLowerCase().includes(q) && t.description.toLowerCase() !== q)).slice(0, 6);
  }, [recent, description]);

  const applySuggestion = (t: Transaction) => {
    setDescription(t.description);
    if (t.accountId) setAccountId(t.accountId);
    const lastItem = t.budgetItemId ? records?.items.find((i) => i.id === t.budgetItemId) : undefined;
    // Items are per month: match last time's line by name in the current month.
    const sameName = openItems.find((s) => s.item.name === (lastItem?.name ?? t.description));
    if (sameName) setTarget(sameName.item.id);
    else if (t.categoryId) {
      setTarget(UNPLANNED);
      setCategoryId(t.categoryId);
    }
  };

  const amount = parseAmount(amountText);

  const selected = target && target !== UNPLANNED ? summary?.items.find((s) => s.item.id === target) : undefined;
  const after = amount ?? 0;
  const hint = selected
    ? `Counts toward ${selected.item.name} (${formatPeso(Math.max(selected.remaining - after, 0))} left after this${selected.remaining - after < 0 ? `, over by ${formatPeso(after - selected.remaining)}` : ''})`
    : target === UNPLANNED && summary
      ? `Unplanned · Safe to spend after this: ${formatPeso(summary.margin - after)}`
      : 'Pick what this is for, or Unplanned.';

  const overBudget = selected ? selected.remaining - after < 0 : target === UNPLANNED && !!summary && summary.margin - after < 0;

  const save = () => {
    if (amount === null || amount <= 0) return setError('Enter an amount greater than ₱0.');
    if (!target) return setError("Pick what it's for.");
    if (target === UNPLANNED && !categoryId) return setError('Pick a category for this unplanned expense.');
    void run(async () => {
      await quickAddExpense({
        amount, date, accountId, note, description,
        budgetItemId: target === UNPLANNED ? null : target,
        categoryId: target === UNPLANNED ? categoryId : null,
      });
      rememberAccount(accountId);
      closeQuickAdd();
      const where = selected?.item.name ?? lookups?.categoryById.get(categoryId ?? '')?.name ?? 'unplanned';
      showToast(`Added ${formatPeso(amount)} to ${where}`);
    });
  };

  if (!lookups) return null;
  const { categories, accounts, categoryById, accountById } = lookups;

  return (
    <Sheet
      open={quickAddOpen}
      onClose={closeQuickAdd}
      title="Quick Expense"
      headerAction={
        <Button variant="tonal" disabled={busy} onClick={save}>
          Save
        </Button>
      }
      footer={
        <div className="space-y-2">
          <Button size="lg" icon="check_circle" fullWidth disabled={busy} onClick={save}>
            {amount ? `Add ${formatPeso(amount, { cents: 'always' })} Expense` : 'Add Expense'}
          </Button>
          <p className={cx('text-center text-xs', overBudget ? 'font-semibold text-error' : 'text-on-surface-variant')}>{hint}</p>
        </div>
      }
    >
      <div className="space-y-5 pt-1">
        {/* Amount */}
        <div className="rounded-xl bg-surface-container-low p-4">
          <label htmlFor="qa-amount" className={cx(fieldLabelClass, 'text-center')}>
            Amount
          </label>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className="text-3xl font-bold text-on-surface-variant">₱</span>
            <input
              id="qa-amount"
              ref={amountRef}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value.replace(/[^\d.,]/g, ''))}
              className="w-48 bg-transparent text-center text-5xl font-bold tracking-tight placeholder:text-outline focus:outline-none"
            />
          </div>
        </div>

        {/* What it's for */}
        <div className="space-y-2">
          <span className={cx(fieldLabelClass, 'px-1')}>What's it for?</span>
          {!monthStarted && (
            <p className="rounded-lg bg-tertiary-fixed/60 px-3 py-2 text-sm text-on-tertiary-fixed">
              {formatMonthLabel(monthId)} hasn't been started, so there are no budget lines yet. You can still log it as unplanned.
            </p>
          )}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {openItems.map((s) => (
              <Tile
                key={s.item.id}
                active={target === s.item.id}
                icon={toIconName(categoryById.get(s.item.categoryId)?.icon ?? 'category')}
                label={s.item.name}
                sub={`${formatPeso(s.remaining)} left`}
                onClick={() => setTarget(s.item.id)}
              />
            ))}
            <Tile active={target === UNPLANNED} icon="add_circle" label="Unplanned" sub="Not in plan" onClick={() => setTarget(UNPLANNED)} />
          </div>
        </div>

        {target === UNPLANNED && (
          <div className="animate-reveal space-y-2">
            <span className={fieldLabelClass}>Category</span>
            <div className="grid grid-cols-4 gap-2">
              {labelOptions(categories, categoryId).map((c) => (
                <Tile key={c.id} compact active={categoryId === c.id} icon={toIconName(c.icon)} label={c.name} onClick={() => setCategoryId(c.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Everything optional lives under "More", with a one-line summary of what will be used. */}
        <div className="rounded-xl bg-surface-container-low">
          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            aria-expanded={showMore}
            className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold">More</span>
              <span className="block truncate text-xs text-on-surface-variant">
                {[accountId ? accountById.get(accountId)?.name : 'No account', date === todayStr() ? 'Today' : formatShortDate(date), description.trim()].filter(Boolean).join(' · ')}
              </span>
            </span>
            <Icon name="keyboard_arrow_down" size={20} className={cx('shrink-0 text-on-surface-variant transition-transform duration-200', showMore && 'rotate-180')} />
          </button>
          {showMore && (
            <div className="animate-reveal space-y-5 px-4 pb-4 pt-1">
              <div className="space-y-2">
                <TextField label="Description" value={description} maxLength={DESCRIPTION_MAX} placeholder="e.g. Jeepney fare, Iced latte" onChange={(e) => setDescription(e.target.value)} />
                {suggestions.length > 0 && (
                  <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
                    {suggestions.map((t) => (
                      <button key={t.id} type="button" onClick={() => applySuggestion(t)} className="min-h-10 shrink-0 rounded-full bg-surface-container px-3.5 text-sm text-on-surface-variant hover:bg-surface-container-high">
                        {t.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <ChipSelect
                label="Paid with"
                value={accountId}
                onChange={setAccountId}
                allowNone
                options={labelOptions(accounts, accountId).map((a) => ({ value: a.id, label: a.name, icon: toIconName(a.icon) }))}
              />
              <DateField label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
              <TextField label="Note" value={note} maxLength={NOTE_MAX} placeholder="Optional" onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
        </div>

        <FormError message={error} />
      </div>
    </Sheet>
  );
}

interface TileProps {
  active: boolean;
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  sub?: string;
  compact?: boolean;
  onClick: () => void;
}

function Tile({ active, icon, label, sub, compact, onClick }: TileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'flex flex-col items-center justify-center gap-1 rounded-xl px-2 text-center transition-all duration-150 active:scale-95',
        compact ? 'min-h-20 py-2' : 'min-h-24 py-2.5',
        active ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
      )}
    >
      <Icon name={icon} size={compact ? 22 : 24} />
      <span className={cx('line-clamp-2 text-xs font-semibold leading-tight', active ? 'text-on-primary' : 'text-on-surface')}>{label}</span>
      {sub && <span className={cx('text-[0.75rem] leading-none', active ? 'text-on-primary/80' : 'text-on-surface-variant')}>{sub}</span>}
    </button>
  );
}
