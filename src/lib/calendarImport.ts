/**
 * Calendar Import Service
 * Unified service for importing events from native iOS Calendar and .ics URLs
 */

import { Capacitor } from '@capacitor/core';
import CalendarPlugin, { CalendarEvent } from '@/plugins/CalendarPlugin';
import { fetchAndParseICS, filterYearlyRecurringEvents, ICSEvent } from './icsParser';
import { CountdownEvent } from '@/types/countdown';

/**
 * Unified calendar event format used across the app
 */
export interface ImportableEvent {
  id: string;
  title: string;
  date: Date;
  isRecurring: boolean;
  isBirthday: boolean;
  source: 'native' | 'ics';
  originalEvent: CalendarEvent | ICSEvent;
}

/**
 * Result from fetching importable events
 */
export interface ImportableEventsResult {
  events: ImportableEvent[];
  error?: string;
}

/**
 * Check if native calendar access is available
 */
export function isNativeCalendarAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Request calendar permission (native only)
 */
export async function requestCalendarPermission(): Promise<boolean> {
  if (!isNativeCalendarAvailable()) {
    return false;
  }
  
  try {
    const result = await CalendarPlugin.requestPermission();
    return result.granted;
  } catch (error) {
    console.error('Failed to request calendar permission:', error);
    return false;
  }
}

/**
 * Check calendar permission status (native only)
 */
export async function checkCalendarPermission(): Promise<boolean> {
  if (!isNativeCalendarAvailable()) {
    return false;
  }
  
  try {
    const result = await CalendarPlugin.checkPermission();
    return result.granted;
  } catch (error) {
    console.error('Failed to check calendar permission:', error);
    return false;
  }
}

/**
 * Fetch recurring events from native iOS Calendar
 */
export async function fetchNativeCalendarEvents(): Promise<ImportableEventsResult> {
  if (!isNativeCalendarAvailable()) {
    return { events: [], error: 'Native calendar not available' };
  }
  
  try {
    // Request permission if not already granted
    const hasPermission = await checkCalendarPermission();
    if (!hasPermission) {
      const granted = await requestCalendarPermission();
      if (!granted) {
        return { events: [], error: 'Calendar permission denied' };
      }
    }
    
    // Fetch events for the next 2 years to catch all recurring events
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 2);
    
    const result = await CalendarPlugin.getRecurringEvents({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    
    // Convert to ImportableEvent format
    const events: ImportableEvent[] = result.events.map(event => ({
      id: event.id,
      title: event.title,
      date: new Date(event.startDate),
      isRecurring: event.isRecurring,
      isBirthday: event.isBirthday,
      source: 'native' as const,
      originalEvent: event,
    }));
    
    return { events };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { events: [], error: `Failed to fetch calendar events: ${errorMessage}` };
  }
}

/**
 * Fetch recurring events from an .ics URL
 */
export async function fetchICSCalendarEvents(url: string): Promise<ImportableEventsResult> {
  try {
    const result = await fetchAndParseICS(url);
    
    if (result.error) {
      return { events: [], error: result.error };
    }
    
    // Filter for yearly recurring events only
    const yearlyEvents = filterYearlyRecurringEvents(result.events);
    
    // Convert to ImportableEvent format
    const events: ImportableEvent[] = yearlyEvents.map(event => ({
      id: event.uid,
      title: event.summary,
      date: event.dtstart,
      isRecurring: true,
      isBirthday: isBirthdayEvent(event.summary),
      source: 'ics' as const,
      originalEvent: event,
    }));
    
    return { events };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { events: [], error: `Failed to fetch calendar: ${errorMessage}` };
  }
}

/**
 * Convert an ImportableEvent to a CountdownEvent
 */
export function convertToCountdownEvent(
  event: ImportableEvent,
  generateId: () => string
): Omit<CountdownEvent, 'id' | 'createdAt'> {
  const emoji = suggestEmojiForEvent(event.title, event.isBirthday);
  const emojiColor = suggestColorForEmoji(emoji);
  
  return {
    title: event.title,
    targetDate: event.date.toISOString(),
    emoji,
    emojiColor,
    isRecurring: event.isRecurring,
  };
}

/**
 * Check if an event title suggests it's a birthday
 */
function isBirthdayEvent(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes('birthday') ||
    lower.includes('bday') ||
    lower.includes('geburtstag') || // German
    lower.includes('cumpleaños') || // Spanish
    lower.includes('compleanno') || // Italian
    lower.includes('aniversário') || // Portuguese
    lower.includes('день рождения') // Russian
  );
}

