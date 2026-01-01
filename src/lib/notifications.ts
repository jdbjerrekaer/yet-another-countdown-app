/**
 * Check if notification permission is granted
 */
export async function checkNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    // Notifications not supported
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  return false;
}

/**
 * Request notification permission if not already granted
 * @returns true if permission is granted (or was already granted), false otherwise
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    // Notifications not supported
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
