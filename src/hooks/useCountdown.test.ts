import { describe, expect, it } from 'vitest';
import { differenceInCalendarDays } from 'date-fns';
import { computeTime } from './useCountdown';

// Mirrors ios/Tests/CountdownTimeTests.swift. Local dates; the DST case only runs in a
// zone with the EU switch on 25 Oct 2026 (npm test sets TZ=Europe/Copenhagen).
const at = (y: number, m: number, d: number, h = 0, min = 0, s = 0) => new Date(y, m - 1, d, h, min, s);
const hms = (c: ReturnType<typeof computeTime>) => [c.days, c.hours, c.minutes, c.seconds];
const concert = at(2026, 10, 9, 8); // date-only countdowns are stored at 08:00

describe('computeTime, all-day countdowns', () => {
  it('matches the list after 08:00 (the reported 4 vs 3)', () => {
    const now = at(2026, 10, 5, 11, 10);
    expect(hms(computeTime(concert, true, now.getTime()))).toEqual([4, 12, 50, 0]);
    expect(differenceInCalendarDays(concert, now)).toBe(4);
  });

  it('before 08:00, at midnight and one second before midnight', () => {
    expect(hms(computeTime(concert, true, at(2026, 10, 5, 7).getTime()))).toEqual([4, 17, 0, 0]);
    expect(hms(computeTime(concert, true, at(2026, 10, 5).getTime()))).toEqual([4, 23, 59, 59]);
    expect(hms(computeTime(concert, true, at(2026, 10, 5, 23, 59, 59).getTime()))).toEqual([4, 0, 0, 1]);
    expect(hms(computeTime(concert, true, at(2026, 10, 8, 23, 59).getTime()))).toEqual([1, 0, 1, 0]);
  });

  it('is complete on the day itself', () => {
    expect(computeTime(concert, true, at(2026, 10, 9, 6).getTime()).isComplete).toBe(true);
    expect(computeTime(concert, true, at(2026, 10, 9, 23).getTime()).isComplete).toBe(true);
  });

  it('counts up in calendar days', () => {
    const quit = at(2026, 9, 12, 8);
    const before8 = computeTime(quit, true, at(2026, 10, 5, 7).getTime());
    expect(before8.isPast).toBe(true);
    expect(before8.daysSince).toBe(23);
    expect(computeTime(quit, true, at(2026, 10, 5, 11).getTime()).daysSince).toBe(23);
  });

  it('agrees with the list at every half hour of a week', () => {
    for (let t = at(2026, 10, 1).getTime(); t < at(2026, 10, 9).getTime(); t += 30 * 60 * 1000) {
      expect(computeTime(concert, true, t).days).toBe(differenceInCalendarDays(concert, new Date(t)));
    }
  });

  it('crosses New Year', () => {
    expect(hms(computeTime(at(2027, 1, 1, 8), true, at(2026, 12, 31, 23).getTime()))).toEqual([1, 1, 0, 0]);
  });

  const isCopenhagen = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Copenhagen';
  it.runIf(isCopenhagen)('handles the 25-hour DST day by wall clock', () => {
    const afterDST = at(2026, 10, 26, 8);
    expect(hms(computeTime(afterDST, true, at(2026, 10, 24, 12).getTime()))).toEqual([2, 12, 0, 0]);
    expect(hms(computeTime(afterDST, true, at(2026, 10, 25, 1).getTime()))).toEqual([1, 23, 0, 0]);
  });
});

describe('computeTime, countdowns with a time', () => {
  it('is unchanged: exact countdown to the moment', () => {
    expect(hms(computeTime(concert, false, at(2026, 10, 5, 11, 10).getTime()))).toEqual([3, 20, 50, 0]);
  });
});
