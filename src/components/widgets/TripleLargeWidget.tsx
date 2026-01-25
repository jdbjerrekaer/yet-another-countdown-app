import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { CountdownTime } from '@/hooks/useCountdown';
import { WidgetAppearanceMode, WidgetCountdownStyle } from '@/types/countdown';
import { getTintedBackground } from '@/lib/colorPalette';
import { getWidgetSizeStyles } from '@/lib/widgetSizes';
import { calculateRemainingPercent } from '@/lib/widgetProgress';
import { formatDateSmart } from '@/lib/utils';
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

interface TripleEvent {
  title: string;
  countdown: CountdownTime;
  targetDate: Date | null;
  emoji: string;
  emojiColor?: string;
  isRecurring?: boolean;
  nextOccurrenceNumber?: number;
  createdAt?: Date;
}

interface TripleLargeWidgetProps {
  event1: TripleEvent | null;
  event2: TripleEvent | null;
  event3: TripleEvent | null;
  appearanceMode: WidgetAppearanceMode;
  countdownStyle?: WidgetCountdownStyle;
}

function getWidgetClasses(appearanceMode: WidgetAppearanceMode): string {
  const baseClasses = 'rounded-[28px] shadow-ios-lg flex flex-col';
  
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

function EventRow({ event, appearanceMode, isLast, countdownStyle = 'focus' }: { event: TripleEvent; appearanceMode: WidgetAppearanceMode; isLast: boolean; countdownStyle?: WidgetCountdownStyle }) {
  const { t } = useTranslation();
  const { title, countdown, targetDate, emoji, emojiColor, isRecurring, createdAt, nextOccurrenceNumber } = event;
  
  const dividerColor = appearanceMode === 'dark' 
    ? 'border-white/15' 
    : 'border-gray-200';

  // Calculate progress for visual mode
  const { remainingPercent } = calculateRemainingPercent(
    targetDate,
    countdown,
    isRecurring ?? false,
    createdAt
  );

  // Use emojiColor for bars, fallback to primary blue
  const barColor = emojiColor || 'hsl(211, 100%, 50%)';

  // Helper to get days text
  const getDaysText = () => {
    if (countdown.isComplete && !countdown.isPast) {
      return ` · ${t('countdown.today')}`;
    } else if (countdown.isPast) {
      return ` · ${t('countdown.daysAgo', { count: countdown.daysSince })}`;
    } else {
      return ` · ${t('widget.units.days', { count: countdown.days })}`;
    }
  };

  // Visual mode layout
  if (countdownStyle === 'visual') {
    return (
      <>
        <div className="flex items-center gap-3 px-6 py-3 h-[109px]">
          {/* Emoji badge */}
          <div 
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!emojiColor ? 'gradient-accent' : ''}`}
            style={emojiColor ? { 
              background: `linear-gradient(135deg, ${emojiColor} 0%, ${adjustColorBrightness(emojiColor, 20)} 100%)` 
            } : undefined}
          >
            <span className="text-xl">{emoji}</span>
          </div>
          
          {/* Event info with days text on date line */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-base font-semibold text-foreground truncate">{title}</p>
              {isRecurring && (
                <>
                  <RefreshCw className="w-3 h-3 text-primary flex-shrink-0" />
                  {nextOccurrenceNumber && (
                    <span className="text-xs text-primary font-medium">#{nextOccurrenceNumber}</span>
                  )}
                </>
              )}
            </div>
            {targetDate && (
              <p className="text-xs text-muted-foreground">
                {isRecurring ? t('widget.next', { date: formatDateSmart(targetDate) }) : formatDateSmart(targetDate)}
                {getDaysText()}
              </p>
            )}
          </div>
          
          {/* Progress bars */}
          <div className="flex-shrink-0">
            <ProgressBars
              countdown={countdown}
              targetDate={targetDate}
              remainingPercent={remainingPercent}
              numBars={6}
              color={barColor}
              barWidth={8}
              barHeight={40}
              gap={4}
            />
          </div>
        </div>
        {!isLast && <div className={`border-t ${dividerColor} mx-6`} />}
      </>
    );
  }

  // Focus mode layout (default)
  return (
    <>
      <div className="flex items-center gap-3 px-6 py-3 h-[109px]">
        {/* Emoji badge */}
        <div 
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!emojiColor ? 'gradient-accent' : ''}`}
          style={emojiColor ? { 
            background: `linear-gradient(135deg, ${emojiColor} 0%, ${adjustColorBrightness(emojiColor, 20)} 100%)` 
          } : undefined}
        >
          <span className="text-xl">{emoji}</span>
        </div>
        
        {/* Event info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-base font-semibold text-foreground truncate">{title}</p>
            {isRecurring && (
              <>
                <RefreshCw className="w-3 h-3 text-primary flex-shrink-0" />
                {nextOccurrenceNumber && (
                  <span className="text-xs text-primary font-medium">#{nextOccurrenceNumber}</span>
                )}
              </>
            )}
          </div>
          {targetDate && (
            <p className="text-xs text-muted-foreground">
              {isRecurring ? `Next: ${formatDateSmart(targetDate)}` : formatDateSmart(targetDate)}
            </p>
          )}
        </div>
        
        {/* Days countdown */}
        <div className="flex-shrink-0 text-right">
          {countdown.isComplete && !countdown.isPast ? (
            <div>
              <p className="text-lg font-bold text-primary">{t('countdown.today')}</p>
            </div>
          ) : countdown.isPast ? (
            <div>
              <p className="text-2xl font-bold text-foreground">{countdown.daysSince}</p>
              <p className="text-xs text-muted-foreground">
                {t('countdown.daysAgo', { count: countdown.daysSince })}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold text-foreground">{countdown.days}</p>
              <p className="text-xs text-muted-foreground">
                {t('widget.units.days', { count: countdown.days })}
              </p>
            </div>
          )}
        </div>
      </div>
      {!isLast && <div className={`border-t ${dividerColor} mx-6`} />}
    </>
  );
}

