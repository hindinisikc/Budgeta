import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { exportBackup, markBackedUp } from '../../db/repo/backup';
import { DEFAULT_SETTINGS } from '../../db/seed';
import { backupFileName } from '../../domain/backup';
import { transactionsCsv } from '../../domain/csv';
import { todayStr } from '../../domain/dates';
import { saveFile } from '../../state/saveFile';
import { useUi } from '../../state/ui';

/** Saves a full JSON backup and records the time. */
export function useBackupNow() {
  const { showToast } = useUi();
  return async () => {
    const backup = await exportBackup();
    const result = await saveFile(backupFileName(backup.exportedAt), JSON.stringify(backup), 'application/json');
    if (result === 'cancelled') return;
    await markBackedUp(backup.exportedAt);
    showToast('Backup saved');
  };
}

/** Saves every transaction as a CSV for spreadsheets. */
export function useExportCsv() {
  const { showToast } = useUi();
  return async () => {
    const [transactions, categories, accounts, items, income, goals] = await Promise.all([
      db.transactions.toArray(),
      db.categories.toArray(),
      db.accounts.toArray(),
      db.budgetItems.toArray(),
      db.incomeItems.toArray(),
      db.goals.toArray(),
    ]);
    const csv = transactionsCsv(transactions, {
      categories: new Map(categories.map((c) => [c.id, c])),
      accounts: new Map(accounts.map((a) => [a.id, a])),
      items: new Map(items.map((i) => [i.id, i])),
      income: new Map(income.map((i) => [i.id, i])),
      goals: new Map(goals.map((g) => [g.id, g])),
    });
    const result = await saveFile(`budgeta-transactions-${todayStr()}.csv`, csv, 'text/csv');
    if (result === 'saved') showToast(`Exported ${transactions.length} transactions`);
  };
}

export interface BackupStatus {
  lastBackupAt: string | null;
  /** Whole days since the last backup (null if never). */
  daysSince: number | null;
  /** True when there's data worth protecting and no backup within the reminder window. */
  due: boolean;
}

/** Drives the backup reminder (bell dot, Notifications, Settings). */
export function useBackupStatus(): BackupStatus | undefined {
  return useLiveQuery(async () => {
    const settings = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
    const hasData = (await db.transactions.count()) > 0;
    const last = settings.lastBackupAt;
    const daysSince = last ? Math.floor((Date.now() - Date.parse(last)) / 86_400_000) : null;
    const due = hasData && (daysSince === null || daysSince >= settings.backupReminderDays);
    return { lastBackupAt: last, daysSince, due };
  }, []);
}
