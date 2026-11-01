import { cx } from './cx';

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
  className?: string;
}

/** Pill tab group (the Budget mockup's All / Unpaid / Paid filter). */
export function SegmentedControl<T extends string>({ value, onChange, options, label, className }: SegmentedControlProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cx('inline-flex rounded-xl bg-surface-container p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'min-h-10 flex-1 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-colors',
              active ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
