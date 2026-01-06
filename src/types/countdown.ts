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
}

export type WidgetSize = 'small' | 'medium' | 'large' | 'extraLarge';

export type WidgetAppearanceMode = 'light' | 'dark' | 'transparent' | 'tinted';

export type WidgetCountdownStyle = 'focus' | 'visual' | 'classic';
