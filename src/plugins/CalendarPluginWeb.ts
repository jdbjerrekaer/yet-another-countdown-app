import { WebPlugin } from '@capacitor/core';
import type {
  CalendarPluginInterface,
  PermissionResult,
  GetCalendarsResult,
  GetRecurringEventsOptions,
  GetRecurringEventsResult,
  GetAllEventsOptions,
  GetAllEventsResult,
  GetWidgetDataResult,
  UpdateWidgetDataOptions,
  UpdateWidgetDataResult,
  OpenSettingsResult,
  InstalledWidgetsResult,
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

  async getAllEvents(_options: GetAllEventsOptions): Promise<GetAllEventsResult> {
    // Web doesn't have native calendar access
    return { events: [] };
  }

  async updateWidgetData(_options: UpdateWidgetDataOptions): Promise<UpdateWidgetDataResult> {
    // Web doesn't have native widgets - no-op but return success
    console.log('CalendarPlugin: Widget data sync is not available on web.');
    return { success: true };
  }

  async getWidgetData(): Promise<GetWidgetDataResult> {
    return { widgetData: null };
  }

  async getInstalledWidgets(): Promise<InstalledWidgetsResult> {
    // No widgets on web; 0 reads as "none", which is the safe default.
    return { count: 0, families: [] };
  }

  async openSettings(): Promise<OpenSettingsResult> {
    // Web doesn't have system settings
    console.warn('CalendarPlugin: Opening settings is not available on web.');
    return { opened: false };
  }
}
