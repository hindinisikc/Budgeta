import { fillTone, type Tone } from './tones';
import { cx } from './cx';

interface ProgressBarProps {
  /** 0..1; values outside are clamped. */
  value: number;
  tone?: Tone;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

export function ProgressBar({ value, tone = 'primary', size = 'md', label, className }: ProgressBarProps) {
  const pct = Math.round(clamp01(value) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cx('w-full overflow-hidden rounded-full bg-surface-variant/70', size === 'md' ? 'h-2' : 'h-1.5', className)}
    >
      <div className={cx('h-full rounded-full transition-[width] duration-500', fillTone[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
