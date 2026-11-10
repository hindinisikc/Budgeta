import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { cx } from './cx';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  icon?: IconName;
  fullWidth?: boolean;
};

const variants = {
  primary: 'bg-primary text-on-primary hover:bg-on-primary-fixed-variant',
  secondary: 'bg-surface-container-low text-primary ring-1 ring-inset ring-outline-variant hover:bg-surface-container',
  tonal: 'bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim',
  ghost: 'text-primary hover:bg-surface-container',
  danger: 'text-error hover:bg-error-container/50',
};
const sizes = {
  md: 'min-h-11 px-4 text-sm gap-1.5',
  lg: 'min-h-14 px-6 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'lg' ? 22 : 18} />}
      {children}
    </button>
  );
}
