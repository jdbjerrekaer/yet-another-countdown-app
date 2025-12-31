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
  size: 'small' | 'medium' | 'large' | 'extraLarge';
  isRecurring?: boolean;
}

export function WidgetPreview({ title, countdown, targetDate, emoji, size, isRecurring }: WidgetPreviewProps) {
  const widget = (() => {
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
  })();

  if (isRecurring && size !== 'small') {
    return (
      <div className="relative">
        {widget}
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full ios-glass flex items-center justify-center">
          <RefreshCw className="w-3 h-3 text-primary-foreground" />
        </div>
      </div>
    );
  }

  return widget;
}
