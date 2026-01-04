import { CountdownTime } from '@/hooks/useCountdown';

interface ProgressBarsProps {
  /** Countdown data for intelligent bar calculation */
  countdown: CountdownTime;
  /** Fallback: Total remaining percentage (0-100) - used for very long countdowns */
  remainingPercent: number;
  /** Number of bars to display */
  numBars: number;
  /** Color for the filled portion of bars */
  color: string;
  /** Width of each bar in pixels */
  barWidth: number;
  /** Height of each bar in pixels */
  barHeight: number;
  /** Gap between bars in pixels */
  gap?: number;
}

/**
 * Calculate bar fill percentages based on countdown time.
 * 
 * Logic:
 * - If days remaining <= numBars: Each bar = 1 day, partial fill based on hours remaining
 * - If days = 0 and hours remaining <= numBars: Each bar = 1 hour, partial fill based on minutes
 * - Otherwise: Use percentage-based approach for longer countdowns
 */
function calculateBarPercentages(
  countdown: CountdownTime,
  remainingPercent: number,
  numBars: number
): number[] {
  const { days, hours, minutes, seconds, isComplete, isPast } = countdown;

  // Handle complete or past events
  if (isComplete || isPast) {
    return Array(numBars).fill(0);
  }

  // Calculate total hours remaining (for the sub-day portion)
  const totalHoursInDay = hours + (minutes / 60) + (seconds / 3600);
  
  // Calculate total minutes remaining (for the sub-hour portion)
  const totalMinutesInHour = minutes + (seconds / 60);

  // Mode 1: Days mode - when days remaining <= numBars
  // Each bar represents 1 full day
  if (days > 0 && days <= numBars) {
    return Array(numBars).fill(0).map((_, index) => {
      if (days === numBars) {
        // Edge case: days equals numBars
        // Show (days - 1) full bars + last bar with partial fill for remaining hours
        if (index < days - 1) {
          return 100; // Full day bars
        } else if (index === days - 1) {
          // Last bar: show remaining hours in the current day (e.g., 6 hours = 25%)
          return (totalHoursInDay / 24) * 100;
        } else {
          return 0;
        }
      } else {
        // Normal case: days < numBars
        if (index < days) {
          return 100; // Full day bars
        } else if (index === days) {
          // Partial bar for remaining hours in the current day
          return (totalHoursInDay / 24) * 100;
        } else {
          return 0; // Empty bars
        }
      }
    });
  }

  // Mode 2: Hours mode - when no days left and hours remaining <= numBars
  // Each bar represents 1 full hour
  if (days === 0 && hours > 0 && hours <= numBars) {
    return Array(numBars).fill(0).map((_, index) => {
      if (hours === numBars) {
        // Edge case: hours equals numBars
        // Show (hours - 1) full bars + last bar with partial fill for remaining minutes
        if (index < hours - 1) {
          return 100; // Full hour bars
        } else if (index === hours - 1) {
          // Last bar: show remaining minutes in the current hour
          return (totalMinutesInHour / 60) * 100;
        } else {
          return 0;
        }
      } else {
        // Normal case: hours < numBars
        if (index < hours) {
          return 100; // Full hour bars
        } else if (index === hours) {
          // Partial bar for remaining minutes in the current hour
          return (totalMinutesInHour / 60) * 100;
        } else {
          return 0; // Empty bars
        }
      }
    });
  }

  // Mode 3: Minutes mode - when no days/hours left and minutes remaining <= numBars
  // Each bar represents 1 full minute
  if (days === 0 && hours === 0 && minutes > 0 && minutes <= numBars) {
    return Array(numBars).fill(0).map((_, index) => {
      if (minutes === numBars) {
        // Edge case: minutes equals numBars
        // Show (minutes - 1) full bars + last bar with partial fill for remaining seconds
        if (index < minutes - 1) {
          return 100; // Full minute bars
        } else if (index === minutes - 1) {
          // Last bar: show remaining seconds in the current minute
          return (seconds / 60) * 100;
        } else {
          return 0;
        }
      } else {
        // Normal case: minutes < numBars
        if (index < minutes) {
          return 100; // Full minute bars
        } else if (index === minutes) {
          // Partial bar for remaining seconds in the current minute
          return (seconds / 60) * 100;
        } else {
          return 0; // Empty bars
        }
      }
    });
  }

  // Mode 4: Percentage mode - for longer countdowns (days > numBars)
  // Or when we're down to just seconds
  const totalBarUnits = (remainingPercent / 100) * numBars;
  const fullBars = Math.floor(totalBarUnits);
  const partialBarPercent = (totalBarUnits % 1) * 100;

  return Array(numBars).fill(0).map((_, index) => {
    if (index < fullBars) {
      return 100; // Full bars
    } else if (index === fullBars) {
      return partialBarPercent; // Partially filled bar
    } else {
      return 0; // Empty bars
    }
  });
}

export function ProgressBars({
  countdown,
  remainingPercent,
  numBars,
  color,
  barWidth,
  barHeight,
  gap = 8,
}: ProgressBarsProps) {
  const percentages = calculateBarPercentages(countdown, remainingPercent, numBars);

  return (
    <div className="flex items-end" style={{ gap: `${gap}px` }}>
      {percentages.map((percent, index) => {
        const fillHeight = (percent / 100) * barHeight;
        return (
          <div
            key={index}
            className="relative rounded-full overflow-hidden bg-secondary/40"
            style={{
              width: `${barWidth}px`,
              height: `${barHeight}px`,
            }}
          >
            {/* Fill */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300 ease-out"
              style={{
                height: `${fillHeight}px`,
                backgroundColor: color,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
