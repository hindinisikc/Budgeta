import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { textTone, type Tone } from './tones';
import { cx } from './cx';

interface StatTileProps {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  icon?: IconName;
  iconTone?: Tone;
  captionTone?: Tone;
  variant?: 'low' | 'accent';
  className?: string;
}

/** Small metric tile (the mockup's Spent / Left / Margin pills). */
export function StatTile({ label, value, caption, icon, iconTone = 'primary', captionTone = 'neutral', variant = 'low', className }: StatTileProps) {
  return (
    <div
      className={cx(
        'flex min-w-0 flex-col rounded-lg p-3 shadow-soft',
        variant === 'low' ? 'bg-surface-container-low' : 'bg-secondary-container/70 text-on-secondary-container',
        className,
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="truncate text-xs font-semibold text-on-surface-variant">{label}</span>
        {icon && <Icon name={icon} size={16} className={textTone[iconTone]} />}
      </div>
      <span className="truncate text-base font-semibold leading-tight">{value}</span>
      {caption && <span className={cx('mt-0.5 truncate text-xs', textTone[captionTone])}>{caption}</span>}
    </div>
  );
}
