import { CountdownTime } from '@/hooks/useCountdown';

interface SmallWidgetProps {
  title: string;
  countdown: CountdownTime;
  emoji: string;
}

export function SmallWidget({ title, countdown, emoji }: SmallWidgetProps) {
  return (
    <div className="w-[155px] h-[155px] rounded-[28px] bg-card shadow-ios-lg p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{emoji}</span>
      </div>
      
      <div>
        <p className="text-xs text-muted-foreground truncate mb-1">{title}</p>
        {countdown.isComplete ? (
          <p className="text-2xl font-bold text-primary">Today!</p>
        ) : (
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {countdown.days}<span className="text-lg font-medium text-muted-foreground ml-1">days</span>
          </p>
        )}
      </div>
    </div>
  );
}
