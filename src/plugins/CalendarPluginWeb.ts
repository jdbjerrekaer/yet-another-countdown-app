import { WebPlugin } from '@capacitor/core';
import type {
  CalendarPluginInterface,
  PermissionResult,
  GetCalendarsResult,
  GetRecurringEventsOptions,
  GetRecurringEventsResult,
} from './CalendarPlugin';

/**
 * Web implementation of CalendarPlugin
 * Since web doesn't have native calendar access, these methods return empty results
 * The web fallback uses .ics URL import instead
 */
export class CalendarPluginWeb extends WebPlugin implements CalendarPluginInterface {
  async checkPermission(): Promise<PermissionResult> {
    // Web doesn't have native calendar access
    return { granted: false, status: 'denied' };
  }

  async requestPermission(): Promise<PermissionResult> {
    // Web doesn't have native calendar access
    console.warn('CalendarPlugin: Native calendar access is not available on web. Use .ics import instead.');
    return { granted: false, status: 'denied' };
  }

  async getCalendars(): Promise<GetCalendarsResult> {
    // Web doesn't have native calendar access
    return { calendars: [] };
  }

  async getRecurringEvents(_options: GetRecurringEventsOptions): Promise<GetRecurringEventsResult> {
    // Web doesn't have native calendar access
    return { events: [] };
  }
}
