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
  size: 'small' | 'medium' | 'large' | 'extraLarge';
}

export function WidgetPreview({ title, countdown, targetDate, emoji, size }: WidgetPreviewProps) {
  switch (size) {
    case 'small':
      return <SmallWidget title={title} countdown={countdown} emoji={emoji} />;
    case 'medium':
      return <MediumWidget title={title} countdown={countdown} emoji={emoji} />;
    case 'large':
      return <LargeWidget title={title} countdown={countdown} targetDate={targetDate} emoji={emoji} />;
    case 'extraLarge':
      return <ExtraLargeWidget title={title} countdown={countdown} targetDate={targetDate} emoji={emoji} />;
    default:
      return null;
  }
}