function EmptyRow({ appearanceMode, isLast }: { appearanceMode: WidgetAppearanceMode; isLast: boolean }) {
  const dividerColor = appearanceMode === 'dark' 
    ? 'border-white/15' 
    : 'border-gray-200';
    
  return (
    <>
      <div className="flex items-center px-6 h-[109px]">
        <p className="text-sm text-muted-foreground">No countdown selected</p>
      </div>
      {!isLast && <div className={`border-t ${dividerColor} mx-6`} />}
    </>
  );
}

export function TripleLargeWidget({ event1, event2, event3, appearanceMode, countdownStyle = 'focus' }: TripleLargeWidgetProps) {
  const widgetClasses = getWidgetClasses(appearanceMode);
  const sizeStyles = getWidgetSizeStyles('large');
  
  // Combined style for both size and tinted background
  const combinedStyle = appearanceMode === 'tinted' && (event1?.emojiColor || event2?.emojiColor || event3?.emojiColor)
    ? { ...sizeStyles, background: getTintedBackground(event1?.emojiColor || event2?.emojiColor || event3?.emojiColor, true) }
    : sizeStyles;

  return (
    <div className={`${widgetClasses} p-0`} style={combinedStyle}>
      {event1 ? (
        <EventRow event={event1} appearanceMode={appearanceMode} isLast={false} countdownStyle={countdownStyle} />
      ) : (
        <EmptyRow appearanceMode={appearanceMode} isLast={false} />
      )}
      
      {event2 ? (
        <EventRow event={event2} appearanceMode={appearanceMode} isLast={false} countdownStyle={countdownStyle} />
      ) : (
        <EmptyRow appearanceMode={appearanceMode} isLast={false} />
      )}
      
      {event3 ? (
        <EventRow event={event3} appearanceMode={appearanceMode} isLast={true} countdownStyle={countdownStyle} />
      ) : (
        <EmptyRow appearanceMode={appearanceMode} isLast={true} />
      )}
    </div>
  );
}
