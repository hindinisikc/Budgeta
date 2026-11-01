import type { HTMLAttributes } from 'react';
import { cx } from './cx';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** `low` = default card, `container` = slightly darker, `highlight` = green hero. */
  variant?: 'low' | 'container' | 'highlight';
  padding?: 'sm' | 'md' | 'lg';
};

const variants = {
  low: 'bg-surface-container-low',
  container: 'bg-surface-container',
  highlight: 'bg-primary-fixed text-on-primary-fixed',
};
const paddings = { sm: 'p-3', md: 'p-4', lg: 'p-5' };

export function Card({ variant = 'low', padding = 'md', className, ...rest }: CardProps) {
  return (
    <div
      className={cx('relative overflow-hidden rounded-xl shadow-soft', variants[variant], paddings[padding], className)}
      {...rest}
    />
  );
}
