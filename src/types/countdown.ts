export interface CountdownEvent {
  id: string;
  title: string;
  targetDate: string;
  emoji: string;
  isRecurring: boolean;
  createdAt: string;
}

export type WidgetSize = 'small' | 'medium' | 'large' | 'extraLarge';
