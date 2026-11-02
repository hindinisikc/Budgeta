import { db } from '../db';
import { DEFAULT_SETTINGS } from '../seed';

/** Hides a plan suggestion for one budget item (per month, since items are per month). */
export async function dismissSuggestion(itemId: string): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const s = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
    const dismissed = new Set(s.dismissedSuggestions ?? []);
    dismissed.add(itemId);
    await db.settings.put({ ...s, dismissedSuggestions: [...dismissed] });
  });
}

/**
 * Turns "live one month ahead" on or off. It applies to months started from now on; months that are
 * already started and still in the future (e.g. you started December early) follow the setting too.
 * The current and past months never change.
 */
export async function setIncomeTiming(timing: 'same-month' | 'next-month', currentMonth: string): Promise<void> {
  await db.transaction('rw', [db.settings, db.months], async () => {
    const s = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
    await db.settings.put({ ...s, incomeTiming: timing });
    const future = await db.months.where('id').above(currentMonth).toArray();
    for (const m of future) {
      if (m.status !== 'open') continue;
      if (timing === 'next-month') await db.months.update(m.id, { fundedBy: 'previous-month' });
      else await db.months.update(m.id, { fundedBy: undefined });
    }
  });
}
