import { NavLink } from 'react-router';
import { Icon, cx } from '../ui';
import { useUi } from '../../state/ui';
import { NAV_ITEMS, type NavItem } from './nav';

function Tab({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cx(
          'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
          isActive ? 'font-bold text-primary' : 'text-on-surface-variant hover:text-on-surface',
        )
      }
    >
      <Icon name={item.icon} size={22} />
      <span className="text-xs leading-none">{item.label}</span>
    </NavLink>
  );
}

/** Mobile/tablet tab bar with the raised Quick Add button in the middle. Hidden on desktop. */
export function BottomNav() {
  const { openQuickAdd } = useUi();
  const [first, second, third, fourth] = NAV_ITEMS;
  return (
    <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-40 bg-surface/90 shadow-bar-top backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-around px-2">
        {first && <Tab item={first} />}
        {second && <Tab item={second} />}
        <div className="shrink-0 px-2">
          <button
            type="button"
            onClick={openQuickAdd}
            aria-label="Quick add expense"
            className="relative -top-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-fab transition-all hover:bg-on-primary-fixed-variant active:scale-95"
          >
            <Icon name="add" size={30} />
          </button>
        </div>
        {third && <Tab item={third} />}
        {fourth && <Tab item={fourth} />}
      </div>
    </nav>
  );
}
