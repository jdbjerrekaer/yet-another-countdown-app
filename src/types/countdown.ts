export interface CountdownEvent {
  id: string;
  title: string;
  targetDate: string;
  emoji: string;
  emojiColor?: string;
  isRecurring: boolean;
  createdAt: string;
}

export type WidgetSize = 'small' | 'medium' | 'large' | 'extraLarge';

export type WidgetAppearanceMode = 'light' | 'dark' | 'transparent' | 'tinted';
