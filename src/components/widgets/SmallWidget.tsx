import { CountdownTime } from '@/hooks/useCountdown';

interface SmallWidgetProps {
  title: string;
  countdown: CountdownTime;
  emoji?: string;
}

export function SmallWidget({ title, countdown, emoji = "🎯" }: SmallWidgetProps) {
  return (
    <div className="w-[170px] h-[170px] rounded-3xl widget-small-bg ios-shadow p-4 flex flex-col justify-between overflow-hidden relative">
      {/* Decorative blur */}
      <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-primary/20 blur-2xl" />
      
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <span className="text-xs font-medium text-muted-foreground truncate flex-1">
          {title}
        </span>
      </div>
      
      <div className="flex flex-col items-center justify-center flex-1">
        <span className="text-5xl font-bold text-foreground tracking-tight animate-count" key={countdown.days}>
          {countdown.days}
        </span>
        <span className="text-xs font-medium text-muted-foreground mt-1">
          days left
        </span>
      </div>
    </div>
  );
}
