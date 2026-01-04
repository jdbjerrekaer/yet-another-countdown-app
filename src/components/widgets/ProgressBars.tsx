import { CountdownTime } from '@/hooks/useCountdown';
import { differenceInYears, differenceInMonths, differenceInWeeks, startOfYear, startOfQuarter, startOfMonth, startOfWeek, endOfQuarter, endOfMonth, endOfWeek, differenceInDays } from 'date-fns';

interface ProgressBarsProps {
  /** Countdown data for intelligent bar calculation */
  countdown: CountdownTime;
  /** Target date for calendar-based calculations */
  targetDate: Date | null;
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
 * Calculate years and remaining days from targetDate
 */
function calculateYears(currentDate: Date, targetDate: Date): { years: number; remainingDays: number } {
  const years = differenceInYears(targetDate, currentDate);
  const nextYearDate = new Date(currentDate);
  nextYearDate.setFullYear(currentDate.getFullYear() + years);
  const remainingDays = differenceInDays(targetDate, nextYearDate);
  return { years, remainingDays };
}

/**
 * Calculate quarters and remaining days in current quarter
 */
function calculateQuarters(currentDate: Date, targetDate: Date): { quarters: number; remainingDays: number } {
  const currentYear = currentDate.getFullYear();
  const targetYear = targetDate.getFullYear();
  const currentQuarter = Math.floor(currentDate.getMonth() / 3);
  const targetQuarter = Math.floor(targetDate.getMonth() / 3);
  
  const yearsDiff = targetYear - currentYear;
  const quartersDiff = targetQuarter - currentQuarter;
  const totalQuarters = yearsDiff * 4 + quartersDiff;
  
  // Calculate the date that is totalQuarters quarters ahead, starting from the start of current quarter
  const currentQuarterStart = startOfQuarter(currentDate);
  const nextQuarterDate = new Date(currentQuarterStart);
  nextQuarterDate.setMonth(currentQuarterStart.getMonth() + totalQuarters * 3);
  
  // Calculate remaining days from that date to target
  const remainingDays = differenceInDays(targetDate, nextQuarterDate);
  
  return { quarters: totalQuarters, remainingDays };
}

/**
 * Calculate months and remaining days in current month
 */
function calculateMonths(currentDate: Date, targetDate: Date): { months: number; remainingDays: number } {
  const months = differenceInMonths(targetDate, currentDate);
  const nextMonthDate = new Date(currentDate);
  nextMonthDate.setMonth(currentDate.getMonth() + months);
  const remainingDays = differenceInDays(targetDate, nextMonthDate);
  return { months, remainingDays };
}

/**
 * Calculate weeks and remaining days in current week
 */
function calculateWeeks(currentDate: Date, targetDate: Date): { weeks: number; remainingDays: number } {
  const weeks = differenceInWeeks(targetDate, currentDate);
  const nextWeekDate = new Date(currentDate);
  nextWeekDate.setDate(currentDate.getDate() + weeks * 7);
  const remainingDays = differenceInDays(targetDate, nextWeekDate);
  return { weeks, remainingDays };
}

/**
 * Calculate bar fill percentages based on countdown time.
 * 
 * Logic:
 * - Years mode: When years <= numBars, each bar = 1 year
 * - Quarters mode: When quarters <= numBars, each bar = 1 quarter
 * - Months mode: When months <= numBars, each bar = 1 month
 * - Weeks mode: When weeks <= numBars, each bar = 1 week
 * - Days mode: When days <= numBars, each bar = 1 day
 * - Hours mode: When hours <= numBars, each bar = 1 hour
 * - Minutes mode: When minutes <= numBars, each bar = 1 minute
 * - Otherwise: Use percentage-based approach for longer countdowns
 */
function calculateBarPercentages(
  countdown: CountdownTime,
  targetDate: Date | null,
  remainingPercent: number,
  numBars: number
): number[] {
  const { days, hours, minutes, seconds, isComplete, isPast } = countdown;

  // Handle complete events (today)
  if (isComplete && !isPast) {
    return Array(numBars).fill(0);
  }

  // Need targetDate for calendar-based calculations
  if (!targetDate) {
    // Fallback to percentage mode if no targetDate
    const totalBarUnits = (remainingPercent / 100) * numBars;
    const fullBars = Math.floor(totalBarUnits);
    const partialBarPercent = (totalBarUnits % 1) * 100;
    return Array(numBars).fill(0).map((_, index) => {
      if (index < fullBars) {
        return 100;
      } else if (index === fullBars) {
        return partialBarPercent;
      } else {
        return 0;
      }
    });
  }

  const currentDate = new Date();

  // Handle past events (counting up)
  if (isPast) {
    // Calculate elapsed time components
    const elapsedYears = differenceInYears(currentDate, targetDate);
    
    // Calculate quarters elapsed
    const targetYear = targetDate.getFullYear();
    const currentYear = currentDate.getFullYear();
    const targetQuarter = Math.floor(targetDate.getMonth() / 3);
    const currentQuarter = Math.floor(currentDate.getMonth() / 3);
    const yearsDiff = currentYear - targetYear;
    const quartersDiff = currentQuarter - targetQuarter;
    const elapsedQuarters = yearsDiff * 4 + quartersDiff;
    
    const elapsedMonths = differenceInMonths(currentDate, targetDate);
    const elapsedWeeks = differenceInWeeks(currentDate, targetDate);
    const elapsedDays = differenceInDays(currentDate, targetDate);
    
    // Calculate hours, minutes, seconds elapsed
    const elapsedMilliseconds = currentDate.getTime() - targetDate.getTime();
    const elapsedHours = Math.floor(elapsedMilliseconds / (1000 * 60 * 60)) % 24;
    const elapsedMinutes = Math.floor(elapsedMilliseconds / (1000 * 60)) % 60;
    const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000) % 60;
    
    // Calculate partial fills
    const totalHoursInDay = elapsedHours + (elapsedMinutes / 60) + (elapsedSeconds / 3600);
    const totalMinutesInHour = elapsedMinutes + (elapsedSeconds / 60);

    // Mode 0: Years mode - when years elapsed <= numBars
    if (elapsedYears > 0 && elapsedYears <= numBars) {
      const nextYearDate = new Date(targetDate);
      nextYearDate.setFullYear(targetDate.getFullYear() + elapsedYears);
      const daysIntoYear = differenceInDays(currentDate, nextYearDate);
      const daysInYear = differenceInDays(startOfYear(new Date(targetDate.getFullYear() + elapsedYears + 1, 0, 1)), startOfYear(new Date(targetDate.getFullYear() + elapsedYears, 0, 1)));
      const partialFillPercent = (daysIntoYear / daysInYear) * 100;
      
      return Array(numBars).fill(0).map((_, index) => {
        if (elapsedYears === numBars) {
          if (index < elapsedYears - 1) {
            return 100;
          } else if (index === elapsedYears - 1) {
            return Math.min(100, partialFillPercent);
          } else {
            return 0;
          }
        } else {
          if (index < elapsedYears) {
            return 100;
          } else if (index === elapsedYears) {
            return Math.min(100, partialFillPercent);
          } else {
            return 0;
          }
        }
      });
    }

    // Mode 1: Quarters mode - when quarters elapsed <= numBars
    if (elapsedQuarters > 0 && elapsedQuarters <= numBars) {
      // Calculate the date that is elapsedQuarters quarters ahead of targetDate
      const targetQuarterStart = startOfQuarter(targetDate);
      const nextQuarterDate = new Date(targetQuarterStart);
      nextQuarterDate.setMonth(targetQuarterStart.getMonth() + elapsedQuarters * 3);
      const daysIntoQuarter = differenceInDays(currentDate, nextQuarterDate);
      
      // Calculate days in the current quarter
      const currentQuarterStart = startOfQuarter(currentDate);
      const currentQuarterEnd = endOfQuarter(currentDate);
      const daysInQuarter = differenceInDays(currentQuarterEnd, currentQuarterStart) + 1;
      const daysIntoCurrentQuarter = differenceInDays(currentDate, currentQuarterStart);
      const partialFillPercent = (daysIntoCurrentQuarter / daysInQuarter) * 100;
      
      return Array(numBars).fill(0).map((_, index) => {
        if (elapsedQuarters === numBars) {
          if (index < elapsedQuarters - 1) {
            return 100;
          } else if (index === elapsedQuarters - 1) {
            return Math.min(100, partialFillPercent);
          } else {
            return 0;
          }
        } else {
          if (index < elapsedQuarters) {
            return 100;
          } else if (index === elapsedQuarters) {
            return Math.min(100, partialFillPercent);
          } else {
            return 0;
          }
        }
      });
    }

    // Mode 2: Months mode - when months elapsed <= numBars
    if (elapsedMonths > 0 && elapsedMonths <= numBars) {
      const nextMonthDate = new Date(targetDate);
      nextMonthDate.setMonth(targetDate.getMonth() + elapsedMonths);
      const daysIntoMonth = differenceInDays(currentDate, nextMonthDate);
      const targetMonthEnd = endOfMonth(nextMonthDate);
      const daysInMonth = differenceInDays(targetMonthEnd, nextMonthDate) + 1;
      const partialFillPercent = (daysIntoMonth / daysInMonth) * 100;
      
      return Array(numBars).fill(0).map((_, index) => {
        if (elapsedMonths === numBars) {
          if (index < elapsedMonths - 1) {
            return 100;
          } else if (index === elapsedMonths - 1) {
            return Math.min(100, partialFillPercent);
          } else {
            return 0;
          }
        } else {
          if (index < elapsedMonths) {
            return 100;
          } else if (index === elapsedMonths) {
            return Math.min(100, partialFillPercent);
          } else {
            return 0;
          }
        }
      });
    }

    // Mode 3: Weeks mode - when weeks elapsed <= numBars
    if (elapsedWeeks > 0 && elapsedWeeks <= numBars) {
      const nextWeekDate = new Date(targetDate);
      nextWeekDate.setDate(targetDate.getDate() + elapsedWeeks * 7);
      const daysIntoWeek = differenceInDays(currentDate, nextWeekDate);
      const targetWeekEnd = endOfWeek(nextWeekDate);
      const daysInWeek = differenceInDays(targetWeekEnd, nextWeekDate) + 1;
      const partialFillPercent = (daysIntoWeek / daysInWeek) * 100;
      
      return Array(numBars).fill(0).map((_, index) => {
        if (elapsedWeeks === numBars) {
          if (index < elapsedWeeks - 1) {
            return 100;
          } else if (index === elapsedWeeks - 1) {
            return Math.min(100, partialFillPercent);
          } else {
            return 0;
          }
        } else {
          if (index < elapsedWeeks) {
            return 100;
          } else if (index === elapsedWeeks) {
            return Math.min(100, partialFillPercent);
          } else {
            return 0;
          }
        }
      });
    }

    // Mode 4: Days mode - when days elapsed <= numBars
    if (elapsedDays > 0 && elapsedDays <= numBars) {
      return Array(numBars).fill(0).map((_, index) => {
        if (elapsedDays === numBars) {
          if (index < elapsedDays - 1) {
            return 100;
          } else if (index === elapsedDays - 1) {
            return (totalHoursInDay / 24) * 100;
          } else {
            return 0;
          }
        } else {
          if (index < elapsedDays) {
            return 100;
          } else if (index === elapsedDays) {
            return (totalHoursInDay / 24) * 100;
          } else {
            return 0;
          }
        }
      });
    }

    // Mode 5: Hours mode - when hours elapsed <= numBars and no days
    if (elapsedDays === 0 && elapsedHours > 0 && elapsedHours <= numBars) {
      return Array(numBars).fill(0).map((_, index) => {
        if (elapsedHours === numBars) {
          if (index < elapsedHours - 1) {
            return 100;
          } else if (index === elapsedHours - 1) {
            return (totalMinutesInHour / 60) * 100;
          } else {
            return 0;
          }
        } else {
          if (index < elapsedHours) {
            return 100;
          } else if (index === elapsedHours) {
            return (totalMinutesInHour / 60) * 100;
          } else {
            return 0;
          }
        }
      });
    }

    // Mode 6: Minutes mode - when minutes elapsed <= numBars and no days/hours
    if (elapsedDays === 0 && elapsedHours === 0 && elapsedMinutes > 0 && elapsedMinutes <= numBars) {
      return Array(numBars).fill(0).map((_, index) => {
        if (elapsedMinutes === numBars) {
          if (index < elapsedMinutes - 1) {
            return 100;
          } else if (index === elapsedMinutes - 1) {
            return (elapsedSeconds / 60) * 100;
          } else {
            return 0;
          }
        } else {
          if (index < elapsedMinutes) {
            return 100;
          } else if (index === elapsedMinutes) {
            return (elapsedSeconds / 60) * 100;
          } else {
            return 0;
          }
        }
      });
    }

    // Mode 7: Percentage mode - for very long elapsed times
    const totalBarUnits = (remainingPercent / 100) * numBars;
    const fullBars = Math.floor(totalBarUnits);
    const partialBarPercent = (totalBarUnits % 1) * 100;
    return Array(numBars).fill(0).map((_, index) => {
      if (index < fullBars) {
        return 100;
      } else if (index === fullBars) {
        return partialBarPercent;
      } else {
        return 0;
      }
    });
  }

