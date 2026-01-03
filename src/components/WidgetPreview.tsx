import { SmallWidget } from './widgets/SmallWidget';
import { MediumWidget } from './widgets/MediumWidget';
import { LargeWidget } from './widgets/LargeWidget';
import { ExtraLargeWidget } from './widgets/ExtraLargeWidget';
import { CountdownTime } from '@/hooks/useCountdown';

interface WidgetPreviewProps {
  title: string;
  countdown: CountdownTime;
  targetDate: Date | null;
  emoji: string;
  emojiColor?: string;
  size: 'small' | 'medium' | 'large' | 'extraLarge';
  isRecurring?: boolean;
  createdAt?: Date;
  nextOccurrenceNumber?: number;
}

export function WidgetPreview({ title, countdown, targetDate, emoji, emojiColor, size, isRecurring, createdAt, nextOccurrenceNumber }: WidgetPreviewProps) {
  switch (size) {
    case 'small':
      return <SmallWidget title={title} countdown={countdown} targetDate={targetDate} emoji={emoji} emojiColor={emojiColor} isRecurring={isRecurring} nextOccurrenceNumber={nextOccurrenceNumber} />;
    case 'medium':
      return <MediumWidget title={title} countdown={countdown} targetDate={targetDate} emoji={emoji} emojiColor={emojiColor} isRecurring={isRecurring} nextOccurrenceNumber={nextOccurrenceNumber} />;
    case 'large':
      return <LargeWidget title={title} countdown={countdown} targetDate={targetDate} emoji={emoji} emojiColor={emojiColor} isRecurring={isRecurring} nextOccurrenceNumber={nextOccurrenceNumber} />;
    case 'extraLarge':
      return <ExtraLargeWidget title={title} countdown={countdown} targetDate={targetDate} emoji={emoji} emojiColor={emojiColor} createdAt={createdAt} isRecurring={isRecurring} nextOccurrenceNumber={nextOccurrenceNumber} />;
    default:
      return null;
  }
}
