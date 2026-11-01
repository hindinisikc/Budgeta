import type { ReactNode } from 'react';
import { clamp01 } from './ProgressBar';
import { cx } from './cx';

export interface Ring {
  /** 0..1 */
  value: number;
  /** Any CSS color, e.g. `var(--color-primary)`. */
  color: string;
  label?: string;
}

interface RingChartProps {
  /** Outermost ring first. */
  rings: Ring[];
  size?: number;
  stroke?: number;
  gap?: number;
  children?: ReactNode;
  className?: string;
}

const VIEW = 160;

/** Concentric progress rings ("fitness tracker" style) with optional centre content. */
export function RingChart({ rings, size = 144, stroke = 9, gap = 5, children, className }: RingChartProps) {
  const label = rings.map((r) => r.label).filter(Boolean).join(', ');
  return (
    <div className={cx('relative flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${VIEW} ${VIEW}`} role="img" aria-label={label || undefined}>
        {rings.map((ring, i) => {
          const r = VIEW / 2 - stroke / 2 - 1 - i * (stroke + gap);
          const c = 2 * Math.PI * r;
          const v = clamp01(ring.value);
          return (
            <g key={i}>
              <circle cx={VIEW / 2} cy={VIEW / 2} r={r} fill="none" stroke="var(--color-surface-variant)" strokeWidth={stroke} opacity={0.55} />
              {v > 0 && (
                <circle
                  cx={VIEW / 2}
                  cy={VIEW / 2}
                  r={r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={c * (1 - v)}
                  className="transition-[stroke-dashoffset] duration-700"
                />
              )}
            </g>
          );
        })}
      </svg>
      {children && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}
