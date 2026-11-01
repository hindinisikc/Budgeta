import { describe, expect, it } from 'vitest';
import { axisPeso, niceTicks } from './chartUtils';
import { monthAxisLabels } from '../../features/activity/reports/labels';

describe('niceTicks', () => {
  it('produces clean steps that cover the max', () => {
    expect(niceTicks(8_500_000)).toEqual([0, 2_500_000, 5_000_000, 7_500_000, 10_000_000]);
    expect(niceTicks(1)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(niceTicks(0)).toEqual([0]);
  });
});

describe('axisPeso', () => {
  it('uses one style per axis, decided by the top tick', () => {
    expect(axisPeso(2_500_000, 10_000_000)).toBe('₱25k');
    expect(axisPeso(50_000, 200_000)).toBe('₱500');
    expect(axisPeso(150_000_000, 200_000_000)).toBe('₱1.5M');
  });
});

describe('monthAxisLabels', () => {
  it('adds the year where it changes', () => {
    expect(monthAxisLabels(['2026-11', '2026-12', '2027-01', '2027-02']).labels).toEqual(['Nov', 'Dec', "Jan '27", 'Feb']);
  });
});

describe('axisPeso zero', () => {
  it('prints zero plainly', () => {
    expect(axisPeso(0, 10_000_000)).toBe('₱0');
  });
});
