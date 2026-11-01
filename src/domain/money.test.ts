import { describe, expect, it } from 'vitest';
import { formatPeso, formatPesoCompact, isValidAmount, parseAmount, pesos } from './money';

describe('parseAmount', () => {
  it.each([
    ['180', 18000],
    ['180.5', 18050],
    ['180.05', 18005],
    ['1,234.50', 123450],
    ['₱ 38,420', 3842000],
    ['.5', 50],
    ['0', 0],
    ['180.', 18000],
  ])('%s → %i', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(['', ' ', 'abc', '-5', '1.234', '1e5', '12.3.4', '99999999999'])('rejects %j', (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

describe('formatPeso', () => {
  it('hides .00 on whole amounts by default', () => {
    expect(formatPeso(3842000)).toBe('₱38,420');
    expect(formatPeso(18050)).toBe('₱180.50');
  });
  it('can always show cents', () => {
    expect(formatPeso(18000, { cents: 'always' })).toBe('₱180.00');
  });
  it('signs', () => {
    expect(formatPeso(-500)).toBe('-₱5');
    expect(formatPeso(500, { signed: true })).toBe('+₱5');
    expect(formatPeso(0, { signed: true })).toBe('₱0');
  });
});

describe('formatPesoCompact', () => {
  it.each([
    [pesos(38420), '₱38.4k'],
    [pesos(9000), '₱9.0k'],
    [pesos(25580), '₱25.6k'],
    [pesos(500), '₱500'],
    [pesos(999.6), '₱1.0k'],
    [pesos(1_500_000), '₱1.5M'],
    [pesos(-2000), '-₱2.0k'],
  ])('%i → %s', (value, expected) => {
    expect(formatPesoCompact(value)).toBe(expected);
  });
});

describe('isValidAmount', () => {
  it('accepts positive safe integers only', () => {
    expect(isValidAmount(1)).toBe(true);
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-1)).toBe(false);
    expect(isValidAmount(1.5)).toBe(false);
    expect(isValidAmount(Number.NaN)).toBe(false);
    expect(isValidAmount('100')).toBe(false);
  });
});
