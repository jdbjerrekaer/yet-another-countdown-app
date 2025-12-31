import { CountdownTime } from '@/hooks/useCountdown';
import { format } from 'date-fns';

interface LargeWidgetProps {
  title: string;
  countdown: CountdownTime;
  targetDate: Date | null;
  emoji?: string;
}

export function LargeWidget({ title, countdown, targetDate, emoji = "🎯" }: LargeWidgetProps) {
  const progress = countdown.isComplete ? 100 : Math.min(100, Math.max(0, 100 - (countdown.totalSeconds / (365 * 24 * 60 * 60)) * 100));

  return (
    <div className="w-[364px] h-[364px] rounded-3xl widget-large-bg ios-shadow p-6 flex flex-col overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-accent/15 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
      
      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{emoji}</span>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">{title}</span>
            <span className="text-xs text-muted-foreground">
              {targetDate ? format(targetDate, 'MMMM d, yyyy') : 'Set a date'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Main countdown */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div className="grid grid-cols-4 gap-3 w-full">
          <CountdownBlock value={countdown.days} label="Days" />
          <CountdownBlock value={countdown.hours} label="Hours" />
          <CountdownBlock value={countdown.minutes} label="Min" />
          <CountdownBlock value={countdown.seconds} label="Sec" />
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="relative z-10 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{countdown.isComplete ? 'Complete!' : `${countdown.days} days remaining`}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div 
            className="h-full rounded-full gradient-accent transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-2xl bg-card/50 ios-glass">
      <span 
        className="text-4xl font-bold text-foreground tracking-tight tabular-nums animate-count" 
        key={value}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
        {label}
      </span>
    </div>
  );
}
