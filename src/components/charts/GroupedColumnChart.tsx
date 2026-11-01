import { useState } from 'react';
import { ChartTooltip, Legend } from './ChartParts';
import { axisPeso, columnPath, niceTicks, useWidth, type Series } from './chartUtils';

interface GroupedColumnChartProps {
  /** Short labels under each group (e.g. "Oct"). */
  labels: string[];
  /** Long labels for tooltips / accessible names (e.g. "October 2026"). */
  titles: string[];
  series: Series[];
  height?: number;
  ariaLabel: string;
}

const LEFT = 48;
const RIGHT = 8;
const TOP = 12;
const AXIS = 24;
const GAP = 2; // surface gap between touching columns
const MAX_COL = 24;

/** Columns grouped per x position, one colour per series, one baseline at zero, hover tooltip per group. */
export function GroupedColumnChart({ labels, titles, series, height = 200, ariaLabel }: GroupedColumnChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(0, ...series.flatMap((s) => s.values));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const plotW = Math.max(width - LEFT - RIGHT, 0);
  const band = labels.length ? plotW / labels.length : 0;
  const k = series.length;
  const col = Math.max(Math.min(MAX_COL, (band * 0.72 - GAP * (k - 1)) / k), 2);
  const groupW = col * k + GAP * (k - 1);
  const y = (v: number) => TOP + height - (v / top) * height;
  const base = y(0);

  return (
    <div className="space-y-2">
      {series.length > 1 && <Legend items={series} mark="bar" />}
      <div ref={ref} className="relative w-full" style={{ height: TOP + height + AXIS }}>
        {width > 0 && (
          <svg width={width} height={TOP + height + AXIS} role="img" aria-label={ariaLabel} className="block overflow-visible">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={LEFT} x2={width - RIGHT} y1={y(t)} y2={y(t)} stroke="var(--color-viz-grid)" strokeWidth={1} />
                <text x={LEFT - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-on-surface-variant text-[11px] tabular-nums">
                  {axisPeso(t, top)}
                </text>
              </g>
            ))}
            {labels.map((label, i) => {
              const x0 = LEFT + band * i + (band - groupW) / 2;
              return (
                <g key={i}>
                  {active === i && <rect x={LEFT + band * i + 2} y={TOP} width={band - 4} height={height} rx={6} className="fill-surface-container" />}
                  {series.map((s, j) => {
                    const v = s.values[i] ?? 0;
                    if (v <= 0) return null;
                    return <path key={s.name} d={columnPath(x0 + j * (col + GAP), col, y(v), base)} fill={s.color} />;
                  })}
                  <text x={LEFT + band * (i + 0.5)} y={base + 16} textAnchor="middle" className="fill-on-surface-variant text-[11px]">
                    {label}
                  </text>
                  {/* Hit target: the whole band, focusable for keyboard users. */}
                  <rect
                    x={LEFT + band * i}
                    y={TOP}
                    width={band}
                    height={height + AXIS}
                    fill="transparent"
                    tabIndex={0}
                    role="graphics-symbol"
                    aria-label={`${titles[i]}: ${series.map((s) => `${s.name} ${axisPeso(s.values[i] ?? 0, 0)}`).join(', ')}`}
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className="cursor-default outline-none"
                  />
                </g>
              );
            })}
            <line x1={LEFT} x2={width - RIGHT} y1={base} y2={base} stroke="var(--color-outline-variant)" strokeWidth={1} />
          </svg>
        )}
        {active !== null && (
          <ChartTooltip
            x={LEFT + band * (active + 0.5)}
            y={y(Math.max(...series.map((s) => s.values[active] ?? 0)))}
            containerWidth={width}
            title={titles[active] ?? ''}
            rows={series.map((s) => ({ name: s.name, color: s.color, value: s.values[active] ?? 0 }))}
          />
        )}
      </div>
    </div>
  );
}
