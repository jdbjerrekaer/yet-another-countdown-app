import { format } from 'date-fns';
import { CountdownTime } from '@/hooks/useCountdown';

interface LargeWidgetProps {
  title: string;
  countdown: CountdownTime;
  targetDate: Date | null;
  emoji: string;
  emojiColor?: string;
}

export function LargeWidget({ title, countdown, targetDate, emoji, emojiColor: _emojiColor }: LargeWidgetProps) {
  return (
    <div className="w-[329px] h-[329px] rounded-[28px] bg-card shadow-ios-lg p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-auto">
        <span className="text-4xl">{emoji}</span>
        <div>
          <p className="text-lg font-semibold text-foreground">{title}</p>
          {targetDate && (
            <p className="text-sm text-muted-foreground">
              {format(targetDate, 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
      
      {countdown.isPast ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <p className="text-6xl font-bold text-foreground">{countdown.daysSince}</p>
          <p className="text-lg text-muted-foreground mt-2">day{countdown.daysSince !== 1 ? 's' : ''} since</p>
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
