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
export function relativeParts(from: Date, to: Date, includeTime: boolean, legacy = false): RelativePart[] {
  const start = includeTime ? from : startOfDay(from);
  const end = includeTime ? to : startOfDay(to);

  // Legacy mode: a single total-days count (no months/weeks/years), plus
  // hours/minutes when a specific time is set. e.g. "5421 days" / "213 days,
  // 22 hours, 43 minutes".
  if (legacy) {
    const ms = end.getTime() - start.getTime();
    const totalDays = Math.floor(ms / 86_400_000);
    const legacyParts: RelativePart[] = [];
    if (totalDays > 0) legacyParts.push({ unit: 'day', count: totalDays });
    if (includeTime) {
      const rem = ms - totalDays * 86_400_000;
      const hours = Math.floor(rem / 3_600_000);
      const minutes = Math.floor((rem % 3_600_000) / 60_000);
      if (hours > 0) legacyParts.push({ unit: 'hour', count: hours });
      if (minutes > 0) legacyParts.push({ unit: 'minute', count: minutes });
    }
    if (legacyParts.length === 0) legacyParts.push({ unit: includeTime ? 'minute' : 'day', count: 0 });
    return legacyParts;
  }

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
export function formatRelative(t: TFunction, target: Date, now: Date, includeTime: boolean, legacy = false): string {
  const isPast = target.getTime() <= now.getTime();
  const [from, to] = isPast ? [target, now] : [now, target];
  // Cap at the 3 most significant units so distant events don't overflow the
  // single-line card subtitle (e.g. "2 years, 4 months, 3 weeks left").
  const joined = relativeParts(from, to, includeTime, legacy)
    .slice(0, 3)
    .map((p) => t(`relative.${p.unit}`, { count: p.count }))
    .join(', ');
  return t(isPast ? 'relative.ago' : 'relative.left', { parts: joined });
}

// Same phrase, narrow units — "4mo 4w left" / "213d 22h ago". Mirrors the
// lock-screen accessory's abbreviated form. Intl gives localised narrow unit
// labels (en "4w", da "4 u", fi "4 vk"), so this needs no extra translations.
export function formatRelativeShort(
  t: TFunction,
  target: Date,
  now: Date,
  includeTime: boolean,
  legacy = false,
  locale = 'en',
): string {
  const isPast = target.getTime() <= now.getTime();
  const [from, to] = isPast ? [target, now] : [now, target];
  const joined = relativeParts(from, to, includeTime, legacy)
    .slice(0, 3)
    .map((p) =>
      new Intl.NumberFormat(locale, { style: 'unit', unit: p.unit, unitDisplay: 'narrow' })
        .format(p.count),
    )
    .join(' ');
  return t(isPast ? 'relative.ago' : 'relative.left', { parts: joined });
}
