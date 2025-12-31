import { setYear, isAfter, addYears } from 'date-fns';

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