  // Calculate total hours remaining (for the sub-day portion)
  const totalHoursInDay = hours + (minutes / 60) + (seconds / 3600);
  
  // Calculate total minutes remaining (for the sub-hour portion)
  const totalMinutesInHour = minutes + (seconds / 60);

  // Mode 0: Years mode - when years remaining <= numBars
  const { years, remainingDays: remainingDaysInYear } = calculateYears(currentDate, targetDate);
  if (years > 0 && years <= numBars) {
    // Calculate partial fill: remaining days in the current year
    const daysInYear = differenceInDays(startOfYear(new Date(currentDate.getFullYear() + 1, 0, 1)), startOfYear(currentDate));
    const partialFillPercent = (remainingDaysInYear / daysInYear) * 100;
    
    return Array(numBars).fill(0).map((_, index) => {
      if (years === numBars) {
        // Edge case: years equals numBars
        if (index < years - 1) {
          return 100; // Full year bars
        } else if (index === years - 1) {
          // Last bar: show remaining days in the current year
          return Math.min(100, partialFillPercent);
        } else {
          return 0;
        }
      } else {
        // Normal case: years < numBars
        if (index < years) {
          return 100; // Full year bars
        } else if (index === years) {
          // Partial bar for remaining days in the current year
          return Math.min(100, partialFillPercent);
        } else {
          return 0; // Empty bars
        }
      }
    });
  }

