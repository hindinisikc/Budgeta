import { Icon } from './Icon';
import type { IconName } from './icons';
import { softTone, textTone, type Tone } from './tones';
import { cx } from './cx';

interface IconChipProps {
  icon: IconName;
  tone?: Tone;
  /** `plain` = neutral background with a colored icon; `soft` = tinted background. */
  look?: 'plain' | 'soft';
  shape?: 'circle' | 'rounded';
  size?: 'sm' | 'md';
  className?: string;
}

export function IconChip({ icon, tone = 'primary', look = 'plain', shape = 'circle', size = 'md', className }: IconChipProps) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center',
        size === 'md' ? 'h-10 w-10' : 'h-8 w-8',
        shape === 'circle' ? 'rounded-full' : 'rounded-lg',
        look === 'plain' ? cx('bg-surface-container', textTone[tone]) : softTone[tone],
        className,
      )}
    >
      <Icon name={icon} size={size === 'md' ? 20 : 18} />
    </span>
  );
}
