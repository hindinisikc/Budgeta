import { formatPeso, type Centavos } from '../../domain/money';

interface LegendProps {
  items: Array<{ name: string; color: string }>;
  /** Swatch mirrors the mark: rect for bars, line for lines. */
  mark: 'bar' | 'line';
}

export function Legend({ items, mark }: LegendProps) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
      {items.map((s) => (
        <li key={s.name} className="flex items-center gap-1.5">
          {mark === 'bar' ? (
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
          ) : (
            <span className="h-0.5 w-3.5 rounded-full" style={{ background: s.color }} />
          )}
          {s.name}
        </li>
      ))}
    </ul>
  );
}

interface TooltipProps {
  /** Anchor in container pixels (centre-top of the hovered position). */
  x: number;
  y: number;
  containerWidth: number;
  title: string;
  rows: Array<{ name: string; color: string; value: Centavos }>;
}

/** One tooltip, every series. Values lead (strong), names follow; short line keys. */
export function ChartTooltip({ x, y, containerWidth, title, rows }: TooltipProps) {
  const width = 168;
  const left = Math.min(Math.max(x - width / 2, 0), Math.max(containerWidth - width, 0));
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 rounded-lg bg-surface-container-lowest px-3 py-2 text-xs shadow-soft ring-1 ring-outline-variant/50"
      style={{ left, top: Math.max(y - 8, 0), width, transform: 'translateY(-100%)' }}
    >
      <p className="mb-1 font-semibold text-on-surface-variant">{title}</p>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-on-surface-variant">
              <span className="h-0.5 w-3 rounded-full" style={{ background: r.color }} />
              {r.name}
            </span>
            <strong className="font-bold text-on-surface tabular-nums">{formatPeso(r.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
