import { setYear } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { CountdownEvent } from '@/types/countdown';
import LiveActivity, { LiveActivityRequest } from '@/plugins/LiveActivityPlugin';

// A Live Activity is only started on the day itself. That is what keeps the
// Dynamic Island quiet until the day arrives — iOS renders both presentations
// from one activity, so "lock screen only" is not a thing that exists.
//
// More than a few at once turns the lock screen into a list, so only the
// soonest are shown.
const MAX_ACTIVITIES = 3;

export interface ActivityStrings {
  /** "Today" */
  today: string;
  /** "3 years today" */
  yearsToday: (years: number) => string;
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * This year's instance of a recurring event, even when it has already passed
 * today — `getNextRecurringDate` rolls straight to next year the moment the
 * time is behind us, which would hide a birthday from its own morning.
 */
const occurrenceOn = (event: CountdownEvent, now: Date): Date => {
  const original = new Date(event.targetDate);
  return event.isRecurring ? setYear(original, now.getFullYear()) : original;
};

export function selectTodaysActivities(
  events: CountdownEvent[],
  now: Date,
  strings: ActivityStrings,
): LiveActivityRequest[] {
  return events
    .map(event => ({ event, at: occurrenceOn(event, now) }))
    .filter(({ at }) => isSameDay(at, now))
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_ACTIVITIES)
    .map(({ event, at }) => {
      const ahead = at.getTime() > now.getTime();
      // Elapsed years, the way people say it out loud — born 1998 is "28 years
      // today", not the 29th occurrence.
      const years = event.isRecurring ? now.getFullYear() - new Date(event.targetDate).getFullYear() : 0;
      return {
        eventId: event.id,
        title: event.title,
        emoji: event.emoji || '⏳',
        tintHex: event.emojiColor,
        // Counting up (the anniversary already landed today) says how many
        // years; everything else just says the day is here. A moment still
        // ahead ticks down instead, and never reaches this string.
        headline: !ahead && years > 0 ? strings.yearsToday(years) : strings.today,
        // Only an event with a real time of day gets the live countdown; an
        // all-day one would tick to midnight, which is not what it means.
        targetDate: ahead && (event.hasTime ?? false) ? at.toISOString() : undefined,
      };
    });
}

export async function syncLiveActivities(
  events: CountdownEvent[],
  strings: ActivityStrings,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const activities = selectTodaysActivities(events, new Date(), strings);
  try {
    await LiveActivity.sync({ activities });
  } catch {
    // Older iOS, or activities switched off for the app. The plugin logs the
    // detail under subsystem com.jonatanbjerrekaer.countdown, category
    // "liveactivity" — read it with `log show --info`.
  }
}
