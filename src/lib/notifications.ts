import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import i18n from '../i18n';

interface WebScheduledNotification {
  eventId: string;
  title: string;
  targetDate: string;
  emoji: string;
}

function readScheduledNotifications(): WebScheduledNotification[] {
  const storedValue = localStorage.getItem('scheduledNotifications');
  if (!storedValue) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is WebScheduledNotification => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const notification = item as Partial<WebScheduledNotification>;
      return (
        typeof notification.eventId === 'string' &&
        typeof notification.title === 'string' &&
        typeof notification.targetDate === 'string' &&
        typeof notification.emoji === 'string'
      );
    });
  } catch {
    return [];
  }
}

/**
 * Convert event ID string to a numeric notification ID
 * Uses a simple hash function to ensure consistent numeric IDs
 */
function getNotificationId(eventId: string): number {
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    const char = eventId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Ensure positive number and within valid range (1-2147483647)
  return Math.abs(hash) % 2147483647 || 1;
}

/**
 * Check if notification permission is granted
 */
export async function checkNotificationPermission(): Promise<boolean> {
  // For native platforms, use Capacitor LocalNotifications
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await LocalNotifications.checkPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.warn('Failed to check notification permission:', error);
      return false;
    }
  }

  // For web, use Web Notifications API
  if (!('Notification' in window)) {
    return false;
  }

  return Notification.permission === 'granted';
}

/**
 * Request notification permission if not already granted
 * @returns true if permission is granted (or was already granted), false otherwise
 */
export async function requestNotificationPermission(): Promise<boolean> {
  // For native platforms, use Capacitor LocalNotifications
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.warn('Failed to request notification permission:', error);
      return false;
    }
  }

  // For web, use Web Notifications API
  if (!('Notification' in window)) {
    return false;
  }

  // If already granted, return true
  if (Notification.permission === 'granted') {
    return true;
  }

  // If denied, don't ask again
  if (Notification.permission === 'denied') {
    return false;
  }

  // Request permission
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.warn('Failed to request notification permission:', error);
    return false;
  }
}

/**
 * Schedule a notification for when the countdown reaches zero
 * @param eventId - Unique identifier for the event
 * @param title - Event title
 * @param targetDate - Date when the countdown reaches zero
 * @param emoji - Emoji for the event
 */
export async function scheduleEventNotification(
  eventId: string,
  title: string,
  targetDate: Date,
  emoji: string
): Promise<void> {
  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) {
    console.warn('Notification permission not granted, cannot schedule notification');
    return;
  }

  const now = Date.now();
  const targetTime = targetDate.getTime();
  const delay = targetTime - now;

  // Don't schedule if the event is in the past
  if (delay <= 0) {
    console.warn('Cannot schedule notification for past event');
    return;
  }

  // For native platforms, use Capacitor LocalNotifications
  if (Capacitor.isNativePlatform()) {
    try {
      const notificationId = getNotificationId(eventId);
      
      // Cancel any existing notification for this event first
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }],
      });

      // Schedule the notification
      await LocalNotifications.schedule({
        notifications: [
          {
            title: `${emoji} ${title}`,
            body: i18n.t('notifications.reachedZero'),
            id: notificationId,
            schedule: { at: targetDate },
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: {
              eventId,
            },
          },
        ],
      });
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  } else {
    // For web, we can't schedule far in advance, so we'll use a workaround
    // Store the notification info and check on page load/interval
    // This is a limitation of web notifications - they can't be scheduled far ahead
    console.warn('Web notifications cannot be scheduled far in advance. Notification will be checked on page load.');
    
    // Store notification info in localStorage for checking later
    const notifications = readScheduledNotifications();
    const notificationData: WebScheduledNotification = {
      eventId,
      title,
      targetDate: targetDate.toISOString(),
      emoji,
    };
    
    // Remove existing notification for this event if any
    const filtered = notifications.filter((n) => n.eventId !== eventId);
    filtered.push(notificationData);
    
    localStorage.setItem('scheduledNotifications', JSON.stringify(filtered));
    
    // Check if we should show notification now (for events happening soon)
    if (delay <= 60000) { // If less than 1 minute away
      setTimeout(() => {
        showWebNotification(title, emoji);
      }, delay);
    }
  }
}

/**
 * Drop any scheduled notification whose countdown no longer exists.
 *
 * Deletes used to cancel only when the undo window closed, so installs from
 * before that fix can hold notifications for countdowns that are long gone.
 * Reconciling against the live list on launch clears those strays; the id is
 * the same deterministic hash schedule/cancel use, so matching is exact.
 *
 * @param liveEventIds - Ids of the countdowns that currently exist
 */
export async function reconcileNotifications(liveEventIds: string[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const wanted = new Set(liveEventIds.map(getNotificationId));
    const pending = await LocalNotifications.getPending();
    const stale = pending.notifications.filter((n) => !wanted.has(n.id));
    if (stale.length === 0) return;
    await LocalNotifications.cancel({ notifications: stale.map((n) => ({ id: n.id })) });
  } catch (error) {
    console.error('Failed to reconcile notifications:', error);
  }
}

/**
 * Cancel a scheduled notification for an event
 * @param eventId - Unique identifier for the event
 */
export async function cancelEventNotification(eventId: string): Promise<void> {
  // For native platforms
  if (Capacitor.isNativePlatform()) {
    try {
      const notificationId = getNotificationId(eventId);
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }],
      });
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  } else {
    // For web, remove from localStorage
    const notifications = readScheduledNotifications();
    const filtered = notifications.filter((n) => n.eventId !== eventId);
    localStorage.setItem('scheduledNotifications', JSON.stringify(filtered));
  }
}

/**
 * Show a web notification (helper function)
 */
function showWebNotification(title: string, emoji: string): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`${emoji} ${title}`, {
      body: i18n.t('notifications.reachedZero'),
      icon: '/favicon.ico',
    });
  }
}

/**
 * Check and trigger any notifications that are due (for web platform)
 * Should be called on app load and periodically
 */
export async function checkScheduledNotifications(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    // Native platforms handle this automatically
    return;
  }

  const notifications = readScheduledNotifications();
  const now = Date.now();
  const triggered: string[] = [];

  for (const notification of notifications) {
    const targetTime = new Date(notification.targetDate).getTime();
    if (targetTime <= now) {
      showWebNotification(notification.title, notification.emoji);
      triggered.push(notification.eventId);
    }
  }

  // Remove triggered notifications
  if (triggered.length > 0) {
    const remaining = notifications.filter((n) => !triggered.includes(n.eventId));
    localStorage.setItem('scheduledNotifications', JSON.stringify(remaining));
  }
}
