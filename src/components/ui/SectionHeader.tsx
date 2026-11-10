import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { textTone, type Tone } from './tones';

interface SectionHeaderProps {
  title: string;
  icon?: IconName;
  iconTone?: Tone;
  /** Right side: a link/button or a short caption. */
  action?: ReactNode;
}

export function SectionHeader({ title, icon, iconTone = 'neutral', action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <div className="flex min-w-0 items-center gap-1.5">
        {icon && <Icon name={icon} size={18} className={textTone[iconTone]} />}
        <h3 className="truncate text-base font-semibold">{title}</h3>
      </div>
      {action && <div className="shrink-0 text-sm font-medium">{action}</div>}
    </div>
  );
}
