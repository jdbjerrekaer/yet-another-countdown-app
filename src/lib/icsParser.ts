/**
 * iCalendar (.ics) parser for importing events from calendar URLs
 * Supports parsing VEVENT components with RRULE for recurring events
 */

export interface ICSEvent {
  uid: string;
  summary: string; // Event title
  dtstart: Date;
  dtend?: Date;
  rrule?: string;
  description?: string;
  isRecurring: boolean;
  isYearlyRecurring: boolean;
}

export interface ICSParseResult {
  events: ICSEvent[];
  calendarName?: string;
  error?: string;
}

/**
 * Fetch and parse an .ics file from a URL
 * @param url - URL to the .ics file (e.g., Google Calendar public URL)
 * @returns Parsed calendar events
 */
export async function fetchAndParseICS(url: string): Promise<ICSParseResult> {
  try {
    // Try direct fetch first
    let response: Response;
    
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/calendar, text/plain, */*',
        },
      });
    } catch (fetchError) {
      // If direct fetch fails (CORS), try with a CORS proxy
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      response = await fetch(proxyUrl);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
    }
    
    const icsContent = await response.text();
    return parseICSContent(icsContent);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      events: [],
      error: `Failed to fetch calendar: ${errorMessage}`,
    };
  }
}

/**
 * Parse iCalendar content string
 * @param content - Raw .ics file content
 * @returns Parsed events
 */
export function parseICSContent(content: string): ICSParseResult {
  try {
    const events: ICSEvent[] = [];
    let calendarName: string | undefined;
    
    // Normalize line endings and unfold lines (RFC 5545 line folding)
    const normalizedContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n[ \t]/g, ''); // Unfold continuation lines
    
    const lines = normalizedContent.split('\n');
    
    // Extract calendar name
    for (const line of lines) {
      if (line.startsWith('X-WR-CALNAME:')) {
        calendarName = line.substring('X-WR-CALNAME:'.length).trim();
        break;
      }
    }
    
    // Find all VEVENT blocks
    let inEvent = false;
    let currentEvent: Partial<ICSEvent> = {};
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = {};
        continue;
      }
      
      if (trimmedLine === 'END:VEVENT') {
        inEvent = false;
        
        // Create event if we have required fields
        if (currentEvent.summary && currentEvent.dtstart) {
          const event: ICSEvent = {
            uid: currentEvent.uid || generateUID(),
            summary: currentEvent.summary,
            dtstart: currentEvent.dtstart,
            dtend: currentEvent.dtend,
            rrule: currentEvent.rrule,
            description: currentEvent.description,
            isRecurring: !!currentEvent.rrule,
            isYearlyRecurring: isYearlyRecurrence(currentEvent.rrule),
          };
          events.push(event);
        }
        
        currentEvent = {};
        continue;
      }
      
      if (!inEvent) continue;
      
      // Parse event properties
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex === -1) continue;
      
      const propertyPart = trimmedLine.substring(0, colonIndex);
      const value = trimmedLine.substring(colonIndex + 1);
      
      // Property name may have parameters (e.g., DTSTART;VALUE=DATE:20240101)
      const semicolonIndex = propertyPart.indexOf(';');
      const propertyName = semicolonIndex === -1 
        ? propertyPart 
        : propertyPart.substring(0, semicolonIndex);
      
      switch (propertyName) {
        case 'UID':
          currentEvent.uid = value;
          break;
        case 'SUMMARY':
          currentEvent.summary = unescapeICSValue(value);
          break;
        case 'DESCRIPTION':
          currentEvent.description = unescapeICSValue(value);
          break;
        case 'DTSTART':
          currentEvent.dtstart = parseICSDate(value, propertyPart);
          break;
        case 'DTEND':
          currentEvent.dtend = parseICSDate(value, propertyPart);
          break;
        case 'RRULE':
          currentEvent.rrule = value;
          break;
      }
    }
    
    return { events, calendarName };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      events: [],
      error: `Failed to parse calendar: ${errorMessage}`,
    };
  }
}

/**
 * Parse iCalendar date/datetime value
 */
function parseICSDate(value: string, propertyPart: string): Date {
  // Check if it's a date-only value (e.g., 20240101) or datetime (e.g., 20240101T120000Z)
  const isDateOnly = propertyPart.includes('VALUE=DATE') && !propertyPart.includes('VALUE=DATE-TIME');
  
  if (isDateOnly || value.length === 8) {
    // Date only: YYYYMMDD
    const year = parseInt(value.substring(0, 4), 10);
    const month = parseInt(value.substring(4, 6), 10) - 1; // 0-indexed
    const day = parseInt(value.substring(6, 8), 10);
    return new Date(year, month, day, 0, 0, 0);
  } else {
    // DateTime: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
    const isUTC = value.endsWith('Z');
    const cleanValue = value.replace('Z', '');
    
    const year = parseInt(cleanValue.substring(0, 4), 10);
    const month = parseInt(cleanValue.substring(4, 6), 10) - 1;
    const day = parseInt(cleanValue.substring(6, 8), 10);
    const hour = parseInt(cleanValue.substring(9, 11), 10);
    const minute = parseInt(cleanValue.substring(11, 13), 10);
    const second = parseInt(cleanValue.substring(13, 15), 10) || 0;
    
    if (isUTC) {
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    } else {
      return new Date(year, month, day, hour, minute, second);
    }
  }
}

/**
 * Check if RRULE represents yearly recurrence
 */
function isYearlyRecurrence(rrule?: string): boolean {
  if (!rrule) return false;
  return rrule.includes('FREQ=YEARLY');
}

/**
 * Unescape iCalendar text values
 */
function unescapeICSValue(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Generate a unique ID for events without one
 */
function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Filter events to only include yearly recurring events (birthdays, anniversaries)
 */
export function filterYearlyRecurringEvents(events: ICSEvent[]): ICSEvent[] {
  return events.filter(event => event.isYearlyRecurring);
}

/**
 * Validate if a URL looks like an .ics calendar URL
 */
export function isValidICSUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Check if it's a valid HTTP(S) URL
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    // Check for common calendar URL patterns
    const path = urlObj.pathname.toLowerCase();
    const query = urlObj.search.toLowerCase();
    return (
      path.endsWith('.ics') ||
      path.includes('/ical') ||
      query.includes('format=ical') ||
      query.includes('format=ics') ||
      urlObj.hostname.includes('calendar.google.com') ||
      urlObj.hostname.includes('outlook.') ||
      urlObj.hostname.includes('icloud.com')
    );
  } catch {
    return false;
  }
}
