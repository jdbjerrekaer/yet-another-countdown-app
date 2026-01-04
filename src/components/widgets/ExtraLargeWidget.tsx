import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { CountdownTime } from '@/hooks/useCountdown';
import { WidgetAppearanceMode, WidgetCountdownStyle } from '@/types/countdown';
import { getTintedBackground } from '@/lib/colorPalette';
import { calculateRemainingPercent } from '@/lib/widgetProgress';
import { CountdownRing } from './CountdownRing';

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
  appearanceMode: WidgetAppearanceMode;
  countdownStyle: WidgetCountdownStyle;
  createdAt?: Date;
  isRecurring?: boolean;
  nextOccurrenceNumber?: number;
}

function getWidgetClasses(appearanceMode: WidgetAppearanceMode): string {
  const baseClasses = 'w-[329px] h-[400px] rounded-[28px] shadow-ios-lg p-6 flex flex-col';
  
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

export function ExtraLargeWidget({ title, countdown, targetDate, emoji, emojiColor, appearanceMode, countdownStyle, createdAt, isRecurring, nextOccurrenceNumber }: ExtraLargeWidgetProps) {
  // Calculate progress for Focus mode (elapsed-based progress bar)
  const calculateElapsedProgress = () => {
    if (!targetDate || countdown.isPast || countdown.isComplete) {
      return 100;
    }
    
    if (!createdAt) {
      return 0;
    }
    
    const startTime = new Date(createdAt).getTime();
    const targetTime = new Date(targetDate).getTime();
    const totalDurationSeconds = Math.floor((targetTime - startTime) / 1000);
    
    if (totalDurationSeconds <= 0) return 100;
    
    const remainingSeconds = countdown.totalSeconds;
    const elapsedSeconds = totalDurationSeconds - remainingSeconds;
    const progress = (elapsedSeconds / totalDurationSeconds) * 100;
    
    return Math.max(0, Math.min(100, Math.round(progress)));
  };

  const elapsedProgress = calculateElapsedProgress();
  const widgetClasses = getWidgetClasses(appearanceMode);
  
  // For tinted mode, generate the background color from emoji color
  const tintedStyle = appearanceMode === 'tinted' 
    ? { background: getTintedBackground(emojiColor, true) }
    : undefined;

  // Calculate remaining progress for visual mode
  const { remainingPercent, isActive } = calculateRemainingPercent(
    targetDate,
    countdown,
    isRecurring ?? false,
    createdAt
  );

  // Use emojiColor for ring, fallback to primary blue
  const ringColor = emojiColor || 'hsl(211, 100%, 50%)';

  // Visual mode layout
  if (countdownStyle === 'visual') {
    return (
      <div className={widgetClasses} style={tintedStyle}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${!emojiColor ? 'gradient-accent' : ''}`}
            style={emojiColor ? { 
              background: `linear-gradient(135deg, ${emojiColor} 0%, ${adjustColorBrightness(emojiColor, 20)} 100%)` 
            } : undefined}
          >
            <span className="text-2xl">{emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-foreground truncate">{title}</p>
              {(isRecurring || countdown.isPast) && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isRecurring && <RefreshCw className="w-4 h-4 text-primary" />}
                  {nextOccurrenceNumber && (
                    <span className="text-sm text-primary font-medium">#{nextOccurrenceNumber}</span>
                  )}
                </div>
              )}
            </div>
            {targetDate && (
              <p className="text-sm text-muted-foreground">
                {isRecurring 
                  ? format(targetDate, 'EEEE, MMMM d, yyyy') 
                  : format(targetDate, 'EEEE, MMMM d, yyyy')}
              </p>
            )}
          </div>
        </div>

        {/* Center: Large ring */}
        <div className="flex-1 flex items-center justify-center">
          {countdown.isPast ? (
            <div className="text-center">
              <p className="text-7xl font-bold text-foreground mb-2">{countdown.daysSince}</p>
              <p className="text-xl text-muted-foreground">day{countdown.daysSince !== 1 ? 's' : ''} ago</p>
            </div>
          ) : countdown.isComplete ? (
            <div className="text-center">
              <p className="text-6xl font-bold text-primary mb-4">Today!</p>
              <p className="text-4xl">🎉</p>
            </div>
          ) : (
            <CountdownRing
              percentRemaining={isActive ? remainingPercent : 0}
              color={ringColor}
              sizePx={180}
              strokeWidth={24}
            />
          )}
        </div>

        {/* Bottom: Time breakdown and remaining bar */}
        {!countdown.isPast && !countdown.isComplete && (
          <div className="space-y-4">
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{countdown.hours}</p>
                <p className="text-xs text-muted-foreground">Hours</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{countdown.minutes}</p>
                <p className="text-xs text-muted-foreground">Min</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{countdown.seconds}</p>
                <p className="text-xs text-muted-foreground">Sec</p>
              </div>
            </div>
            
            <div className="bg-secondary/30 rounded-2xl p-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-medium text-foreground">
                  {remainingPercent}%
                </span>
              </div>
              <div 
                className="h-2 bg-secondary rounded-full overflow-hidden"
              >
                <div 
                  className="rounded-full"
                  style={{ 
                    width: `${remainingPercent}%`,
                    height: '100%',
                    maxWidth: '100%',
                    backgroundColor: ringColor,
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

  // Focus mode layout (original)
  return (
    <div className={widgetClasses} style={tintedStyle}>
      <div className="flex items-center gap-4 mb-6">
        <div 
          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${!emojiColor ? 'gradient-accent' : ''}`}
          style={emojiColor ? { 
            background: `linear-gradient(135deg, ${emojiColor} 0%, ${adjustColorBrightness(emojiColor, 20)} 100%)` 
          } : undefined}
        >
          <span className="text-3xl">{emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-foreground truncate">{title}</p>
            {isRecurring && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <RefreshCw className="w-4 h-4 text-primary" />
                {nextOccurrenceNumber && (
                  <span className="text-sm text-primary font-medium">#{nextOccurrenceNumber}</span>
                )}
              </div>
            )}
          </div>
          {targetDate && (
            <p className="text-sm text-muted-foreground">
              {isRecurring 
                ? `Next: ${format(targetDate, 'EEEE, MMMM d, yyyy')}` 
                : format(targetDate, 'EEEE, MMMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
      
      {countdown.isPast ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-7xl font-bold text-foreground mb-2">{countdown.daysSince}</p>
          <p className="text-xl text-muted-foreground">day{countdown.daysSince !== 1 ? 's' : ''} ago</p>
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
                {elapsedProgress}%
              </span>
            </div>
            <div 
              className="h-2 bg-secondary rounded-full overflow-hidden"
              style={{ position: 'relative' }}
            >
              <div 
                className="bg-primary rounded-full"
                style={{ 
                  width: `${elapsedProgress}%`,
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
