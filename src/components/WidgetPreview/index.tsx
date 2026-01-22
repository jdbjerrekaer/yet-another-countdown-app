import { SmallWidget } from '../widgets/SmallWidget';
import { MediumWidget } from '../widgets/MediumWidget';
import { LargeWidget } from '../widgets/LargeWidget';
import { CountdownTime } from '@/hooks/useCountdown';
import { WidgetAppearanceMode, WidgetCountdownStyle } from '@/types/countdown';

interface WidgetPreviewProps {
  title: string;
  countdown: CountdownTime;
  targetDate: Date | null;
  emoji: string;
  emojiColor?: string;
  size: 'small' | 'medium' | 'large';
  appearanceMode: WidgetAppearanceMode;
  countdownStyle: WidgetCountdownStyle;
  isRecurring?: boolean;
  createdAt?: Date;
  nextOccurrenceNumber?: number;
}

export function WidgetPreview({ title, countdown, targetDate, emoji, emojiColor, size, appearanceMode, countdownStyle, isRecurring, createdAt, nextOccurrenceNumber }: WidgetPreviewProps) {
  switch (size) {
    case 'small':
      return <SmallWidget title={title} countdown={countdown} targetDate={targetDate} emoji={emoji} emojiColor={emojiColor} appearanceMode={appearanceMode} countdownStyle={countdownStyle} isRecurring={isRecurring} createdAt={createdAt} nextOccurrenceNumber={nextOccurrenceNumber} />;
    case 'medium':
      return <MediumWidget title={title} countdown={countdown} targetDate={targetDate} emoji={emoji} emojiColor={emojiColor} appearanceMode={appearanceMode} countdownStyle={countdownStyle} isRecurring={isRecurring} createdAt={createdAt} nextOccurrenceNumber={nextOccurrenceNumber} />;
    case 'large':
      return <LargeWidget title={title} countdown={countdown} targetDate={targetDate} emoji={emoji} emojiColor={emojiColor} appearanceMode={appearanceMode} countdownStyle={countdownStyle} isRecurring={isRecurring} createdAt={createdAt} nextOccurrenceNumber={nextOccurrenceNumber} />;
    default:
      return null;
  }
}
