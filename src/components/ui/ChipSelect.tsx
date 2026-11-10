import { Icon } from './Icon';
import type { IconName } from './icons';
import { fieldLabelClass } from './Field';
import { cx } from './cx';

interface ChipOption {
  value: string;
  label: string;
  icon?: IconName;
}

interface ChipSelectProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: ChipOption[];
  /** Allow tapping the selected chip again to clear it. */
  allowNone?: boolean;
}

/** Horizontally scrolling single-choice chips (the mockup's "Paid with" row). */
export function ChipSelect({ label, value, onChange, options, allowNone }: ChipSelectProps) {
  return (
    <div className="space-y-1.5">
      <span className={fieldLabelClass}>{label}</span>
      <div role="radiogroup" aria-label={label} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(selected && allowNone ? null : o.value)}
              className={cx(
                'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-all duration-150 active:scale-95',
                selected ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface ring-1 ring-inset ring-outline-variant/70 hover:bg-surface-container',
              )}
            >
              {o.icon && <Icon name={o.icon} size={18} />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
