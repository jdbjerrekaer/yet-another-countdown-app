import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { CountdownTime } from '@/hooks/useCountdown';

interface MediumWidgetProps {
  title: string;
  countdown: CountdownTime;
  targetDate: Date | null;
  emoji: string;
  emojiColor?: string;
  isRecurring?: boolean;
  nextOccurrenceNumber?: number;
}

export function MediumWidget({ title, countdown, targetDate, emoji, emojiColor: _emojiColor, isRecurring, nextOccurrenceNumber }: MediumWidgetProps) {
  return (
    <div className="w-[329px] h-[155px] rounded-[28px] bg-card shadow-ios-lg p-5 flex flex-col justify-between">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground truncate">{title}</p>
            {isRecurring && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                {nextOccurrenceNumber && (
                  <span className="text-xs text-primary font-medium">#{nextOccurrenceNumber}</span>
                )}
              </div>
            )}
          </div>
          {targetDate ? (
            <p className="text-xs text-muted-foreground">
              {isRecurring ? `Next: ${format(targetDate, 'MMM d, yyyy')}` : format(targetDate, 'MMM d, yyyy')}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {countdown.isPast ? 'Time since event' : countdown.isComplete ? 'Event arrived!' : 'Counting down'}
            </p>
          )}
        </div>
      </div>
      
      {countdown.isPast ? (
        <div className="flex gap-6">
          <div>
            <p className="text-3xl font-bold text-foreground">{countdown.daysSince}</p>
            <p className="text-xs text-muted-foreground">Day{countdown.daysSince !== 1 ? 's' : ''} ago</p>
          </div>
        </div>
      ) : countdown.isComplete ? (
        <p className="text-3xl font-bold text-primary">Today! 🎉</p>
      ) : (
        <div className="flex gap-6">
          <div>
            <p className="text-3xl font-bold text-foreground">{countdown.days}</p>
            <p className="text-xs text-muted-foreground">Days</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{countdown.hours}</p>
            <p className="text-xs text-muted-foreground">Hours</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{countdown.minutes}</p>
            <p className="text-xs text-muted-foreground">Min</p>
          </div>
        </div>
      )}
    </div>
  );
}
