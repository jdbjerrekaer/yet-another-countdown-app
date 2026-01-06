import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { CountdownTime } from '@/hooks/useCountdown';
import { WidgetAppearanceMode, WidgetCountdownStyle } from '@/types/countdown';
import { getTintedBackground } from '@/lib/colorPalette';
import { calculateRemainingPercent } from '@/lib/widgetProgress';
import { getWidgetSizeStyles } from '@/lib/widgetSizes';
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
  const baseClasses = 'rounded-[28px] shadow-ios-lg p-[20px] flex';
  
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
  const { t } = useTranslation();
  const widgetClasses = getWidgetClasses(appearanceMode);
  const sizeStyles = getWidgetSizeStyles('medium');
  
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

  // Visual mode layout - same structure as Focus mode, but replace time breakdown with ring
  if (countdownStyle === 'visual') {
    return (
      <div className={`${widgetClasses} flex-col gap-4`} style={combinedStyle}>
        <div className="flex items-center gap-3">
          <div 
            className={`w-12 h-12 rounded-[14px] flex items-center justify-center ${!emojiColor ? 'gradient-accent' : ''}`}
            style={emojiColor ? { 
              background: `linear-gradient(135deg, ${emojiColor} 0%, ${adjustColorBrightness(emojiColor, 20)} 100%)` 
            } : undefined}
          >
            <span className="text-2xl">{emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-foreground truncate">{title}</p>
              {(isRecurring || countdown.isPast) && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isRecurring && <RefreshCw className="w-3.5 h-3.5 text-primary" />}
                  {isRecurring && nextOccurrenceNumber && (
                    <span className="text-xs text-primary font-medium">#{nextOccurrenceNumber}</span>
                  )}
                </div>
              )}
            </div>
            {targetDate ? (
              <p className="text-xs text-muted-foreground">
                {isRecurring 
                  ? `${t('widget.next', { date: format(targetDate, 'MMM d, yyyy') })} · ${countdown.days} ${countdown.days === 1 ? t('widget.units.days') : t('widget.units.days_plural')}`
                  : countdown.isPast
                    ? `${format(targetDate, 'MMM d, yyyy')} · ${t('countdown.daysAgo', { count: countdown.daysSince })}`
                    : `${format(targetDate, 'MMM d, yyyy')} · ${countdown.days} ${countdown.days === 1 ? t('widget.units.days') : t('widget.units.days_plural')}`}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {countdown.isPast ? t('widget.timeSince') : countdown.isComplete ? t('widget.arrived') : t('widget.countingDown')}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex items-end">
          {countdown.isComplete && !countdown.isPast ? (
            <p className="text-3xl font-bold text-primary">{t('countdown.today')}</p>
          ) : (
            <div className="flex gap-6 items-end w-full">
              <ProgressBars
                countdown={countdown}
                targetDate={targetDate}
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
      </div>
    );
  }

  // Classic mode layout - flip clock style
  if (countdownStyle === 'classic') {
    // Use dark theme only for dark appearance mode, light theme for all others
    const flipTheme = appearanceMode === 'dark' ? 'dark' : 'light';
    
    return (
      <div className={`${widgetClasses} flex-col gap-4`} style={combinedStyle}>
        <div className="flex items-center gap-3">
          <div 
            className={`w-12 h-12 rounded-[14px] flex items-center justify-center ${!emojiColor ? 'gradient-accent' : ''}`}
            style={emojiColor ? { 
              background: `linear-gradient(135deg, ${emojiColor} 0%, ${adjustColorBrightness(emojiColor, 20)} 100%)` 
            } : undefined}
          >
            <span className="text-2xl">{emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-foreground truncate">{title}</p>
              {(isRecurring || countdown.isPast) && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isRecurring && <RefreshCw className="w-3.5 h-3.5 text-primary" />}
                  {isRecurring && nextOccurrenceNumber && (
                    <span className="text-xs text-primary font-medium">#{nextOccurrenceNumber}</span>
                  )}
                </div>
              )}
            </div>
            {targetDate ? (
              <p className="text-xs text-muted-foreground">
                {isRecurring 
                  ? `${t('widget.next', { date: format(targetDate, 'MMM d, yyyy') })} · ${countdown.days} ${countdown.days === 1 ? t('widget.units.days') : t('widget.units.days_plural')}`
                  : countdown.isPast
                    ? format(targetDate, 'MMM d, yyyy')
                    : `${format(targetDate, 'MMM d, yyyy')} · ${countdown.days} ${countdown.days === 1 ? t('widget.units.days') : t('widget.units.days_plural')}`}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {countdown.isPast ? t('widget.timeSince') : countdown.isComplete ? t('widget.arrived') : t('widget.countingDown')}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex items-end">
          {countdown.isPast ? (
            <div className="flex gap-6">
              <FlipDigit value={countdown.daysSince} label={t('widget.units.daysShort', { count: countdown.daysSince }) + ' ' + t('widget.daysAgoText')} size="medium" theme={flipTheme} layout="column" />
            </div>
          ) : countdown.isComplete ? (
            <p className="text-3xl font-bold text-primary">{t('countdown.today')}</p>
          ) : (
            <div className="flex gap-6">
              <FlipDigit value={countdown.days} label={t('widget.units.daysShort', { count: countdown.days })} size="medium" theme={flipTheme} layout="column" />
              <FlipDigit value={countdown.hours} label={t('widget.units.hoursShort', { count: countdown.hours })} size="medium" theme={flipTheme} layout="column" />
              <FlipDigit value={countdown.minutes} label={t('widget.units.minutesShort', { count: countdown.minutes })} size="medium" theme={flipTheme} layout="column" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Focus mode layout (original)
  return (
    <div className={`${widgetClasses} flex-col gap-4`} style={combinedStyle}>
      <div className="flex items-center gap-3">
        <div 
          className={`w-12 h-12 rounded-[14px] flex items-center justify-center ${!emojiColor ? 'gradient-accent' : ''}`}
          style={emojiColor ? { 
            background: `linear-gradient(135deg, ${emojiColor} 0%, ${adjustColorBrightness(emojiColor, 20)} 100%)` 
          } : undefined}
        >
          <span className="text-2xl">{emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-foreground truncate">{title}</p>
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
              {isRecurring 
                ? `${t('widget.next', { date: format(targetDate, 'MMM d, yyyy') })} · ${countdown.days} ${countdown.days === 1 ? t('widget.units.days') : t('widget.units.days_plural')}`
                : countdown.isPast
                  ? format(targetDate, 'MMM d, yyyy')
                  : `${format(targetDate, 'MMM d, yyyy')} · ${countdown.days} ${countdown.days === 1 ? t('widget.units.days') : t('widget.units.days_plural')}`}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {countdown.isPast ? t('widget.timeSince') : countdown.isComplete ? t('widget.arrived') : t('widget.countingDown')}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex items-end">
        {countdown.isPast ? (
          <div className="flex gap-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{countdown.daysSince}</p>
              <p className="text-xs text-muted-foreground">{t('widget.units.daysShort', { count: countdown.daysSince })} {t('widget.daysAgoText')}</p>
            </div>
          </div>
        ) : countdown.isComplete ? (
          <p className="text-3xl font-bold text-primary">{t('countdown.today')}</p>
        ) : (
          <div className="flex gap-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{countdown.days}</p>
              <p className="text-xs text-muted-foreground">{t('widget.units.daysShort', { count: countdown.days })}</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{countdown.hours}</p>
              <p className="text-xs text-muted-foreground">{t('widget.units.hoursShort', { count: countdown.hours })}</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{countdown.minutes}</p>
              <p className="text-xs text-muted-foreground">{t('widget.units.minutesShort', { count: countdown.minutes })}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
