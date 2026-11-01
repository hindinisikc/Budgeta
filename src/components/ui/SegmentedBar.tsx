import type { ReactNode } from 'react';
import { fillTone, type Tone } from './tones';
import { cx } from './cx';

export interface Segment {
  value: number;
  tone: Tone;
  label: ReactNode;
}

interface SegmentedBarProps {
  segments: Segment[];
  showLegend?: boolean;
  className?: string;
}

/** Horizontal bar split proportionally between segments (e.g. Expenses / Savings / Margin). */
export function SegmentedBar({ segments, showLegend = true, className }: SegmentedBarProps) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  return (
    <div className={cx('space-y-2', className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-variant">
        {total > 0 &&
          segments.map((s, i) => (
            <div key={i} className={cx('h-full', fillTone[s.tone])} style={{ width: `${(Math.max(0, s.value) / total) * 100}%` }} />
          ))}
      </div>
      {showLegend && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-0.5 text-xs text-on-surface-variant">
          {segments.map((s, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className={cx('h-2 w-2 rounded-full', fillTone[s.tone])} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
