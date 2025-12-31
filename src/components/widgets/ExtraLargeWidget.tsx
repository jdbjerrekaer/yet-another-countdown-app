import { CountdownTime } from '@/hooks/useCountdown';
import { format, differenceInDays } from 'date-fns';

interface ExtraLargeWidgetProps {
  title: string;
  countdown: CountdownTime;
  targetDate: Date | null;
  startDate?: Date;
  emoji?: string;
}

export function ExtraLargeWidget({ 
  title, 
  countdown, 
  targetDate, 
  startDate = new Date(), 
  emoji = "🎯" 
}: ExtraLargeWidgetProps) {
  const totalDays = targetDate ? differenceInDays(targetDate, startDate) : 0;
  const elapsedDays = totalDays - countdown.days;
  const progressPercent = totalDays > 0 ? Math.min(100, (elapsedDays / totalDays) * 100) : 0;

  return (
    <div className="w-[364px] h-[400px] rounded-3xl widget-large-bg ios-shadow p-6 flex flex-col overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-accent/15 blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
      
      {/* Header */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center shadow-ios">
            <span className="text-3xl">{emoji}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-foreground">{title}</span>
            <span className="text-sm text-muted-foreground">
              {targetDate ? format(targetDate, 'EEEE, MMMM d, yyyy') : 'Set a target date'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Main countdown display */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-4">
        <div className="text-center mb-4">
          <span className="text-7xl font-bold text-foreground tracking-tight animate-count" key={countdown.days}>
            {countdown.days}
          </span>
          <span className="block text-lg font-medium text-muted-foreground mt-1">
            days remaining
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-6 w-full max-w-xs">
          <TimeBlock value={countdown.hours} label="Hours" />
          <TimeBlock value={countdown.minutes} label="Minutes" />
          <TimeBlock value={countdown.seconds} label="Seconds" />
        </div>
      </div>
      
      {/* Progress section */}
      <div className="relative z-10 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">Live countdown</span>
          </div>
          <span className="text-xs font-semibold text-foreground">
            {Math.round(progressPercent)}% complete
          </span>
        </div>
        
        <div className="h-3 rounded-full bg-secondary/80 overflow-hidden">
          <div 
            className="h-full rounded-full gradient-accent transition-all duration-1000 ease-out relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse-slow" />
          </div>
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{format(startDate, 'MMM d')}</span>
          <span>{targetDate ? format(targetDate, 'MMM d, yyyy') : '—'}</span>
        </div>
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-full aspect-square rounded-2xl bg-card/60 ios-glass flex items-center justify-center">
        <span 
          className="text-2xl font-bold text-foreground tabular-nums animate-count" 
          key={value}
        >
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-2">
        {label}
      </span>
    </div>
  );
}
