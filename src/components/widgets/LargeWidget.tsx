import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { CountdownTime } from '@/hooks/useCountdown';
import { WidgetAppearanceMode, WidgetCountdownStyle } from '@/types/countdown';
import { getTintedBackground } from '@/lib/colorPalette';
import { calculateRemainingPercent } from '@/lib/widgetProgress';
import { getWidgetSizeStyles } from '@/lib/widgetSizes';
import { formatDateSmart } from '@/lib/utils';
import { ProgressBars } from './ProgressBars';
import { FlipDigit } from './FlipDigit';

// Helper function to adjust color brightness for gradient
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

interface LargeWidgetProps {
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
  const baseClasses = 'rounded-[28px] shadow-ios-lg p-[24px] flex flex-col';
  
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

export function LargeWidget({ title, countdown, targetDate, emoji, emojiColor, appearanceMode, countdownStyle, isRecurring, createdAt, nextOccurrenceNumber }: LargeWidgetProps) {
  const { t } = useTranslation();
  const widgetClasses = getWidgetClasses(appearanceMode);
  const sizeStyles = getWidgetSizeStyles('large');
  
  // Combined style for both size and tinted background
  const combinedStyle = appearanceMode === 'tinted'
    ? { ...sizeStyles, background: getTintedBackground(emojiColor, true) }
    : sizeStyles;

  // Calculate progress for visual mode
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
      <div className={`${widgetClasses} gap-0`} style={combinedStyle}>
        {/* Header */}
        <div className="flex items-center gap-4 pb-6">
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
                  {isRecurring && nextOccurrenceNumber && (
                    <span className="text-sm text-primary font-medium">#{nextOccurrenceNumber}</span>
                  )}
                </div>
              )}
            </div>
            {targetDate && (
              <p className="text-sm text-muted-foreground">
                {isRecurring 
                  ? t('widget.next', { date: formatDateSmart(targetDate) }) 
                  : formatDateSmart(targetDate)}
              </p>
            )}
          </div>
        </div>

        {/* Center: Progress bars */}
        <div className="flex-1 flex items-center justify-center">
          {countdown.isComplete && !countdown.isPast ? (
            <div className="text-center">
              <p className="text-5xl font-bold text-primary">{t('countdown.today')}</p>
            </div>
          ) : (
            <ProgressBars
              countdown={countdown}
              targetDate={targetDate}
              remainingPercent={remainingPercent}
              numBars={10}
              color={barColor}
              barWidth={22}
              barHeight={120}
              gap={6}
            />
          )}
        </div>

        {/* Bottom: Time breakdown */}
        {!(countdown.isComplete && !countdown.isPast) && (
          <div className="flex justify-center gap-6 pt-4">
            {countdown.isPast ? (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{elapsedDays}</p>
                  <p className="text-xs text-muted-foreground">{t('widget.daysAgoTextUpper')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{elapsedHours}</p>
                  <p className="text-xs text-muted-foreground">{t('widget.units.hoursShort')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{elapsedMinutes}</p>
                  <p className="text-xs text-muted-foreground">{t('widget.units.minutesShort')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{elapsedSeconds}</p>
                  <p className="text-xs text-muted-foreground">{t('widget.units.secondsShort')}</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{countdown.days}</p>
                  <p className="text-xs text-muted-foreground">{t('widget.units.daysShort')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{countdown.hours}</p>
                  <p className="text-xs text-muted-foreground">{t('widget.units.hoursShort')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{countdown.minutes}</p>
                  <p className="text-xs text-muted-foreground">{t('widget.units.minutesShort')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{countdown.seconds}</p>
                  <p className="text-xs text-muted-foreground">{t('widget.units.secondsShort')}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Classic mode layout - flip clock style
  if (countdownStyle === 'classic') {
    // Use dark theme only for dark appearance mode, light theme for all others
    const flipTheme = appearanceMode === 'dark' ? 'dark' : 'light';
    
    return (
      <div className={`${widgetClasses} gap-0`} style={combinedStyle}>
        <div className="flex items-center gap-4 pb-6">
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
                  {isRecurring && nextOccurrenceNumber && (
                    <span className="text-sm text-primary font-medium">#{nextOccurrenceNumber}</span>
                  )}
                </div>
              )}
            </div>
            {targetDate && (
              <p className="text-sm text-muted-foreground">
                {isRecurring ? `Next: ${formatDateSmart(targetDate)}` : formatDateSmart(targetDate)}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          {countdown.isPast ? (
            <FlipDigit value={countdown.daysSince} label={(countdown.daysSince === 1 ? 'Day' : t('widget.units.daysShort')) + ' ' + t('widget.daysAgoText')} size="large" theme={flipTheme} layout="row" />
          ) : countdown.isComplete ? (
            <div className="text-center py-8">
              <p className="text-5xl font-bold text-primary">{t('countdown.today')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 w-full">
              <FlipDigit value={countdown.days} label={t('widget.units.days_plural')} size="large" theme={flipTheme} layout="row" />
              <FlipDigit value={countdown.hours} label={t('widget.units.hours_plural')} size="large" theme={flipTheme} layout="row" />
              <FlipDigit value={countdown.minutes} label={t('widget.units.minutes_plural')} size="large" theme={flipTheme} layout="row" />
              <FlipDigit value={countdown.seconds} label={t('widget.units.seconds_plural')} size="large" theme={flipTheme} layout="row" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Focus mode layout (original)
  return (
    <div className={`${widgetClasses} gap-0`} style={combinedStyle}>
      <div className="flex items-center gap-4 pb-6">
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
              {isRecurring ? `Next: ${formatDateSmart(targetDate)}` : formatDateSmart(targetDate)}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        {countdown.isPast ? (
          <div className="flex flex-col items-center justify-center">
            <p className="text-6xl font-bold text-foreground">{countdown.daysSince}</p>
            <p className="text-lg text-muted-foreground mt-2">{countdown.daysSince === 1 
              ? t('widget.units.days') + ' ' + t('widget.daysAgoText')
              : t('widget.units.days_plural') + ' ' + t('widget.daysAgoText')}</p>
          </div>
        ) : countdown.isComplete ? (
          <div className="text-center py-8">
            <p className="text-5xl font-bold text-primary">{t('countdown.today')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-secondary/50 rounded-2xl p-4 text-center">
              <p className="text-4xl font-bold text-foreground">{countdown.days}</p>
              <p className="text-sm text-muted-foreground">{t('widget.units.days_plural')}</p>
            </div>
            <div className="bg-secondary/50 rounded-2xl p-4 text-center">
              <p className="text-4xl font-bold text-foreground">{countdown.hours}</p>
              <p className="text-sm text-muted-foreground">{t('widget.units.hours_plural')}</p>
            </div>
            <div className="bg-secondary/50 rounded-2xl p-4 text-center">
              <p className="text-4xl font-bold text-foreground">{countdown.minutes}</p>
              <p className="text-sm text-muted-foreground">{t('widget.units.minutes_plural')}</p>
            </div>
            <div className="bg-secondary/50 rounded-2xl p-4 text-center">
              <p className="text-4xl font-bold text-foreground">{countdown.seconds}</p>
              <p className="text-sm text-muted-foreground">{t('widget.units.seconds_plural')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
