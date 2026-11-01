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
