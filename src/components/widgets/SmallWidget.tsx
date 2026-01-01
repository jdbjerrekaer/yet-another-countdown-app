import { CountdownTime } from '@/hooks/useCountdown';

interface SmallWidgetProps {
  title: string;
  countdown: CountdownTime;
  emoji: string;
}

const getTimeDisplay = (countdown: CountdownTime): { value: number; unit: string } => {
  if (countdown.days > 0) {
    return { value: countdown.days, unit: 'days' };
  }
  if (countdown.hours > 0) {
    return { value: countdown.hours, unit: 'hours' };
  }
  if (countdown.minutes > 0) {
    return { value: countdown.minutes, unit: 'minutes' };
  }
  return { value: countdown.seconds, unit: 'seconds' };
};

export function SmallWidget({ title, countdown, emoji }: SmallWidgetProps) {
  const timeDisplay = getTimeDisplay(countdown);
  
  return (
    <div className="w-[155px] h-[155px] rounded-[28px] bg-card shadow-ios-lg p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{emoji}</span>
      </div>
      
      <div>
        <p className="text-xs text-muted-foreground truncate mb-1">{title}</p>
        {countdown.isPast ? (
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {countdown.daysSince}<span className="text-sm font-medium text-muted-foreground ml-1">days ago</span>
          </p>
        ) : countdown.isComplete ? (
          <p className="text-2xl font-bold text-primary">Today! 🎉</p>
        ) : (
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {timeDisplay.value}<span className="text-lg font-medium text-muted-foreground ml-1">{timeDisplay.unit}</span>
          </p>
        )}
      </div>
    </div>
  );
}
