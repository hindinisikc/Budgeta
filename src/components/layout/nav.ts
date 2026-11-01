import type { IconName } from '../ui';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

/** Main destinations, in bottom-nav order. The Quick Add button sits between Budget and Savings. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/budget', label: 'Budget', icon: 'account_balance_wallet' },
  { to: '/savings', label: 'Savings', icon: 'savings' },
  { to: '/activity', label: 'Activity', icon: 'receipt_long' },
];
