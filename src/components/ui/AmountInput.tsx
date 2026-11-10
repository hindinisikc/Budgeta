import { useId, type ReactNode } from 'react';
import { fieldLabelClass } from './Field';
import { cx } from './cx';

interface AmountInputProps {
  label: string;
  /** Raw text as typed; parse with parseAmount() on save. */
  value: string;
  onChange: (value: string) => void;
  size?: 'md' | 'lg';
  hint?: ReactNode;
  autoFocus?: boolean;
}

/** Peso amount field. Keeps the raw text so typing "1,2" or "180." never jumps around. */
export function AmountInput({ label, value, onChange, size = 'md', hint, autoFocus }: AmountInputProps) {
  const id = useId();
  const large = size === 'lg';
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <div
        className={cx(
          'flex items-center rounded-xl bg-surface-container-low px-4 ring-1 ring-inset ring-outline-variant/70 transition-all focus-within:ring-2 focus-within:ring-primary',
          large ? 'min-h-16' : 'min-h-12',
        )}
      >
        <span className={cx('font-semibold text-on-surface-variant', large ? 'text-2xl' : 'text-lg')}>₱</span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
          className={cx(
            'w-full min-w-0 self-stretch bg-transparent pl-2 font-semibold text-on-surface placeholder:text-outline focus:outline-none',
            large ? 'text-3xl' : 'text-lg',
          )}
        />
      </div>
      {hint && <p className="px-1 text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}
