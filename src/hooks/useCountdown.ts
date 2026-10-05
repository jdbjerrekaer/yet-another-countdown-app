import { useEffect, useRef, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';

export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isComplete: boolean;
  isPast: boolean;
  daysSince: number;
}

export type CountdownResolution = 'second' | 'minute';

type Listener = () => void;

const listeners = new Set<Listener>();
let tickInterval: ReturnType<typeof setInterval> | null = null;

function startTickIfNeeded() {
  if (tickInterval !== null || listeners.size === 0) return;
  tickInterval = setInterval(() => {
    listeners.forEach((l) => l());
  }, 1000);
}

function stopTickIfIdle() {
  if (tickInterval !== null && listeners.size === 0) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  startTickIfNeeded();
  return () => {
    listeners.delete(listener);
    stopTickIfIdle();
  };
}

// `allDay` is true for countdowns without a user-set time (`hasTime` off). They are stored
// at 08:00, so whole-24h counting came out a day lower than the list (calendar days) from
// 08:00 to midnight. All-day countdowns count calendar days, plus what's left of today as
// hours/minutes, so widgets agree with the list. Mirrors CountdownTime.calculate in Swift.
export function computeTime(targetDate: Date | null, allDay = false, now = Date.now()): CountdownTime {
  if (!targetDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isComplete: true, isPast: false, daysSince: 0 };
  }

  const target = targetDate.getTime();
  const difference = target - now;

  const nowDate = new Date(now);
  const isToday = nowDate.toDateString() === targetDate.toDateString();

  if (isToday) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isComplete: true, isPast: false, daysSince: 0 };
  }

  if (allDay) {
    const dayDiff = differenceInCalendarDays(targetDate, nowDate);
    if (dayDiff < 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isComplete: true, isPast: true, daysSince: -dayDiff };
    }
    // Wall-clock time left of today (DST days still read 23h at 01:00); exactly at
    // midnight that is a full 24h, so clamp to 23:59:59.
    const elapsedToday = nowDate.getHours() * 3600 + nowDate.getMinutes() * 60 + nowDate.getSeconds();
    const leftToday = Math.min(24 * 3600 - elapsedToday, 24 * 3600 - 1);
    return {
      days: dayDiff,
      hours: Math.floor(leftToday / 3600),
      minutes: Math.floor((leftToday % 3600) / 60),
      seconds: leftToday % 60,
      totalSeconds: Math.max(0, Math.floor(difference / 1000)),
      isComplete: false,
      isPast: false,
      daysSince: 0,
    };
  }

  if (difference < 0) {
    const daysSince = Math.floor(Math.abs(difference) / (1000 * 60 * 60 * 24));
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isComplete: true, isPast: true, daysSince };
  }

  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, totalSeconds, isComplete: false, isPast: false, daysSince: 0 };
}

function equalAtResolution(a: CountdownTime, b: CountdownTime, resolution: CountdownResolution): boolean {
  if (
    a.isComplete !== b.isComplete ||
    a.isPast !== b.isPast ||
    a.daysSince !== b.daysSince ||
    a.days !== b.days ||
    a.hours !== b.hours ||
    a.minutes !== b.minutes
  ) {
    return false;
  }
  if (resolution === 'second' && a.seconds !== b.seconds) {
    return false;
  }
  return true;
}

export function useCountdown(
  targetDate: Date | null,
  options?: { resolution?: CountdownResolution; allDay?: boolean },
): CountdownTime {
  const resolution: CountdownResolution = options?.resolution ?? 'second';
  const allDay = options?.allDay ?? false;
  const [time, setTime] = useState<CountdownTime>(() => computeTime(targetDate, allDay));
  const lastRef = useRef<CountdownTime>(time);
  const targetMs = targetDate ? targetDate.getTime() : null;

  useEffect(() => {
    const recompute = () => {
      const next = computeTime(targetDate, allDay);
      if (!equalAtResolution(lastRef.current, next, resolution)) {
        lastRef.current = next;
        setTime(next);
      }
    };

    recompute();
    return subscribe(recompute);
    // `targetDate` is captured via closure but only the underlying ms matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMs, resolution, allDay]);

  return time;
}
