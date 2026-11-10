import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from './cx';

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: ReactNode }>;
  label: string;
  className?: string;
}

/** Pill tab group (e.g. All / Unpaid / Paid). The white highlight slides to the chosen tab. */
export function SegmentedControl<T extends string>({ value, onChange, options, label, className }: SegmentedControlProps<T>) {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  // Measure the active tab (also when labels change width, e.g. counts updating).
  const labelsKey = options.map((o) => (typeof o.label === 'string' ? o.label : o.value)).join('|');
  useLayoutEffect(() => {
    const el = refs.current.get(value);
    if (!el) return;
    const measure = () => setPill({ left: el.offsetLeft, width: el.offsetWidth });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value, labelsKey]);

  return (
    <div role="tablist" aria-label={label} className={cx('relative inline-flex rounded-xl bg-surface-container-high p-1', className)}>
      {pill && (
        <span
          aria-hidden
          className="absolute bottom-1 top-1 rounded-lg bg-surface-container-lowest shadow-sm transition-[transform,width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ width: pill.width, transform: `translateX(${pill.left - 4}px)`, left: 4 }}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              if (el) refs.current.set(o.value, el);
              else refs.current.delete(o.value);
            }}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'relative min-h-10 min-w-11 flex-auto whitespace-nowrap rounded-lg px-2 text-sm font-medium transition-colors duration-200 min-[380px]:px-3 sm:px-4',
              active ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface',
              // Before the first measurement, show the highlight on the button itself.
              active && !pill && 'bg-surface-container-lowest shadow-sm',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
