/**
 * All money is stored as integer centavos (₱1.00 = 100) so sums never pick up
 * floating-point errors. Convert only at the edges: parsing user input and formatting for display.
 */
export type Centavos = number;

/** ₱9,999,999.99 — far above any personal budget line; guards against typos like extra zeros. */
export const MAX_AMOUNT: Centavos = 999_999_999;

export function isValidAmount(value: unknown): value is Centavos {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= MAX_AMOUNT;
}

/**
 * Parse what a user typed ("1,234.5", "₱180", " 99.99 ") into centavos.
 * Returns null for empty, negative, non-numeric, more than 2 decimals, or out-of-range input.
 * Zero is returned as 0 (callers decide whether zero is allowed).
 */
export function parseAmount(input: string): Centavos | null {
  const cleaned = input.replace(/[₱,\s]/g, '').replace(/^php/i, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned) && !/^\.\d{1,2}$/.test(cleaned)) return null;
  const [whole = '0', frac = ''] = cleaned.split('.');
  const centavos = Number(whole || '0') * 100 + Number(frac.padEnd(2, '0') || '0');
  if (!Number.isSafeInteger(centavos) || centavos > MAX_AMOUNT) return null;
  return centavos;
}

const pesoFormat = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pesoFormatWhole = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 });

interface FormatOptions {
  /** `auto` (default) hides ".00" on whole amounts; `always` keeps two decimals. */
  cents?: 'auto' | 'always';
  /** Prefix "+" for positive values (minus is always shown for negatives). */
  signed?: boolean;
}

/** 3842000 → "₱38,420"; 18000 → "₱180" (or "₱180.00" with cents: 'always'); -500 → "-₱5". */
export function formatPeso(value: Centavos, { cents = 'auto', signed = false }: FormatOptions = {}): string {
  const abs = Math.abs(value);
  const showCents = cents === 'always' || abs % 100 !== 0;
  const body = showCents ? pesoFormat.format(abs / 100) : pesoFormatWhole.format(abs / 100);
  const sign = value < 0 ? '-' : signed && value > 0 ? '+' : '';
  return `${sign}₱${body}`;
}

/** Short form for tight tiles: 3842000 → "₱38.4k", 900000 → "₱9.0k", 150000000 → "₱1.5M", 50000 → "₱500". */
export function formatPesoCompact(value: Centavos): string {
  const sign = value < 0 ? '-' : '';
  const pesos = Math.abs(value) / 100;
  // Thresholds sit just below 1,000 / 1,000,000 so values that would round up (999.6 → "₱1000") switch unit instead.
  if (pesos >= 999_950) return `${sign}₱${(Math.round(pesos / 100_000) / 10).toFixed(1)}M`;
  if (pesos >= 999.5) return `${sign}₱${(Math.round(pesos / 100) / 10).toFixed(1)}k`;
  return `${sign}₱${Math.round(pesos)}`;
}

/** Convert whole pesos to centavos (handy for seeds/tests). */
export function pesos(amount: number): Centavos {
  return Math.round(amount * 100);
}

export function sum(values: Iterable<Centavos>): Centavos {
  let total = 0;
  for (const v of values) total += v;
  return total;
}
