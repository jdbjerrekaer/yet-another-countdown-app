import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IonItemSliding, IonItem, IonItemOptions, IonItemOption } from '@ionic/react';
import { RefreshCw, CalendarIcon, Trash2 } from 'lucide-react';
import { useCountdown } from '@/hooks/useCountdown';
import { useHaptic } from '@/hooks/useHaptic';
import { CountdownEvent } from '@/types/countdown';
import { getNextRecurringDate, getNextOccurrenceNumber, getRepetitionCount } from '@/lib/recurring';
import { formatRelative } from '@/lib/relativeTime';
import { useLegacyTimeFormat } from '@/lib/useLegacyTimeFormat';
import styles from './styles.module.scss';

interface CountdownCardProps {
  event: CountdownEvent;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => Promise<boolean> | void;
  isReordering?: boolean;
  isDragging?: boolean;
  isNative?: boolean;
  isDeleting?: boolean;
}

export function CountdownCard({ 
  event, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete,
  isReordering = false,
  isDragging = false,
  isNative = false,
  isDeleting = false,
}: CountdownCardProps) {
  const { t } = useTranslation();
  const { trigger } = useHaptic();
  const legacyTimeFormat = useLegacyTimeFormat();
  const slidingRef = useRef<HTMLIonItemSlidingElement>(null);
  const hapticTriggeredRef = useRef(false);
  const [isSliding, setIsSliding] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [swipeAmount, setSwipeAmount] = useState(0);
  
  const targetDate = event.isRecurring 
    ? getNextRecurringDate(new Date(event.targetDate))
    : new Date(event.targetDate);
  
  const countdown = useCountdown(targetDate, { resolution: 'minute' });
  
  // Calculate occurrence number for events (only for recurring events)
  const occurrenceNumber = event.isRecurring
    ? (countdown.isPast
        ? getRepetitionCount(new Date(event.targetDate))
        : getNextOccurrenceNumber(new Date(event.targetDate)))
    : 0;

  const handleSelect = (e?: React.MouseEvent) => {
    trigger('light');
    // On native, open edit modal instead of selecting
    if (isNative) {
      if (e) {
        e.stopPropagation();
      }
      onEdit();
    } else {
      onSelect();
    }
  };

  const handleDelete = async () => {
    trigger('heavy');
    const confirmed = await onDelete();
    if (confirmed === false) {
      await slidingRef.current?.close();
    }
  };

  const handleDeletePress = () => {
    // Trigger medium haptic on press/touch for immediate feedback
    trigger('medium');
  };

  const handleSwipe = async () => {
    trigger('heavy');
    const confirmed = await onDelete();
    if (confirmed === false) {
      await slidingRef.current?.close();
    }
  };

  // After a swipe ends, Ionic animates the item back to closed (~250ms).
  // Instead of polling every 100ms, chain setTimeout checks at 250ms —
  // fewer CPU wakeups, and the effect self-terminates once closed.
  useEffect(() => {
    if (!isSliding) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      if (cancelled || !slidingRef.current) return;
      try {
        const openAmount = await slidingRef.current.getOpenAmount();
        if (Math.abs(openAmount) <= 2) {
          setIsSliding(false);
          setSwipeProgress(0);
          hapticTriggeredRef.current = false;
          return;
        }
      } catch {
        return;
      }
      timeoutId = setTimeout(check, 250);
    };

    timeoutId = setTimeout(check, 250);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isSliding]);

  useEffect(() => {
    const deleteOptionEl = slidingRef.current?.querySelector('ion-item-option');
    if (!deleteOptionEl || !isSliding) return;
    
    const applyBackground = () => {
      const native = deleteOptionEl.shadowRoot?.querySelector('.item-native') || deleteOptionEl.shadowRoot?.querySelector('[part="native"]');
      if (native) {
        const nativeEl = native as HTMLElement;
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--ion-background-color').trim() || 'var(--ion-background-color)';
        
        nativeEl.style.setProperty('background', bgColor, 'important');
        nativeEl.style.setProperty('background-color', bgColor, 'important');
        nativeEl.style.setProperty('border', 'none', 'important');
        nativeEl.style.setProperty('border-width', '0', 'important');
        nativeEl.style.setProperty('box-shadow', 'none', 'important');
        nativeEl.style.setProperty('border-top-right-radius', '16px', 'important');
        nativeEl.style.setProperty('border-bottom-right-radius', '16px', 'important');
        nativeEl.style.setProperty('border-top-left-radius', '0', 'important');
        nativeEl.style.setProperty('border-bottom-left-radius', '0', 'important');
        nativeEl.style.setProperty('overflow', 'hidden', 'important');
        
        const hostEl = deleteOptionEl as HTMLElement;
        hostEl.style.setProperty('border', 'none', 'important');
        hostEl.style.setProperty('border-width', '0', 'important');
        hostEl.style.setProperty('border-top-right-radius', '16px', 'important');
        hostEl.style.setProperty('border-bottom-right-radius', '16px', 'important');
        hostEl.style.setProperty('overflow', 'hidden', 'important');
      }
    };
    
    applyBackground();
    const timeoutId = setTimeout(applyBackground, 100);
    return () => clearTimeout(timeoutId);
  }, [isSliding]);


  const handleDrag = (e: CustomEvent) => {
    const amount = (e.detail as { amount?: number })?.amount || 0;
    if (Math.abs(amount) > 2) {
      setIsSliding(true);
    }
    const maxSwipe = 120;
    const progress = Math.min(Math.max(Math.abs(amount) / maxSwipe, 0), 1);
    setSwipeProgress(progress);
    setSwipeAmount(Math.abs(amount));
    
    const hapticThreshold = 0.5;
    if (progress >= hapticThreshold && !hapticTriggeredRef.current) {
      trigger('light');
      hapticTriggeredRef.current = true;
    }
  };

  const borderRadius = 16;

  const wrapperClasses = [
    'countdown-card-wrapper',
    styles.wrapper,
    !isNative && isSelected && 'countdown-card-selected',
    isDragging && 'countdown-card-dragging',
    isSliding && styles.wrapperSwiping,
    isDeleting && 'animate-collapse',
    !isReordering && !isDragging && 'active:scale-[0.98]',
    'transition-transform duration-150',
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={wrapperClasses}
      style={{
        borderRadius: `${borderRadius}px`,
        WebkitBorderRadius: `${borderRadius}px`,
        backgroundColor: isSliding ? 'transparent' : 'hsl(var(--card))',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        isolation: isDragging ? 'isolate' : 'auto',
        pointerEvents: isDragging ? 'none' : 'auto',
        backdropFilter: isDragging ? 'none' : undefined,
        WebkitBackdropFilter: isDragging ? 'none' : undefined,
        boxShadow: isNative ? 'none' : undefined,
        border: isSliding ? 'none' : undefined,
        borderBottom: isSliding ? 'none' : undefined,
        borderWidth: isSliding ? '0' : undefined,
      }}
    >
      <IonItemSliding 
        ref={slidingRef}
        disabled={isReordering}
        onIonDrag={handleDrag}
        style={{
          borderRadius: `${borderRadius}px`,
          WebkitBorderRadius: `${borderRadius}px`,
          overflow: 'hidden',
          background: 'transparent',
          '--background': 'transparent',
        } as React.CSSProperties}
      >
          {/* Delete option on the right side */}
          <IonItemOptions side="end" onIonSwipe={handleSwipe} className={styles.deleteOptions}>
            <IonItemOption 
              expandable
              onClick={handleDelete}
              className={styles.deleteOption}
              style={{
                '--background': 'var(--ion-background-color)',
                '--ion-color-base': 'var(--ion-background-color)',
                '--border-width': '0',
                '--border-color': 'transparent',
                '--inner-border-width': '0',
                background: 'var(--ion-background-color)',
                backgroundColor: 'var(--ion-background-color)',
                border: 'none',
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: 'none',
                borderLeft: 'none',
                borderWidth: '0',
                borderStyle: 'none',
                borderColor: 'transparent',
                outline: 'none',
                boxShadow: 'none',
              } as React.CSSProperties}
              ref={(el) => {
                if (!el) return;
                const applyBackground = () => {
                  const native = el.shadowRoot?.querySelector('.item-native') || el.shadowRoot?.querySelector('[part="native"]');
                  if (native) {
                    const nativeEl = native as HTMLElement;
                    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--ion-background-color').trim() || 'var(--ion-background-color)';
                    nativeEl.style.setProperty('background', bgColor, 'important');
                    nativeEl.style.setProperty('background-color', bgColor, 'important');
                    nativeEl.style.setProperty('border', 'none', 'important');
                    nativeEl.style.setProperty('border-width', '0', 'important');
                    nativeEl.style.setProperty('box-shadow', 'none', 'important');
                    nativeEl.style.setProperty('border-top-right-radius', '16px', 'important');
                    nativeEl.style.setProperty('border-bottom-right-radius', '16px', 'important');
                    nativeEl.style.setProperty('border-top-left-radius', '0', 'important');
                    nativeEl.style.setProperty('border-bottom-left-radius', '0', 'important');
                    nativeEl.style.setProperty('overflow', 'hidden', 'important');
                    const hostEl = el as HTMLElement;
                    hostEl.style.setProperty('border', 'none', 'important');
                    hostEl.style.setProperty('border-width', '0', 'important');
                    hostEl.style.setProperty('border-top-right-radius', '16px', 'important');
                    hostEl.style.setProperty('border-bottom-right-radius', '16px', 'important');
                    hostEl.style.setProperty('overflow', 'hidden', 'important');
                  }
                };
                applyBackground();
                setTimeout(applyBackground, 100);
              }}
            >
              <div className={styles.deleteContent}>
                <div 
                  className={styles.deleteIconCircle}
                  onPointerDown={handleDeletePress}
                  onTouchStart={handleDeletePress}
                  style={{
                    width: (() => {
                      const baseWidth = 40;
                      const expandedWidth = Math.max(swipeAmount - 16, baseWidth);
                      
                      if (swipeProgress <= 0.90) {
                        return '2.5rem';
                      }
                      
                      const expansionProgress = Math.min((swipeProgress - 0.90) / 0.10, 1);
                      const currentWidth = baseWidth + (expandedWidth - baseWidth) * expansionProgress;
                      return `${currentWidth}px`;
                    })(),
                    borderRadius: '9999px',
                    transform: `scale(${Math.min(swipeProgress / 0.5, 1)})`,
                    opacity: (() => {
                      const scaleProgress = Math.min(swipeProgress / 0.5, 1);
                      return 0.3 + (scaleProgress * 0.7);
                    })(),
                    filter: (() => {
                      const scaleProgress = Math.min(swipeProgress / 0.5, 1);
                      const blurAmount = 2 * (1 - scaleProgress);
                      return blurAmount > 0 ? `blur(${blurAmount}px)` : 'none';
                    })(),
                    transition: isSliding 
                      ? 'opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1), filter 0.15s cubic-bezier(0.4, 0, 0.2, 1)' 
                      : 'width 0.15s ease-out, transform 0.12s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.12s ease-out, opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1), filter 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <Trash2 
                    className={styles.deleteIcon}
                    style={{
                      filter: swipeProgress > 0.95 ? `blur(${Math.max(0, (1 - (swipeProgress - 0.90) / 0.10) * 4)}px)` : 'none',
                    }}
                  />
                  <span 
                    className={styles.deleteText}
                    style={{
                      display: swipeProgress > 0.95 ? 'inline' : 'none',
                      opacity: swipeProgress > 0.95 ? Math.min((swipeProgress - 0.90) / 0.10, 1) : 0,
                      filter: swipeProgress > 0.95 ? `blur(${Math.max(0, (1 - (swipeProgress - 0.90) / 0.10) * 4)}px)` : 'none',
                    }}
                  >
                    {t('events.delete')}
                  </span>
                </div>
              </div>
            </IonItemOption>
          </IonItemOptions>
          
          {/* Main card content */}
          <IonItem 
            button
            detail={isNative}
            onClick={handleSelect}
            lines="none"
            className={styles.item}
            style={{
              '--border-radius': `${borderRadius}px`,
              borderRadius: `${borderRadius}px`,
            } as React.CSSProperties}
          >
            <div 
              className="w-full p-4 flex items-center gap-4 overflow-hidden"
              style={{
                borderRadius: `${borderRadius}px`,
                backgroundColor: 'hsl(var(--card))',
              }}
            >
              <div 
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${!event.emojiColor ? 'gradient-accent' : ''}`}
                style={event.emojiColor ? { 
                  backgroundColor: event.emojiColor
                } : undefined}
              >
                <span className="text-2xl">{event.emoji}</span>
              </div>
              
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-semibold text-foreground truncate min-w-0 flex-1">{event.title}</h3>
                  {(event.isRecurring || countdown.isPast) && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {event.isRecurring && <RefreshCw className="w-3.5 h-3.5 text-primary" />}
                      {event.isRecurring && occurrenceNumber > 0 && (
                        <span className="text-xs text-primary font-medium">
                          #{occurrenceNumber}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm text-muted-foreground flex-shrink-0">
                    {countdown.isComplete && !countdown.isPast
                      ? t('countdown.today')
                      : formatRelative(t, targetDate, new Date(), event.hasTime ?? false, legacyTimeFormat)
                    }
                  </p>
                  {event.isImported && event.importedFrom && (
                    <span className="text-xs text-muted-foreground/70 flex items-center gap-1 min-w-0 truncate">
                      <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{event.importedFrom}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </IonItem>
        </IonItemSliding>
    </div>
  );
}
