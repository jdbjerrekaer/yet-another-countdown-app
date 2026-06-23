import { intervalToDuration, startOfDay } from 'date-fns';
import type { TFunction } from 'i18next';

export type RelativeUnit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute';

export interface RelativePart {
  unit: RelativeUnit;
  count: number;
}

// Break the gap between two instants into year/month/week/day [+hour/minute]
// parts, zero-suppressed (units that are 0 are omitted). date-fns gives
// year/month/day; weeks are derived from the day remainder.
// When `includeTime` is false the time-of-day is stripped from both ends so a
// date-only event reads in whole days (no partial-day rounding).
export function relativeParts(from: Date, to: Date, includeTime: boolean): RelativePart[] {
  const start = includeTime ? from : startOfDay(from);
  const end = includeTime ? to : startOfDay(to);

  const d = intervalToDuration({ start, end });
  const totalDays = d.days ?? 0;
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  const parts: RelativePart[] = [];
  const push = (unit: RelativeUnit, count: number) => {
    if (count > 0) parts.push({ unit, count });
  };
  push('year', d.years ?? 0);
  push('month', d.months ?? 0);
  push('week', weeks);
  push('day', days);
  if (includeTime) {
    push('hour', d.hours ?? 0);
    push('minute', d.minutes ?? 0);
  }

  // Everything rounded away (e.g. <1 day with no specific time): show the
  // smallest meaningful unit as 0 rather than an empty string.
  if (parts.length === 0) parts.push({ unit: includeTime ? 'minute' : 'day', count: 0 });
  return parts;
}

// Localised "2 months, 1 week, 3 days ago" / "... left". `target` is the event
// time; direction is decided by whether it's before or after `now`.
export function formatRelative(t: TFunction, target: Date, now: Date, includeTime: boolean): string {
  const isPast = target.getTime() <= now.getTime();
  const [from, to] = isPast ? [target, now] : [now, target];
  const joined = relativeParts(from, to, includeTime)
    .map((p) => t(`relative.${p.unit}`, { count: p.count }))
    .join(', ');
  return t(isPast ? 'relative.ago' : 'relative.left', { parts: joined });
}
