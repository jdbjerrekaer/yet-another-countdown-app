import { format, differenceInDays } from 'date-fns';
import { CountdownTime } from '@/hooks/useCountdown';

interface ExtraLargeWidgetProps {
  title: string;
  countdown: CountdownTime;
  targetDate: Date | null;
  emoji: string;
  createdAt?: Date;
}

export function ExtraLargeWidget({ title, countdown, targetDate, emoji, createdAt }: ExtraLargeWidgetProps) {
  // Calculate progress based on creation date to target date
  const calculateProgress = () => {
    if (!targetDate || countdown.isPast || countdown.isComplete) {
      return 100;
    }
    
    const now = new Date();
    const startDate = createdAt || now;
    
    const totalDays = differenceInDays(targetDate, startDate);
    const daysElapsed = differenceInDays(now, startDate);
    
    if (totalDays <= 0) return 100;
    
    const progress = (daysElapsed / totalDays) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const progress = calculateProgress();

  return (
    <div className="w-[329px] h-[400px] rounded-[28px] bg-card shadow-ios-lg p-6 flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center">
          <span className="text-3xl">{emoji}</span>
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{title}</p>
          {targetDate && (
            <p className="text-sm text-muted-foreground">
              {format(targetDate, 'EEEE, MMMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
      
      {countdown.isPast ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-7xl font-bold text-foreground mb-2">{countdown.daysSince}</p>
          <p className="text-xl text-muted-foreground">days since</p>
        </div>
      ) : countdown.isComplete ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-6xl font-bold text-primary mb-4">Today!</p>
          <p className="text-4xl">🎉</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-4 gap-2 mb-6">
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold text-foreground">{countdown.days}</p>
              <p className="text-xs text-muted-foreground">Days</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold text-foreground">{countdown.hours}</p>
              <p className="text-xs text-muted-foreground">Hrs</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold text-foreground">{countdown.minutes}</p>
              <p className="text-xs text-muted-foreground">Min</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold text-foreground">{countdown.seconds}</p>
              <p className="text-xs text-muted-foreground">Sec</p>
            </div>
          </div>
          
          <div className="bg-secondary/30 rounded-2xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">
                {progress.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ 
                  width: `${progress}%` 
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
