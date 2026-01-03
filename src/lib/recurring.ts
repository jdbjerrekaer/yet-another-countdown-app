import { setYear, isAfter, addYears, differenceInYears, isBefore, isSameDay } from 'date-fns';

/**
 * Gets the next occurrence of a recurring yearly event
 */
export function getNextRecurringDate(originalDate: Date): Date {
  const now = new Date();
  const thisYear = now.getFullYear();
  
  // Set the event to this year
  let nextOccurrence = setYear(originalDate, thisYear);
  
  // If that date has passed, move to next year
  if (isAfter(now, nextOccurrence)) {
    nextOccurrence = addYears(nextOccurrence, 1);
  }
  
  return nextOccurrence;
}

/**
 * Gets the number of times a yearly recurring event has occurred since the original date
 * For example: Birthday on Feb 11, 1998 → on Feb 15, 2026, this would return 28 (28th birthday)
 */
export function getRepetitionCount(originalDate: Date): number {
  const now = new Date();
  
  // Calculate the difference in years from the original date
  const yearsDiff = differenceInYears(now, originalDate);
  
  // If we haven't reached the first occurrence yet
  if (yearsDiff < 0) {
    return 0;
  }
  
  // Get this year's occurrence date
  const thisYearOccurrence = setYear(originalDate, now.getFullYear());
  
  // If this year's occurrence has passed or is today, count it
  // Otherwise, subtract 1 (we haven't had this year's occurrence yet)
  if (isAfter(now, thisYearOccurrence) || isSameDay(now, thisYearOccurrence)) {
    return yearsDiff + 1;
  } else {
    return yearsDiff;
  }
}

/**
 * Gets the next occurrence number for a recurring event
 * This is the number that will be displayed for the upcoming occurrence
 * For example: If 27 occurrences have happened, the next will be #28
 */
export function getNextOccurrenceNumber(originalDate: Date): number {
  const currentCount = getRepetitionCount(originalDate);
  // The next occurrence will be one more than what has already occurred
  return currentCount + 1;
}
