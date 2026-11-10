import { useEffect, useState } from 'react';
import { AnimatedPeso, Icon, cx } from '../../components/ui';
import type { Lookups, MonthRecords } from '../../db/hooks';
import { formatPeso, sum } from '../../domain/money';
import { categoryOf } from './TransactionRow';

/** Validated categorical slots (theme.css --color-viz-1..4), in fixed order; everything after folds into "Other". */
const SLOTS = ['var(--color-viz-1)', 'var(--color-viz-2)', 'var(--color-viz-3)', 'var(--color-viz-4)'];
const OTHER_COLOR = 'var(--color-outline)';

interface Part {
  id: string;
  name: string;
  amount: number;
  color: string;
}

interface SpendingBreakdownProps {
  records: MonthRecords;
  lookups: Lookups;
  /** Category currently filtering the history below ('' = none). */
  selected: string;
  onSelect: (categoryId: string) => void;
}

/**
 * "Where it went": this month's spending split by category. One thin bar for the at-a-glance split,
 * then a row per part with its amount and share. Tapping a category filters the history below.
 */
export function SpendingBreakdown({ records, lookups, selected, onSelect }: SpendingBreakdownProps) {
  const [showOther, setShowOther] = useState(false);

  const itemById = new Map(records.items.map((i) => [i.id, i]));
  const totals = new Map<string, number>();
  for (const t of records.transactions) {
    if (t.type !== 'expense') continue;
    const key = categoryOf(t, itemById) ?? 'none';
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }
  const ranked = [...totals.entries()]
    .map(([id, amount]) => ({ id, amount, name: lookups.categoryById.get(id)?.name ?? 'Uncategorized' }))
    .sort((a, b) => b.amount - a.amount);
  const total = sum(ranked.map((r) => r.amount));

  // Top four keep a colour; a fifth category would just get "Other" too, so fold only when 2+ remain.
  const keep = ranked.length <= SLOTS.length + 1 ? ranked.length : SLOTS.length;
  const top: Part[] = ranked.slice(0, Math.min(keep, SLOTS.length)).map((r, i) => ({ ...r, color: SLOTS[i]! }));
  const rest = ranked.slice(top.length);
  const parts: Part[] =
    rest.length === 1
      ? [...top, { ...rest[0]!, color: OTHER_COLOR }]
      : rest.length > 1
        ? [...top, { id: 'other', name: `Other (${rest.length})`, amount: sum(rest.map((r) => r.amount)), color: OTHER_COLOR }]
        : top;

  // The bar grows in from empty when it first appears.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (total === 0) return null;
  const pct = (n: number) => {
    const p = (n / total) * 100;
    return p > 0 && p < 1 ? '<1%' : `${Math.round(p)}%`;
  };

  return (
    <section className="animate-item-in rounded-xl bg-surface-container-low p-4 shadow-soft" aria-labelledby="where-it-went">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="where-it-went" className="text-base font-semibold">
          Where it went
        </h3>
        <p className="text-sm text-on-surface-variant">
          <strong className="font-semibold text-on-surface">
            <AnimatedPeso value={total} />
          </strong>{' '}
          spent
        </p>
      </div>

      {/* Thin segmented bar: 2px gaps between parts, no text on it (the rows below carry the figures). */}
      <div
        role="img"
        aria-label={`Spending split: ${parts.map((p) => `${p.name} ${formatPeso(p.amount)} (${pct(p.amount)})`).join(', ')}`}
        className="mt-3 flex h-2 w-full gap-[2px] overflow-hidden rounded-full"
      >
        {parts.map((p) => (
          <span
            key={p.id}
            className={cx('h-full min-w-[2px] transition-[flex-grow,opacity] duration-700 ease-out', selected && selected !== p.id && 'opacity-30')}
            style={{ backgroundColor: p.color, flexGrow: grown ? p.amount : 0, flexBasis: 0 }}
          />
        ))}
      </div>

      <ul className="mt-2 -mx-2">
        {parts.map((p) => {
          const isOther = p.id === 'other';
          const active = selected === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => (isOther ? setShowOther((s) => !s) : onSelect(active ? '' : p.id))}
                aria-pressed={isOther ? undefined : active}
                aria-expanded={isOther ? showOther : undefined}
                className={cx(
                  'flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors active:bg-surface-container',
                  active && 'bg-surface-container',
                )}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="shrink-0 font-semibold">{formatPeso(p.amount)}</span>
                <span className="w-10 shrink-0 text-right text-sm text-on-surface-variant">{pct(p.amount)}</span>
                {/* Same-width end slot on every row so amounts and percentages line up. */}
                <span className="flex w-4 shrink-0 justify-center">
                  {isOther && <Icon name="keyboard_arrow_down" size={18} className={cx('shrink-0 text-on-surface-variant transition-transform duration-200', showOther && 'rotate-180')} />}
                </span>
              </button>
              {isOther && showOther && (
                <ul className="animate-reveal pb-1">
                  {rest.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(selected === r.id ? '' : r.id)}
                        aria-pressed={selected === r.id}
                        className={cx(
                          'flex min-h-10 w-full items-center gap-3 rounded-lg py-1 pl-7 pr-2 text-left text-sm transition-colors active:bg-surface-container',
                          selected === r.id && 'bg-surface-container',
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate text-on-surface-variant">{r.name}</span>
                        <span className="shrink-0">{formatPeso(r.amount)}</span>
                        <span className="w-10 shrink-0 text-right text-on-surface-variant">{pct(r.amount)}</span>
                        <span className="w-4 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
