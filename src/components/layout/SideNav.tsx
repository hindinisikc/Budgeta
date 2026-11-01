import { NavLink } from 'react-router';
import { Button, Icon, cx, type IconName } from '../ui';
import { useUi } from '../../state/ui';
import { Logo } from './Logo';
import { NAV_ITEMS } from './nav';

function SideLink({ to, label, icon }: { to: string; label: string; icon: IconName }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cx(
          'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors',
          isActive ? 'bg-primary-fixed/70 font-bold text-on-primary-fixed' : 'font-semibold text-on-surface-variant hover:bg-surface-container',
        )
      }
    >
      <Icon name={icon} size={22} />
      {label}
    </NavLink>
  );
}

/** Desktop (≥1024px) navigation rail replacing the bottom tab bar. */
export function SideNav() {
  const { openQuickAdd } = useUi();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-6 bg-surface-container-low px-4 py-5 lg:flex">
      <Logo className="px-2" />
      <Button icon="add" onClick={openQuickAdd} fullWidth>
        Quick Add
      </Button>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <SideLink key={item.to} {...item} />
        ))}
      </nav>
      <div className="mt-auto">
        <SideLink to="/settings" label="Settings" icon="settings" />
      </div>
    </aside>
  );
}
