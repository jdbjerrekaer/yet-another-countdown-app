import { addYears, subDays } from 'date-fns';
import { CountdownTime } from '@/hooks/useCountdown';

export interface ProgressResult {
  /** Progress percentage (100% at start → 0% at target for future, 0% → increasing for past) */
  remainingPercent: number;
  /** Whether the countdown is active (not complete) */
  isActive: boolean;
}

/**
 * Calculate progress percentage for widget visual display.
 * 
 * For future events (counting down):
 *   - Returns remaining = (targetDate - now) / (targetDate - cycleStart) * 100
 *   - 100% at start → 0% at target
 * 
 * For past events (counting up):
 *   - Returns elapsed = (now - targetDate) / (targetDate - cycleStart) * 100
 *   - 0% at target → increasing as time passes
 * 
 * For non-recurring events:
 *   - Uses createdAt → targetDate as the total window
 * 
 * For recurring yearly events:
 *   - Uses the yearly cycle: (targetDate - 1 year) → targetDate
 *   - Where targetDate is already the next occurrence
 */
export function calculateRemainingPercent(
  targetDate: Date | null,
  countdown: CountdownTime,
  isRecurring: boolean,
  createdAt?: Date
): ProgressResult {
  if (!targetDate) {
    return { remainingPercent: 0, isActive: false };
  }

  const now = new Date();
  const targetTime = targetDate.getTime();
  const nowTime = now.getTime();

  let cycleStart: number;
  let useFallback = false;

  if (isRecurring) {
    // For recurring events, the cycle is one year leading up to targetDate
    const oneYearAgo = addYears(targetDate, -1);
    cycleStart = oneYearAgo.getTime();
  } else {
    // For non-recurring events, use createdAt as the start
    if (!createdAt) {
      // No createdAt - use fallback for past events, otherwise can't calculate
      if (countdown.isPast || countdown.isComplete) {
        // Use 1 year before targetDate as fallback reference period
        const oneYearAgo = subDays(targetDate, 365);
        cycleStart = oneYearAgo.getTime();
        useFallback = true;
      } else {
        // Future event without createdAt - show 100% remaining
        return { remainingPercent: 100, isActive: true };
      }
    } else {
      cycleStart = createdAt.getTime();
      // Check if createdAt is after targetDate (invalid cycle)
      if (cycleStart > targetTime) {
        // Use fallback: 1 year before targetDate
        const oneYearAgo = subDays(targetDate, 365);
        cycleStart = oneYearAgo.getTime();
        useFallback = true;
      }
    }
  }

  const totalDuration = targetTime - cycleStart;
  
  // If target is at or before cycle start (shouldn't happen with fallback, but check anyway)
  if (totalDuration <= 0) {
    // If we're using fallback and still have invalid duration, use a minimum 1-day duration
    if (useFallback) {
      const oneDayAgo = subDays(targetDate, 1);
      cycleStart = oneDayAgo.getTime();
      const fallbackDuration = targetTime - cycleStart;
      if (fallbackDuration > 0) {
        // Recalculate with 1-day fallback
        if (countdown.isPast) {
          const elapsed = nowTime - targetTime;
          const elapsedPercent = (elapsed / fallbackDuration) * 100;
          return {
            remainingPercent: Math.min(200, Math.max(0, Math.round(elapsedPercent))),
            isActive: true,
          };
        }
      }
    }
    return { remainingPercent: 0, isActive: !countdown.isComplete };
  }

  if (countdown.isPast) {
    // Event has passed - calculate elapsed time as percentage of cycle
    const elapsed = nowTime - targetTime;
    const elapsedPercent = (elapsed / totalDuration) * 100;
    // Cap at reasonable maximum (e.g., 200% = 2 cycles) for display
    return {
      remainingPercent: Math.min(200, Math.max(0, Math.round(elapsedPercent))),
      isActive: true,
    };
  } else if (countdown.isComplete) {
    // Today - show 0% (at the event)
    return { remainingPercent: 0, isActive: false };
  } else {
    // Future - calculate remaining time
    const remaining = targetTime - nowTime;
    const remainingPercent = (remaining / totalDuration) * 100;
    // Clamp between 0 and 100
    return {
      remainingPercent: Math.max(0, Math.min(100, Math.round(remainingPercent))),
      isActive: true,
    };
  }
}
