import { useEffect, useRef, useState } from 'react';
import { formatPeso, type Centavos } from '../../domain/money';

const DURATION = 500;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A peso amount that counts smoothly to its new value when it changes.
 * `fromZero` also counts up from ₱0 when it first appears (for a screen's main number).
 */
export function AnimatedPeso({ value, fromZero = false }: { value: Centavos; fromZero?: boolean }) {
  const [shown, setShown] = useState(fromZero && !reducedMotion() ? 0 : value);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    const start = shownRef.current;
    if (start === value || reducedMotion()) {
      setShown(value);
      return;
    }
    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - t0) / DURATION, 1);
      // Whole pesos while moving so the digits don't flicker through centavos.
      setShown(t < 1 ? Math.round((start + (value - start) * easeOut(t)) / 100) * 100 : value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{formatPeso(shown)}</>;
}
