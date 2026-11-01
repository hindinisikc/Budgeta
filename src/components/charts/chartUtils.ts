import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { Centavos } from '../../domain/money';

export const SERIES_COLORS = ['var(--color-viz-1)', 'var(--color-viz-2)', 'var(--color-viz-3)', 'var(--color-viz-4)'] as const;

export interface Series {
  name: string;
  color: string;
  /** One value per x position (centavos). */
  values: Centavos[];
}

/** Tracks an element's width so SVG charts can lay out in real pixels. */
export function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Clean y-axis ticks from 0 to just above `max` (1/2/2.5/5 × 10ⁿ steps). */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = 0; v < max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1]! < max) ticks.push(ticks[ticks.length - 1]! + step);
  return ticks;
}

/** Axis label in pesos: ₱0, ₱500, ₱2,000, ₱20k, ₱1.2M (one style per axis, decided by the top tick). */
export function axisPeso(centavos: number, top: number): string {
  const p = centavos / 100;
  if (p === 0) return '₱0';
  const t = top / 100;
  if (t >= 1_000_000) return `₱${+(p / 1_000_000).toFixed(1)}M`;
  if (t >= 10_000) return `₱${+(p / 1000).toFixed(1)}k`;
  return `₱${Math.round(p).toLocaleString('en-PH')}`;
}

/** Column path: 4px rounded data-end, square at the baseline. */
export function columnPath(x: number, w: number, top: number, base: number): string {
  const h = base - top;
  const r = Math.min(4, w / 2, h);
  return `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
}
