import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { CountdownTime } from '@/hooks/useCountdown';
import { WidgetAppearanceMode, WidgetCountdownStyle } from '@/types/countdown';
import { getTintedBackground } from '@/lib/colorPalette';
import { calculateRemainingPercent } from '@/lib/widgetProgress';
import { ProgressBars } from './ProgressBars';

interface SmallWidgetProps {
  title: string;
  countdown: CountdownTime;
  targetDate: Date | null;
  emoji: string;
  emojiColor?: string;
  appearanceMode: WidgetAppearanceMode;
  countdownStyle: WidgetCountdownStyle;
  isRecurring?: boolean;
  createdAt?: Date;
  nextOccurrenceNumber?: number;
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

function getWidgetClasses(appearanceMode: WidgetAppearanceMode): string {
  const baseClasses = 'w-[155px] h-[155px] rounded-[28px] shadow-ios-lg p-4 flex flex-col';
  
  switch (appearanceMode) {
    case 'light':
      return `${baseClasses} widget-light`;
    case 'dark':
      return `${baseClasses} widget-dark`;
    case 'transparent':
      return `${baseClasses} widget-transparent`;
    case 'tinted':
      return `${baseClasses} widget-tinted widget-tinted-light`;
    default:
      return `${baseClasses} bg-card`;
  }
}

export function SmallWidget({ title, countdown, targetDate, emoji, emojiColor, appearanceMode, countdownStyle, isRecurring, createdAt, nextOccurrenceNumber }: SmallWidgetProps) {
  const timeDisplay = getTimeDisplay(countdown);
  const widgetClasses = getWidgetClasses(appearanceMode);
  
  // For tinted mode, generate the background color from emoji color
  const tintedStyle = appearanceMode === 'tinted' 
    ? { background: getTintedBackground(emojiColor, true) }
    : undefined;

  // Calculate progress for visual mode
  const { remainingPercent, isActive } = calculateRemainingPercent(
    targetDate,
    countdown,
    isRecurring ?? false,
    createdAt
  );

  // Use emojiColor for bars, fallback to primary blue
  const barColor = emojiColor || 'hsl(211, 100%, 50%)';

  // Visual mode layout - same structure as Focus mode, but replace number with ring
  if (countdownStyle === 'visual') {
    return (
      <div className={`${widgetClasses} justify-between`} style={tintedStyle}>
        <div className="flex items-center justify-between">
          <span className="text-2xl">{emoji}</span>
          {(isRecurring || countdown.isPast) && (
            <div className="flex items-center gap-1">
              {isRecurring && <RefreshCw className="w-3 h-3 text-primary" />}
              {nextOccurrenceNumber && (
                <span className="text-xs text-primary font-medium">#{nextOccurrenceNumber}</span>
              )}
            </div>
          )}
        </div>
        
        <div>
          <p className="text-sm font-semibold text-foreground truncate mb-1">{title}</p>
          {targetDate && (
            <p className="text-xs text-muted-foreground truncate mb-1">
              {isRecurring ? `Next: ${format(targetDate, 'MMM d')}` : format(targetDate, 'MMM d, yyyy')}
            </p>
          )}
          {countdown.isComplete && !countdown.isPast ? (
            <p className="text-2xl font-bold text-primary">Today! 🎉</p>
          ) : (
            <div className="flex justify-start w-full">
              <ProgressBars
                countdown={countdown}
                targetDate={targetDate}
                remainingPercent={remainingPercent}
                numBars={7}
                color={barColor}
                barWidth={12}
                barHeight={36.5}
                gap={6}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Focus mode layout (original)
  return (
    <div className={`${widgetClasses} justify-between`} style={tintedStyle}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{emoji}</span>
        {(isRecurring || countdown.isPast) && (
          <div className="flex items-center gap-1">
            {isRecurring && <RefreshCw className="w-3 h-3 text-primary" />}
            {nextOccurrenceNumber && (
              <span className="text-xs text-primary font-medium">#{nextOccurrenceNumber}</span>
            )}
          </div>
        )}
      </div>
      
      <div>
        <p className="text-sm font-semibold text-foreground truncate mb-1">{title}</p>
        {targetDate && (
          <p className="text-xs text-muted-foreground truncate mb-1">
            {isRecurring ? `Next: ${format(targetDate, 'MMM d')}` : format(targetDate, 'MMM d, yyyy')}
          </p>
        )}
        {countdown.isPast ? (
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {countdown.daysSince}<span className="text-sm font-medium text-muted-foreground ml-1">day{countdown.daysSince !== 1 ? 's' : ''} ago</span>
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
