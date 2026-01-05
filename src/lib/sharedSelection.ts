import { Capacitor } from '@capacitor/core';

interface SelectedEventData {
  id: string;
  title: string;
  targetDate: string;
  emoji: string;
  emojiColor?: string;
  isRecurring: boolean;
}

/**
 * Utility for sharing the selected event with iOS widgets
 * This is a no-op on web platforms
 */
export const SharedSelection = {
  /**
   * Set the currently selected event for widgets to display
   */
  async setSelectedEvent(event: SelectedEventData): Promise<void> {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // This is handled by the main updateWidgetData call in Index.tsx
    // The selected event is determined by the widget configuration, not a shared selection
    console.log('[SharedSelection] Selected event:', event.title);
  },

  /**
   * Clear the selected event
   */
  async clearSelectedEvent(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    console.log('[SharedSelection] Cleared selected event');
  },
};
