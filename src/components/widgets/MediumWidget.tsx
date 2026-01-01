import { CountdownTime } from '@/hooks/useCountdown';

interface MediumWidgetProps {
  title: string;
  countdown: CountdownTime;
  emoji: string;
}

export function MediumWidget({ title, countdown, emoji }: MediumWidgetProps) {
  return (
    <div className="w-[329px] h-[155px] rounded-[28px] bg-card shadow-ios-lg p-5 flex flex-col justify-between">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">
            {countdown.isPast ? 'Time since event' : countdown.isComplete ? 'Event arrived!' : 'Counting down'}
          </p>
        </div>
      </div>
      
      {countdown.isPast ? (
        <div className="flex gap-6">
          <div>
            <p className="text-3xl font-bold text-foreground">{countdown.daysSince}</p>
            <p className="text-xs text-muted-foreground">Days ago</p>
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
