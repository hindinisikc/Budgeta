import { useId, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes } from 'react';
import { Icon } from './Icon';
import { cx } from './cx';

export const fieldLabelClass = 'block px-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant';
export const fieldInputClass =
  'min-h-12 w-full rounded-xl bg-surface-container-low px-4 text-base font-semibold text-on-surface placeholder:text-outline transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary';

interface FieldShellProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function FieldShell({ label, htmlFor, hint, className, children }: FieldShellProps) {
  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className={fieldLabelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="px-1 text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: ReactNode;
  options: Array<{ value: string; label: string }>;
};

/** Native select (uses the phone's own picker), styled like Terra inputs. */
export function SelectField({ label, hint, options, className, id, ...rest }: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <FieldShell label={label} htmlFor={selectId} hint={hint} className={className}>
      <div className="relative">
        <select id={selectId} className={cx(fieldInputClass, 'appearance-none pr-10')} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon name="keyboard_arrow_down" size={20} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
      </div>
    </FieldShell>
  );
}

type DateFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string; hint?: ReactNode };

export function DateField({ label, hint, className, id, ...rest }: DateFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} className={className}>
      <input id={inputId} type="date" className={fieldInputClass} {...rest} />
    </FieldShell>
  );
}
