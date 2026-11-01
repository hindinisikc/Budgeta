import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { softTone, type Tone } from './tones';
import { cx } from './cx';

interface BadgeProps {
  tone?: Tone;
  icon?: IconName;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', icon, className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
        softTone[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}
