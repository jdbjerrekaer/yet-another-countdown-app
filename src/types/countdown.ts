export interface CountdownEvent {
  id: string;
  title: string;
  targetDate: string;
  emoji: string;
  emojiColor?: string;
  isRecurring: boolean;
  createdAt: string;
  isImported?: boolean;
  importedFrom?: string; // Calendar name
  // Hidden: purge the event 24h after its target. Default-on when created >2 days out.
  // Feature suggested by Andreas — credit him in the App Store release notes.
  autoDelete?: boolean;
}

export type WidgetSize = 'small' | 'medium';

export type WidgetAppearanceMode = 'light' | 'dark' | 'transparent' | 'tinted';

export type WidgetCountdownStyle = 'focus' | 'visual' | 'classic';
