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
  calendarTitle?: string;
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
      // Make ID collision-proof by including calendar, title, and date
      // This ensures "48th Birthday" and "49th Birthday" get different IDs even if they share the same base event.id
      id: `${event.calendarId || 'unknown'}-${event.title}-${event.startDate}`,
      title: event.title,
      date: new Date(event.startDate),
      isRecurring: event.isRecurring,
      isBirthday: event.isBirthday,
      source: 'native' as const,
      calendarTitle: event.calendarTitle,
      originalEvent: event,
    }));
    
    return { events };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { events: [], error: `Failed to fetch calendar events: ${errorMessage}` };
  }
}

/**
 * Fetch ALL events from native iOS Calendar (not just recurring)
 * Used when a specific calendar is selected or when searching
 */
export async function fetchAllNativeCalendarEvents(calendarId?: string): Promise<ImportableEventsResult> {
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
    
    // Fetch events for the next 2 years
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 2);
    
    const result = await CalendarPlugin.getAllEvents({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      calendarId,
    });
    
    // Convert to ImportableEvent format
    const events: ImportableEvent[] = result.events.map(event => ({
      id: `${event.calendarId || 'unknown'}-${event.title}-${event.startDate}`,
      title: event.title,
      date: new Date(event.startDate),
      isRecurring: event.isRecurring,
      isBirthday: event.isBirthday,
      source: 'native' as const,
      calendarTitle: event.calendarTitle,
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
      // Make ID collision-proof by including uid, summary, and date
      // This ensures different occurrences of the same recurring event get unique IDs
      id: `${event.uid}-${event.summary}-${event.dtstart.toISOString()}`,
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
 * Extract age from birthday title (e.g., "48th Birthday" → 48)
 * Handles various formats:
 * - "Kate Bell's 48th Birthday"
 * - "48. Geburtstag"
 * - "48º Cumpleaños"
 * - "48 День рождения"
 * - "48. Fødselsdag" (Danish/Norwegian)
 * - "48. Födelsedag" (Swedish)
 */
function extractAgeFromTitle(title: string): number | null {
  // Birthday words for pattern matching (same as normalizeEventTitle)
  const birthdayWords = 'birthday|bday|geburtstag|cumpleaños|cumpleanos|compleanno|aniversário|aniversario|день рождения|деньрождения|fødselsdag|födelsedag';
  
  // Match patterns like "48th", "48.", "48º", "48°", or just "48" before birthday words
  // Also handles possessive forms like "Kate's 48th Birthday"
  const patterns = [
    // Pattern 1: Number with ordinal/symbol before birthday word
    new RegExp(`\\b(\\d+)[º°.]?\\s*(st|nd|rd|th)?\\s*(${birthdayWords})`, 'i'),
    // Pattern 2: Number in parentheses or brackets before birthday word
    new RegExp(`\\((\\d+)\\)\\s*(${birthdayWords})`, 'i'),
    // Pattern 3: Number with ordinal in parentheses before birthday word
    new RegExp(`\\((\\d+)(st|nd|rd|th)\\s*(${birthdayWords})\\)`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      const age = parseInt(match[1], 10);
      // Sanity check: age should be reasonable (between 0 and 150)
      if (age >= 0 && age <= 150) {
        return age;
      }
    }
  }
  
  return null;
}

/**
 * Convert an ImportableEvent to a CountdownEvent
 */
export function convertToCountdownEvent(
  event: ImportableEvent,
  generateId: () => string
): Omit<CountdownEvent, 'id' | 'createdAt'> {
  // Clean title using the shared normalizer (removes age patterns)
  const cleanTitle = normalizeEventTitle(event.title);
  
  // Calculate the original date based on age in title (for birthdays)
  let targetDate = event.date;
  if (event.isBirthday || event.isRecurring) {
    const age = extractAgeFromTitle(event.title);
    if (age !== null && age > 0) {
      // Calculate original year: if event is "48th Birthday" in 2025, original year is 2025 - 48 = 1977
      const eventYear = event.date.getFullYear();
      const originalYear = eventYear - age;
      targetDate = new Date(event.date);
      targetDate.setFullYear(originalYear);
    }
  }
  
  const emoji = suggestEmojiForEvent(cleanTitle, event.isBirthday);
  const emojiColor = suggestColorForEmoji(emoji);
  
  return {
    title: cleanTitle,
    targetDate: targetDate.toISOString(),
    emoji,
    emojiColor,
    isRecurring: event.isRecurring,
    isImported: true,
    importedFrom: event.calendarTitle || (event.source === 'native' ? 'Calendar' : 'iCal'),
  };
}

/**
 * Normalize event titles by removing age-related patterns and common suffixes
 * This ensures "Kate Bell's 48th Birthday" and "Kate Bell's 49th Birthday" 
 * are treated as the same event for deduplication
 * 
 * Supports multiple languages:
 * - English: "48th Birthday", "48 Birthday"
 * - German: "48. Geburtstag", "48 Geburtstag"
 * - Spanish: "48º Cumpleaños", "48 Cumpleaños"
 * - Italian: "48° Compleanno", "48 Compleanno"
 * - Portuguese: "48º Aniversário", "48 Aniversário"
 * - Russian: "48 День рождения", "48 день рождения"
 * - Danish: "48. Fødselsdag", "48 Fødselsdag"
 * - Norwegian: "48. Fødselsdag", "48 Fødselsdag"
 * - Swedish: "48. Födelsedag", "48 Födelsedag"
 */
function normalizeEventTitle(title: string): string {
  // Birthday words in various languages (case-insensitive matching)
  const birthdayWords = [
    'birthday', 'bday', // English
    'geburtstag', // German
    'cumpleaños', 'cumpleanos', // Spanish
    'compleanno', // Italian
    'aniversário', 'aniversario', // Portuguese
    'день рождения', 'деньрождения', // Russian (with/without space)
    'fødselsdag', // Danish & Norwegian
    'födelsedag' // Swedish
  ];
  
  // Create a regex pattern that matches any birthday word
  const birthdayPattern = `(${birthdayWords.join('|')})`;
  
  let normalized = title
    .trim()
    .replace(/\s+/g, ' ');
  
  // Remove embedded age patterns before birthday words
  // Matches patterns like:
  // - "48th Birthday" → "Birthday"
  // - "48. Geburtstag" → "Geburtstag"
  // - "48º Cumpleaños" → "Cumpleaños"
  // - "48 День рождения" → "День рождения"
  // - "48. Fødselsdag" → "Fødselsdag" (Danish/Norwegian)
  // - "48. Födelsedag" → "Födelsedag" (Swedish)
  // Handles ordinals (th, st, nd, rd), periods (.), degree symbols (º, °), and plain numbers
  normalized = normalized.replace(
    new RegExp(`\\b\\d+[º°.]?\\s*(st|nd|rd|th)?\\s*${birthdayPattern}\\b`, 'gi'),
    (match, ordinal, birthdayWord) => {
      // Keep the birthday word, preserving original casing
      return birthdayWord;
    }
  );
  
  // Remove trailing age patterns like "#28", "(28)", "(28th birthday)", "(28. Geburtstag)"
  normalized = normalized
    .replace(/\s*#\d+$/, '')
    .replace(
      new RegExp(`\\s*\\(\\d+[º°.]?\\s*(st|nd|rd|th)?\\s*${birthdayPattern}\\)$`, 'gi'),
      ''
    )
    .replace(/\s*\(\d+[º°.]?\)$/, '')
    .trim();
  
  return normalized;
}

/**
 * Normalize title for deduplication (lowercase, normalize unicode)
 */
function normalizeTitleForDedup(title: string): string {
  return normalizeEventTitle(title)
    .toLowerCase()
    .normalize('NFC');
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
    lower.includes('день рождения') || // Russian
    lower.includes('fødselsdag') || // Danish & Norwegian
    lower.includes('födelsedag') // Swedish
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
 * For recurring events, we only compare month and day (not year) since
 * the same yearly event might appear multiple times in a date range
 */
export function deduplicateEvents(events: ImportableEvent[]): ImportableEvent[] {
  const seen = new Map<string, ImportableEvent>();
  
  for (const event of events) {
    // Normalize title using shared normalizer (handles embedded age patterns)
    const normalizedTitle = normalizeTitleForDedup(event.title);
    
    // For all recurring events, use only month-day to deduplicate
    // This catches the same yearly event appearing multiple times
    const month = String(event.date.getMonth() + 1).padStart(2, '0');
    const day = String(event.date.getDate()).padStart(2, '0');
    const dateKey = `${month}-${day}`;
    
    const key = `${normalizedTitle}-${dateKey}`;
    
    // Keep the first occurrence (usually the upcoming one)
    // If we already have one, compare dates and keep the one that's sooner
    if (!seen.has(key)) {
      seen.set(key, event);
    } else {
      const existing = seen.get(key)!;
      // Keep the event with the sooner date (upcoming occurrence)
      const existingNextOccurrence = getNextOccurrence(existing.date);
      const currentNextOccurrence = getNextOccurrence(event.date);
      if (currentNextOccurrence < existingNextOccurrence) {
        seen.set(key, event);
      }
    }
  }
  
  return Array.from(seen.values());
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
