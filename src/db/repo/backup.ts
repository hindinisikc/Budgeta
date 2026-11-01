import { db } from '../db';
import { DEFAULT_SETTINGS } from '../seed';
import { BACKUP_TABLES, makeBackup, type BackupData, type BackupFile } from '../../domain/backup';
import { nowIso } from '../../domain/id';

const ALL_TABLES = BACKUP_TABLES.map((t) => db[t]);

/** Snapshot of every table, read in one consistent transaction. */
export async function exportBackup(): Promise<BackupFile> {
  return db.transaction('r', ALL_TABLES, async () => {
    const entries = await Promise.all(BACKUP_TABLES.map(async (t) => [t, await db[t].toArray()] as const));
    return makeBackup(Object.fromEntries(entries) as unknown as BackupData, nowIso());
  });
}

/** Records that a backup was just saved (drives the backup reminder). */
export async function markBackedUp(at: string = nowIso()): Promise<void> {
  const s = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
  await db.settings.put({ ...s, lastBackupAt: at });
}

/**
 * Replaces ALL data with the backup's contents. Runs as one transaction: if anything fails,
 * nothing is changed. The backup must already have passed `checkBackup`.
 */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  await db.transaction('rw', ALL_TABLES, async () => {
    for (const t of BACKUP_TABLES) await db[t].clear();
    for (const t of BACKUP_TABLES) {
      // Each table gets its own typed rows; the cast only bridges the loop over table names.
      await (db[t] as unknown as { bulkAdd(rows: unknown[]): Promise<unknown> }).bulkAdd(backup.data[t]);
    }
    if (!(await db.settings.get('app'))) await db.settings.add(DEFAULT_SETTINGS);
  });
}
