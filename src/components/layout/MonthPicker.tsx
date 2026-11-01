import { useEffect, useRef, useState } from 'react';
import { Icon, cx } from '../ui';
import { currentMonthId, formatMonthLabel, monthName, parseMonthId, toMonthId } from '../../domain/dates';
import { useUi } from '../../state/ui';

/** Header pill showing the selected month; opens a year/month grid popover. */
export function MonthPicker() {
  const { selectedMonth, setSelectedMonth } = useUi();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseMonthId(selectedMonth).year);
  const rootRef = useRef<HTMLDivElement>(null);
  const today = currentMonthId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) setViewYear(parseMonthId(selectedMonth).year);
    setOpen((o) => !o);
  };

  const pick = (id: string) => {
    setSelectedMonth(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-surface-container"
      >
        <Icon name="calendar_today" size={16} className="text-primary" />
        <span className="whitespace-nowrap">{formatMonthLabel(selectedMonth)}</span>
        <Icon name="keyboard_arrow_down" size={18} className={cx('text-on-surface-variant transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose month"
          className="absolute left-0 top-full z-50 mt-2 w-72 animate-fade-in rounded-xl bg-surface-container-lowest p-3 shadow-soft ring-1 ring-outline-variant/40"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous year" onClick={() => setViewYear((y) => y - 1)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-container">
              <Icon name="chevron_left" size={22} />
            </button>
            <span className="font-headline text-base font-bold">{viewYear}</span>
            <button type="button" aria-label="Next year" onClick={() => setViewYear((y) => y + 1)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-container">
              <Icon name="chevron_right" size={22} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => {
              const id = toMonthId(viewYear, i);
              const selected = id === selectedMonth;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => pick(id)}
                  aria-current={selected ? 'date' : undefined}
                  className={cx(
                    'min-h-11 rounded-lg text-sm font-semibold transition-colors',
                    selected ? 'bg-primary text-on-primary' : 'hover:bg-surface-container',
                    !selected && id === today && 'text-primary ring-1 ring-primary/50',
                  )}
                >
                  {monthName(i, true)}
                </button>
              );
            })}
          </div>
          {selectedMonth !== today && (
            <button type="button" onClick={() => pick(today)} className="mt-2 min-h-11 w-full rounded-lg text-sm font-semibold text-primary hover:bg-surface-container">
              Go to this month
            </button>
          )}
        </div>
      )}
    </div>
  );
}
