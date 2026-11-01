import { describe, expect, it } from 'vitest';
import {
  addMonths,
  daysBetween,
  daysInMonth,
  daysLeftInMonth,
  dueDateFor,
  formatShortDate,
  isValidDateStr,
  isValidMonthId,
  monthElapsedFraction,
  monthOf,
  toDateStr,
} from './dates';

describe('months', () => {
  it('adds months across year boundaries', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-10', -22)).toBe('2024-12');
  });
  it('knows month lengths incl. leap years', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-10')).toBe(31);
  });
  it('validates month ids', () => {
    expect(isValidMonthId('2026-10')).toBe(true);
    expect(isValidMonthId('2026-13')).toBe(false);
    expect(isValidMonthId('2026-1')).toBe(false);
  });
});

describe('dates', () => {
  it('formats local dates without timezone drift', () => {
    expect(toDateStr(new Date(2026, 9, 31, 23, 59))).toBe('2026-10-31');
  });
  it('validates dates', () => {
    expect(isValidDateStr('2026-02-28')).toBe(true);
    expect(isValidDateStr('2026-02-29')).toBe(false);
    expect(isValidDateStr('2026-10-32')).toBe(false);
    expect(isValidDateStr('2026-10-3')).toBe(false);
  });
  it('clamps due days to the month length', () => {
    expect(dueDateFor('2026-02', 31)).toBe('2026-02-28');
    expect(dueDateFor('2026-10', 30)).toBe('2026-10-30');
    expect(dueDateFor('2026-10', 0)).toBe('2026-10-01');
  });
  it('counts days between dates', () => {
    expect(daysBetween('2026-10-27', '2026-10-30')).toBe(3);
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(daysBetween('2026-11-02', '2026-10-30')).toBe(-3);
  });
  it('formats short dates', () => {
    expect(formatShortDate('2026-10-05')).toBe('Oct 5');
    expect(monthOf('2026-10-05')).toBe('2026-10');
  });
});

describe('month progress', () => {
  it('counts days left including today', () => {
    expect(daysLeftInMonth('2026-10', '2026-10-18')).toBe(14);
    expect(daysLeftInMonth('2026-10', '2026-10-31')).toBe(1);
    expect(daysLeftInMonth('2026-09', '2026-10-18')).toBe(0);
    expect(daysLeftInMonth('2026-11', '2026-10-18')).toBe(30);
  });
  it('computes elapsed fraction', () => {
    expect(monthElapsedFraction('2026-10', '2026-10-31')).toBe(1);
    expect(monthElapsedFraction('2026-09', '2026-10-01')).toBe(1);
    expect(monthElapsedFraction('2026-11', '2026-10-01')).toBe(0);
  });
});
