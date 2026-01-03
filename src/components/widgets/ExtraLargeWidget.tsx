import { format } from 'date-fns';
import { CountdownTime } from '@/hooks/useCountdown';

// Helper function to adjust color brightness for gradient
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

interface ExtraLargeWidgetProps {
  title: string;
  countdown: CountdownTime;
  targetDate: Date | null;
  emoji: string;
  emojiColor?: string;
  createdAt?: Date;
}

export function ExtraLargeWidget({ title, countdown, targetDate, emoji, emojiColor, createdAt }: ExtraLargeWidgetProps) {
  // Calculate progress based on creation date to target date
  // Uses countdown.totalSeconds for smooth updates every second
  const calculateProgress = () => {
    if (!targetDate || countdown.isPast || countdown.isComplete) {
      return 100;
    }
    
    if (!createdAt) {
      // No createdAt date - can't calculate progress, show 0%
      return 0;
    }
    
    const startTime = new Date(createdAt).getTime();
    const targetTime = new Date(targetDate).getTime();
    const totalDurationSeconds = Math.floor((targetTime - startTime) / 1000);
    
    // If target is before or at start time, show 100%
    if (totalDurationSeconds <= 0) return 100;
    
    // Remaining seconds from countdown hook (updates every second)
    const remainingSeconds = countdown.totalSeconds;
    
    // Elapsed time = total duration - remaining time
    const elapsedSeconds = totalDurationSeconds - remainingSeconds;
    
    // Calculate progress as percentage of time elapsed
    const progress = (elapsedSeconds / totalDurationSeconds) * 100;
    
    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, Math.round(progress)));
  };

  const progress = calculateProgress();

  return (
    <div className="w-[329px] h-[400px] rounded-[28px] bg-card shadow-ios-lg p-6 flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <div 
          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${!emojiColor ? 'gradient-accent' : ''}`}
          style={emojiColor ? { 
            background: `linear-gradient(135deg, ${emojiColor} 0%, ${adjustColorBrightness(emojiColor, 20)} 100%)` 
          } : undefined}
        >
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
          <p className="text-xl text-muted-foreground">day{countdown.daysSince !== 1 ? 's' : ''} since</p>
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
                {progress}%
              </span>
            </div>
            <div 
              className="h-2 bg-secondary rounded-full overflow-hidden"
              style={{ position: 'relative' }}
            >
              <div 
                className="bg-primary rounded-full"
                style={{ 
                  width: `${progress}%`,
                  height: '100%',
                  maxWidth: '100%',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