  // Mode 1: Quarters mode - when quarters remaining <= numBars (and years don't fit)
  const { quarters, remainingDays: remainingDaysInQuarter } = calculateQuarters(currentDate, targetDate);
  if (quarters > 0 && quarters <= numBars) {
    // Calculate partial fill: remaining days in the target quarter
    const targetQuarterStart = startOfQuarter(targetDate);
    const targetQuarterEnd = endOfQuarter(targetDate);
    const daysInTargetQuarter = differenceInDays(targetQuarterEnd, targetQuarterStart) + 1;
    // remainingDaysInQuarter is days from start of target quarter to target date
    const daysIntoQuarter = Math.max(0, remainingDaysInQuarter);
    const partialFillPercent = (daysIntoQuarter / daysInTargetQuarter) * 100;
    
    return Array(numBars).fill(0).map((_, index) => {
      if (quarters === numBars) {
        // Edge case: quarters equals numBars
        if (index < quarters - 1) {
          return 100; // Full quarter bars
        } else if (index === quarters - 1) {
          // Last bar: show remaining days in the current quarter
          return Math.min(100, partialFillPercent);
        } else {
          return 0;
        }
      } else {
        // Normal case: quarters < numBars
        if (index < quarters) {
          return 100; // Full quarter bars
        } else if (index === quarters) {
          // Partial bar for remaining days in the current quarter
          return Math.min(100, partialFillPercent);
        } else {
          return 0; // Empty bars
        }
      }
    });
  }

