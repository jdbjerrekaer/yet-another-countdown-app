import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { CountdownTime } from '@/hooks/useCountdown';
import { WidgetAppearanceMode, WidgetCountdownStyle } from '@/types/countdown';
import { getTintedBackground } from '@/lib/colorPalette';
import { calculateRemainingPercent } from '@/lib/widgetProgress';
import { ProgressBars } from './ProgressBars';

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
  const { t } = useTranslation();
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

  // Use emojiColor for bars, fallback to primary blue
  const barColor = emojiColor || 'hsl(211, 100%, 50%)';

  // Calculate elapsed time for past events
  let elapsedDays = 0;
  let elapsedHours = 0;
  let elapsedMinutes = 0;
  let elapsedSeconds = 0;
  if (countdown.isPast && targetDate) {
    const now = new Date();
    const elapsed = now.getTime() - targetDate.getTime();
    elapsedDays = Math.floor(elapsed / (1000 * 60 * 60 * 24));
    elapsedHours = Math.floor((elapsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    elapsedMinutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    elapsedSeconds = Math.floor((elapsed % (1000 * 60)) / 1000);
  }

  // Visual mode layout
  if (countdownStyle === 'visual') {
    return (
      <div className={widgetClasses} style={tintedStyle}>
        {/* Header */}
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
                  ? t('widget.next', { date: format(targetDate, 'EEEE, MMMM d, yyyy') }) 
                  : countdown.isPast
                    ? `${format(targetDate, 'EEEE, MMMM d, yyyy')} · ${t('countdown.daysAgo', { count: countdown.daysSince })}`
                    : format(targetDate, 'EEEE, MMMM d, yyyy')}
              </p>
            )}
          </div>
        </div>

        {/* Center: Progress bars and time breakdown */}
        <div className="flex-1 flex flex-col justify-center">
          {countdown.isComplete && !countdown.isPast ? (
            <div className="text-center">
              <p className="text-6xl font-bold text-primary mb-4">{t('countdown.today')}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center mb-6">
                <ProgressBars
                  countdown={countdown}
                  targetDate={targetDate}
                  remainingPercent={remainingPercent}
                  numBars={8}
                  color={barColor}
                  barWidth={30}
                  barHeight={140}
                  gap={5}
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold text-foreground">
                    {countdown.isPast ? elapsedDays : countdown.days}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {countdown.isPast ? t('widget.units.daysShort') + ' ' + t('widget.daysAgoText') : t('widget.units.days_plural')}
                  </p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold text-foreground">
                    {countdown.isPast ? elapsedHours : countdown.hours}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('widget.units.hours_plural')}</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold text-foreground">
                    {countdown.isPast ? elapsedMinutes : countdown.minutes}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('widget.units.minutes_plural')}</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-3xl font-bold text-foreground">
                    {countdown.isPast ? elapsedSeconds : countdown.seconds}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('widget.units.seconds_plural')}</p>
                </div>
              </div>
            </>
          )}
        </div>
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
              {isRecurring ? `Next: ${format(targetDate, 'EEEE, MMMM d, yyyy')}` : format(targetDate, 'EEEE, MMMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
      
      {countdown.isPast ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-7xl font-bold text-foreground mb-2">{countdown.daysSince}</p>
          <p className="text-xl text-muted-foreground">{t('countdown.daysAgo', { count: countdown.daysSince })}</p>
        </div>
      ) : countdown.isComplete ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-6xl font-bold text-primary mb-4">{t('countdown.today')}</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-secondary/50 rounded-2xl p-5 text-center">
              <p className="text-5xl font-bold text-foreground">{countdown.days}</p>
              <p className="text-sm text-muted-foreground">{t('widget.units.days_plural')}</p>
            </div>
            <div className="bg-secondary/50 rounded-2xl p-5 text-center">
              <p className="text-5xl font-bold text-foreground">{countdown.hours}</p>
              <p className="text-sm text-muted-foreground">{t('widget.units.hours_plural')}</p>
            </div>
            <div className="bg-secondary/50 rounded-2xl p-5 text-center">
              <p className="text-5xl font-bold text-foreground">{countdown.minutes}</p>
              <p className="text-sm text-muted-foreground">{t('widget.units.minutes_plural')}</p>
            </div>
            <div className="bg-secondary/50 rounded-2xl p-5 text-center">
              <p className="text-5xl font-bold text-foreground">{countdown.seconds}</p>
              <p className="text-sm text-muted-foreground">{t('widget.units.seconds_plural')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
