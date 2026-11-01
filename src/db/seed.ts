import type { Transaction as DexieTransaction } from 'dexie';
import { newId } from '../domain/id';
import type { Account, Category, Settings } from '../domain/types';

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  dueSoonDays: 5,
  backupReminderDays: 14,
  lastBackupAt: null,
};

const DEFAULT_CATEGORIES: Array<[name: string, icon: string]> = [
  ['Food', 'restaurant'],
  ['Groceries', 'local_mall'],
  ['Transit', 'directions_bus'],
  ['Utilities', 'bolt'],
  ['Personal', 'self_improvement'],
  ['Family', 'volunteer_activism'],
  ['Bills', 'receipt_long'],
  ['Housing', 'home'],
  ['Education', 'school'],
  ['Health', 'medical_services'],
  ['Debt', 'credit_card'],
  ['Others', 'category'],
];

const DEFAULT_ACCOUNTS: Array<[name: string, icon: string]> = [
  ['Cash', 'payments'],
  ['GCash', 'account_balance_wallet'],
  ['Maya', 'qr_code_2'],
  ['BPI', 'credit_card'],
  ['BDO', 'account_balance'],
];

export function defaultCategories(): Category[] {
  return DEFAULT_CATEGORIES.map(([name, icon], order) => ({ id: newId(), name, icon, archived: false, order }));
}

export function defaultAccounts(): Account[] {
  return DEFAULT_ACCOUNTS.map(([name, icon], order) => ({ id: newId(), name, icon, archived: false, order }));
}

export async function seedDefaults(tx: DexieTransaction): Promise<void> {
  await tx.table('settings').add(DEFAULT_SETTINGS);
  await tx.table('categories').bulkAdd(defaultCategories());
  await tx.table('accounts').bulkAdd(defaultAccounts());
}
