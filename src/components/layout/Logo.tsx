import { Icon, cx } from '../ui';

/** Placeholder brand mark until a real Budgeta logo exists. */
export function Logo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
        <Icon name="eco_fill" size={18} />
      </span>
      {showName && <span className="text-base font-semibold tracking-tight">Budgeta</span>}
    </span>
  );
}
