import type { MonthSummary } from './calc';

export type PaceStatus = 'on_track' | 'watch' | 'over';

/** How far flexible spending may run ahead of the calendar before we say "Watch". */
export const WATCH_THRESHOLD = 0.1;

/**
 * - Over: Margin is negative (more promised/spent than available).
 * - Watch: flexible pools are being used faster than the month is passing (+10 points).
 * - On Track: otherwise.
 */
export function paceStatus(summary: MonthSummary, elapsedFraction: number): PaceStatus {
  if (summary.margin < 0) return 'over';
  if (summary.flexiblePlanned > 0) {
    const used = summary.flexibleSpent / summary.flexiblePlanned;
    if (used > elapsedFraction + WATCH_THRESHOLD) return 'watch';
  }
  return 'on_track';
}

export const PACE_LABEL: Record<PaceStatus, string> = {
  on_track: 'On track',
  watch: 'Watch',
  over: 'Over',
};
