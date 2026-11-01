import type { ReactNode } from 'react';
import { cx } from './cx';

interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  trailingSub?: ReactNode;
  onClick?: () => void;
  className?: string;
}

/** Row used for transactions and bills: icon · title/subtitle · amount/caption. */
export function ListRow({ leading, title, subtitle, trailing, trailingSub, onClick, className }: ListRowProps) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="min-w-0">
          <div className="truncate font-headline text-sm font-semibold">{title}</div>
          {subtitle && <div className="truncate text-xs text-on-surface-variant">{subtitle}</div>}
        </div>
      </div>
      {(trailing || trailingSub) && (
        <div className="shrink-0 text-right">
          {trailing && <div className="font-headline text-sm font-bold">{trailing}</div>}
          {trailingSub && <div className="text-xs text-on-surface-variant">{trailingSub}</div>}
        </div>
      )}
    </>
  );
  const base = 'flex w-full items-center justify-between gap-3 p-3.5 text-left';
  return onClick ? (
    <button type="button" onClick={onClick} className={cx(base, 'transition-colors hover:bg-surface-container/40', className)}>
      {content}
    </button>
  ) : (
    <div className={cx(base, className)}>{content}</div>
  );
}
