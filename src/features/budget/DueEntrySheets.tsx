import { useMemo } from 'react';
import { useMonthRecords, type Lookups } from '../../db/hooks';
import { summarizeMonth } from '../../domain/calc';
import type { DueEntry } from '../../domain/due';
import { PayItemSheet, ReceiveIncomeSheet } from './MoneySheets';

interface DueEntrySheetsProps {
  /** The entry to act on; null when nothing is open. */
  entry: DueEntry | null;
  open: boolean;
  onClose: () => void;
  lookups: Lookups;
}

/** Opens "Record Payment" for a due bill or "Income Received" for expected income, from any screen. */
export function DueEntrySheets({ entry, open, onClose, lookups }: DueEntrySheetsProps) {
  const records = useMonthRecords(entry?.monthId ?? '');
  const summary = useMemo(() => (records && entry ? summarizeMonth(records) : null), [records, entry]);
  const item = entry?.kind === 'bill' ? (summary?.items.find((s) => s.item.id === entry.id) ?? null) : null;
  const income = entry?.kind === 'income' ? (summary?.income.find((s) => s.income.id === entry.id) ?? null) : null;
  return (
    <>
      <PayItemSheet open={open && entry?.kind === 'bill'} onClose={onClose} target={item} accounts={lookups.accounts} />
      <ReceiveIncomeSheet open={open && entry?.kind === 'income'} onClose={onClose} target={income} accounts={lookups.accounts} />
    </>
  );
}