  // Mode 2: Months mode - when months remaining <= numBars (and years/quarters don't fit)
  const { months, remainingDays: remainingDaysInMonth } = calculateMonths(currentDate, targetDate);
  if (months > 0 && months <= numBars) {
    // Calculate partial fill: remaining days in the current month
    const currentMonthStart = startOfMonth(currentDate);
    const currentMonthEnd = endOfMonth(currentDate);
    const daysInMonth = differenceInDays(currentMonthEnd, currentMonthStart) + 1;
    const partialFillPercent = (remainingDaysInMonth / daysInMonth) * 100;
    
    return Array(numBars).fill(0).map((_, index) => {
      if (months === numBars) {
        // Edge case: months equals numBars
        if (index < months - 1) {
          return 100; // Full month bars
        } else if (index === months - 1) {
          // Last bar: show remaining days in the current month
          return Math.min(100, partialFillPercent);
        } else {
          return 0;
        }
      } else {
        // Normal case: months < numBars
        if (index < months) {
          return 100; // Full month bars
        } else if (index === months) {
          // Partial bar for remaining days in the current month
          return Math.min(100, partialFillPercent);
        } else {
          return 0; // Empty bars
        }
      }
    });
  }

  // Mode 3: Weeks mode - when weeks remaining <= numBars (and larger units don't fit)
  const { weeks, remainingDays: remainingDaysInWeek } = calculateWeeks(currentDate, targetDate);
  if (weeks > 0 && weeks <= numBars) {
    // Calculate partial fill: remaining days in the current week
    const currentWeekStart = startOfWeek(currentDate);
    const currentWeekEnd = endOfWeek(currentDate);
    const daysInWeek = differenceInDays(currentWeekEnd, currentWeekStart) + 1;
    const partialFillPercent = (remainingDaysInWeek / daysInWeek) * 100;
    
    return Array(numBars).fill(0).map((_, index) => {
      if (weeks === numBars) {
        // Edge case: weeks equals numBars
        if (index < weeks - 1) {
          return 100; // Full week bars
        } else if (index === weeks - 1) {
          // Last bar: show remaining days in the current week
          return Math.min(100, partialFillPercent);
        } else {
          return 0;
        }
      } else {
        // Normal case: weeks < numBars
        if (index < weeks) {
          return 100; // Full week bars
        } else if (index === weeks) {
          // Partial bar for remaining days in the current week
          return Math.min(100, partialFillPercent);
        } else {
          return 0; // Empty bars
        }
      }
    });
  }

  // Mode 4: Days mode - when days remaining <= numBars
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

  // Mode 5: Hours mode - when no days left and hours remaining <= numBars
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

  // Mode 6: Minutes mode - when no days/hours left and minutes remaining <= numBars
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

  // Mode 7: Percentage mode - for longer countdowns (days > numBars)
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
  targetDate,
  remainingPercent,
  numBars,
  color,
  barWidth,
  barHeight,
  gap = 8,
}: ProgressBarsProps) {
  const percentages = calculateBarPercentages(countdown, targetDate, remainingPercent, numBars);

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
