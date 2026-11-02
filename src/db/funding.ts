import { db } from './db';
import { earningsFunding, type Funding } from '../domain/calc';
import { addMonths } from '../domain/dates';
import type { Month } from '../domain/types';

/**
 * For a "one month ahead" month: what it runs on, read live from the previous month's paydays
 * (so marking the 30th's salary late still updates it). Null for normal months.
 */
export async function fundingFor(month: Month | undefined): Promise<Funding | null> {
  if (month?.fundedBy !== 'previous-month') return null;
  const prev = addMonths(month.id, -1);
  const [incomeItems, transactions] = await Promise.all([
    db.incomeItems.where('monthId').equals(prev).toArray(),
    db.transactions.where('monthId').equals(prev).toArray(),
  ]);
  return earningsFunding(prev, incomeItems, transactions);
}
