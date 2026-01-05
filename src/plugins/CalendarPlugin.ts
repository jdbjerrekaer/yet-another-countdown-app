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
 * Result from getRecurringEvents
 */
export interface GetRecurringEventsResult {
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
  isRecurring: boolean;
  createdAt: string;
}

/**
 * Options for updating widget data
 */
export interface UpdateWidgetDataOptions {
  events: WidgetCountdownEvent[];
  appearanceMode: string;
  countdownStyle: string;
}

/**
 * Result from updateWidgetData
 */
export interface UpdateWidgetDataResult {
  success: boolean;
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
   * Update widget data in native shared storage (App Group)
   * This syncs countdown events and widget settings to be accessible by iOS widgets
   */
  updateWidgetData(options: UpdateWidgetDataOptions): Promise<UpdateWidgetDataResult>;
}

/**
 * Register the CalendarPlugin with Capacitor
 * This plugin is only available on native iOS platforms
 */
const CalendarPlugin = registerPlugin<CalendarPluginInterface>('CalendarPlugin', {
  web: () => import('./CalendarPluginWeb').then(m => new m.CalendarPluginWeb()),
});

export default CalendarPlugin;
