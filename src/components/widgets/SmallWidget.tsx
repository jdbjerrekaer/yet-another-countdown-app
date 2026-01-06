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

const getTimeUnitLabel = (unit: string, value: number, t: (key: string) => string): string => {
  if (value === 1) {
    return t(`widget.units.${unit}`);
  }
  return t(`widget.units.${unit}_plural`);
};

function getWidgetClasses(appearanceMode: WidgetAppearanceMode): string {
  const baseClasses = 'rounded-[28px] shadow-ios-lg p-[16px] flex flex-col aspect-square';
  
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
  const { t } = useTranslation();
  const timeDisplay = getTimeDisplay(countdown);
  const widgetClasses = getWidgetClasses(appearanceMode);
  const sizeStyles = getWidgetSizeStyles('small');

  // Calculate progress for visual mode
  const { remainingPercent, isActive } = calculateRemainingPercent(
    targetDate,
    countdown,
    isRecurring ?? false,
    createdAt
  );

  // Use emojiColor for bars, fallback to primary blue
  const barColor = emojiColor || 'hsl(211, 100%, 50%)';

  // Combined style for both size and tinted background
  // For small widget, only use minWidth and let aspect-square determine height-based width
  const smallSizeStyle = { minWidth: sizeStyles.minWidth };
  const combinedStyle = appearanceMode === 'tinted'
    ? { ...smallSizeStyle, background: getTintedBackground(emojiColor, true) }
    : smallSizeStyle;

  // Visual mode layout - same structure as Focus mode, but replace number with ring
  if (countdownStyle === 'visual') {
    return (
      <div className={`${widgetClasses} gap-5`} style={combinedStyle}>
        <div className="flex items-center justify-between">
          <div 
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${!emojiColor ? 'gradient-accent' : ''}`}
            style={emojiColor ? { 
              background: `linear-gradient(135deg, ${emojiColor} 0%, ${adjustColorBrightness(emojiColor, 20)} 100%)` 
            } : undefined}
          >
            <span className="text-xl">{emoji}</span>
          </div>
          {(isRecurring || countdown.isPast) && (
            <div className="flex items-center gap-1">
              {isRecurring && <RefreshCw className="w-3 h-3 text-primary" />}
              {isRecurring && nextOccurrenceNumber && (
                <span className="text-xs text-primary font-medium">#{nextOccurrenceNumber}</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex-1 flex flex-col justify-end">
          <p className="text-sm font-semibold text-foreground truncate mb-1">{title}</p>
          {targetDate && (
            <p className="text-xs text-muted-foreground truncate mb-1">
              {isRecurring 
                ? `${t('widget.next', { date: format(targetDate, 'MMM d') })} · ${countdown.days} ${countdown.days === 1 ? t('widget.units.days') : t('widget.units.days_plural')}`
                : countdown.isPast
                  ? t('countdown.daysAgo', { count: countdown.daysSince })
                  : formatDateSmart(targetDate)}
            </p>
          )}
          {countdown.isComplete && !countdown.isPast ? (
            <p className="text-2xl font-bold text-primary">{t('countdown.today')}</p>
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

  // Classic mode layout - flip clock style
  if (countdownStyle === 'classic') {
    // Use dark theme only for dark appearance mode, light theme for all others
    const flipTheme = appearanceMode === 'dark' ? 'dark' : 'light';
    
    return (
      <div className={`${widgetClasses} gap-5`} style={combinedStyle}>
        <div className="flex items-center justify-between">
          <div 
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${!emojiColor ? 'gradient-accent' : ''}`}
            style={emojiColor ? { 
              background: `linear-gradient(135deg, ${emojiColor} 0%, ${adjustColorBrightness(emojiColor, 20)} 100%)` 
            } : undefined}
          >
            <span className="text-xl">{emoji}</span>
          </div>
          {(isRecurring || countdown.isPast) && (
            <div className="flex items-center gap-1">
              {isRecurring && <RefreshCw className="w-3 h-3 text-primary" />}
              {isRecurring && nextOccurrenceNumber && (
                <span className="text-xs text-primary font-medium">#{nextOccurrenceNumber}</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex-1 flex flex-col justify-end">
          <p className="text-sm font-semibold text-foreground truncate mb-1">{title}</p>
          {targetDate && (
            <p className="text-xs text-muted-foreground truncate mb-1">
              {isRecurring 
                ? t('widget.next', { date: format(targetDate, 'MMM d') })
                : formatDateSmart(targetDate)}
            </p>
          )}
          {countdown.isPast ? (
            <FlipDigit 
              value={countdown.daysSince} 
              label={t('widget.units.daysShort', { count: countdown.daysSince }) + ' ' + t('widget.daysAgoText')}
              size="small" 
              theme={flipTheme} 
              layout="row"
            />
          ) : countdown.isComplete ? (
            <p className="text-2xl font-bold text-primary">{t('countdown.today')}</p>
          ) : (
            <FlipDigit 
              value={timeDisplay.value} 
              label={getTimeUnitLabel(timeDisplay.unit, timeDisplay.value, t)}
              size="small" 
              theme={flipTheme} 
              layout="row"
            />
          )}
        </div>
      </div>
    );
  }

  // Focus mode layout (original)
  return (
    <div className={`${widgetClasses} gap-5`} style={combinedStyle}>
      <div className="flex items-center justify-between">
        <div 
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${!emojiColor ? 'gradient-accent' : ''}`}
          style={emojiColor ? { 
            background: `linear-gradient(135deg, ${emojiColor} 0%, ${adjustColorBrightness(emojiColor, 20)} 100%)` 
          } : undefined}
        >
          <span className="text-xl">{emoji}</span>
        </div>
        {(isRecurring || countdown.isPast) && (
          <div className="flex items-center gap-1">
            {isRecurring && <RefreshCw className="w-3 h-3 text-primary" />}
            {nextOccurrenceNumber && (
              <span className="text-xs text-primary font-medium">#{nextOccurrenceNumber}</span>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-end">
        <p className="text-sm font-semibold text-foreground truncate mb-1">{title}</p>
        {targetDate && (
          <p className="text-xs text-muted-foreground truncate mb-1">
            {isRecurring ? t('widget.next', { date: format(targetDate, 'MMM d') }) : formatDateSmart(targetDate)}
          </p>
        )}
        {countdown.isPast ? (
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {countdown.daysSince}<span className="text-lg font-medium text-muted-foreground ml-1">{t('widget.units.days', { count: countdown.daysSince })} {t('widget.daysAgoText')}</span>
          </p>
        ) : countdown.isComplete ? (
          <p className="text-2xl font-bold text-primary">{t('countdown.today')}</p>
        ) : (
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {timeDisplay.value}<span className="text-lg font-medium text-muted-foreground ml-1">{getTimeUnitLabel(timeDisplay.unit, timeDisplay.value, t)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
