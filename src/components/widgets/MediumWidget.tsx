import { CountdownTime } from '@/hooks/useCountdown';

interface MediumWidgetProps {
  title: string;
  countdown: CountdownTime;
  emoji?: string;
}

export function MediumWidget({ title, countdown, emoji = "🎯" }: MediumWidgetProps) {
  return (
    <div className="w-[364px] h-[170px] rounded-3xl widget-medium-bg ios-shadow p-5 flex flex-col justify-between overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-accent/10 blur-2xl" />
      
      <div className="flex items-center gap-3 relative z-10">
        <span className="text-3xl">{emoji}</span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">Countdown</span>
        </div>
      </div>
      
      <div className="flex items-end justify-between relative z-10">
        <div className="flex gap-4">
          <TimeUnit value={countdown.days} label="Days" />
          <TimeUnit value={countdown.hours} label="Hrs" />
          <TimeUnit value={countdown.minutes} label="Min" />
          <TimeUnit value={countdown.seconds} label="Sec" />
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span 
        className="text-3xl font-bold text-foreground tracking-tight animate-count tabular-nums" 
        key={value}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}
