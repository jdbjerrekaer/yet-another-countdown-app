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
  const baseClasses = 'rounded-[28px] shadow-ios-lg p-5 flex';
  
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
      <div className={`${widgetClasses} flex-col justify-between`} style={combinedStyle}>
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
                {isRecurring 
                  ? t('widget.next', { date: format(targetDate, 'MMM d, yyyy') }) 
                  : countdown.isPast
                    ? `${format(targetDate, 'MMM d, yyyy')} · ${t('countdown.daysAgo', { count: countdown.daysSince })}`
                    : format(targetDate, 'MMM d, yyyy')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {countdown.isPast ? t('widget.timeSince') : countdown.isComplete ? t('widget.arrived') : t('widget.countingDown')}
              </p>
            )}
          </div>
        </div>
        
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
    );
  }

  // Classic mode layout - flip clock style
  if (countdownStyle === 'classic') {
    // Use dark theme only for dark appearance mode, light theme for all others
    const flipTheme = appearanceMode === 'dark' ? 'dark' : 'light';
    
    return (
      <div className={`${widgetClasses} flex-col justify-between`} style={combinedStyle}>
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
                {isRecurring ? t('widget.next', { date: format(targetDate, 'MMM d, yyyy') }) : format(targetDate, 'MMM d, yyyy')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {countdown.isPast ? t('widget.timeSince') : countdown.isComplete ? t('widget.arrived') : t('widget.countingDown')}
              </p>
            )}
          </div>
        </div>
        
        {countdown.isPast ? (
          <div className="flex gap-6">
            <FlipDigit value={countdown.daysSince} label={t('widget.units.daysShort', { count: countdown.daysSince }) + ' ' + t('widget.daysAgoText')} size="medium" theme={flipTheme} />
          </div>
        ) : countdown.isComplete ? (
          <p className="text-3xl font-bold text-primary">{t('countdown.today')}</p>
        ) : (
          <div className="flex gap-6">
            <FlipDigit value={countdown.days} label={t('widget.units.daysShort', { count: countdown.days })} size="medium" theme={flipTheme} />
            <FlipDigit value={countdown.hours} label={t('widget.units.hoursShort', { count: countdown.hours })} size="medium" theme={flipTheme} />
            <FlipDigit value={countdown.minutes} label={t('widget.units.minutesShort', { count: countdown.minutes })} size="medium" theme={flipTheme} />
          </div>
        )}
      </div>
    );
  }

  // Focus mode layout (original)
  return (
    <div className={`${widgetClasses} flex-col justify-between`} style={combinedStyle}>
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
              {isRecurring ? t('widget.next', { date: format(targetDate, 'MMM d, yyyy') }) : format(targetDate, 'MMM d, yyyy')}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {countdown.isPast ? t('widget.timeSince') : countdown.isComplete ? t('widget.arrived') : t('widget.countingDown')}
            </p>
          )}
        </div>
      </div>
      
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
  );
}
