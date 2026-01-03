import { RefreshCw } from 'lucide-react';
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
}

export function WidgetPreview({ title, countdown, targetDate, emoji, emojiColor, size, isRecurring, createdAt }: WidgetPreviewProps) {
  const widget = (() => {
    switch (size) {
      case 'small':
        return <SmallWidget title={title} countdown={countdown} targetDate={targetDate} emoji={emoji} emojiColor={emojiColor} />;
      case 'medium':
        return <MediumWidget title={title} countdown={countdown} targetDate={targetDate} emoji={emoji} emojiColor={emojiColor} />;
      case 'large':
        return <LargeWidget title={title} countdown={countdown} targetDate={targetDate} emoji={emoji} emojiColor={emojiColor} />;
      case 'extraLarge':
        return <ExtraLargeWidget title={title} countdown={countdown} targetDate={targetDate} emoji={emoji} emojiColor={emojiColor} createdAt={createdAt} />;
      default:
        return null;
    }
  })();

  if (isRecurring && size !== 'small') {
    return (
      <div className="relative">
        {widget}
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <RefreshCw className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>
    );
  }

  return widget;
}