/**
 * Suggest an emoji based on event title
 */
function suggestEmojiForEvent(title: string, isBirthday: boolean): string {
  const lower = title.toLowerCase();
  
  // Birthday variations
  if (isBirthday || lower.includes('birthday') || lower.includes('bday')) {
    return '🎂';
  }
  
  // Anniversary variations
  if (lower.includes('anniversary') || lower.includes('aniversario')) {
    return '💍';
  }
  
  // Wedding
  if (lower.includes('wedding')) {
    return '💒';
  }
  
  // Holiday keywords
  if (lower.includes('christmas') || lower.includes('navidad') || lower.includes('weihnachten')) {
    return '🎄';
  }
  
  if (lower.includes('easter') || lower.includes('pascua') || lower.includes('ostern')) {
    return '🐰';
  }
  
  if (lower.includes('halloween')) {
    return '🎃';
  }
  
  if (lower.includes('valentine')) {
    return '❤️';
  }
  
  if (lower.includes('new year') || lower.includes('año nuevo') || lower.includes('neujahr')) {
    return '🎉';
  }
  
  if (lower.includes('mother') || lower.includes('mom') || lower.includes('madre')) {
    return '💐';
  }
  
  if (lower.includes('father') || lower.includes('dad') || lower.includes('padre')) {
    return '👔';
  }
  
  // Graduation
  if (lower.includes('graduation') || lower.includes('graduate')) {
    return '🎓';
  }
  
  // Default for recurring events
  return '🎉';
}

/**
 * Suggest a color based on emoji
 */
function suggestColorForEmoji(emoji: string): string {
  const colorMap: Record<string, string> = {
    '🎂': '#f472b6', // Pink for birthday
    '💍': '#fbbf24', // Gold for anniversary
    '💒': '#f472b6', // Pink for wedding
    '🎄': '#22c55e', // Green for Christmas
    '🐰': '#a78bfa', // Purple for Easter
    '🎃': '#f97316', // Orange for Halloween
    '❤️': '#ef4444', // Red for Valentine's
    '🎉': '#3b82f6', // Blue for celebrations
    '💐': '#ec4899', // Pink for Mother's Day
    '👔': '#3b82f6', // Blue for Father's Day
    '🎓': '#8b5cf6', // Purple for graduation
  };
  
  return colorMap[emoji] || '#3b82f6'; // Default blue
}

/**
 * Remove duplicate events based on title and date
 */
export function deduplicateEvents(events: ImportableEvent[]): ImportableEvent[] {
  const seen = new Set<string>();
  return events.filter(event => {
    // Create a key based on title and date (ignoring time)
    const dateStr = event.date.toISOString().split('T')[0];
    const key = `${event.title.toLowerCase()}-${dateStr}`;
    
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Sort events by date (closest first)
 */
export function sortEventsByDate(events: ImportableEvent[]): ImportableEvent[] {
  const now = new Date();
  return [...events].sort((a, b) => {
    // Get next occurrence for each event
    const dateA = getNextOccurrence(a.date);
    const dateB = getNextOccurrence(b.date);
    
    // Sort by distance from now
    return Math.abs(dateA.getTime() - now.getTime()) - Math.abs(dateB.getTime() - now.getTime());
  });
}

/**
 * Get the next occurrence of a yearly event
 */
function getNextOccurrence(date: Date): Date {
  const now = new Date();
  const thisYear = now.getFullYear();
  
  // Set to this year
  const thisYearDate = new Date(date);
  thisYearDate.setFullYear(thisYear);
  
  // If it's already passed this year, move to next year
  if (thisYearDate < now) {
    thisYearDate.setFullYear(thisYear + 1);
  }
  
  return thisYearDate;
}
