import { useId, type InputHTMLAttributes } from 'react';
import { cx } from './cx';
import { fieldLabelClass } from './Field';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
};

/** Text input: light grey fill, rounded, green focus ring. */
export function TextField({ label, error, className, id, ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={inputId} className={fieldLabelClass}>
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={cx(
          'min-h-12 w-full rounded-xl bg-surface-container-low px-4 text-base font-medium text-on-surface ring-inset placeholder:text-outline transition-all focus:outline-none focus:ring-2',
          error ? 'ring-2 ring-error/60 focus:ring-error' : 'ring-1 ring-outline-variant/70 focus:ring-primary',
        )}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="px-1 text-sm font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  );
}
