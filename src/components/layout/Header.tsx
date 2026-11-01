import { Link } from 'react-router';
import { Icon } from '../ui';
import { useDueEntries } from '../../db/hooks';
import { useBackupStatus } from '../../features/backup/useBackup';
import { Logo } from './Logo';
import { MonthPicker } from './MonthPicker';

export function Header() {
  const due = useDueEntries();
  const backup = useBackupStatus();
  const count = (due?.length ?? 0) + (backup?.due ? 1 : 0);
  const urgent = (due?.some((d) => d.daysUntil <= 0) ?? false) || !!backup?.due;
  return (
    <header className="pt-safe fixed inset-x-0 top-0 z-40 bg-surface/85 shadow-bar-bottom backdrop-blur-xl lg:left-64">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Logo showName={false} className="lg:hidden" />
          <MonthPicker />
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/notifications"
            aria-label={count ? `Notifications (${count} due)` : 'Notifications'}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="notifications" size={22} />
            {count > 0 && <span className={`absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface ${urgent ? 'bg-error' : 'bg-primary'}`} />}
          </Link>
          <Link
            to="/settings"
            aria-label="Settings"
            className="flex h-11 w-11 items-center justify-center rounded-full transition-opacity hover:opacity-90"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
              <Icon name="person" size={18} />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
