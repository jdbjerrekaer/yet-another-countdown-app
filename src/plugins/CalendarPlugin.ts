import { registerPlugin } from '@capacitor/core';

/**
 * Calendar event returned from native iOS Calendar
 */
export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrenceRule?: string;
  calendarId: string;
  calendarTitle: string;
  isBirthday: boolean;
  notes?: string;
}

/**
 * Calendar information
 */
export interface Calendar {
  id: string;
  title: string;
  type: 'local' | 'calDAV' | 'exchange' | 'subscription' | 'birthday' | 'unknown';
  color: string;
}

/**
 * Permission check result
 */
export interface PermissionResult {
  granted: boolean;
  status?: 'notDetermined' | 'restricted' | 'denied' | 'authorized' | 'fullAccess' | 'writeOnly' | 'unknown';
}

/**
 * Options for fetching recurring events
 */
export interface GetRecurringEventsOptions {
  startDate: string; // ISO8601 format
  endDate: string; // ISO8601 format
}

/**
 * Options for fetching all events (not just recurring)
 */
export interface GetAllEventsOptions {
  startDate: string; // ISO8601 format
  endDate: string; // ISO8601 format
  calendarId?: string; // Optional: filter by specific calendar
}

/**
 * Result from getRecurringEvents
 */
export interface GetRecurringEventsResult {
  events: CalendarEvent[];
}

/**
 * Result from getAllEvents
 */
export interface GetAllEventsResult {
  events: CalendarEvent[];
}

/**
 * Result from getCalendars
 */
export interface GetCalendarsResult {
  calendars: Calendar[];
}

/**
 * Widget countdown event data for syncing to native storage
 */
export interface WidgetCountdownEvent {
  id: string;
  title: string;
  targetDate: string;
  emoji: string;
  emojiColor?: string;
  emojiShape?: 'squircle' | 'circle' | 'heart' | 'flower' | 'hexagon';
  isRecurring: boolean;
  createdAt: string;
  hasTime?: boolean;
  invertTimeFormat?: boolean;
}

/**
 * Widget data stored in App Group storage
 */
export interface WidgetData {
  events: WidgetCountdownEvent[];
  appearanceMode: string;
  countdownStyle: string;
  legacyTimeFormat?: boolean;
  appLanguage?: string;
  lastUpdated?: string;
}

/**
 * Result from getWidgetData
 */
export interface GetWidgetDataResult {
  widgetData: WidgetData | null;
}

/**
 * Result from getAppShortcutsStatus
 */
/**
 * Options for updating widget data
 */
export interface UpdateWidgetDataOptions {
  events: WidgetCountdownEvent[];
  appearanceMode: string;
  countdownStyle: string;
  legacyTimeFormat?: boolean;
  appLanguage?: string;
}

/**
 * Result from updateWidgetData
 */
export interface UpdateWidgetDataResult {
  success: boolean;
}

/**
 * Result from openSettings
 */
export interface OpenSettingsResult {
  opened: boolean;
}

/**
 * Result from getInstalledWidgets
 */
export interface InstalledWidgetsResult {
  /** Widgets the user has placed. 0 also means "couldn't tell". */
  count: number;
  /** WidgetFamily names, e.g. systemSmall, accessoryRectangular. */
  families: string[];
}

/**
 * CalendarPlugin interface for accessing iOS Calendar via EventKit
 */
export interface CalendarPluginInterface {
  /**
   * Check if calendar permission is granted
   */
  checkPermission(): Promise<PermissionResult>;

  /**
   * Request calendar access permission
   */
  requestPermission(): Promise<PermissionResult>;

  /**
   * Get list of available calendars
   */
  getCalendars(): Promise<GetCalendarsResult>;

  /**
   * Get recurring events (birthdays, anniversaries) within a date range
   */
  getRecurringEvents(options: GetRecurringEventsOptions): Promise<GetRecurringEventsResult>;

  /**
   * Get ALL events (not just recurring) within a date range
   * Optionally filter by a specific calendar
   */
  getAllEvents(options: GetAllEventsOptions): Promise<GetAllEventsResult>;

  /**
   * Read widget data from native shared storage (App Group)
   */
  getWidgetData(): Promise<GetWidgetDataResult>;

  /**
   * Update widget data in native shared storage (App Group)
   * This syncs countdown events and widget settings to be accessible by iOS widgets
   */
  updateWidgetData(options: UpdateWidgetDataOptions): Promise<UpdateWidgetDataResult>;

  /**
   * Widgets the user has actually placed, via WidgetCenter. A snapshot, so call
   * it on foreground — the widget gets added while the app is backgrounded.
   * Resolves with 0 when it cannot tell (including on web).
   */
  getInstalledWidgets(): Promise<InstalledWidgetsResult>;

  /**
   * Open the iOS Settings app to allow the user to change permissions
   */
  openSettings(): Promise<OpenSettingsResult>;
}

/**
 * Register the CalendarPlugin with Capacitor
 * This plugin is only available on native iOS platforms
 */
const CalendarPlugin = registerPlugin<CalendarPluginInterface>('CalendarPlugin', {
  web: () => import('./CalendarPluginWeb').then(m => new m.CalendarPluginWeb()),
});

export default CalendarPlugin;
