import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { CountdownTime } from '@/hooks/useCountdown';
import { WidgetAppearanceMode, WidgetCountdownStyle } from '@/types/countdown';
import { getTintedBackground } from '@/lib/colorPalette';
import { calculateRemainingPercent } from '@/lib/widgetProgress';
import { ProgressBars } from './ProgressBars';

interface MediumWidgetProps {
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

function getWidgetClasses(appearanceMode: WidgetAppearanceMode): string {
  const baseClasses = 'w-[329px] h-[155px] rounded-[28px] shadow-ios-lg p-5 flex';
  
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

export function MediumWidget({ title, countdown, targetDate, emoji, emojiColor, appearanceMode, countdownStyle, isRecurring, createdAt, nextOccurrenceNumber }: MediumWidgetProps) {
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

  // Visual mode layout - same structure as Focus mode, but replace time breakdown with ring
  if (countdownStyle === 'visual') {
    return (
      <div className={`${widgetClasses} flex-col justify-between`} style={tintedStyle}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground truncate">{title}</p>
              {(isRecurring || countdown.isPast) && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isRecurring && <RefreshCw className="w-3.5 h-3.5 text-primary" />}
                  {nextOccurrenceNumber && (
                    <span className="text-xs text-primary font-medium">#{nextOccurrenceNumber}</span>
                  )}
                </div>
              )}
            </div>
            {targetDate ? (
              <p className="text-xs text-muted-foreground">
                {isRecurring ? `Next: ${format(targetDate, 'MMM d, yyyy')}` : format(targetDate, 'MMM d, yyyy')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {countdown.isPast ? 'Time since event' : countdown.isComplete ? 'Event arrived!' : 'Counting down'}
              </p>
            )}
          </div>
        </div>
        
        {countdown.isComplete && !countdown.isPast ? (
          <p className="text-3xl font-bold text-primary">Today! 🎉</p>
        ) : (
          <div className="flex gap-6 items-end w-full">
            <ProgressBars
              countdown={countdown}
              remainingPercent={remainingPercent}
              numBars={14}
              color={barColor}
              barWidth={15}
              barHeight={52}
              gap={6}
            />
          </div>
        )}
      </div>
    );
  }

  // Focus mode layout (original)
  return (
    <div className={`${widgetClasses} flex-col justify-between`} style={tintedStyle}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground truncate">{title}</p>
            {isRecurring && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                {nextOccurrenceNumber && (
                  <span className="text-xs text-primary font-medium">#{nextOccurrenceNumber}</span>
                )}
              </div>
            )}
          </div>
          {targetDate ? (
            <p className="text-xs text-muted-foreground">
              {isRecurring ? `Next: ${format(targetDate, 'MMM d, yyyy')}` : format(targetDate, 'MMM d, yyyy')}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {countdown.isPast ? 'Time since event' : countdown.isComplete ? 'Event arrived!' : 'Counting down'}
            </p>
          )}
        </div>
      </div>
      
      {countdown.isPast ? (
        <div className="flex gap-6">
          <div>
            <p className="text-3xl font-bold text-foreground">{countdown.daysSince}</p>
            <p className="text-xs text-muted-foreground">Day{countdown.daysSince !== 1 ? 's' : ''} ago</p>
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
