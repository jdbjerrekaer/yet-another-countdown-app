import { format } from 'date-fns';
import type { TFunction } from 'i18next';
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

const getTimeUnitLabel = (unit: string, value: number, t: TFunction): string => {
  return t(`widget.units.${unit}`, { count: value });
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

function getFontSizeForValue(value: number): { number: string; unit: string } {
  const digitCount = Math.abs(value).toString().length;
  
  if (digitCount === 1) {
    return { number: 'text-3xl', unit: 'text-lg' };
  }
  if (digitCount === 2) {
    return { number: 'text-2xl', unit: 'text-base' };
  }
  if (digitCount === 3) {
    return { number: 'text-xl', unit: 'text-sm' };
  }
  if (digitCount === 4) {
    return { number: 'text-lg', unit: 'text-xs' };
  }
  return { number: 'text-base', unit: 'text-xs' };
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
                ? `${t('widget.next', { date: format(targetDate, 'MMM d') })} · ${t('widget.units.days', { count: countdown.days })}`
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
              label={t('countdown.daysAgo', { count: countdown.daysSince })}
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
          (() => {
            const fontSize = getFontSizeForValue(countdown.daysSince);
            return (
              <p className={`${fontSize.number} font-bold text-foreground tracking-tight`}>
                {countdown.daysSince}<span className={`${fontSize.unit} font-medium text-muted-foreground ml-1 lowercase`}>{t('widget.daysAgoTextUpper', { count: countdown.daysSince })}</span>
              </p>
            );
          })()
        ) : countdown.isComplete ? (
          <p className="text-2xl font-bold text-primary">{t('countdown.today')}</p>
        ) : (
          (() => {
            const fontSize = getFontSizeForValue(timeDisplay.value);
            return (
              <p className={`${fontSize.number} font-bold text-foreground tracking-tight`}>
                {timeDisplay.value}<span className={`${fontSize.unit} font-medium text-muted-foreground ml-1`}>{t(`widget.units.${timeDisplay.unit}`, { count: timeDisplay.value })}</span>
              </p>
            );
          })()
        )}
      </div>
    </div>
  );
}
