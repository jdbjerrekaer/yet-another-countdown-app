import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { CountdownTime } from '@/hooks/useCountdown';

interface LargeWidgetProps {
  title: string;
  countdown: CountdownTime;
  targetDate: Date | null;
  emoji: string;
  emojiColor?: string;
  isRecurring?: boolean;
  nextOccurrenceNumber?: number;
}

export function LargeWidget({ title, countdown, targetDate, emoji, emojiColor: _emojiColor, isRecurring, nextOccurrenceNumber }: LargeWidgetProps) {
  return (
    <div className="w-[329px] h-[329px] rounded-[28px] bg-card shadow-ios-lg p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-auto">
        <span className="text-4xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-foreground truncate">{title}</p>
            {isRecurring && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                {nextOccurrenceNumber && (
                  <span className="text-xs text-primary font-medium">#{nextOccurrenceNumber}</span>
                )}
              </div>
            )}
          </div>
          {targetDate && (
            <p className="text-sm text-muted-foreground">
              {isRecurring ? `Next: ${format(targetDate, 'MMM d, yyyy')}` : format(targetDate, 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
      
      {countdown.isPast ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <p className="text-6xl font-bold text-foreground">{countdown.daysSince}</p>
          <p className="text-lg text-muted-foreground mt-2">day{countdown.daysSince !== 1 ? 's' : ''} ago</p>
        </div>
      ) : countdown.isComplete ? (
        <div className="text-center py-8">
          <p className="text-5xl font-bold text-primary">Today!</p>
          <p className="text-xl mt-2">🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-secondary/50 rounded-2xl p-4 text-center">
            <p className="text-4xl font-bold text-foreground">{countdown.days}</p>
            <p className="text-sm text-muted-foreground">Days</p>
          </div>
          <div className="bg-secondary/50 rounded-2xl p-4 text-center">
            <p className="text-4xl font-bold text-foreground">{countdown.hours}</p>
            <p className="text-sm text-muted-foreground">Hours</p>
          </div>
          <div className="bg-secondary/50 rounded-2xl p-4 text-center">
            <p className="text-4xl font-bold text-foreground">{countdown.minutes}</p>
            <p className="text-sm text-muted-foreground">Minutes</p>
          </div>
          <div className="bg-secondary/50 rounded-2xl p-4 text-center">
            <p className="text-4xl font-bold text-foreground">{countdown.seconds}</p>
            <p className="text-sm text-muted-foreground">Seconds</p>
          </div>
        </div>
      )}
    </div>
  );
}
