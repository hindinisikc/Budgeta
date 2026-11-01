import { Icon } from '../ui';
import { useUi } from '../../state/ui';

/** Short confirmation shown above the bottom nav (mobile) or bottom-right (desktop). */
export function Toast() {
  const { toast } = useUi();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-6 lg:left-64">
      {toast && (
        <p
          key={toast.id}
          className="flex animate-sheet-up items-center gap-2 rounded-xl bg-inverse-surface px-4 py-3 text-sm font-semibold text-inverse-on-surface shadow-soft"
        >
          <Icon name="check_circle" size={18} className="text-inverse-primary" />
          {toast.message}
        </p>
      )}
    </div>
  );
}
