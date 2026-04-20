import { useEffect, useRef, useState } from 'react';

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

function computeTime(targetDate: Date | null): CountdownTime {
  if (!targetDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isComplete: true, isPast: false, daysSince: 0 };
  }

  const now = Date.now();
  const target = targetDate.getTime();
  const difference = target - now;

  const nowDate = new Date(now);
  const isToday = nowDate.toDateString() === targetDate.toDateString();

  if (isToday) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isComplete: true, isPast: false, daysSince: 0 };
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
  options?: { resolution?: CountdownResolution },
): CountdownTime {
  const resolution: CountdownResolution = options?.resolution ?? 'second';
  const [time, setTime] = useState<CountdownTime>(() => computeTime(targetDate));
  const lastRef = useRef<CountdownTime>(time);
  const targetMs = targetDate ? targetDate.getTime() : null;

  useEffect(() => {
    const recompute = () => {
      const next = computeTime(targetDate);
      if (!equalAtResolution(lastRef.current, next, resolution)) {
        lastRef.current = next;
        setTime(next);
      }
    };

    recompute();
    return subscribe(recompute);
    // `targetDate` is captured via closure but only the underlying ms matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMs, resolution]);

  return time;
}
