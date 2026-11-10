import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Icon, SegmentedControl, SelectField, Sheet, cx, fieldInputClass } from '../../components/ui';
import { db } from '../../db/db';
import { useLookups, useMonthRecords } from '../../db/hooks';
import { formatShortDate, monthName, todayStr, daysBetween, type DateStr } from '../../domain/dates';
import { formatPeso, sum } from '../../domain/money';
import type { Transaction } from '../../domain/types';
import { useUi } from '../../state/ui';
import { labelOptions } from '../budget/helpers';
import { SpendingBreakdown } from './SpendingBreakdown';
import { TransactionEditorSheet } from './TransactionEditorSheet';
import { TransactionRow, categoryOf as sharedCategoryOf } from './TransactionRow';

type TypeFilter = 'all' | 'expense' | 'income' | 'savings';
interface Filters {
  categoryId: string;
  accountId: string;
  itemId: string;
}
const NO_FILTERS: Filters = { categoryId: '', accountId: '', itemId: '' };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function dayLabel(date: DateStr, today: DateStr): string {
  const diff = daysBetween(date, today);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const d = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
  return `${WEEKDAYS[d.getDay()]}, ${monthName(d.getMonth(), true)} ${d.getDate()}`;
}

/** Transaction history for the month chosen in the header, with search and filters. */
export function HistoryView() {
  const { selectedMonth } = useUi();
  const records = useMonthRecords(selectedMonth);
  const lookups = useLookups();
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<{ open: boolean; tx: Transaction | null }>({ open: false, tx: null });
  const today = todayStr();

  const itemById = useMemo(() => new Map((records?.items ?? []).map((i) => [i.id, i])), [records]);
  const incomeById = useMemo(() => new Map((records?.incomeItems ?? []).map((i) => [i.id, i])), [records]);
  const goalById = useMemo(() => new Map((goals ?? []).map((g) => [g.id, g])), [goals]);

  const categoryOf = (t: Transaction) => sharedCategoryOf(t, itemById);

  const filtered = useMemo(() => {
    if (!records) return [];
    const q = query.trim().toLowerCase();
    return records.transactions
      .filter((t) => {
        if (typeFilter === 'savings' ? t.type !== 'contribution' && t.type !== 'withdrawal' : typeFilter !== 'all' && t.type !== typeFilter) return false;
        if (filters.categoryId && categoryOf(t) !== filters.categoryId) return false;
        if (filters.accountId && t.accountId !== filters.accountId) return false;
        if (filters.itemId === 'unplanned' ? !(t.type === 'expense' && !t.budgetItemId) : filters.itemId && t.budgetItemId !== filters.itemId) return false;
        if (q && !`${t.description} ${t.note} ${t.receiptRef}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [records, query, typeFilter, filters, itemById]);

  if (!records || !lookups) return null;
  const { categoryById, accountById, categories, accounts } = lookups;

  const groups: Array<{ date: DateStr; txs: Transaction[] }> = [];
  for (const t of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.date === t.date) last.txs.push(t);
    else groups.push({ date: t.date, txs: [t] });
  }

  const spent = sum(filtered.filter((t) => t.type === 'expense').map((t) => t.amount));
  const received = sum(filtered.filter((t) => t.type === 'income').map((t) => t.amount));
  const activeFilters = [
    filters.categoryId && { key: 'categoryId' as const, label: categoryById.get(filters.categoryId)?.name ?? 'Category' },
    filters.accountId && { key: 'accountId' as const, label: accountById.get(filters.accountId)?.name ?? 'Account' },
    filters.itemId && { key: 'itemId' as const, label: filters.itemId === 'unplanned' ? 'Unplanned' : (itemById.get(filters.itemId)?.name ?? 'Budget line') },
  ].filter(Boolean) as Array<{ key: keyof Filters; label: string }>;

  const ctx = { lookups, itemById, incomeById, goalById };

  return (
    <>
      <SpendingBreakdown
        records={records}
        lookups={lookups}
        selected={filters.categoryId}
        onSelect={(categoryId) => setFilters((s) => ({ ...s, categoryId }))}
      />

      <div className="space-y-3">
        <div className="relative">
          <Icon name="search" size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="search"
            aria-label="Search transactions"
            placeholder="Search description, note, receipt…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cx(fieldInputClass, 'pl-11 text-sm')}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <SegmentedControl<TypeFilter>
            label="Type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'expense', label: 'Spent' },
              { value: 'income', label: 'Income' },
              { value: 'savings', label: 'Savings' },
            ]}
          />
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-surface-container-low px-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
          >
            <Icon name="tune" size={18} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-on-primary">{activeFilters.length}</span>}
          </button>
        </div>
        {activeFilters.length > 0 && (
          <div className="flex animate-reveal flex-wrap gap-2">
            {activeFilters.map((f) => (
              <button key={f.key} type="button" onClick={() => setFilters((s) => ({ ...s, [f.key]: '' }))} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary-fixed px-3 text-sm font-semibold text-on-primary-fixed">
                {f.label} <Icon name="close" size={16} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-1 text-sm text-on-surface-variant">
        <span>
          {filtered.length} transaction{filtered.length === 1 ? '' : 's'} · Spent <strong className="text-on-surface">{formatPeso(spent)}</strong>
          {received > 0 && (
            <>
              {' '}· In <strong className="text-primary">{formatPeso(received)}</strong>
            </>
          )}
        </span>
        <button type="button" onClick={() => setEditing({ open: true, tx: null })} className="inline-flex min-h-11 shrink-0 items-center gap-1 font-semibold text-primary">
          <Icon name="add" size={16} /> Add income
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl bg-surface-container-low px-4 py-10 text-center text-sm text-on-surface-variant shadow-soft">
          {records.transactions.length === 0 ? 'No transactions this month yet. Tap + to add your first expense.' : 'No transactions match your search or filters.'}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.date} className="space-y-1.5">
              <h3 className="px-1 text-sm font-medium text-on-surface-variant">
                {dayLabel(g.date, today).includes(formatShortDate(g.date)) ? dayLabel(g.date, today) : `${dayLabel(g.date, today)} · ${formatShortDate(g.date)}`}
              </h3>
              <ul className="divide-y divide-surface-container overflow-hidden rounded-xl bg-surface-container-low shadow-soft">
                {g.txs.map((t) => (
                  <li key={t.id}>
                    <TransactionRow tx={t} ctx={ctx} onClick={() => setEditing({ open: true, tx: t })} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setFilters(NO_FILTERS)}>
              Clear all
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Show results</Button>
          </div>
        }
      >
        <div className="space-y-5 pt-1">
          <SelectField
            label="Category"
            value={filters.categoryId}
            onChange={(e) => setFilters((s) => ({ ...s, categoryId: e.target.value }))}
            options={[{ value: '', label: 'Any category' }, ...labelOptions(categories, filters.categoryId || null).map((c) => ({ value: c.id, label: c.name }))]}
          />
          <SelectField
            label="Account"
            value={filters.accountId}
            onChange={(e) => setFilters((s) => ({ ...s, accountId: e.target.value }))}
            options={[{ value: '', label: 'Any account' }, ...accounts.map((a) => ({ value: a.id, label: a.name + (a.archived ? ' (archived)' : '') }))]}
          />
          <SelectField
            label="Budget line"
            value={filters.itemId}
            onChange={(e) => setFilters((s) => ({ ...s, itemId: e.target.value }))}
            options={[{ value: '', label: 'Any' }, { value: 'unplanned', label: 'Unplanned only' }, ...records.items.map((i) => ({ value: i.id, label: i.name }))]}
          />
        </div>
      </Sheet>

      <TransactionEditorSheet
        open={editing.open}
        onClose={() => setEditing((s) => ({ ...s, open: false }))}
        tx={editing.tx ? (records.transactions.find((t) => t.id === editing.tx!.id) ?? editing.tx) : null}
        monthId={selectedMonth}
        lookups={lookups}
        goalName={editing.tx?.goalId ? goalById.get(editing.tx.goalId)?.name : undefined}
      />
    </>
  );
}
